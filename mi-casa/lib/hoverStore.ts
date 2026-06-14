import { create } from "zustand";

/** Transient hover state for the measure tool (NOT persisted). */
interface HoverState {
  point: [number, number, number] | null;
  info: string | null;
  snapped: boolean;
  set: (point: [number, number, number] | null, info: string | null, snapped: boolean) => void;
}

export const useHover = create<HoverState>((set) => ({
  point: null,
  info: null,
  snapped: false,
  set: (point, info, snapped) => set({ point, info, snapped }),
}));
