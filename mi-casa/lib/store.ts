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
  const seeds: Array<[string, number, number, number, number]> = [
    // [type, x, z, rotationY, level]
    ["encimera", 1.0, -1.0, 0, 0],
    ["mesa-trabajo", 1.0, -2.1, 0, 0],
    ["despensa-aerea", 3.0, -1.0, 0, 0],
    ["lavadora", 3.1, -2.1, 0, 0],
    // Closets near bedrooms on the upper level.
    ["closet", 1.0, -5.6, Math.PI / 2, 1],
    ["closet", 3.2, -5.6, Math.PI / 2, 1],
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

  setLevels: (levels: LevelInfo[]) => void;
  setDrop: (x: number, z: number) => void;
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
      dropX: 0,
      dropZ: 0,

      setLevels: (levels) =>
        set({
          levels,
          levelVisible: levels.map(() => true),
        }),

      setDrop: (x, z) => set({ dropX: x, dropZ: z }),

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
      // Persist only the user's layout, not transient view/levels state.
      partialize: (s) => ({
        items: s.items,
        showGrid: s.showGrid,
        seeded: s.seeded,
      }),
    }
  )
);
