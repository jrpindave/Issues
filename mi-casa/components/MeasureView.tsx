"use client";

import { Line, Html } from "@react-three/drei";
import * as THREE from "three";
import { usePlanner } from "@/lib/store";

const labelStyle: React.CSSProperties = {
  pointerEvents: "none",
  background: "rgba(8,9,12,0.85)",
  border: "1px solid #ffd47955",
  color: "#ffd479",
  borderRadius: 6,
  padding: "1px 6px",
  fontSize: 11,
  fontWeight: 600,
  fontVariantNumeric: "tabular-nums",
  whiteSpace: "nowrap",
};

function fmt(d: number) {
  return d >= 1 ? `${d.toFixed(2)} m` : `${Math.round(d * 100)} cm`;
}

export default function MeasureView() {
  const measurements = usePlanner((s) => s.measurements);
  const pending = usePlanner((s) => s.pendingPoint);

  return (
    <>
      {measurements.map((m, i) => {
        const a = new THREE.Vector3(...m.a);
        const b = new THREE.Vector3(...m.b);
        const mid = a.clone().add(b).multiplyScalar(0.5);
        const d = a.distanceTo(b);
        return (
          <group key={i}>
            <Line points={[m.a, m.b]} color="#ffd479" lineWidth={2} />
            <Html position={[mid.x, mid.y, mid.z]} center zIndexRange={[100, 0]}>
              <div style={labelStyle}>{fmt(d)}</div>
            </Html>
            <mesh position={m.a}>
              <sphereGeometry args={[0.03, 12, 12]} />
              <meshBasicMaterial color="#ffd479" />
            </mesh>
            <mesh position={m.b}>
              <sphereGeometry args={[0.03, 12, 12]} />
              <meshBasicMaterial color="#ffd479" />
            </mesh>
          </group>
        );
      })}
      {pending && (
        <mesh position={pending}>
          <sphereGeometry args={[0.04, 12, 12]} />
          <meshBasicMaterial color="#6ea8fe" />
        </mesh>
      )}
    </>
  );
}
