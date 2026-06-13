"use client";

import { TransformControls, Edges } from "@react-three/drei";
import { useEffect, useRef } from "react";
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

type BoxDef = { args: [number, number, number]; pos: [number, number, number]; opacity: number };

/** Compute the prisms for an item (L corner sofa, or box + optional upper). */
function boxesFor(item: FurnitureItem): BoxDef[] {
  const h = item.height;
  if (item.shape === "L") {
    const t = item.arm ?? Math.min(item.width, item.depth) * 0.45;
    return [
      // back arm along X
      { args: [item.width, h, t], pos: [0, 0, -item.depth / 2 + t / 2], opacity: 1 },
      // side arm along Z
      { args: [t, h, item.depth], pos: [-item.width / 2 + t / 2, 0, 0], opacity: 1 },
    ];
  }
  const boxes: BoxDef[] = [
    { args: [item.width, h, item.depth], pos: [0, 0, 0], opacity: item.fixture ? 0.92 : 1 },
  ];
  if (item.upper) {
    boxes.push({
      args: [item.upper.width ?? item.width, item.upper.height, item.upper.depth ?? item.depth],
      pos: [0, item.upper.topY - item.upper.height / 2 - h / 2, 0],
      opacity: 0.9,
    });
  }
  return boxes;
}

/**
 * The prism(s) for one item. The parent group's origin sits at the item's
 * vertical center (so the move gizmo hugs the block); meshes are offset around it.
 */
function PieceMeshes({ item, selected }: { item: FurnitureItem; selected: boolean }) {
  const emissive = selected ? "#3a3320" : "#000000";
  const edgeColor = selected ? "#ffd479" : item.fixture ? "#00000055" : "#00000033";
  return (
    <>
      {boxesFor(item).map((b, i) => (
        <mesh key={i} position={b.pos} castShadow receiveShadow>
          <boxGeometry args={b.args} />
          <meshStandardMaterial
            color={item.color}
            roughness={0.7}
            metalness={0.04}
            emissive={emissive}
            emissiveIntensity={selected ? 1 : 0}
            transparent={b.opacity < 1}
            opacity={b.opacity}
          />
          <Edges threshold={15} scale={1.001} color={edgeColor} />
        </mesh>
      ))}
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
  // drei forwards the controls instance through this ref.
  const tcRef = useRef<React.ComponentRef<typeof TransformControls>>(null);
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
      x = snapAxis(x, hx, snapXPlanes, 0.35);
      z = snapAxis(z, hz, snapZPlanes, 0.35);
    }
    // Vertical: keep whatever height the gizmo set, as an offset above the floor.
    const baseY = levelElevation(levels, selected.level) + selected.height / 2;
    const yOffset = Math.max(-selected.height / 2, g.position.y - baseY);
    updateItem(selected.id, { x, z, yOffset });
  };

  // Persist the move when the drag ends. 'dragging-changed' is the reliable
  // TransformControls event, so positions never reset on the next click.
  useEffect(() => {
    const tc = tcRef.current as unknown as {
      addEventListener: (t: string, cb: (e: { value: boolean }) => void) => void;
      removeEventListener: (t: string, cb: (e: { value: boolean }) => void) => void;
    } | null;
    if (!tc) return;
    const onDrag = (e: { value: boolean }) => {
      if (!e.value) commitSelected();
    };
    tc.addEventListener("dragging-changed", onDrag);
    return () => tc.removeEventListener("dragging-changed", onDrag);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, snapEnabled, snapXPlanes, snapZPlanes]);

  return (
    <group>
      {items.map((item) => {
        if (!(levelVisible[item.level] ?? true)) return null;
        if (item.id === selectedId) return null; // drawn with the gizmo below
        const elev = levelElevation(levels, item.level);
        return (
          <group
            key={item.id}
            position={[item.x, elev + item.height / 2 + (item.yOffset ?? 0), item.z]}
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
        // Attach the gizmo to the positioned group via `object` (a ref) so it
        // hugs the block; nesting under <TransformControls> would anchor it at
        // the world origin instead. Keyed so it re-attaches per selection.
        <group key={selected.id}>
          <group
            ref={selectedRef}
            position={[
              selected.x,
              levelElevation(levels, selected.level) + selected.height / 2 + (selected.yOffset ?? 0),
              selected.z,
            ]}
            rotation={[0, selected.rotationY, 0]}
          >
            <PieceMeshes item={selected} selected />
          </group>
          <TransformControls
            ref={tcRef}
            object={selectedRef as React.RefObject<THREE.Object3D>}
            mode="translate"
            translationSnap={0.05}
          />
        </group>
      )}
    </group>
  );
}
