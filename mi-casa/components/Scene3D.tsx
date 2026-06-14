"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Grid, ContactShadows, GizmoHelper, GizmoViewcube } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import HouseModel, { type ModelInfo } from "./HouseModel";
import FurnitureLayer from "./FurnitureLayer";
import MeasureView from "./MeasureView";
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
      // Touch mapping is managed reactively by TouchController.
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
 * Mobile gestures: 1 tap = select, 1-finger drag = pan, two fingers = pan + zoom.
 * Double-tap toggles "orbit mode" (a sticky mode) → 1-finger drag orbits.
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
    const setOne = (v: number | undefined) =>
      (controls.touches = { ONE: v, TWO: THREE.TOUCH.DOLLY_PAN });
    setOne(THREE.TOUCH.PAN); // default: one finger pans

    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "touch") return;
      active.add(e.pointerId);
      // Second tap of a double-tap, held → orbit for this gesture only.
      // Set ROTATE before OrbitControls (bubble phase) reads it.
      if (active.size === 1 && performance.now() - lastUp < 300) {
        setOne(THREE.TOUCH.ROTATE);
        e.preventDefault(); // also kills iOS' long-press magnifier
      }
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerType !== "touch") return;
      active.delete(e.pointerId);
      if (active.size === 0) {
        lastUp = performance.now();
        setOne(THREE.TOUCH.PAN); // release → back to pan
      }
    };
    const onSelectStart = (e: Event) => e.preventDefault();
    const blockGesture = (e: Event) => e.preventDefault();
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };
    const cap = { capture: true } as AddEventListenerOptions;
    const np = { passive: false } as AddEventListenerOptions;
    el.addEventListener("pointerdown", onDown, cap);
    el.addEventListener("pointerup", onUp, cap);
    el.addEventListener("pointercancel", onUp, cap);
    el.addEventListener("selectstart", onSelectStart);
    el.addEventListener("touchmove", onTouchMove, np);
    // Block iOS pinch (page zoom / tab overview) document-wide, so a sloppy
    // pinch that strays off the canvas can't zoom the whole app.
    document.addEventListener("gesturestart", blockGesture, np);
    document.addEventListener("gesturechange", blockGesture, np);
    document.addEventListener("gestureend", blockGesture, np);
    return () => {
      el.removeEventListener("pointerdown", onDown, cap);
      el.removeEventListener("pointerup", onUp, cap);
      el.removeEventListener("pointercancel", onUp, cap);
      el.removeEventListener("selectstart", onSelectStart);
      el.removeEventListener("touchmove", onTouchMove, np);
      document.removeEventListener("gesturestart", blockGesture, np);
      document.removeEventListener("gesturechange", blockGesture, np);
      document.removeEventListener("gestureend", blockGesture, np);
    };
  }, [gl, controls]);
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
      <MeasureView />

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

      {/* Autodesk-style view cube: click faces/edges/corners to orient. */}
      <GizmoHelper alignment="top-right" margin={[72, 72]}>
        <GizmoViewcube
          color="#2a2f37"
          textColor="#e7ebef"
          strokeColor="#4b5563"
          hoverColor="#6ea8fe"
        />
      </GizmoHelper>

      <CameraController info={info} controls={controls} />
    </Canvas>
  );
}
