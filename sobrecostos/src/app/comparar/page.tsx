import { Fragment } from "react";
import { ObraFilterBar } from "@/components/filters/ObraFilterBar";
import { ObrasBarChart, type ObraBarDatum } from "@/components/charts/ObrasBarChart";
import { ProgramaBadge } from "@/components/ProgramaBadge";
import { DesvioPill } from "@/components/DesvioPill";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { getNetoProyCc, getNetoProyObra } from "@/lib/queries";
import { incidenciaPorClase, topFamiliasDeCC } from "@/lib/cta";
import { formatCLP, formatCLPCompact } from "@/lib/format";
import type { CentroCosto, Programa } from "@/lib/types";

interface Row {
  obra: string;
  programa: Programa;
  subsegmento: string | null;
  proy_label: string | null;
  costo_neto: number;
  proy_ultima: number;
  desvio: number;
}

export default async function CompararPage({
  searchParams,
}: {
  searchParams: Promise<{ obras?: string; cc?: string }>;
}) {
  const sp = await searchParams;
  const cc = sp.cc ?? "";

  const [resumen, ccAll] = await Promise.all([
    getNetoProyObra(),
    getNetoProyCc(),
  ]);

  const obraOpts = resumen.map((r) => ({
    obra: r.obra,
    nombre: r.nombre,
    programa: r.programa,
  }));

  // Subsegmentos (tipologías) disponibles, con sus obras — dimensión de comparación.
  const subsegmentoOpts = [
    ...resumen
      .reduce((map, r) => {
        const label = r.subsegmento ?? "(sin tipología)";
        (map.get(label) ?? map.set(label, []).get(label)!).push(r.obra);
        return map;
      }, new Map<string, string[]>())
      .entries(),
  ]
    .map(([label, obras]) => ({ label, obras }))
    .sort((a, b) => a.label.localeCompare(b.label, "es"));

  // Catálogo de centros de costo (para comparar un mismo CC entre obras).
  const centros: CentroCosto[] = [
    ...ccAll
      .reduce((m, r) => {
        if (!m.has(r.cc_codigo)) m.set(r.cc_codigo, r.cc_nombre);
        return m;
      }, new Map<string, string | null>())
      .entries(),
  ]
    .map(([cc_codigo, cc_nombre]) => ({ cc_codigo, cc_nombre }))
    .sort((a, b) => a.cc_codigo.localeCompare(b.cc_codigo, "es"));

  const selected = sp.obras
    ? sp.obras.split(",").filter(Boolean)
    : resumen.map((r) => r.obra);

  // Filas según haya o no filtro de centro de costo.
  let rows: Row[];
  if (cc) {
    const byObra = new Map(
      ccAll.filter((r) => r.cc_codigo === cc).map((r) => [r.obra, r]),
    );
    rows = selected.map((obra) => {
      const meta = resumen.find((x) => x.obra === obra);
      const r = byObra.get(obra);
      return {
        obra,
        programa: meta?.programa ?? null,
        subsegmento: meta?.subsegmento ?? null,
        proy_label: meta?.proy_label ?? null,
        costo_neto: r?.costo_neto ?? 0,
        proy_ultima: r?.proy_ultima ?? 0,
        desvio: r?.desvio ?? 0,
      };
    });
  } else {
    rows = resumen
      .filter((r) => selected.includes(r.obra))
      .map((r) => ({
        obra: r.obra,
        programa: r.programa,
        subsegmento: r.subsegmento,
        proy_label: r.proy_label,
        costo_neto: r.costo_neto,
        proy_ultima: r.proy_ultima,
        desvio: r.desvio,
      }));
  }

  const chartData: ObraBarDatum[] = rows.map((r) => ({
    obra: r.obra,
    costo_neto: r.costo_neto,
    proy_ultima: r.proy_ultima,
  }));

  const ccLabel = cc
    ? centros.find((c) => c.cc_codigo === cc)?.cc_nombre ?? cc
    : null;

  // Ranking de centros de costo que más se desvían EN CADA OBRA, con incidencia
  // de desvío = |desvío_cc| / Σ|desvío_cc| de la obra. Top 5 por obra.
  const ccPorObra = selected
    .map((obra) => {
      const meta = resumen.find((r) => r.obra === obra);
      const filas = ccAll.filter((r) => r.obra === obra);
      const sumAbs = filas.reduce((a, r) => a + Math.abs(r.desvio), 0);
      const top = [...filas]
        .sort((a, b) => Math.abs(b.desvio) - Math.abs(a.desvio))
        .slice(0, 5)
        .map((r) => ({
          cc_codigo: r.cc_codigo,
          cc_nombre: r.cc_nombre,
          costo_neto: r.costo_neto,
          proy_ultima: r.proy_ultima,
          desvio: r.desvio,
          incidencia: sumAbs ? Math.abs(r.desvio) / sumAbs : 0,
          familias: topFamiliasDeCC(obra, r.cc_codigo, 5),
        }));
      return {
        obra,
        programa: meta?.programa ?? null,
        subsegmento: meta?.subsegmento ?? null,
        top,
      };
    })
    .filter((o) => o.top.length > 0);

  // Qué clase/familia de recurso incide más en el desvío (sobre las obras
  // seleccionadas), matcheada al maestro MaeRecurso.
  const clases = incidenciaPorClase(selected);

  // Agregación por subsegmento (sobre las obras seleccionadas).
  const segRows = [
    ...rows
      .reduce((map, r) => {
        const key = r.subsegmento ?? "(sin tipología)";
        const acc =
          map.get(key) ??
          map
            .set(key, {
              subsegmento: key,
              programa: r.programa,
              obras: 0,
              costo_neto: 0,
              proy_ultima: 0,
              desvio: 0,
            })
            .get(key)!;
        acc.obras += 1;
        acc.costo_neto += r.costo_neto;
        acc.proy_ultima += r.proy_ultima;
        acc.desvio += r.desvio;
        return map;
      }, new Map<string, {
        subsegmento: string;
        programa: Programa;
        obras: number;
        costo_neto: number;
        proy_ultima: number;
        desvio: number;
      }>())
      .values(),
  ].sort((a, b) => a.subsegmento.localeCompare(b.subsegmento, "es"));

  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">02 · Comparador</p>
        <h1 className="mt-1 text-2xl text-gris-900">Comparar obras</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-gris-500">
          {ccLabel
            ? `Centro de costo: ${cc} · ${ccLabel} — costo neto vs. última proyección.`
            : "Costo neto vs. última proyección. Filtra por programa, subsegmento o centro de costo."}
        </p>
      </header>

      <ObraFilterBar
        obras={obraOpts}
        subsegmentos={subsegmentoOpts}
        centros={centros}
        selected={selected}
        cc={cc}
      />

      <Card>
        <CardHeader>
          <CardTitle>Costo neto vs. última proyección</CardTitle>
        </CardHeader>
        <CardContent>
          <ObrasBarChart data={chartData} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Comparación por subsegmento</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left font-mono text-[10.5px] uppercase tracking-[0.08em] text-gris-500">
                  <th className="px-5 py-2.5 font-medium">Subsegmento</th>
                  <th className="px-3 py-2.5 font-medium">Programa</th>
                  <th className="px-3 py-2.5 text-right font-medium">Obras</th>
                  <th className="px-3 py-2.5 text-right font-medium">
                    Costo neto
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium">
                    Proyección
                  </th>
                  <th className="px-5 py-2.5 text-right font-medium">Desvío</th>
                </tr>
              </thead>
              <tbody>
                {segRows.map((s) => {
                  const f = s.costo_neto ? s.desvio / s.costo_neto : null;
                  return (
                    <tr
                      key={s.subsegmento}
                      className="border-b border-line last:border-0 hover:bg-cafe-50"
                    >
                      <td className="px-5 py-2.5 font-medium text-gris-900">
                        {s.subsegmento}
                      </td>
                      <td className="px-3 py-2.5">
                        <ProgramaBadge programa={s.programa} />
                      </td>
                      <td className="px-3 py-2.5 text-right tabular text-gris-800">
                        {s.obras}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular text-gris-800">
                        {formatCLP(s.costo_neto)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular text-gris-800">
                        {formatCLP(s.proy_ultima)}
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        <DesvioPill monto={s.desvio} fraction={f} />
                      </td>
                    </tr>
                  );
                })}
                {segRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-8 text-center text-gris-500"
                    >
                      Selecciona obras para comparar por subsegmento.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card accent>
        <CardHeader className="flex-col items-start gap-0.5">
          <CardTitle>Centros de costo que más se desvían — por obra</CardTitle>
          <p className="text-xs text-gris-500">
            Top 5 centros de costo por magnitud de desvío en cada obra.
            Incidencia = participación de ese CC en el desvío total de la obra.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left font-mono text-[10.5px] uppercase tracking-[0.08em] text-gris-500">
                  <th className="px-5 py-2.5 font-medium">Obra / Centro de costo</th>
                  <th className="px-3 py-2.5 text-right font-medium">Costo neto</th>
                  <th className="px-3 py-2.5 text-right font-medium">Proyección</th>
                  <th className="px-3 py-2.5 text-right font-medium">Desvío</th>
                  <th className="px-5 py-2.5 text-right font-medium">Incidencia</th>
                </tr>
              </thead>
              <tbody>
                {ccPorObra.map((o) => (
                  <Fragment key={o.obra}>
                    <tr className="border-b border-line bg-cafe-50/60">
                      <td className="px-5 py-2 font-mono text-[12px] font-semibold text-gris-900">
                        {o.obra}
                        <span className="ml-2 align-middle">
                          <ProgramaBadge programa={o.programa} />
                        </span>
                        {o.subsegmento && (
                          <span className="ml-2 text-[11px] font-normal text-gris-500">
                            {o.subsegmento}
                          </span>
                        )}
                      </td>
                      <td colSpan={4} />
                    </tr>
                    {o.top.map((r) => {
                      const fr = r.costo_neto ? r.desvio / r.costo_neto : null;
                      return (
                        <Fragment key={`${o.obra}-${r.cc_codigo}`}>
                          <tr className="border-b border-line hover:bg-cafe-50">
                            <td className="px-5 py-2 pl-8">
                              <span className="font-mono text-xs text-gris-500">
                                {r.cc_codigo}
                              </span>{" "}
                              <span className="text-gris-800">{r.cc_nombre}</span>
                            </td>
                            <td className="px-3 py-2 text-right tabular text-gris-700">
                              {formatCLP(r.costo_neto)}
                            </td>
                            <td className="px-3 py-2 text-right tabular text-gris-700">
                              {formatCLP(r.proy_ultima)}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <DesvioPill monto={r.desvio} fraction={fr} />
                            </td>
                            <td className="px-5 py-2 text-right tabular text-gris-700">
                              {(r.incidencia * 100).toFixed(0)}%
                            </td>
                          </tr>
                          {r.familias.length ? (
                            <tr className="border-b border-line">
                              <td colSpan={5} className="px-5 pb-1 pl-12 pt-0">
                                <details name="ccfam" className="group">
                                  <summary className="cursor-pointer list-none font-mono text-[10.5px] uppercase tracking-wide text-azul-600 hover:underline">
                                    <span className="group-open:hidden">▸ </span>
                                    <span className="hidden group-open:inline">▾ </span>
                                    {r.cc_codigo} · top familias
                                  </summary>
                                  <ul className="mt-1 divide-y divide-line border border-line bg-white">
                                    {r.familias.map((f) => (
                                      <li
                                        key={f.key}
                                        className="flex items-center gap-3 px-3 py-1.5 text-[12.5px] text-gris-700"
                                      >
                                        <span
                                          aria-hidden
                                          className={`h-1.5 w-1.5 shrink-0 ${f.desvio > 0 ? "bg-danger-500" : "bg-success-500"}`}
                                        />
                                        <span className="flex-1 truncate">{f.key}</span>
                                        <span
                                          className={`tabular ${f.desvio > 0 ? "text-danger-700" : "text-success-700"}`}
                                        >
                                          {formatCLPCompact(f.desvio)}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                </details>
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      );
                    })}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-col items-start gap-0.5">
          <CardTitle>Familia de recurso que más incide en el desvío</CardTitle>
          <p className="text-xs text-gris-500">
            Gasto por clase de recurso (taxonomía del maestro) en las obras
            seleccionadas. Incidencia = participación en el desvío absoluto total.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left font-mono text-[10.5px] uppercase tracking-[0.08em] text-gris-500">
                  <th className="px-5 py-2.5 font-medium">Clase de recurso</th>
                  <th className="px-3 py-2.5 text-right font-medium">Costo neto</th>
                  <th className="px-3 py-2.5 text-right font-medium">Proyección</th>
                  <th className="px-3 py-2.5 text-right font-medium">Desvío</th>
                  <th className="px-5 py-2.5 text-right font-medium">Incidencia</th>
                </tr>
              </thead>
              <tbody>
                {clases.map((c) => {
                  const fr = c.costo_neto ? c.desvio / c.costo_neto : null;
                  return (
                    <tr
                      key={c.clase}
                      className="border-b border-line last:border-0 hover:bg-cafe-50"
                    >
                      <td className="px-5 py-2.5 text-gris-800">{c.clase}</td>
                      <td className="px-3 py-2.5 text-right tabular text-gris-700">
                        {formatCLP(c.costo_neto)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular text-gris-700">
                        {formatCLP(c.proy_ultima)}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <DesvioPill monto={c.desvio} fraction={fr} />
                      </td>
                      <td className="px-5 py-2.5 text-right tabular text-gris-700">
                        {(c.incidencia * 100).toFixed(0)}%
                      </td>
                    </tr>
                  );
                })}
                {clases.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-gris-500">
                      Selecciona obras para ver la incidencia por familia.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detalle por obra</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left font-mono text-[10.5px] uppercase tracking-[0.08em] text-gris-500">
                  <th className="px-5 py-2.5 font-medium">Obra</th>
                  <th className="px-3 py-2.5 font-medium">Programa</th>
                  <th className="px-3 py-2.5 font-medium">Subsegmento</th>
                  <th className="px-3 py-2.5 text-right font-medium">
                    Costo neto
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium">
                    Proyección
                  </th>
                  <th className="px-5 py-2.5 text-right font-medium">Desvío</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const f = r.costo_neto ? r.desvio / r.costo_neto : null;
                  return (
                    <tr
                      key={r.obra}
                      className="border-b border-line last:border-0 hover:bg-cafe-50"
                    >
                      <td className="px-5 py-2.5 font-mono font-medium text-gris-900">
                        {r.obra}
                      </td>
                      <td className="px-3 py-2.5">
                        <ProgramaBadge programa={r.programa} />
                      </td>
                      <td className="px-3 py-2.5 text-gris-700">
                        {r.subsegmento ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular text-gris-800">
                        {formatCLP(r.costo_neto)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular text-gris-800">
                        {formatCLP(r.proy_ultima)}
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        <DesvioPill monto={r.desvio} fraction={f} />
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-8 text-center text-gris-500"
                    >
                      Selecciona obras para comparar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
