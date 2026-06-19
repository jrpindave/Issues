import { AnalisisControls } from "@/components/filters/AnalisisControls";
import {
  ScatterNetoProy,
  type ScatterPoint,
} from "@/components/charts/ScatterNetoProy";
import { ProgramaBadge } from "@/components/ProgramaBadge";
import { DesvioPill } from "@/components/DesvioPill";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { TopCcDrilldown } from "@/components/TopCcDrilldown";
import { getNetoProyObra } from "@/lib/queries";
import { familiasDeObra, puntosObraFamilia, topCentrosGlobal } from "@/lib/cta";
import { formatCLP } from "@/lib/format";
import type { NetoProyObra } from "@/lib/types";

const DEFAULT_FAMILIA = "SUELDOS DE OBRA";

function buildPanel(
  pre: string,
  sp: Record<string, string | undefined>,
  obrasMeta: NetoProyObra[],
  defaultObra: string,
) {
  const programa = sp[`${pre}p`] ?? "";
  const subsegmento = sp[`${pre}s`] ?? "";
  const obra = sp[`${pre}o`] ?? defaultObra;
  const familiasList = obra ? familiasDeObra(obra) : [];
  const familiaKeys = familiasList.map((f) => f.key);
  const familia =
    sp[`${pre}f`] ??
    (familiaKeys.includes(DEFAULT_FAMILIA)
      ? DEFAULT_FAMILIA
      : familiaKeys[0] ?? "");

  const points: ScatterPoint[] =
    obra && familia ? puntosObraFamilia(obra, familia) : [];

  // Incidencia de la familia en el desvío de la obra (sobre desvío absoluto).
  const sumAbs = familiasList.reduce((a, f) => a + Math.abs(f.desvio), 0);
  const fam = familiasList.find((f) => f.key === familia);
  const meta = obrasMeta.find((o) => o.obra === obra) ?? null;

  return {
    programa,
    subsegmento,
    obra,
    familia,
    familiaKeys,
    points,
    fam,
    meta,
    incidencia: fam && sumAbs ? Math.abs(fam.desvio) / sumAbs : 0,
  };
}

function Panel({
  pre,
  sp,
  obrasMeta,
  defaultObra,
}: {
  pre: string;
  sp: Record<string, string | undefined>;
  obrasMeta: NetoProyObra[];
  defaultObra: string;
}) {
  const p = buildPanel(pre, sp, obrasMeta, defaultObra);
  const obraOpts = obrasMeta.map((o) => ({
    obra: o.obra,
    programa: o.programa,
    subsegmento: o.subsegmento,
  }));

  return (
    <Card>
      <CardHeader className="flex-col items-start gap-2">
        <CardTitle className="flex items-center gap-2">
          {p.obra || "—"}
          {p.meta && <ProgramaBadge programa={p.meta.programa} />}
          {p.meta?.subsegmento && (
            <span className="text-[11px] font-normal text-gris-500">
              {p.meta.subsegmento}
            </span>
          )}
        </CardTitle>
        <AnalisisControls
          prefix={pre}
          obras={obraOpts}
          familias={p.familiaKeys}
          programa={p.programa}
          subsegmento={p.subsegmento}
          obra={p.obra}
          familia={p.familia}
        />
      </CardHeader>
      <CardContent className="space-y-3">
        {p.fam && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-b border-line pb-3 text-sm">
            <span className="font-medium text-gris-900">{p.familia}</span>
            <span className="text-gris-500">
              Neto{" "}
              <span className="tabular text-gris-800">
                {formatCLP(p.fam.costo_neto)}
              </span>
            </span>
            <span className="text-gris-500">
              Proy{" "}
              <span className="tabular text-gris-800">
                {formatCLP(p.fam.proy_ultima)}
              </span>
            </span>
            <DesvioPill
              monto={p.fam.desvio}
              fraction={p.fam.costo_neto ? p.fam.desvio / p.fam.costo_neto : null}
            />
            <span className="text-gris-500">
              Incidencia en la obra{" "}
              <span className="tabular text-gris-800">
                {(p.incidencia * 100).toFixed(0)}%
              </span>
            </span>
          </div>
        )}
        <ScatterNetoProy data={p.points} />
        <p className="text-xs text-gris-400">
          Cada punto es un centro de costo. Sobre la línea = sobrecosto
          proyectado (rojo); bajo la línea = bajo el neto (verde).
        </p>
      </CardContent>
    </Card>
  );
}

export default async function AnalisisPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const obrasMeta = await getNetoProyObra();
  const ds19 = obrasMeta.find((o) => o.programa === "DS19")?.obra ?? "";
  const ds49 = obrasMeta.find((o) => o.programa === "DS49")?.obra ?? "";
  const topCentros = topCentrosGlobal(20, 20);

  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">03 · Análisis</p>
        <h1 className="mt-1 text-2xl text-gris-900">
          Dispersión por clase / familia
        </h1>
        <p className="mt-1.5 max-w-3xl text-sm text-gris-500">
          Elegí una familia de recurso (ej. <strong>SUELDOS DE OBRA</strong>) y
          mirá en qué centros de costo se desvía. Cada panel es una obra
          independiente — filtrá por programa y subsegmento para enfrentar dos.
          Eje X: costo neto · Eje Y: última proyección · línea = sin desvío.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel pre="a" sp={sp} obrasMeta={obrasMeta} defaultObra={ds19} />
        <Panel pre="b" sp={sp} obrasMeta={obrasMeta} defaultObra={ds49} />
      </div>

      <Card>
        <CardHeader className="flex-col items-start gap-0.5">
          <CardTitle>
            Top 20 centros de costo con más desvío — todos los proyectos
          </CardTitle>
          <p className="text-xs text-gris-500">
            Agregado por código de centro de costo sobre todas las obras.
            Incidencia = participación en el desvío absoluto total. Abrí un
            centro de costo para ver sus familias con más desvío; al clickear
            una familia se carga en ambos paneles de arriba.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <TopCcDrilldown centros={topCentros} />
        </CardContent>
      </Card>
    </div>
  );
}
