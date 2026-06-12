"use client";

import { useEffect, useState } from "react";
import * as THREE from "three";
import { loadIfc } from "@/lib/ifc";
import { usePlanner } from "@/lib/store";

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
  const [error, setError] = useState<string | null>(null);
  const setLevels = usePlanner((s) => s.setLevels);
  const setDrop = usePlanner((s) => s.setDrop);
  const levelVisible = usePlanner((s) => s.levelVisible);

  // Load the IFC once.
  useEffect(() => {
    let alive = true;
    loadIfc("/Casa.ifc")
      .then(({ group, levels, bbox, center }) => {
        if (!alive) return;
        const size = bbox.getSize(new THREE.Vector3());
        setGroup(group);
        setLevels(levels);
        setDrop(center.x, center.z);
        onLoaded({ bbox, center, size });
      })
      .catch((e) => {
        console.error("Error cargando IFC:", e);
        if (alive) setError(String(e));
      });
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

  if (error) {
    // Surface a console error above; nothing to draw in-scene.
    return null;
  }

  return group ? <primitive object={group} /> : null;
}
