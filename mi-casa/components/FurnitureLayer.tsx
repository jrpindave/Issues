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
  if (item.shape === "cylinder") {
    const r = item.width / 2;
    return (
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[r, r, item.height, 32]} />
        <meshStandardMaterial
          color={item.color}
          roughness={0.7}
          metalness={0.04}
          emissive={emissive}
          emissiveIntensity={selected ? 1 : 0}
        />
        <Edges threshold={25} scale={1.001} color={edgeColor} />
      </mesh>
    );
  }
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
  const gizmoMode = usePlanner((s) => s.gizmoMode);

  const selectedRef = useRef<THREE.Group>(null);
  // drei forwards the controls instance through this ref.
  const tcRef = useRef<React.ComponentRef<typeof TransformControls>>(null);
  // Hold Ctrl (or ⌘) while dragging to place freely (disables wall snap).
  const ctrlRef = useRef(false);
  useEffect(() => {
    const set = (e: KeyboardEvent) => (ctrlRef.current = e.ctrlKey || e.metaKey);
    window.addEventListener("keydown", set);
    window.addEventListener("keyup", set);
    return () => {
      window.removeEventListener("keydown", set);
      window.removeEventListener("keyup", set);
    };
  }, []);
  const selected = items.find((it) => it.id === selectedId) ?? null;
  const selectedVisible = selected ? levelVisible[selected.level] ?? true : false;

  const commitSelected = () => {
    const g = selectedRef.current;
    if (!g || !selected) return;
    if (gizmoMode === "rotate") {
      updateItem(selected.id, {
        rotationX: g.rotation.x,
        rotationY: g.rotation.y,
        rotationZ: g.rotation.z,
      });
      return;
    }
    if (gizmoMode === "scale") {
      const clamp = (v: number) => Math.max(0.05, Math.min(8, v));
      const newW = clamp(selected.width * g.scale.x);
      const newH = clamp(selected.height * g.scale.y);
      const newD = clamp(selected.depth * g.scale.z);
      g.scale.set(1, 1, 1);
      if (selected.shape === "cylinder") {
        // Diameter stays centered; height grows from the base (handled by yOffset).
        updateItem(selected.id, { width: newW, height: newH, depth: newD });
        return;
      }
      // Box/L: the parameter origin is the min (left/back) face, so growth goes
      // toward +local X/Z. Height grows from the base (via the floor offset).
      const dW = newW - selected.width;
      const dD = newD - selected.depth;
      const r = selected.rotationY;
      const dx = (dW / 2) * Math.cos(r) + (dD / 2) * Math.sin(r);
      const dz = -(dW / 2) * Math.sin(r) + (dD / 2) * Math.cos(r);
      updateItem(selected.id, {
        width: newW,
        height: newH,
        depth: newD,
        x: selected.x + dx,
        z: selected.z + dz,
      });
      return;
    }
    let x = g.position.x;
    let z = g.position.z;
    if (snapEnabled && !ctrlRef.current) {
      // Snap the prism's nearest face to a wall plane when close enough.
      const r = selected.rotationY;
      const hx = Math.abs((selected.width / 2) * Math.cos(r)) + Math.abs((selected.depth / 2) * Math.sin(r));
      const hz = Math.abs((selected.width / 2) * Math.sin(r)) + Math.abs((selected.depth / 2) * Math.cos(r));
      x = snapAxis(x, hx, snapXPlanes, 0.2);
      z = snapAxis(z, hz, snapZPlanes, 0.2);
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
  }, [selectedId, snapEnabled, snapXPlanes, snapZPlanes, gizmoMode]);

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
            rotation={[item.rotationX ?? 0, item.rotationY, item.rotationZ ?? 0]}
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
            rotation={[selected.rotationX ?? 0, selected.rotationY, selected.rotationZ ?? 0]}
          >
            <PieceMeshes item={selected} selected />
          </group>
          <TransformControls
            ref={tcRef}
            object={selectedRef as React.RefObject<THREE.Object3D>}
            mode={gizmoMode}
          />
        </group>
      )}
    </group>
  );
}
