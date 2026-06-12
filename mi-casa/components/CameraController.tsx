"use client";

import { useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { ModelInfo } from "./HouseModel";
import { usePlanner } from "@/lib/store";

interface Props {
  info: ModelInfo | null;
  controls: React.RefObject<React.ComponentRef<typeof OrbitControls> | null>;
}

/** Frames the model once on load and swaps between orbit and top (plan) views. */
export default function CameraController({ info, controls }: Props) {
  const camera = useThree((s) => s.camera);
  const planView = usePlanner((s) => s.planView);
  const framedFor = useRef<ModelInfo | null>(null);

  // Initial framing when the model bbox becomes available.
  useEffect(() => {
    if (!info || framedFor.current === info) return;
    framedFor.current = info;
    applyView(camera, controls.current, info, planView);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [info]);

  // React to plan/orbit toggle.
  useEffect(() => {
    if (!info) return;
    applyView(camera, controls.current, info, planView);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planView]);

  return null;
}

function applyView(
  camera: THREE.Camera,
  controls: React.ComponentRef<typeof OrbitControls> | null,
  info: ModelInfo,
  planView: boolean
) {
  const { center, size } = info;
  const radius = Math.max(size.x, size.y, size.z);

  if (planView) {
    camera.position.set(center.x, center.y + radius * 1.6, center.z + 0.001);
  } else {
    camera.position.set(
      center.x + radius * 0.9,
      center.y + radius * 0.8,
      center.z + radius * 1.1
    );
  }
  camera.lookAt(center);

  if (controls) {
    controls.target.copy(center);
    controls.enableRotate = !planView;
    controls.update();
  }
}
