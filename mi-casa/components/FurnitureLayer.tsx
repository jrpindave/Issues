"use client";

import { TransformControls, Edges } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";
import { usePlanner } from "@/lib/store";
import type { FurnitureItem, LevelInfo } from "@/lib/types";

function levelElevation(levels: LevelInfo[], level: number): number {
  return levels[level]?.elevation ?? 0;
}

/** Snap a center coordinate so the prism's nearest face lands on a wall plane. */
function snapAxis(center: number, half: number, planes: number[], threshold: number): number {
  let bestShift = 0;
  let bestAbs = threshold;
  for (const p of planes) {
    for (const edge of [center - half, center + half]) {
      const d = p - edge;
      if (Math.abs(d) < bestAbs) {
        bestAbs = Math.abs(d);
        bestShift = d;
      }
    }
  }
  return center + bestShift;
}

/** The box(es) for one item, drawn relative to the floor of its level. */
function PieceMeshes({ item, selected }: { item: FurnitureItem; selected: boolean }) {
  const emissive = selected ? "#3a3320" : "#000000";
  const edgeColor = selected ? "#ffd479" : item.fixture ? "#00000055" : "#00000033";

  return (
    <>
      <mesh position={[0, item.height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[item.width, item.height, item.depth]} />
        <meshStandardMaterial
          color={item.color}
          roughness={0.7}
          metalness={0.04}
          emissive={emissive}
          emissiveIntensity={selected ? 1 : 0}
          transparent={item.fixture}
          opacity={item.fixture ? 0.92 : 1}
        />
        <Edges threshold={15} scale={1.001} color={edgeColor} />
      </mesh>

      {item.upper && (
        <mesh
          position={[0, item.upper.topY - item.upper.height / 2, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry
            args={[item.upper.width ?? item.width, item.upper.height, item.upper.depth ?? item.depth]}
          />
          <meshStandardMaterial
            color={item.color}
            roughness={0.7}
            metalness={0.04}
            emissive={emissive}
            emissiveIntensity={selected ? 1 : 0}
            transparent
            opacity={0.9}
          />
          <Edges threshold={15} scale={1.001} color={edgeColor} />
        </mesh>
      )}
    </>
  );
}

export default function FurnitureLayer() {
  const items = usePlanner((s) => s.items);
  const levels = usePlanner((s) => s.levels);
  const levelVisible = usePlanner((s) => s.levelVisible);
  const selectedId = usePlanner((s) => s.selectedId);
  const select = usePlanner((s) => s.select);
  const updateItem = usePlanner((s) => s.updateItem);
  const snapXPlanes = usePlanner((s) => s.snapX);
  const snapZPlanes = usePlanner((s) => s.snapZ);
  const snapEnabled = usePlanner((s) => s.snapEnabled);

  const selectedRef = useRef<THREE.Group>(null);
  const selected = items.find((it) => it.id === selectedId) ?? null;
  const selectedVisible = selected ? levelVisible[selected.level] ?? true : false;

  const commitSelected = () => {
    const g = selectedRef.current;
    if (!g || !selected) return;
    let x = g.position.x;
    let z = g.position.z;
    if (snapEnabled) {
      // Snap the prism's nearest face to a wall plane when close enough.
      const r = selected.rotationY;
      const hx = Math.abs((selected.width / 2) * Math.cos(r)) + Math.abs((selected.depth / 2) * Math.sin(r));
      const hz = Math.abs((selected.width / 2) * Math.sin(r)) + Math.abs((selected.depth / 2) * Math.cos(r));
      x = snapAxis(x, hx, snapXPlanes, 0.25);
      z = snapAxis(z, hz, snapZPlanes, 0.25);
    }
    updateItem(selected.id, { x, z });
  };

  return (
    <group>
      {items.map((item) => {
        if (!(levelVisible[item.level] ?? true)) return null;
        if (item.id === selectedId) return null; // drawn with the gizmo below
        const elev = levelElevation(levels, item.level);
        return (
          <group
            key={item.id}
            position={[item.x, elev, item.z]}
            rotation={[0, item.rotationY, 0]}
            onClick={(e) => {
              e.stopPropagation();
              select(item.id);
            }}
          >
            <PieceMeshes item={item} selected={false} />
          </group>
        );
      })}

      {selected && selectedVisible && (
        <TransformControls
          mode="translate"
          showY={false}
          translationSnap={0.05}
          onMouseUp={commitSelected}
        >
          <group
            ref={selectedRef}
            position={[selected.x, levelElevation(levels, selected.level), selected.z]}
            rotation={[0, selected.rotationY, 0]}
          >
            <PieceMeshes item={selected} selected />
          </group>
        </TransformControls>
      )}
    </group>
  );
}
