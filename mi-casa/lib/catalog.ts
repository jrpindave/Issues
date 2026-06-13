import type { FurnitureTemplate } from "./types";

// Parametric volume blocks. Dimensions in meters: width (X) × depth (Z) × height (Y).
// Colors use a calm, muted palette so the architecture stays readable.

export const CATALOG: FurnitureTemplate[] = [
  // ── Dormitorio ──────────────────────────────────────────────
  { type: "cama-matrimonial", label: "Cama matrimonial", category: "Dormitorio", width: 1.6, depth: 2.0, height: 0.5, color: "#7c9cbf" },
  { type: "cama-individual", label: "Cama individual", category: "Dormitorio", width: 0.9, depth: 1.9, height: 0.5, color: "#88a8c9" },
  { type: "velador", label: "Velador / mesa de noche", category: "Dormitorio", width: 0.5, depth: 0.4, height: 0.5, color: "#b08968" },
  { type: "comoda", label: "Cómoda", category: "Dormitorio", width: 1.0, depth: 0.5, height: 0.8, color: "#a07855" },

  // ── Living ─────────────────────────────────────────────────
  { type: "sofa-3", label: "Sofá 3 cuerpos", category: "Living", width: 2.2, depth: 0.9, height: 0.8, color: "#6b8f71" },
  { type: "sofa-2", label: "Sofá 2 cuerpos", category: "Living", width: 1.6, depth: 0.9, height: 0.8, color: "#79a081" },
  { type: "sillon", label: "Sillón", category: "Living", width: 0.9, depth: 0.9, height: 0.8, color: "#8bb094" },
  { type: "mesa-centro", label: "Mesa de centro", category: "Living", width: 1.1, depth: 0.6, height: 0.4, color: "#9c6f4e" },
  { type: "mueble-tv", label: "Mueble TV", category: "Living", width: 1.8, depth: 0.4, height: 0.5, color: "#5c5c66" },

  // ── Comedor ────────────────────────────────────────────────
  { type: "mesa-comedor", label: "Mesa comedor", category: "Comedor", width: 1.6, depth: 0.9, height: 0.75, color: "#a8794f" },
  { type: "silla", label: "Silla", category: "Comedor", width: 0.45, depth: 0.5, height: 0.9, color: "#b98a5c" },

  // ── Baño ───────────────────────────────────────────────────
  { type: "inodoro", label: "Inodoro", category: "Baño", width: 0.4, depth: 0.6, height: 0.8, color: "#d8dde2" },
  { type: "lavamanos", label: "Lavamanos", category: "Baño", width: 0.6, depth: 0.45, height: 0.85, color: "#cfd6dc" },
  { type: "tina", label: "Tina", category: "Baño", width: 1.7, depth: 0.75, height: 0.6, color: "#c4ccd3" },
  { type: "ducha", label: "Ducha", category: "Baño", width: 0.9, depth: 0.9, height: 2.0, color: "#aebfce" },

  // ── Genéricos (prismas libres) ─────────────────────────────
  { type: "prisma", label: "Prisma libre", category: "Genéricos", width: 1.0, depth: 1.0, height: 1.0, color: "#9aa0a6" },
  { type: "mesa", label: "Mesa", category: "Genéricos", width: 1.2, depth: 0.6, height: 0.75, color: "#a8794f" },
  { type: "estanteria", label: "Estantería", category: "Genéricos", width: 0.8, depth: 0.3, height: 1.8, color: "#8a6d4f" },

  // ── Equipamiento fijo (ya viene en la casa) ────────────────
  { type: "encimera", label: "Cocina / encimera", category: "Equipamiento fijo", width: 1.8, depth: 0.6, height: 0.9, color: "#c2c7cc", fixture: true },
  { type: "lavadora", label: "Lavadora", category: "Equipamiento fijo", width: 0.6, depth: 0.6, height: 0.85, color: "#e2e6ea", fixture: true },
  { type: "lavaplatos", label: "Lavaplatos", category: "Equipamiento fijo", width: 1.2, depth: 0.6, height: 0.9, color: "#cdd3d8", fixture: true },
  { type: "mesa-trabajo", label: "Mesa de trabajo", category: "Equipamiento fijo", width: 1.2, depth: 0.6, height: 0.9, color: "#b9a88f", fixture: true },
  {
    type: "despensa-aerea",
    label: "Mueble aéreo despensa",
    category: "Equipamiento fijo",
    width: 1.2,
    depth: 0.6,
    height: 0.9,
    color: "#b9a88f",
    fixture: true,
    // Base de trabajo + volumen colgante de 1.80 a 2.30 m (0.50 m de alto pegado al cielo).
    upper: { topY: 2.3, height: 0.5, depth: 0.4 },
  },
  { type: "closet", label: "Clóset", category: "Equipamiento fijo", width: 1.6, depth: 0.6, height: 2.3, color: "#a99a86", fixture: true },
];

export const CATEGORIES = Array.from(new Set(CATALOG.map((t) => t.category)));

export function templateByType(type: string): FurnitureTemplate | undefined {
  return CATALOG.find((t) => t.type === type);
}
