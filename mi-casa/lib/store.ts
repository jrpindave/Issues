import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { FurnitureItem, FurnitureTemplate, LevelInfo } from "./types";
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
    level,
    upper: t.upper,
    fixture: t.fixture,
  };
}

/** Built-in fixtures the house ships with, pre-placed (movable, "a criterio"). */
function seedFixtures(): FurnitureItem[] {
  const byType = (type: string) => CATALOG.find((t) => t.type === type)!;
  // Kitchen + laundry clustered on level 0, near the origin (model is centered).
  // Coordinates live inside the footprint (X≈0..4.1, Z≈-7..0). Everything is
  // movable, so these are just sensible starting spots.
  // Coordinates come from the named IFCSPACE rooms in Casa.ifc (same world axes
  // the app renders in). Items sit against a wall inside their room.
  const seeds: Array<[string, number, number, number, number]> = [
    // [type, x, z, rotationY, level]
    // Cocina (Nivel 1) — encimera contra el muro X≈4.0, lavadora al frente.
    ["lavaplatos", 3.72, 0.9, Math.PI / 2, 0],
    ["mesa-trabajo", 3.72, -0.3, Math.PI / 2, 0],
    ["despensa-aerea", 3.72, -1.5, Math.PI / 2, 0],
    ["lavadora", 2.6, -1.6, Math.PI / 2, 0],
    // Clósets, uno por dormitorio.
    ["closet", 1.11, -1.88, 0, 0], // Dormitorio 3 (Nivel 1)
    ["closet", 0.35, 2.96, Math.PI / 2, 1], // Dormitorio 1 (Nivel 2)
    ["closet", 0.35, -0.54, Math.PI / 2, 1], // Dormitorio 2 (Nivel 2)
  ];
  return seeds.map(([type, x, z, rot, level]) => {
    const item = itemFromTemplate(byType(type), x, z, level);
    item.rotationY = rot;
    return item;
  });
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

  setLevels: (levels: LevelInfo[]) => void;
  setDrop: (x: number, z: number) => void;
  setModelStatus: (status: "loading" | "ready" | "error", error?: string | null) => void;
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

      setLevels: (levels) =>
        set({
          levels,
          levelVisible: levels.map(() => true),
        }),

      setDrop: (x, z) => set({ dropX: x, dropZ: z }),

      setModelStatus: (status, error = null) => set({ modelStatus: status, modelError: error }),

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
      // Bump when the built-in fixture layout changes so it re-seeds on load.
      version: 4,
      // Persist only the user's layout, not transient view/levels state.
      partialize: (s) => ({
        items: s.items,
        showGrid: s.showGrid,
        seeded: s.seeded,
      }),
      // On a version bump, refresh the built-in fixtures (new positions/items)
      // while keeping every movable piece the user placed.
      migrate: (persisted) => {
        const state = (persisted ?? {}) as { items?: FurnitureItem[]; showGrid?: boolean };
        const movable = (state.items ?? []).filter((it) => !it.fixture);
        return { ...state, items: [...movable, ...seedFixtures()], seeded: true };
      },
    }
  )
);
