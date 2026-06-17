import Link from "next/link";
import { notFound } from "next/navigation";
import { KpiCard } from "@/components/KpiCard";
import { ProgramaBadge } from "@/components/ProgramaBadge";
import { DesvioPill } from "@/components/DesvioPill";
import { CcSelect } from "@/components/filters/CcSelect";
import { ProyeccionChart } from "@/components/charts/ProyeccionChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  getItemizadoObra,
  getObraResumen,
  getProyeccionObra,
} from "@/lib/queries";
import { formatCLP, formatPct } from "@/lib/format";
import type { CentroCosto, ItemizadoLinea } from "@/lib/types";

interface Fila {
  cc_codigo: string;
  etiqueta: string;
  presupuesto: number;
  comprado: number;
  recepcionado: number;
  real_obra: number;
  sobrecosto: number;
}

function sumMeasures(lines: ItemizadoLinea[]) {
  return lines.reduce(
    (a, l) => ({
      presupuesto: a.presupuesto + (l.costo_con_iva ?? 0),
      comprado: a.comprado + (l.comprado ?? 0),
      recepcionado: a.recepcionado + (l.recepcionado ?? 0),
      real_obra: a.real_obra + (l.real_obra ?? 0),
    }),
    { presupuesto: 0, comprado: 0, recepcionado: 0, real_obra: 0 },
  );
}

export default async function ObraPage({
  params,
  searchParams,
}: {
  params: Promise<{ obra: string }>;
  searchParams: Promise<{ cc?: string }>;
}) {
  const { obra } = await params;
  const { cc = "" } = await searchParams;

  const [resumen, lineas] = await Promise.all([
    getObraResumen(),
    getItemizadoObra(obra),
  ]);
  const meta = resumen.find((r) => r.obra === obra);
  if (!meta) notFound();

  const cta = lineas.filter((l) => l.nivel === "CTA");

  // Nombre de cada centro de costo (de la fila nivel='CC').
  const ccNombre = new Map<string, string>();
  for (const l of lineas) {
    if (l.nivel === "CC" && l.cc_codigo) {
      ccNombre.set(l.cc_codigo, l.item ?? l.cc_codigo);
    }
  }

  // Subtotales por centro de costo (desde las líneas CTA).
  const byCc = new Map<string, ItemizadoLinea[]>();
  for (const l of cta) {
    const k = l.cc_codigo ?? "—";
    (byCc.get(k) ?? byCc.set(k, []).get(k)!).push(l);
  }

  const centros: CentroCosto[] = [...byCc.keys()]
    .sort((a, b) => a.localeCompare(b, "es"))
    .map((code) => ({
      cc_codigo: code,
      cc_nombre: ccNombre.get(code) ?? null,
    }));

  // Filas de la tabla: subtotales por CC, o detalle CTA si hay un CC filtrado.
  let filas: Fila[];
  if (cc) {
    filas = (byCc.get(cc) ?? []).map((l) => ({
      cc_codigo: l.cc_codigo ?? "",
      etiqueta: l.item ?? "",
      presupuesto: l.costo_con_iva ?? 0,
      comprado: l.comprado ?? 0,
      recepcionado: l.recepcionado ?? 0,
      real_obra: l.real_obra ?? 0,
      sobrecosto: (l.real_obra ?? 0) - (l.costo_con_iva ?? 0),
    }));
  } else {
    filas = [...byCc.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], "es"))
      .map(([code, ls]) => {
        const s = sumMeasures(ls);
        return {
          cc_codigo: code,
          etiqueta: ccNombre.get(code) ?? code,
          presupuesto: s.presupuesto,
          comprado: s.comprado,
          recepcionado: s.recepcionado,
          real_obra: s.real_obra,
          sobrecosto: s.real_obra - s.presupuesto,
        };
      });
  }

  // KPIs del alcance visible (obra completa o CC filtrado).
  const scope = cc ? byCc.get(cc) ?? [] : cta;
  const s = sumMeasures(scope);
  const desvio = s.real_obra - s.presupuesto;
  const frac = s.presupuesto ? desvio / s.presupuesto : null;

  const proyeccion = await getProyeccionObra(obra, cc || undefined);

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
          <span className="text-sm text-gris-500">{meta.nombre}</span>
        </div>
        <div className="pt-1">
          <CcSelect centros={centros} cc={cc} />
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Presupuesto" value={formatCLP(s.presupuesto)} />
        <KpiCard label="Comprado" value={formatCLP(s.comprado)} />
        <KpiCard label="Real a la fecha" value={formatCLP(s.real_obra)} />
        <KpiCard
          label="Desvío"
          value={formatCLP(desvio)}
          hint={frac != null ? formatPct(frac) + " vs. presupuesto" : undefined}
          tone={desvio > 0 ? "negative" : "positive"}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Proyección mensual</CardTitle>
        </CardHeader>
        <CardContent>
          <ProyeccionChart data={proyeccion} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {cc ? "Detalle de cuentas" : "Centros de costo"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left font-mono text-[10.5px] uppercase tracking-[0.08em] text-gris-500">
                  <th className="px-5 py-2.5 font-medium">
                    {cc ? "Cuenta" : "Centro de costo"}
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium">
                    Presupuesto
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium">Comprado</th>
                  <th className="px-3 py-2.5 text-right font-medium">
                    Recepcionado
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium">Real</th>
                  <th className="px-5 py-2.5 text-right font-medium">Desvío</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f, i) => {
                  const fr = f.presupuesto ? f.sobrecosto / f.presupuesto : null;
                  const inner = (
                    <>
                      <td className="px-3 py-2.5 text-right tabular text-gris-800">
                        {formatCLP(f.presupuesto)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular text-gris-800">
                        {formatCLP(f.comprado)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular text-gris-800">
                        {formatCLP(f.recepcionado)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular text-gris-800">
                        {formatCLP(f.real_obra)}
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        <DesvioPill monto={f.sobrecosto} fraction={fr} />
                      </td>
                    </>
                  );
                  return (
                    <tr
                      key={`${f.cc_codigo}-${i}`}
                      className="border-b border-line last:border-0 hover:bg-cafe-50"
                    >
                      <td className="px-5 py-2.5">
                        {cc ? (
                          <span className="text-gris-700">{f.etiqueta}</span>
                        ) : (
                          <Link
                            href={`/obra/${obra}?cc=${f.cc_codigo}`}
                            className="font-medium text-gris-900 no-underline hover:text-azul-600 hover:underline"
                          >
                            {f.etiqueta}
                          </Link>
                        )}
                      </td>
                      {inner}
                    </tr>
                  );
                })}
                {filas.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-8 text-center text-gris-500"
                    >
                      Sin líneas de costo para esta selección.
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
