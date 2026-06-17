export type Programa = "DS19" | "DS49" | null;

export interface ObraResumen {
  obra: string;
  nombre: string | null;
  programa: Programa;
  presupuesto: number;
  comprado: number;
  recepcionado: number;
  real_contable: number;
  real_obra: number;
  sobrecosto: number;
}

export interface CcObra {
  obra: string;
  obra_nombre: string | null;
  programa: Programa;
  cc_codigo: string;
  cc_nombre: string | null;
  presupuesto: number;
  comprado: number;
  recepcionado: number;
  real_contable: number;
  real_obra: number;
  sobrecosto: number;
}

export interface ItemizadoLinea {
  id: number;
  obra: string;
  cc_codigo: string | null;
  cc: string | null;
  item: string | null;
  nivel: string | null;
  costo_con_iva: number | null;
  comprado: number | null;
  recepcionado: number | null;
  real_contable: number | null;
  real_obra: number | null;
}

export interface ProyeccionMes {
  obra: string;
  cc_codigo: string | null;
  periodo: string;
  monto: number;
}

/** Catálogo de centros de costo (derivado de las vistas). */
export interface CentroCosto {
  cc_codigo: string;
  cc_nombre: string | null;
}
