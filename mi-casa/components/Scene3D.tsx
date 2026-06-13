"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Grid, ContactShadows } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import HouseModel, { type ModelInfo } from "./HouseModel";
import FurnitureLayer from "./FurnitureLayer";
import CameraController from "./CameraController";
import { usePlanner } from "@/lib/store";

/**
 * Configures the default OrbitControls once it exists:
 * wheel = zoom, drag = orbit (left OR right), middle-drag = pan (inverted),
 * left-click = select. Left-drag orbit is included because Opera's mouse
 * gestures hijack the right button, breaking right-drag orbit there.
 */
function ControlsSetup() {
  const gl = useThree((s) => s.gl);
  const controls = useThree((s) => s.controls) as unknown as {
    mouseButtons: { LEFT?: number; MIDDLE?: number; RIGHT?: number };
    touches: { ONE?: number; TWO?: number };
    screenSpacePanning: boolean;
    panSpeed: number;
  } | null;
  useEffect(() => {
    if (controls) {
      // Orbit on LEFT-drag only. The right button is intentionally inert because
      // Opera hijacks it with mouse gestures, which left right-drag orbit "stuck".
      // Middle button is handled by the custom PanController.
      controls.mouseButtons = {
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: undefined,
        RIGHT: undefined,
      };
      // One finger does nothing by default (so a tap selects and a drag doesn't
      // orbit); TouchController arms one-finger orbit only on a double-tap-hold.
      controls.touches = { ONE: undefined, TWO: THREE.TOUCH.DOLLY_PAN };
      controls.screenSpacePanning = true;
    }
    // Neutralise the right button on the canvas: block the context menu and the
    // right pointerdown so Opera's gestures don't fire over the viewport.
    const el = gl.domElement;
    const onContext = (e: Event) => e.preventDefault();
    const onRightDown = (e: PointerEvent | MouseEvent) => {
      if (e.button === 2) e.preventDefault();
    };
    el.addEventListener("contextmenu", onContext, { capture: true });
    el.addEventListener("pointerdown", onRightDown, { capture: true });
    el.addEventListener("mousedown", onRightDown, { capture: true });
    return () => {
      el.removeEventListener("contextmenu", onContext, { capture: true } as EventListenerOptions);
      el.removeEventListener("pointerdown", onRightDown, { capture: true } as EventListenerOptions);
      el.removeEventListener("mousedown", onRightDown, { capture: true } as EventListenerOptions);
    };
  }, [controls, gl]);
  return null;
}

/**
 * Custom middle-button pan with per-axis control:
 *   drag right → scene moves right (horizontal natural)
 *   drag up    → the frame lowers ("encuadre baja")
 * (OrbitControls only offers a single panSpeed, so we can't mix axes there.)
 */
function PanController() {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const controls = useThree((s) => s.controls) as unknown as { target: THREE.Vector3 } | null;
  useEffect(() => {
    const el = gl.domElement;
    let panning = false;
    let lastX = 0;
    let lastY = 0;
    const right = new THREE.Vector3();
    const up = new THREE.Vector3();
    const offset = new THREE.Vector3();

    const onDown = (e: PointerEvent) => {
      if (e.button !== 1) return; // middle button only
      panning = true;
      lastX = e.clientX;
      lastY = e.clientY;
      el.setPointerCapture?.(e.pointerId);
      e.preventDefault();
    };
    const onMove = (e: PointerEvent) => {
      if (!panning) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      const target = controls?.target ?? new THREE.Vector3();
      const dist = camera.position.distanceTo(target);
      const fov = ((camera as THREE.PerspectiveCamera).fov ?? 45) * (Math.PI / 180);
      const worldPerPixel = (2 * dist * Math.tan(fov / 2)) / el.clientHeight;
      const m = camera.matrix.elements;
      right.set(m[0], m[1], m[2]);
      up.set(m[4], m[5], m[6]);
      offset.set(0, 0, 0);
      offset.addScaledVector(right, -dx * worldPerPixel); // horizontal: right → scene right
      offset.addScaledVector(up, dy * worldPerPixel); // vertical: drag up → encuadre baja
      camera.position.add(offset);
      if (controls) controls.target.add(offset);
    };
    const onUp = (e: PointerEvent) => {
      if (!panning) return;
      panning = false;
      el.releasePointerCapture?.(e.pointerId);
    };

    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [camera, gl, controls]);
  return null;
}

/**
 * Mobile gestures: 1 tap = select, double-tap then hold + drag = orbit,
 * two fingers = pan + pinch-zoom. One-finger drag (without a preceding tap)
 * does nothing, so it never orbits by accident.
 */
function TouchController() {
  const gl = useThree((s) => s.gl);
  const controls = useThree((s) => s.controls) as unknown as {
    touches: { ONE?: number; TWO?: number };
  } | null;
  useEffect(() => {
    if (!controls) return;
    const el = gl.domElement;
    const active = new Set<number>();
    let lastUp = 0;
    let armed = false;
    const reset = () => (controls.touches = { ONE: undefined, TWO: THREE.TOUCH.DOLLY_PAN });
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "touch") return;
      const first = active.size === 0;
      active.add(e.pointerId);
      if (!first) return; // a second finger → two-finger gesture, leave ONE off
      if (performance.now() - lastUp < 320) {
        armed = true;
        controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
        e.preventDefault(); // stop the browser double-tap selection/zoom
      } else {
        reset();
      }
    };
    const onSelectStart = (e: Event) => e.preventDefault();
    const onUp = (e: PointerEvent) => {
      if (e.pointerType !== "touch") return;
      active.delete(e.pointerId);
      if (active.size === 0) {
        lastUp = performance.now();
        if (armed) {
          armed = false;
          reset();
        }
      }
    };
    const opts = { capture: true } as AddEventListenerOptions;
    el.addEventListener("pointerdown", onDown, opts);
    el.addEventListener("pointerup", onUp, opts);
    el.addEventListener("pointercancel", onUp, opts);
    el.addEventListener("selectstart", onSelectStart);
    return () => {
      el.removeEventListener("pointerdown", onDown, opts);
      el.removeEventListener("pointerup", onUp, opts);
      el.removeEventListener("pointercancel", onUp, opts);
      el.removeEventListener("selectstart", onSelectStart);
    };
  }, [controls, gl]);
  return null;
}

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
      onPointerMissed={(e) => {
        if ((e as MouseEvent).button === 0) select(null);
      }}
      // Prevent the browser/Opera right-click menu so right-drag orbit doesn't
      // get stuck and gestures don't interfere.
      onContextMenu={(e) => e.preventDefault()}
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
      <ControlsSetup />
      <PanController />
      <TouchController />

      <CameraController info={info} controls={controls} />
    </Canvas>
  );
}
