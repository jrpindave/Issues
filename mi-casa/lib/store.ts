import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { FurnitureItem, FurnitureTemplate, LevelInfo, RoomInfo } from "./types";
import { CATALOG } from "./catalog";

function uid(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

function itemFromTemplate(t: FurnitureTemplate, x: number, z: number, level: number): FurnitureItem {
  return {
    id: uid(),
    type: t.type,
    label: t.label,
    category: t.category,
    color: t.color,
    width: t.width,
    depth: t.depth,
    height: t.height,
    x,
    z,
    rotationY: 0,
    yOffset: 0,
    level,
    upper: t.upper,
    shape: t.shape,
    arm: t.arm,
    fixture: t.fixture,
  };
}

/**
 * The fixed equipment (kitchen, closets, sanitary…) now ships modeled inside the
 * IFC, so the app no longer pre-seeds any furniture — the user adds movable
 * pieces from the library as needed.
 */
function seedFixtures(): FurnitureItem[] {
  return [];
}

interface PlannerState {
  items: FurnitureItem[];
  selectedId: string | null;
  levels: LevelInfo[];
  levelVisible: boolean[];
  showGrid: boolean;
  planView: boolean;
  seeded: boolean;
  /** Default plan position where freshly added furniture appears. */
  dropX: number;
  dropZ: number;
  /** Status of the IFC model load, surfaced to the UI for diagnostics. */
  modelStatus: "loading" | "ready" | "error";
  modelError: string | null;
  /** Wall snap planes from the IFC, and whether snapping is on. */
  snapX: number[];
  snapZ: number[];
  snapEnabled: boolean;
  /** Wall painting: mode on/off, active color, and per-wall overrides. */
  paintMode: boolean;
  paintColor: string;
  /** Painted wall faces, keyed "wallId|side" (side = x+/x-/z+/z-). */
  wallColors: Record<string, string>;
  /** Mobile: false = one finger pans, true = one finger orbits. */
  orbitMode: boolean;
  /** Gizmo behaviour for the selected piece. */
  gizmoMode: "translate" | "rotate" | "scale";
  /** Named rooms from the IFC, for per-room wall painting. */
  rooms: RoomInfo[];
  /** Where the loaded IFC came from. */
  ifcSource: "supabase" | "local" | null;

  setLevels: (levels: LevelInfo[]) => void;
  setDrop: (x: number, z: number) => void;
  setSnapPlanes: (x: number[], z: number[]) => void;
  setSnapEnabled: (v: boolean) => void;
  setPaintMode: (v: boolean) => void;
  setPaintColor: (c: string) => void;
  paintWallSide: (key: string) => void;
  resetWalls: () => void;
  toggleOrbitMode: () => void;
  setOrbitMode: (v: boolean) => void;
  setGizmoMode: (m: "translate" | "rotate" | "scale") => void;
  setRooms: (r: RoomInfo[]) => void;
  setIfcSource: (s: "supabase" | "local") => void;
  setModelStatus: (status: "loading" | "ready" | "error", error?: string | null) => void;
  importLayout: (items: FurnitureItem[]) => void;
  addTemplate: (t: FurnitureTemplate, level: number) => void;
  updateItem: (id: string, patch: Partial<FurnitureItem>) => void;
  removeItem: (id: string) => void;
  duplicateItem: (id: string) => void;
  select: (id: string | null) => void;
  toggleLevel: (index: number) => void;
  setShowGrid: (v: boolean) => void;
  setPlanView: (v: boolean) => void;
  clearMovable: () => void;
  restoreFixtures: () => void;
}

export const usePlanner = create<PlannerState>()(
  persist(
    (set, get) => ({
      items: seedFixtures(),
      selectedId: null,
      levels: [],
      levelVisible: [true, true],
      showGrid: true,
      planView: false,
      seeded: true,
      modelStatus: "loading",
      modelError: null,
      dropX: 0,
      dropZ: 0,
      snapX: [],
      snapZ: [],
      snapEnabled: true,
      paintMode: false,
      paintColor: "#cdb89a",
      wallColors: {},
      orbitMode: false,
      gizmoMode: "translate",
      rooms: [],
      ifcSource: null,

      setLevels: (levels) =>
        set({
          levels,
          levelVisible: levels.map(() => true),
        }),

      setDrop: (x, z) => set({ dropX: x, dropZ: z }),

      setSnapPlanes: (x, z) => set({ snapX: x, snapZ: z }),
      setSnapEnabled: (v) => set({ snapEnabled: v }),
      setPaintMode: (v) => set({ paintMode: v }),
      setPaintColor: (c) => set({ paintColor: c }),
      paintWallSide: (key) =>
        set((s) => ({ wallColors: { ...s.wallColors, [key]: s.paintColor } })),
      resetWalls: () => set({ wallColors: {} }),
      toggleOrbitMode: () => set((s) => ({ orbitMode: !s.orbitMode })),
      setOrbitMode: (v) => set({ orbitMode: v }),
      setGizmoMode: (m) => set({ gizmoMode: m }),
      setRooms: (r) => set({ rooms: r }),
      setIfcSource: (s) => set({ ifcSource: s }),

      setModelStatus: (status, error = null) => set({ modelStatus: status, modelError: error }),

      importLayout: (items) => set({ items, selectedId: null }),

      addTemplate: (t, level) => {
        // Drop at the footprint center with a small scatter so stacked adds don't overlap.
        const jitter = (get().items.length % 5) * 0.35;
        const item = itemFromTemplate(t, get().dropX + jitter, get().dropZ + jitter, level);
        set((s) => ({ items: [...s.items, item], selectedId: item.id }));
      },

      updateItem: (id, patch) =>
        set((s) => ({
          items: s.items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
        })),

      removeItem: (id) =>
        set((s) => ({
          items: s.items.filter((it) => it.id !== id),
          selectedId: s.selectedId === id ? null : s.selectedId,
        })),

      duplicateItem: (id) =>
        set((s) => {
          const src = s.items.find((it) => it.id === id);
          if (!src) return s;
          const copy: FurnitureItem = { ...src, id: uid(), x: src.x + 0.4, z: src.z + 0.4 };
          return { items: [...s.items, copy], selectedId: copy.id };
        }),

      select: (id) => set({ selectedId: id }),

      toggleLevel: (index) =>
        set((s) => ({
          levelVisible: s.levelVisible.map((v, i) => (i === index ? !v : v)),
        })),

      setShowGrid: (v) => set({ showGrid: v }),
      setPlanView: (v) => set({ planView: v }),

      clearMovable: () =>
        set((s) => ({
          items: s.items.filter((it) => it.fixture),
          selectedId: null,
        })),

      restoreFixtures: () =>
        set((s) => ({
          items: [...s.items.filter((it) => !it.fixture), ...seedFixtures()],
        })),
    }),
    {
      name: "mi-casa-planner",
      // Bump when the built-in layout changes so it re-seeds on load.
      version: 5,
      // Persist only the user's layout/preferences, not transient state.
      partialize: (s) => ({
        items: s.items,
        showGrid: s.showGrid,
        snapEnabled: s.snapEnabled,
        paintColor: s.paintColor,
        wallColors: s.wallColors,
      }),
      // Fixed equipment now lives in the IFC, so drop any previously seeded
      // fixtures while keeping every movable piece the user placed.
      migrate: (persisted) => {
        const state = (persisted ?? {}) as { items?: FurnitureItem[]; showGrid?: boolean };
        const movable = (state.items ?? []).filter((it) => !it.fixture);
        return { ...state, items: movable };
      },
    }
  )
);
