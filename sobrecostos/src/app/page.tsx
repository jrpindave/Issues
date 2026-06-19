import Link from "next/link";
import { ProgramaBadge } from "@/components/ProgramaBadge";
import { DesvioPill } from "@/components/DesvioPill";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ObrasBarChart, type ObraBarDatum } from "@/components/charts/ObrasBarChart";
import { getNetoProyObra } from "@/lib/queries";
import { formatCLP } from "@/lib/format";
import type { NetoProyObra, Programa } from "@/lib/types";

function totals(rows: NetoProyObra[]) {
  return rows.reduce(
    (a, r) => ({
      costo_neto: a.costo_neto + r.costo_neto,
      proy_ultima: a.proy_ultima + r.proy_ultima,
      desvio: a.desvio + r.desvio,
    }),
    { costo_neto: 0, proy_ultima: 0, desvio: 0 },
  );
}

function ProgramaCard({
  programa,
  rows,
}: {
  programa: Exclude<Programa, null>;
  rows: NetoProyObra[];
}) {
  const t = totals(rows);
  const frac = t.costo_neto ? t.desvio / t.costo_neto : null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ProgramaBadge programa={programa} />
          <span className="font-mono text-[11px] font-normal text-gris-500">
            {rows.length} obras
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <span className="text-gris-500">Costo neto</span>
        <span className="text-right tabular text-gris-800">
          {formatCLP(t.costo_neto)}
        </span>
        <span className="text-gris-500">Última proyección</span>
        <span className="text-right tabular text-gris-800">
          {formatCLP(t.proy_ultima)}
        </span>
        <span className="text-gris-500">Desvío</span>
        <span className="text-right">
          <DesvioPill monto={t.desvio} fraction={frac} />
        </span>
      </CardContent>
    </Card>
  );
}

export default async function ResumenPage() {
  const rows = await getNetoProyObra();
  const ds19 = rows.filter((r) => r.programa === "DS19");
  const ds49 = rows.filter((r) => r.programa === "DS49");

  const chartData: ObraBarDatum[] = rows.map((r) => ({
    obra: r.obra,
    costo_neto: r.costo_neto,
    proy_ultima: r.proy_ultima,
  }));

  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">01 · Control de costos</p>
        <h1 className="mt-1 text-2xl text-gris-900">
          Costo neto vs. última proyección
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-gris-500">
          Por obra: el COSTO (NETO) del itemizado contra la última proyección
          registrada completa. Desvío = proyección − costo neto (positivo =
          sobrecosto proyectado, en rojo).
        </p>
      </header>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <ProgramaCard programa="DS19" rows={ds19} />
        <ProgramaCard programa="DS49" rows={ds49} />
      </section>

      <Card accent>
        <CardHeader>
          <CardTitle>Costo neto vs. proyección por obra</CardTitle>
        </CardHeader>
        <CardContent>
          <ObrasBarChart data={chartData} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Obras</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left font-mono text-[10.5px] uppercase tracking-[0.08em] text-gris-500">
                  <th className="px-5 py-2.5 font-medium">Obra</th>
                  <th className="px-3 py-2.5 font-medium">Programa</th>
                  <th className="px-3 py-2.5 font-medium">Última proy.</th>
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
                      <td className="px-5 py-2.5">
                        <Link
                          href={`/obra/${r.obra}`}
                          className="font-mono font-medium text-gris-900 no-underline hover:text-azul-600 hover:underline"
                        >
                          {r.obra}
                        </Link>
                        <span className="ml-2 text-xs text-gris-400">
                          {r.nombre}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <ProgramaBadge programa={r.programa} />
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs uppercase text-gris-600">
                        {r.proy_label ?? "—"}
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
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
