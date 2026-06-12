"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, ContactShadows } from "@react-three/drei";
import { useRef, useState } from "react";
import * as THREE from "three";
import HouseModel, { type ModelInfo } from "./HouseModel";
import FurnitureLayer from "./FurnitureLayer";
import CameraController from "./CameraController";
import { usePlanner } from "@/lib/store";

export default function Scene3D() {
  const [info, setInfo] = useState<ModelInfo | null>(null);
  const controls = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const showGrid = usePlanner((s) => s.showGrid);
  const select = usePlanner((s) => s.select);

  const center = info ? info.center : new THREE.Vector3(0, 0, 0);
  const gridY = info ? info.bbox.min.y + 0.002 : 0;

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      camera={{ position: [9, 8, 12], fov: 45, near: 0.05, far: 500 }}
      onPointerMissed={() => select(null)}
      className="h-full w-full"
    >
      <color attach="background" args={["#0b0d10"]} />
      <fog attach="fog" args={["#0b0d10", 40, 90]} />

      {/* Lighting tuned for a clean, "filete" architectural look. */}
      <hemisphereLight args={["#dfe7f2", "#2a2620", 0.9]} />
      <ambientLight intensity={0.25} />
      <directionalLight
        position={[12, 18, 8]}
        intensity={1.7}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0001}
      >
        <orthographicCamera attach="shadow-camera" args={[-20, 20, 20, -20, 0.1, 80]} />
      </directionalLight>
      <directionalLight position={[-10, 8, -6]} intensity={0.4} />

      <HouseModel onLoaded={setInfo} />
      <FurnitureLayer />

      {showGrid && (
        <Grid
          position={[center.x, gridY, center.z]}
          args={[60, 60]}
          cellSize={0.5}
          cellThickness={0.6}
          cellColor="#1c2128"
          sectionSize={1}
          sectionThickness={1}
          sectionColor="#39414c"
          fadeDistance={55}
          fadeStrength={1.5}
          infiniteGrid
          followCamera={false}
        />
      )}

      <ContactShadows
        position={[center.x, gridY + 0.001, center.z]}
        scale={50}
        blur={2.2}
        opacity={0.45}
        far={20}
      />

      <OrbitControls
        ref={controls}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={1}
        maxDistance={80}
        maxPolarAngle={Math.PI / 2 - 0.02}
      />

      <CameraController info={info} controls={controls} />
    </Canvas>
  );
}
