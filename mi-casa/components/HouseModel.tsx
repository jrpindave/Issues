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

  return group ? <primitive object={group} /> : null;
}
