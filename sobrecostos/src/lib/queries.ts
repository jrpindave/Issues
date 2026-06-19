import { getSupabaseServer } from "@/lib/supabase/server";
import type {
  CcObra,
  CentroCosto,
  DesvioProyCc,
  DesvioProyObra,
  GastoFamilia,
  ItemizadoLinea,
  NetoProyCc,
  NetoProyObra,
  ObraResumen,
  ProyeccionMes,
} from "@/lib/types";

const T = {
  resumen: "SobrecostosDboard_v_obra_resumen",
  ccObra: "SobrecostosDboard_v_cc_obra",
  itemizado: "SobrecostosDboard_itemizado",
  proyeccion: "SobrecostosDboard_v_proyeccion_mensual",
  desvioProyObra: "SobrecostosDboard_v_desvio_proy_obra",
  desvioProyCc: "SobrecostosDboard_v_desvio_proy_cc",
  gastoFamilia: "SobrecostosDboard_v_gasto_familia",
  netoProyObra: "SobrecostosDboard_v_neto_proy_obra",
  netoProyCc: "SobrecostosDboard_v_neto_proy_cc",
} as const;

/** Costo NETO vs última proyección registrada, por obra (parseo limpio ITEMIZADO). */
export async function getNetoProyObra(): Promise<NetoProyObra[]> {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from(T.netoProyObra)
    .select("*")
    .order("programa", { ascending: true })
    .order("obra", { ascending: true });
  if (error) throw new Error(`getNetoProyObra: ${error.message}`);
  return (data ?? []) as NetoProyObra[];
}

/** Costo NETO vs última proyección por centro de costo. Opcionalmente de una obra. */
export async function getNetoProyCc(obra?: string): Promise<NetoProyCc[]> {
  const supabase = await getSupabaseServer();
  let q = supabase.from(T.netoProyCc).select("*");
  if (obra) q = q.eq("obra", obra);
  const { data, error } = await q.order("cc_codigo", { ascending: true });
  if (error) throw new Error(`getNetoProyCc: ${error.message}`);
  return (data ?? []) as NetoProyCc[];
}

/** Resumen por obra (las 9 obras, con su programa DS19/DS49). */
export async function getObraResumen(): Promise<ObraResumen[]> {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from(T.resumen)
    .select("*")
    .order("programa", { ascending: true })
    .order("obra", { ascending: true });
  if (error) throw new Error(`getObraResumen: ${error.message}`);
  return (data ?? []) as ObraResumen[];
}

/** Filas centro-de-costo × obra (para el comparador con filtro de CC). */
export async function getCcObra(): Promise<CcObra[]> {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from(T.ccObra)
    .select("*")
    .order("cc_codigo", { ascending: true });
  if (error) throw new Error(`getCcObra: ${error.message}`);
  return (data ?? []) as CcObra[];
}

/** Catálogo de centros de costo (código + nombre representativo). */
export async function getCentrosCosto(): Promise<CentroCosto[]> {
  const rows = await getCcObra();
  const map = new Map<string, CentroCosto>();
  for (const r of rows) {
    if (!map.has(r.cc_codigo)) {
      map.set(r.cc_codigo, { cc_codigo: r.cc_codigo, cc_nombre: r.cc_nombre });
    }
  }
  return [...map.values()].sort((a, b) =>
    a.cc_codigo.localeCompare(b.cc_codigo, "es"),
  );
}

/** Líneas itemizado de una obra (detalle CTA + subtotales CC). */
export async function getItemizadoObra(obra: string): Promise<ItemizadoLinea[]> {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from(T.itemizado)
    .select(
      "id,obra,cc_codigo,cc,item,nivel,costo_con_iva,comprado,recepcionado,real_contable,real_obra",
    )
    .eq("obra", obra)
    .order("id", { ascending: true });
  if (error) throw new Error(`getItemizadoObra: ${error.message}`);
  return (data ?? []) as ItemizadoLinea[];
}

/** Proyección mensual de una obra (opcionalmente filtrada por centro de costo). */
export async function getProyeccionObra(
  obra: string,
  ccCodigo?: string,
): Promise<{ periodo: string; monto: number }[]> {
  const supabase = await getSupabaseServer();
  let q = supabase
    .from(T.proyeccion)
    .select("obra,cc_codigo,periodo,monto")
    .eq("obra", obra);
  if (ccCodigo) q = q.eq("cc_codigo", ccCodigo);
  const { data, error } = await q;
  if (error) throw new Error(`getProyeccionObra: ${error.message}`);

  // Agregar por periodo (la vista trae detalle por cc_codigo).
  const byMonth = new Map<string, number>();
  for (const r of (data ?? []) as ProyeccionMes[]) {
    byMonth.set(r.periodo, (byMonth.get(r.periodo) ?? 0) + (r.monto ?? 0));
  }
  return [...byMonth.entries()]
    .map(([periodo, monto]) => ({ periodo, monto }))
    .sort((a, b) => a.periodo.localeCompare(b.periodo));
}

/** Desvío COSTO NETO vs última proyección registrada, por obra. */
export async function getDesvioProyObra(): Promise<DesvioProyObra[]> {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from(T.desvioProyObra)
    .select("*")
    .order("programa", { ascending: true })
    .order("obra", { ascending: true });
  if (error) throw new Error(`getDesvioProyObra: ${error.message}`);
  return (data ?? []) as DesvioProyObra[];
}

/** Desvío COSTO NETO vs última proyección por centro de costo de una obra. */
export async function getDesvioProyCc(obra: string): Promise<DesvioProyCc[]> {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from(T.desvioProyCc)
    .select("*")
    .eq("obra", obra)
    .order("cc_codigo", { ascending: true });
  if (error) throw new Error(`getDesvioProyCc: ${error.message}`);
  return (data ?? []) as DesvioProyCc[];
}

/** Gasto de compras por familia de recurso, para una obra. */
export async function getGastoFamilia(obra: string): Promise<GastoFamilia[]> {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from(T.gastoFamilia)
    .select("*")
    .eq("obra", obra)
    .order("gasto", { ascending: false });
  if (error) throw new Error(`getGastoFamilia: ${error.message}`);
  return (data ?? []) as GastoFamilia[];
}
