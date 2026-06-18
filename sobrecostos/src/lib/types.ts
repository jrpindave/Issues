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

/** Desvío COSTO NETO vs última proyección registrada (por obra). */
export interface DesvioProyObra {
  obra: string;
  obra_nombre: string | null;
  programa: Programa;
  proy_periodo: string | null;
  costo_neto: number;
  proy_ultima: number;
  desvio: number;
  lineas: number;
  lineas_con_proy: number;
}

/** Desvío COSTO NETO vs última proyección por centro de costo (detalle de obra). */
export interface DesvioProyCc {
  obra: string;
  programa: Programa;
  cc_codigo: string;
  cc_nombre: string | null;
  costo_neto: number;
  proy_ultima: number;
  desvio: number;
}

/** Gasto de compras por familia de recurso (taxonomía del maestro). */
export interface GastoFamilia {
  obra: string;
  clase: string;
  subclase_cod: string;
  familia: string;
  lineas: number;
  gasto: number;
}
