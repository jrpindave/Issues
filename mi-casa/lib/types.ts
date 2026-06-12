// Core domain types for the furniture planner.
// All measurements are in METERS, matching the IFC model.

export type Vec3 = [number, number, number];

/** An optional second box stacked above the base (e.g. overhead pantry cabinet). */
export interface UpperVolume {
  /** Height of the upper box, meters. */
  height: number;
  /** Y of the TOP of the upper box (ceiling line), meters, relative to the level floor. */
  topY: number;
  /** Footprint of the upper box (defaults to the base footprint if omitted). */
  width?: number;
  depth?: number;
}

/** A catalog entry: the parametric template a user can drop into the scene. */
export interface FurnitureTemplate {
  type: string;
  label: string;
  category: string;
  /** Default dimensions in meters: width (X), depth (Z), height (Y). */
  width: number;
  depth: number;
  height: number;
  color: string;
  /** Optional overhead volume (pantry, upper cabinets). */
  upper?: UpperVolume;
  /** Built-in fixtures that ship with the house (kitchen, laundry, closets…). */
  fixture?: boolean;
}

/** A placed instance living in the scene. */
export interface FurnitureItem {
  id: string;
  type: string;
  label: string;
  category: string;
  color: string;
  width: number;
  depth: number;
  height: number;
  /** Plan position in world meters (X, Z). Y is derived from the level floor. */
  x: number;
  z: number;
  /** Rotation around the vertical axis, radians. */
  rotationY: number;
  /** 0 = ground level, 1 = upper level. */
  level: number;
  upper?: UpperVolume;
  fixture?: boolean;
}

export interface LevelInfo {
  index: number;
  name: string;
  /** World-space Y of the floor for this level, meters. */
  elevation: number;
}
