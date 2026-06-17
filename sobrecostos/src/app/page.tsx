import Link from "next/link";
import { KpiCard } from "@/components/KpiCard";
import { ProgramaBadge } from "@/components/ProgramaBadge";
import { DesvioPill } from "@/components/DesvioPill";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { getObraResumen } from "@/lib/queries";
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
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <ProgramaBadge programa={programa} /> · {rows.length} obras
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <span className="text-slate-500">Presupuesto</span>
        <span className="text-right tabular">{formatCLP(t.presupuesto)}</span>
        <span className="text-slate-500">Real a la fecha</span>
        <span className="text-right tabular">{formatCLP(t.real_obra)}</span>
        <span className="text-slate-500">Desvío</span>
        <span className="text-right">
          <DesvioPill monto={t.sobrecosto} fraction={frac} />
        </span>
      </CardContent>
    </Card>
  );
}

export default async function ResumenPage() {
  const rows = await getObraResumen();
  const t = totals(rows);
  const frac = t.presupuesto ? t.sobrecosto / t.presupuesto : null;
  const ds19 = rows.filter((r) => r.programa === "DS19");
  const ds49 = rows.filter((r) => r.programa === "DS49");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-slate-900">
          Resumen de costos
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Presupuesto vs. ejecución real por obra. Desvío = real − presupuesto
          (negativo = aún bajo presupuesto).
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ProgramaCard programa="DS19" rows={ds19} />
        <ProgramaCard programa="DS49" rows={ds49} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Obras</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-2 font-medium">Obra</th>
                  <th className="px-3 py-2 font-medium">Programa</th>
                  <th className="px-3 py-2 text-right font-medium">
                    Presupuesto
                  </th>
                  <th className="px-3 py-2 text-right font-medium">Comprado</th>
                  <th className="px-3 py-2 text-right font-medium">Real</th>
                  <th className="px-5 py-2 text-right font-medium">Desvío</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const f = r.presupuesto ? r.sobrecosto / r.presupuesto : null;
                  return (
                    <tr
                      key={r.obra}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                    >
                      <td className="px-5 py-2.5">
                        <Link
                          href={`/obra/${r.obra}`}
                          className="font-medium text-slate-900 hover:underline"
                        >
                          {r.obra}
                        </Link>
                        <span className="ml-2 text-xs text-slate-400">
                          {r.nombre}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <ProgramaBadge programa={r.programa} />
                      </td>
                      <td className="px-3 py-2.5 text-right tabular">
                        {formatCLP(r.presupuesto)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular">
                        {formatCLP(r.comprado)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular">
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
