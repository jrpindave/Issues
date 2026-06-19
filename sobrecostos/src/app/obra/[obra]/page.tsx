import Link from "next/link";
import { notFound } from "next/navigation";
import { KpiCard } from "@/components/KpiCard";
import { ProgramaBadge } from "@/components/ProgramaBadge";
import { DesvioPill } from "@/components/DesvioPill";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  getGastoFamilia,
  getNetoProyCc,
  getNetoProyObra,
} from "@/lib/queries";
import { formatCLP, formatCLPCompact, formatPct } from "@/lib/format";

export default async function ObraPage({
  params,
}: {
  params: Promise<{ obra: string }>;
}) {
  const { obra } = await params;

  const [resumen, ccRows, familias] = await Promise.all([
    getNetoProyObra(),
    getNetoProyCc(obra),
    getGastoFamilia(obra),
  ]);
  const meta = resumen.find((r) => r.obra === obra);
  if (!meta) notFound();

  const frac = meta.costo_neto ? meta.desvio / meta.costo_neto : null;
  const gastoTotal = familias.reduce((a, f) => a + f.gasto, 0);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <Link
          href="/"
          className="font-mono text-[12px] text-gris-500 no-underline hover:text-azul-600 hover:underline"
        >
          ← Resumen
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-2xl font-semibold text-gris-900">
            {obra}
          </h1>
          <ProgramaBadge programa={meta.programa} />
          {meta.subsegmento && (
            <span className="rounded-[2px] border border-line-strong bg-white px-2 py-0.5 text-xs text-gris-600">
              {meta.subsegmento}
            </span>
          )}
          <span className="text-sm text-gris-500">{meta.nombre}</span>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Costo neto" value={formatCLP(meta.costo_neto)} />
        <KpiCard
          label={`Última proyección${meta.proy_label ? ` · ${meta.proy_label}` : ""}`}
          value={formatCLP(meta.proy_ultima)}
        />
        <KpiCard
          label="Desvío"
          value={formatCLP(meta.desvio)}
          hint={frac != null ? formatPct(frac) + " vs. costo neto" : undefined}
          tone={meta.desvio > 0 ? "negative" : "positive"}
        />
      </section>

      <Card>
        <CardHeader className="flex-col items-start gap-0.5">
          <CardTitle>Costo neto vs. proyección por centro de costo</CardTitle>
          <p className="text-xs text-gris-500">
            COSTO (NETO) del itemizado contra la última proyección registrada
            {meta.proy_label ? ` (${meta.proy_label})` : ""}. Desvío = proyección
            − costo neto.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left font-mono text-[10.5px] uppercase tracking-[0.08em] text-gris-500">
                  <th className="px-5 py-2.5 font-medium">Centro de costo</th>
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
                {ccRows.map((r) => {
                  const fr = r.costo_neto ? r.desvio / r.costo_neto : null;
                  return (
                    <tr
                      key={r.cc_codigo}
                      className="border-b border-line last:border-0 hover:bg-cafe-50"
                    >
                      <td className="px-5 py-2.5">
                        <span className="font-mono text-xs text-gris-500">
                          {r.cc_codigo}
                        </span>{" "}
                        <span className="text-gris-800">{r.cc_nombre}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular text-gris-800">
                        {formatCLP(r.costo_neto)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular text-gris-800">
                        {formatCLP(r.proy_ultima)}
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        <DesvioPill monto={r.desvio} fraction={fr} />
                      </td>
                    </tr>
                  );
                })}
                {ccRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-5 py-8 text-center text-gris-500"
                    >
                      Sin datos de costo neto / proyección para esta obra.
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
          <CardTitle>Gasto por familia de recurso</CardTitle>
          <p className="text-xs text-gris-500">
            Compras de la obra clasificadas por familia (taxonomía del maestro de
            recursos). Total clasificado: {formatCLP(gastoTotal)}.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left font-mono text-[10.5px] uppercase tracking-[0.08em] text-gris-500">
                  <th className="px-5 py-2.5 font-medium">Familia</th>
                  <th className="px-3 py-2.5 font-medium">Clase</th>
                  <th className="px-3 py-2.5 text-right font-medium">Líneas</th>
                  <th className="px-5 py-2.5 text-right font-medium">Gasto</th>
                </tr>
              </thead>
              <tbody>
                {familias.map((f) => {
                  const share = gastoTotal ? f.gasto / gastoTotal : 0;
                  return (
                    <tr
                      key={`${f.subclase_cod}-${f.familia}`}
                      className="border-b border-line last:border-0 hover:bg-cafe-50"
                    >
                      <td className="px-5 py-2.5">
                        <div className="text-gris-800">{f.familia}</div>
                        <div className="mt-1 h-1 w-full max-w-[220px] bg-cafe-50">
                          <div
                            className="h-1 bg-azul-500"
                            style={{ width: `${(share * 100).toFixed(1)}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gris-500">
                        {f.clase}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular text-gris-600">
                        {f.lineas}
                      </td>
                      <td className="px-5 py-2.5 text-right tabular text-gris-800">
                        {formatCLPCompact(f.gasto)}
                        <span className="ml-2 text-xs text-gris-400">
                          {(share * 100).toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {familias.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-5 py-8 text-center text-gris-500"
                    >
                      Sin compras clasificadas para esta obra.
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
