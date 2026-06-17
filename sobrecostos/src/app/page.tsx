import Link from "next/link";
import { KpiCard } from "@/components/KpiCard";
import { ProgramaBadge } from "@/components/ProgramaBadge";
import { DesvioPill } from "@/components/DesvioPill";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  CcScatterChart,
  type CcScatterDatum,
} from "@/components/charts/CcScatterChart";
import { getCcObra, getObraResumen } from "@/lib/queries";
import { formatCLP, formatPct } from "@/lib/format";
import type { ObraResumen, Programa } from "@/lib/types";

function totals(rows: ObraResumen[]) {
  return rows.reduce(
    (acc, r) => ({
      presupuesto: acc.presupuesto + r.presupuesto,
      comprado: acc.comprado + r.comprado,
      real_obra: acc.real_obra + r.real_obra,
      sobrecosto: acc.sobrecosto + r.sobrecosto,
    }),
    { presupuesto: 0, comprado: 0, real_obra: 0, sobrecosto: 0 },
  );
}

function ProgramaCard({
  programa,
  rows,
}: {
  programa: Exclude<Programa, null>;
  rows: ObraResumen[];
}) {
  const t = totals(rows);
  const frac = t.presupuesto ? t.sobrecosto / t.presupuesto : null;
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
        <span className="text-gris-500">Presupuesto</span>
        <span className="text-right tabular text-gris-800">
          {formatCLP(t.presupuesto)}
        </span>
        <span className="text-gris-500">Real a la fecha</span>
        <span className="text-right tabular text-gris-800">
          {formatCLP(t.real_obra)}
        </span>
        <span className="text-gris-500">Desvío</span>
        <span className="text-right">
          <DesvioPill monto={t.sobrecosto} fraction={frac} />
        </span>
      </CardContent>
    </Card>
  );
}

export default async function ResumenPage() {
  const [rows, ccObra] = await Promise.all([getObraResumen(), getCcObra()]);
  const t = totals(rows);
  const frac = t.presupuesto ? t.sobrecosto / t.presupuesto : null;
  const ds19 = rows.filter((r) => r.programa === "DS19");
  const ds49 = rows.filter((r) => r.programa === "DS49");

  const scatter: CcScatterDatum[] = ccObra.map((r) => ({
    obra: r.obra,
    cc_codigo: r.cc_codigo,
    cc_nombre: r.cc_nombre,
    programa: r.programa,
    presupuesto: r.presupuesto,
    real: r.real_obra,
  }));

  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">01 · Control de costos</p>
        <h1 className="mt-1 text-2xl text-gris-900">Resumen de costos</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-gris-500">
          Presupuesto vs. ejecución real por obra. Desvío = real − presupuesto
          (negativo = aún bajo presupuesto).
        </p>
      </header>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Presupuesto total" value={formatCLP(t.presupuesto)} />
        <KpiCard label="Comprado" value={formatCLP(t.comprado)} />
        <KpiCard label="Real a la fecha" value={formatCLP(t.real_obra)} />
        <KpiCard
          label="Desvío"
          value={formatCLP(t.sobrecosto)}
          hint={frac != null ? formatPct(frac) + " vs. presupuesto" : undefined}
          tone={t.sobrecosto > 0 ? "negative" : "positive"}
        />
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <ProgramaCard programa="DS19" rows={ds19} />
        <ProgramaCard programa="DS49" rows={ds49} />
      </section>

      <Card accent>
        <CardHeader className="flex-col items-start gap-0.5">
          <CardTitle>Dispersión de centros de costo</CardTitle>
          <p className="text-xs text-gris-500">
            Presupuesto vs. real de cada centro de costo, en todas las obras.
            Detecta de un vistazo cuáles se desvían de la tendencia.
          </p>
        </CardHeader>
        <CardContent>
          <CcScatterChart data={scatter} />
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
                  <th className="px-3 py-2.5 text-right font-medium">
                    Presupuesto
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium">Comprado</th>
                  <th className="px-3 py-2.5 text-right font-medium">Real</th>
                  <th className="px-5 py-2.5 text-right font-medium">Desvío</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const f = r.presupuesto ? r.sobrecosto / r.presupuesto : null;
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
                      <td className="px-3 py-2.5 text-right tabular text-gris-800">
                        {formatCLP(r.presupuesto)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular text-gris-800">
                        {formatCLP(r.comprado)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular text-gris-800">
                        {formatCLP(r.real_obra)}
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        <DesvioPill monto={r.sobrecosto} fraction={f} />
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
