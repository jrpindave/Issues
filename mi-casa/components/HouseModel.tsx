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
  const setRooms = usePlanner((s) => s.setRooms);
  const setIfcSource = usePlanner((s) => s.setIfcSource);
  const measureMode = usePlanner((s) => s.measureMode);

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

  // Paint whole wall entities (vertex colors). Split walls per room in the IFC
  // to get per-room painting; here a click paints the clicked wall entity.
  useEffect(() => {
    if (!group) return;
    const c = new THREE.Color();
    group.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.userData?.isWall) return;
      const geo = mesh.geometry as THREE.BufferGeometry;
      const colAttr = geo.getAttribute("color") as THREE.BufferAttribute | undefined;
      if (!colAttr) return;
      const [br, bg, bb] = mesh.userData.baseRGB as [number, number, number];
      const hex = wallColors[`${mesh.userData.wallId}`];
      if (hex) {
        c.set(hex);
        for (let i = 0; i < colAttr.count; i++) colAttr.setXYZ(i, c.r, c.g, c.b);
      } else {
        for (let i = 0; i < colAttr.count; i++) colAttr.setXYZ(i, br, bg, bb);
      }
      colAttr.needsUpdate = true;
    });
  }, [group, wallColors]);

  return group ? (
    <primitive
      object={group}
      onClick={(e: { object: THREE.Object3D; stopPropagation: () => void }) => {
        if (measureMode) return; // measuring is handled globally
        if (!paintMode || !e.object.userData?.isWall) return;
        e.stopPropagation();
        paintWallSide(`${e.object.userData.wallId}`);
      }}
    />
  ) : null;
}
