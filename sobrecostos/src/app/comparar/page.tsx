import { ObraFilterBar } from "@/components/filters/ObraFilterBar";
import { ObrasBarChart, type ObraBarDatum } from "@/components/charts/ObrasBarChart";
import { ProgramaBadge } from "@/components/ProgramaBadge";
import { DesvioPill } from "@/components/DesvioPill";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { getCcObra, getCentrosCosto, getObraResumen } from "@/lib/queries";
import { formatCLP } from "@/lib/format";

interface Row {
  obra: string;
  programa: "DS19" | "DS49" | null;
  presupuesto: number;
  comprado: number;
  recepcionado: number;
  real_obra: number;
  sobrecosto: number;
}

export default async function CompararPage({
  searchParams,
}: {
  searchParams: Promise<{ obras?: string; cc?: string }>;
}) {
  const sp = await searchParams;
  const cc = sp.cc ?? "";

  const [resumen, centros] = await Promise.all([
    getObraResumen(),
    getCentrosCosto(),
  ]);

  const obraOpts = resumen.map((r) => ({
    obra: r.obra,
    nombre: r.nombre,
    programa: r.programa,
  }));

  // Selección: por defecto todas las obras.
  const selected = sp.obras
    ? sp.obras.split(",").filter(Boolean)
    : resumen.map((r) => r.obra);

  // Datos según haya o no filtro de centro de costo.
  let rows: Row[];
  if (cc) {
    const ccRows = (await getCcObra()).filter((r) => r.cc_codigo === cc);
    const byObra = new Map(ccRows.map((r) => [r.obra, r]));
    rows = selected.map((obra) => {
      const r = byObra.get(obra);
      const meta = resumen.find((x) => x.obra === obra);
      return {
        obra,
        programa: meta?.programa ?? null,
        presupuesto: r?.presupuesto ?? 0,
        comprado: r?.comprado ?? 0,
        recepcionado: r?.recepcionado ?? 0,
        real_obra: r?.real_obra ?? 0,
        sobrecosto: r?.sobrecosto ?? 0,
      };
    });
  } else {
    rows = resumen
      .filter((r) => selected.includes(r.obra))
      .map((r) => ({
        obra: r.obra,
        programa: r.programa,
        presupuesto: r.presupuesto,
        comprado: r.comprado,
        recepcionado: r.recepcionado,
        real_obra: r.real_obra,
        sobrecosto: r.sobrecosto,
      }));
  }

  const chartData: ObraBarDatum[] = rows.map((r) => ({
    obra: r.obra,
    presupuesto: r.presupuesto,
    comprado: r.comprado,
    recepcionado: r.recepcionado,
    real_obra: r.real_obra,
  }));

  const ccLabel = cc
    ? centros.find((c) => c.cc_codigo === cc)?.cc_nombre ?? cc
    : null;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-slate-900">Comparar obras</h1>
        <p className="mt-1 text-sm text-slate-500">
          {ccLabel
            ? `Centro de costo: ${cc} · ${ccLabel}`
            : "Todos los centros de costo. Filtra por uno para comparar el mismo ítem entre obras."}
        </p>
      </header>

      <ObraFilterBar
        obras={obraOpts}
        centros={centros}
        selected={selected}
        cc={cc}
      />

      <Card>
        <CardHeader>
          <CardTitle>Presupuesto vs. ejecución</CardTitle>
        </CardHeader>
        <CardContent>
          <ObrasBarChart data={chartData} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detalle</CardTitle>
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
                  <th className="px-3 py-2 text-right font-medium">
                    Recepcionado
                  </th>
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
                      <td className="px-5 py-2.5 font-medium text-slate-900">
                        {r.obra}
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
                        {formatCLP(r.recepcionado)}
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
                {rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-8 text-center text-slate-500"
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
