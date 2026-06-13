import * as THREE from "three";
import { IfcAPI, IFCBUILDINGSTOREY, IFCSPACE } from "web-ifc";
import type { LevelInfo } from "./types";

export interface LoadedModel {
  /** All IFC meshes in three world space (Y-up). Each mesh has userData.level. */
  group: THREE.Group;
  levels: LevelInfo[];
  bbox: THREE.Box3;
  /** Plan-center of the footprint, used as the default drop point for new furniture. */
  center: THREE.Vector3;
  /** Vertical wall planes (constant X and constant Z) used to snap furniture. */
  snapX: number[];
  snapZ: number[];
}

let apiPromise: Promise<IfcAPI> | null = null;

async function getApi(): Promise<IfcAPI> {
  if (!apiPromise) {
    apiPromise = (async () => {
      const api = new IfcAPI();
      // Load the WASM from a CDN (matches the standalone build). This sidesteps
      // any static-hosting quirks around serving .wasm and guarantees the file
      // is delivered with the right CORS + application/wasm content-type.
      api.SetWasmPath("https://unpkg.com/web-ifc@0.0.69/", true);
      await api.Init();
      return api;
    })();
  }
  return apiPromise;
}

function readStoreyElevations(api: IfcAPI, modelID: number): number[] {
  const ids = api.GetLineIDsWithType(modelID, IFCBUILDINGSTOREY);
  const elevs: number[] = [];
  for (let i = 0; i < ids.size(); i++) {
    const line = api.GetLine(modelID, ids.get(i)) as { Elevation?: { value?: number } };
    elevs.push(line.Elevation?.value ?? 0);
  }
  elevs.sort((a, b) => a - b);
  return elevs.length ? elevs : [0];
}

export async function loadIfc(url: string): Promise<LoadedModel> {
  let api: IfcAPI;
  try {
    api = await getApi();
  } catch (e) {
    throw new Error(`init web-ifc (WASM CDN): ${(e as Error).message ?? e}`);
  }

  let data: Uint8Array;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} al pedir ${url}`);
    data = new Uint8Array(await res.arrayBuffer());
  } catch (e) {
    throw new Error(`fetch IFC (${url}): ${(e as Error).message ?? e}`);
  }

  // web-ifc returns Y-up geometry; COORDINATE_TO_ORIGIN keeps coordinates small.
  const modelID = api.OpenModel(data, { COORDINATE_TO_ORIGIN: true });
  const storeyElevs = readStoreyElevations(api, modelID);

  const group = new THREE.Group();
  const meshes: { mesh: THREE.Mesh; minY: number }[] = [];
  const bbox = new THREE.Box3();
  // Histogram of horizontal (floor-like) surface area, keyed by rounded Y.
  const floorHist = new Map<number, number>();
  const addFloor = (y: number, area: number) => {
    const k = Math.round(y / 0.05) * 0.05;
    floorHist.set(k, (floorHist.get(k) ?? 0) + area);
  };
  // Histograms of vertical wall faces, keyed by their constant X or Z plane.
  const wallX = new Map<number, number>();
  const wallZ = new Map<number, number>();
  const addWall = (map: Map<number, number>, c: number, area: number) => {
    const k = Math.round(c / 0.02) * 0.02;
    map.set(k, (map.get(k) ?? 0) + area);
  };

  const v = new THREE.Vector3();
  const n = new THREE.Vector3();

  // IFCSPACE volumes carry room metadata but should not be drawn as solids.
  const spaceIds = new Set<number>();
  const sids = api.GetLineIDsWithType(modelID, IFCSPACE);
  for (let i = 0; i < sids.size(); i++) spaceIds.add(sids.get(i));

  api.StreamAllMeshes(modelID, (flatMesh) => {
    if (spaceIds.has(flatMesh.expressID)) return;
    const placed = flatMesh.geometries;
    for (let i = 0; i < placed.size(); i++) {
      const pg = placed.get(i);
      const geom = api.GetGeometry(modelID, pg.geometryExpressID);
      const verts = api.GetVertexArray(geom.GetVertexData(), geom.GetVertexDataSize());
      const indices = api.GetIndexArray(geom.GetIndexData(), geom.GetIndexDataSize());

      const m = new THREE.Matrix4().fromArray(pg.flatTransformation);
      const nm = new THREE.Matrix3().getNormalMatrix(m);

      // Bake the placement into world-space positions/normals.
      const vc = verts.length / 6;
      const positions = new Float32Array(vc * 3);
      const normals = new Float32Array(vc * 3);
      let meshMinY = Infinity;
      for (let k = 0; k < vc; k++) {
        v.set(verts[k * 6], verts[k * 6 + 1], verts[k * 6 + 2]).applyMatrix4(m);
        n.set(verts[k * 6 + 3], verts[k * 6 + 4], verts[k * 6 + 5]).applyMatrix3(nm).normalize();
        positions[k * 3] = v.x;
        positions[k * 3 + 1] = v.y;
        positions[k * 3 + 2] = v.z;
        normals[k * 3] = n.x;
        normals[k * 3 + 1] = n.y;
        normals[k * 3 + 2] = n.z;
        if (v.y < meshMinY) meshMinY = v.y;
      }

      // Tally horizontal surface area to locate the floor planes.
      for (let t = 0; t < indices.length; t += 3) {
        const a = indices[t] * 3;
        const b = indices[t + 1] * 3;
        const c = indices[t + 2] * 3;
        const ux = positions[b] - positions[a];
        const uy = positions[b + 1] - positions[a + 1];
        const uz = positions[b + 2] - positions[a + 2];
        const wx = positions[c] - positions[a];
        const wy = positions[c + 1] - positions[a + 1];
        const wz = positions[c + 2] - positions[a + 2];
        const cx = uy * wz - uz * wy;
        const cy = uz * wx - ux * wz;
        const cz = ux * wy - uy * wx;
        const mag = Math.hypot(cx, cy, cz);
        if (mag <= 0) continue;
        const area = 0.5 * mag;
        if (Math.abs(cy) / mag > 0.9) {
          const avgY = (positions[a + 1] + positions[b + 1] + positions[c + 1]) / 3;
          addFloor(avgY, area);
        } else if (Math.abs(cy) / mag < 0.2) {
          // Vertical face: record its constant plane if axis-aligned in X or Z.
          if (Math.abs(cx) / mag > 0.85) {
            addWall(wallX, (positions[a] + positions[b] + positions[c]) / 3, area);
          } else if (Math.abs(cz) / mag > 0.85) {
            addWall(wallZ, (positions[a + 2] + positions[b + 2] + positions[c + 2]) / 3, area);
          }
        }
      }

      const bg = new THREE.BufferGeometry();
      bg.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      bg.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
      bg.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));

      const col = pg.color;
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(col.x, col.y, col.z),
        opacity: col.w,
        transparent: col.w < 0.999,
        side: THREE.DoubleSide,
        roughness: 0.85,
        metalness: 0,
      });

      const mesh = new THREE.Mesh(bg, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      meshes.push({ mesh, minY: meshMinY });
      bbox.expandByObject(mesh);

      geom.delete();
    }
  });

  api.CloseModel(modelID);

  const size = bbox.getSize(new THREE.Vector3());

  // Ground floor = strongest horizontal plane in the lower part of the model.
  const groundBandTop = bbox.min.y + size.y * 0.4;
  let groundFloorY = bbox.min.y;
  let bestArea = -1;
  for (const [y, area] of floorHist) {
    if (y <= groundBandTop && area > bestArea) {
      bestArea = area;
      groundFloorY = y;
    }
  }

  const baseElev = storeyElevs[0];
  const levels: LevelInfo[] = storeyElevs.map((e, idx) => ({
    index: idx,
    name: `Nivel ${idx + 1}`,
    elevation: groundFloorY + (e - baseElev),
  }));

  // Classify each mesh into a storey by its lowest point.
  const spacing = storeyElevs.length > 1 ? storeyElevs[1] - storeyElevs[0] : 2.6;
  const splitY = groundFloorY + spacing / 2;
  for (const { mesh, minY } of meshes) {
    mesh.userData.level = minY >= splitY ? 1 : 0;
    group.add(mesh);
  }

  const center = bbox.getCenter(new THREE.Vector3());

  // Keep only prominent wall planes as snap targets (filters out clutter).
  const planesFrom = (map: Map<number, number>, minArea: number) =>
    [...map.entries()]
      .filter(([, area]) => area >= minArea)
      .map(([c]) => c)
      .sort((a, b) => a - b);
  const snapX = planesFrom(wallX, 0.4);
  const snapZ = planesFrom(wallZ, 0.4);

  return { group, levels, bbox, center, snapX, snapZ };
}
