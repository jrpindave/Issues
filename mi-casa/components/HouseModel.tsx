"use client";

import { useEffect, useState } from "react";
import * as THREE from "three";
import { loadIfc } from "@/lib/ifc";
import { usePlanner } from "@/lib/store";

// Public Supabase Storage object the .bat / Revit uploads overwrite.
const SUPABASE_IFC_URL =
  "https://wetwdokwnstjidoceoib.supabase.co/storage/v1/object/public/ifc/casa.ifc";

export interface ModelInfo {
  bbox: THREE.Box3;
  center: THREE.Vector3;
  size: THREE.Vector3;
}

interface Props {
  onLoaded: (info: ModelInfo) => void;
}

export default function HouseModel({ onLoaded }: Props) {
  const [group, setGroup] = useState<THREE.Group | null>(null);
  const setLevels = usePlanner((s) => s.setLevels);
  const setDrop = usePlanner((s) => s.setDrop);
  const setSnapPlanes = usePlanner((s) => s.setSnapPlanes);
  const setModelStatus = usePlanner((s) => s.setModelStatus);
  const levelVisible = usePlanner((s) => s.levelVisible);
  const paintMode = usePlanner((s) => s.paintMode);
  const paintWallSide = usePlanner((s) => s.paintWallSide);
  const wallColors = usePlanner((s) => s.wallColors);

  // Load the IFC once. Default source is the Supabase Storage object (always the
  // latest upload); falls back to the bundled file if it's missing/unreachable.
  // Override via localStorage["mi-casa-ifc-url"].
  useEffect(() => {
    let alive = true;
    setModelStatus("loading");
    const bundled = "/Casa.ifc";
    let primary = SUPABASE_IFC_URL;
    try {
      primary = localStorage.getItem("mi-casa-ifc-url") || primary;
    } catch {
      /* localStorage may be unavailable */
    }
    const apply = ({ group, levels, bbox, center, snapX, snapZ }: Awaited<ReturnType<typeof loadIfc>>) => {
      if (!alive) return;
      const size = bbox.getSize(new THREE.Vector3());
      setGroup(group);
      setLevels(levels);
      setDrop(center.x, center.z);
      setSnapPlanes(snapX, snapZ);
      setModelStatus("ready");
      onLoaded({ bbox, center, size });
    };
    loadIfc(primary)
      .then(apply)
      .catch(() =>
        // Supabase empty/unreachable → use the IFC shipped with the build.
        loadIfc(bundled)
          .then(apply)
          .catch((e: unknown) => {
            const msg = e instanceof Error ? `${e.message}` : String(e);
            console.error("Error cargando IFC:", e);
            if (alive) setModelStatus("error", msg);
          })
      );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Toggle storey visibility on the loaded meshes.
  useEffect(() => {
    if (!group) return;
    group.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const lvl = (obj.userData.level as number) ?? 0;
        obj.visible = levelVisible[lvl] ?? true;
      }
    });
  }, [group, levelVisible]);

  // Paint saved wall faces (per side) into the vertex colors; restore base first.
  useEffect(() => {
    if (!group) return;
    const c = new THREE.Color();
    group.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.userData?.isWall) return;
      const geo = mesh.geometry as THREE.BufferGeometry;
      const colAttr = geo.getAttribute("color") as THREE.BufferAttribute | undefined;
      const nor = geo.getAttribute("normal") as THREE.BufferAttribute | undefined;
      const idx = geo.getIndex();
      if (!colAttr || !nor || !idx) return;
      const [br, bg, bb] = mesh.userData.baseRGB as [number, number, number];
      for (let i = 0; i < colAttr.count; i++) colAttr.setXYZ(i, br, bg, bb);
      const wallId = mesh.userData.wallId as number;
      for (let t = 0; t < idx.count; t += 3) {
        const a = idx.getX(t);
        const side = faceSide(nor.getX(a), nor.getY(a), nor.getZ(a));
        if (!side) continue;
        const hex = wallColors[`${wallId}|${side}`];
        if (!hex) continue;
        c.set(hex);
        colAttr.setXYZ(a, c.r, c.g, c.b);
        colAttr.setXYZ(idx.getX(t + 1), c.r, c.g, c.b);
        colAttr.setXYZ(idx.getX(t + 2), c.r, c.g, c.b);
      }
      colAttr.needsUpdate = true;
    });
  }, [group, wallColors]);

  return group ? (
    <primitive
      object={group}
      onClick={(e: {
        object: THREE.Object3D;
        face?: { normal: THREE.Vector3 } | null;
        stopPropagation: () => void;
      }) => {
        if (!paintMode || !e.object.userData?.isWall || !e.face) return;
        e.stopPropagation();
        const n = e.face.normal;
        const side = faceSide(n.x, n.y, n.z);
        if (side) paintWallSide(`${e.object.userData.wallId}|${side}`);
      }}
    />
  ) : null;
}

/** Quantize a face normal to a wall side; null for top/bottom faces. */
function faceSide(nx: number, ny: number, nz: number): string | null {
  if (Math.abs(ny) > 0.6) return null;
  return Math.abs(nx) >= Math.abs(nz) ? (nx >= 0 ? "x+" : "x-") : nz >= 0 ? "z+" : "z-";
}
