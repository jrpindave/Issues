"use client";

import { useEffect, useState } from "react";
import * as THREE from "three";
import { loadIfc } from "@/lib/ifc";
import { usePlanner } from "@/lib/store";
import type { RoomInfo } from "@/lib/types";

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
  const setRooms = usePlanner((s) => s.setRooms);
  const setIfcSource = usePlanner((s) => s.setIfcSource);
  const rooms = usePlanner((s) => s.rooms);

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
    const apply = ({ group, levels, bbox, center, snapX, snapZ, rooms }: Awaited<ReturnType<typeof loadIfc>>) => {
      if (!alive) return;
      const size = bbox.getSize(new THREE.Vector3());
      setGroup(group);
      setLevels(levels);
      setDrop(center.x, center.z);
      setSnapPlanes(snapX, snapZ);
      setRooms(rooms);
      setModelStatus("ready");
      onLoaded({ bbox, center, size });
    };
    const isSupabase = primary.includes("supabase.co");
    loadIfc(primary)
      .then((r) => {
        apply(r);
        if (alive) setIfcSource(isSupabase ? "supabase" : "local");
      })
      .catch(() =>
        // Supabase empty/unreachable → use the IFC shipped with the build.
        loadIfc(bundled)
          .then((r) => {
            apply(r);
            if (alive) setIfcSource("local");
          })
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

  // Paint each wall's segment that falls inside a painted room (no normals — robust).
  useEffect(() => {
    if (!group) return;
    const c = new THREE.Color();
    group.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.userData?.isWall) return;
      const geo = mesh.geometry as THREE.BufferGeometry;
      const colAttr = geo.getAttribute("color") as THREE.BufferAttribute | undefined;
      const pos = geo.getAttribute("position") as THREE.BufferAttribute | undefined;
      const idx = geo.getIndex();
      if (!colAttr || !pos || !idx) return;
      const [br, bg, bb] = mesh.userData.baseRGB as [number, number, number];
      for (let i = 0; i < colAttr.count; i++) colAttr.setXYZ(i, br, bg, bb);
      const wallId = mesh.userData.wallId as number;
      const prefix = `${wallId}|`;
      if (Object.keys(wallColors).some((k) => k.startsWith(prefix))) {
        for (let t = 0; t < idx.count; t += 3) {
          const a = idx.getX(t), b = idx.getX(t + 1), d = idx.getX(t + 2);
          const cx = (pos.getX(a) + pos.getX(b) + pos.getX(d)) / 3;
          const cy = (pos.getY(a) + pos.getY(b) + pos.getY(d)) / 3;
          const cz = (pos.getZ(a) + pos.getZ(b) + pos.getZ(d)) / 3;
          const hex = paintedRoomColor(cx, cy, cz, wallId, rooms, wallColors);
          if (!hex) continue;
          c.set(hex);
          colAttr.setXYZ(a, c.r, c.g, c.b);
          colAttr.setXYZ(b, c.r, c.g, c.b);
          colAttr.setXYZ(d, c.r, c.g, c.b);
        }
      }
      colAttr.needsUpdate = true;
    });
  }, [group, wallColors, rooms]);

  return group ? (
    <primitive
      object={group}
      onClick={(e: {
        object: THREE.Object3D;
        point?: THREE.Vector3;
        camera?: THREE.Camera;
        stopPropagation: () => void;
      }) => {
        if (!paintMode || !e.object.userData?.isWall || !e.point || !e.camera) return;
        e.stopPropagation();
        const p = e.point;
        const cam = e.camera.position;
        // Offset toward the camera to pick the room on the viewer's side.
        const dx = cam.x - p.x, dy = cam.y - p.y, dz = cam.z - p.z;
        const len = Math.hypot(dx, dy, dz) || 1;
        const room = roomOf(p.x + (dx / len) * 0.4, p.y + (dy / len) * 0.4, p.z + (dz / len) * 0.4, rooms);
        if (room >= 0) paintWallSide(`${e.object.userData.wallId}|${room}`);
      }}
    />
  ) : null;
}

/** Index of the smallest room containing the point (with tolerance), or -1. */
function roomOf(x: number, y: number, z: number, rooms: RoomInfo[]): number {
  let best = -1;
  let bestArea = Infinity;
  for (let i = 0; i < rooms.length; i++) {
    const r = rooms[i];
    if (
      x >= r.minX - 0.1 && x <= r.maxX + 0.1 &&
      z >= r.minZ - 0.1 && z <= r.maxZ + 0.1 &&
      y >= r.minY - 0.3 && y <= r.maxY + 0.3
    ) {
      const area = (r.maxX - r.minX) * (r.maxZ - r.minZ);
      if (area < bestArea) { bestArea = area; best = i; }
    }
  }
  return best;
}

/** Colour for a wall triangle: smallest painted room whose bounds contain it. */
function paintedRoomColor(
  x: number, y: number, z: number,
  wallId: number, rooms: RoomInfo[], wallColors: Record<string, string>
): string | null {
  let hex: string | null = null;
  let bestArea = Infinity;
  for (let i = 0; i < rooms.length; i++) {
    const r = rooms[i];
    if (
      x >= r.minX - 0.25 && x <= r.maxX + 0.25 &&
      z >= r.minZ - 0.25 && z <= r.maxZ + 0.25 &&
      y >= r.minY - 0.3 && y <= r.maxY + 0.3
    ) {
      const col = wallColors[`${wallId}|${i}`];
      if (col) {
        const area = (r.maxX - r.minX) * (r.maxZ - r.minZ);
        if (area < bestArea) { bestArea = area; hex = col; }
      }
    }
  }
  return hex;
}
