import ctaData from "@/data/cta.json";

/** Una línea de detalle de cuenta (familia) por obra y centro de costo,
 *  con la taxonomía del maestro de recursos (clase/subclase) ya matcheada. */
export interface CtaRow {
  obra: string;
  cc_codigo: string;
  cc_nombre: string;
  familia: string;
  costo_neto: number;
  proy_ultima: number;
  subclase_cod: string;
  subclase_desc: string;
  clase_desc: string;
}

const ROWS = ctaData as CtaRow[];

export function ctaRows(): CtaRow[] {
  return ROWS;
}

/** Familias (subclase canónica) presentes en una obra, ordenadas por |desvío|. */
export function familiasDeObra(
  obra: string,
): { key: string; clase: string; costo_neto: number; proy_ultima: number; desvio: number }[] {
  const m = new Map<
    string,
    { key: string; clase: string; costo_neto: number; proy_ultima: number; desvio: number }
  >();
  for (const r of ROWS) {
    if (r.obra !== obra) continue;
    const acc =
      m.get(r.subclase_desc) ??
      m
        .set(r.subclase_desc, {
          key: r.subclase_desc,
          clase: r.clase_desc,
          costo_neto: 0,
          proy_ultima: 0,
          desvio: 0,
        })
        .get(r.subclase_desc)!;
    acc.costo_neto += r.costo_neto;
    acc.proy_ultima += r.proy_ultima;
    acc.desvio += r.proy_ultima - r.costo_neto;
  }
  return [...m.values()].sort((a, b) => Math.abs(b.desvio) - Math.abs(a.desvio));
}

/** Puntos para la dispersión: un punto por centro de costo de la obra donde
 *  aparece la familia elegida (x = neto, y = proyección). */
export function puntosObraFamilia(
  obra: string,
  familiaKey: string,
): {
  cc_codigo: string;
  cc_nombre: string;
  costo_neto: number;
  proy_ultima: number;
  desvio: number;
}[] {
  const m = new Map<
    string,
    { cc_codigo: string; cc_nombre: string; costo_neto: number; proy_ultima: number; desvio: number }
  >();
  for (const r of ROWS) {
    if (r.obra !== obra || r.subclase_desc !== familiaKey) continue;
    const acc =
      m.get(r.cc_codigo) ??
      m
        .set(r.cc_codigo, {
          cc_codigo: r.cc_codigo,
          cc_nombre: r.cc_nombre,
          costo_neto: 0,
          proy_ultima: 0,
          desvio: 0,
        })
        .get(r.cc_codigo)!;
    acc.costo_neto += r.costo_neto;
    acc.proy_ultima += r.proy_ultima;
    acc.desvio += r.proy_ultima - r.costo_neto;
  }
  return [...m.values()].sort((a, b) => b.costo_neto - a.costo_neto);
}

/** Incidencia por clase sobre un conjunto de obras: desvío y participación en
 *  el desvío absoluto total. Para "qué familia/clase incide más en el desvío". */
export function incidenciaPorClase(
  obras: string[],
): { clase: string; costo_neto: number; proy_ultima: number; desvio: number; incidencia: number }[] {
  const set = new Set(obras);
  const m = new Map<
    string,
    { clase: string; costo_neto: number; proy_ultima: number; desvio: number; incidencia: number }
  >();
  for (const r of ROWS) {
    if (!set.has(r.obra)) continue;
    const acc =
      m.get(r.clase_desc) ??
      m
        .set(r.clase_desc, {
          clase: r.clase_desc,
          costo_neto: 0,
          proy_ultima: 0,
          desvio: 0,
          incidencia: 0,
        })
        .get(r.clase_desc)!;
    acc.costo_neto += r.costo_neto;
    acc.proy_ultima += r.proy_ultima;
    acc.desvio += r.proy_ultima - r.costo_neto;
  }
  const out = [...m.values()];
  const sumAbs = out.reduce((a, c) => a + Math.abs(c.desvio), 0);
  for (const c of out) c.incidencia = sumAbs ? Math.abs(c.desvio) / sumAbs : 0;
  return out.sort((a, b) => Math.abs(b.desvio) - Math.abs(a.desvio));
}
