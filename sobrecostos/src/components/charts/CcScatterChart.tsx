"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { formatCLP, formatCLPCompact, formatPct } from "@/lib/format";

export interface CcScatterDatum {
  obra: string;
  cc_codigo: string;
  cc_nombre: string | null;
  programa: "DS19" | "DS49" | null;
  presupuesto: number;
  real: number;
}

const AZUL = "#2871b8";
const DANGER = "#c0392b";
const SUCCESS = "#2f8f5b";
const CAFE = "#968a87";
const TREND = "#1c4f83";
const AXIS = "#6e7378";
const GRID = "#f0ebe8";

interface Pt extends CcScatterDatum {
  desvio: number;
  frac: number | null;
  overrun: boolean;
}

function regression(pts: Pt[]) {
  // Mínimos cuadrados en espacio log-log: log10(real) = a + b·log10(ppto).
  const xs = pts.map((p) => Math.log10(p.presupuesto));
  const ys = pts.map((p) => Math.log10(p.real));
  const n = xs.length;
  const mx = xs.reduce((s, v) => s + v, 0) / n;
  const my = ys.reduce((s, v) => s + v, 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
  }
  const b = sxx ? sxy / sxx : 1;
  const a = my - b * mx;
  return (x: number) => 10 ** (a + b * Math.log10(x));
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: Pt }[];
}) {
  if (!active || !payload?.length) return null;
  const p: Pt = payload[0].payload;
  return (
    <div className="rounded-[3px] border border-line bg-white px-3 py-2 shadow-[var(--shadow-ds-md)]">
      <div className="mb-1 flex items-center gap-2">
        <span
          className="h-2 w-2"
          style={{ background: p.overrun ? DANGER : SUCCESS }}
        />
        <span className="font-mono text-[11px] font-semibold tracking-wide text-gris-800">
          {p.cc_codigo} · {p.obra}
        </span>
      </div>
      {p.cc_nombre && (
        <p className="mb-1.5 max-w-[220px] text-[11px] leading-snug text-gris-500">
          {p.cc_nombre}
        </p>
      )}
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 font-mono text-[11px] tabular-nums">
        <dt className="text-gris-500">Presupuesto</dt>
        <dd className="text-right text-gris-800">{formatCLP(p.presupuesto)}</dd>
        <dt className="text-gris-500">Real</dt>
        <dd className="text-right text-gris-800">{formatCLP(p.real)}</dd>
        <dt className="text-gris-500">Desvío</dt>
        <dd
          className="text-right font-semibold"
          style={{ color: p.overrun ? DANGER : SUCCESS }}
        >
          {formatCLPCompact(p.desvio)}
          {p.frac != null ? ` (${formatPct(p.frac)})` : ""}
        </dd>
      </dl>
    </div>
  );
}

export function CcScatterChart({ data }: { data: CcScatterDatum[] }) {
  const [hideOk, setHideOk] = useState(false);

  const { pts, excluded, domain, ticks, trendLine, overruns } = useMemo(() => {
    const all: Pt[] = data
      .filter((d) => d.presupuesto > 0 && d.real > 0)
      .map((d) => {
        const desvio = d.real - d.presupuesto;
        return {
          ...d,
          desvio,
          frac: d.presupuesto ? desvio / d.presupuesto : null,
          overrun: d.real > d.presupuesto,
        };
      });

    const overruns = all.filter((p) => p.overrun).length;
    const shown = hideOk ? all.filter((p) => p.overrun) : all;

    const vals = all.flatMap((p) => [p.presupuesto, p.real]);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const lo = 10 ** Math.floor(Math.log10(min));
    const hi = 10 ** Math.ceil(Math.log10(max));

    const ticks: number[] = [];
    for (let t = lo; t <= hi + 1; t *= 10) ticks.push(t);

    const f = all.length >= 2 ? regression(all) : (x: number) => x;
    const trendLine: [{ x: number; y: number }, { x: number; y: number }] = [
      { x: lo, y: Math.min(hi, Math.max(lo, f(lo))) },
      { x: hi, y: Math.min(hi, Math.max(lo, f(hi))) },
    ];

    return {
      pts: shown,
      excluded: data.length - all.length,
      domain: [lo, hi] as [number, number],
      ticks,
      trendLine,
      overruns,
    };
  }, [data, hideOk]);

  if (data.filter((d) => d.presupuesto > 0 && d.real > 0).length < 2) {
    return (
      <p className="py-12 text-center text-sm text-gris-500">
        Datos insuficientes para la dispersión.
      </p>
    );
  }

  return (
    <div>
      {/* Leyenda + control */}
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[11px] text-gris-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2" style={{ background: DANGER }} />
          Sobre presupuesto ({overruns})
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2" style={{ background: AZUL }} />
          Dentro de presupuesto
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-[2px] w-5" style={{ background: TREND }} />
          Tendencia
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="20" height="6" aria-hidden>
            <line x1="0" y1="3" x2="20" y2="3" stroke={CAFE} strokeWidth="1.5" strokeDasharray="4 3" />
          </svg>
          En presupuesto (real = ppto)
        </span>
        <button
          type="button"
          onClick={() => setHideOk((v) => !v)}
          className="ml-auto rounded-[2px] border border-line px-2 py-1 text-[11px] font-medium text-gris-600 transition-colors hover:bg-cafe-50"
        >
          {hideOk ? "Ver todos" : "Solo desviados"}
        </button>
      </div>

      <ResponsiveContainer width="100%" height={420}>
        <ScatterChart margin={{ left: 12, right: 20, top: 8, bottom: 24 }}>
          <CartesianGrid stroke={GRID} />
          <XAxis
            type="number"
            dataKey="presupuesto"
            name="Presupuesto"
            scale="log"
            domain={domain}
            ticks={ticks}
            allowDataOverflow
            tickFormatter={(v) => formatCLPCompact(v as number)}
            tick={{ fontSize: 10, fill: AXIS, fontFamily: "var(--font-mono)" }}
            tickLine={{ stroke: GRID }}
            axisLine={{ stroke: "#e8e2df" }}
          />
          <YAxis
            type="number"
            dataKey="real"
            name="Real"
            scale="log"
            domain={domain}
            ticks={ticks}
            allowDataOverflow
            width={56}
            tickFormatter={(v) => formatCLPCompact(v as number)}
            tick={{ fontSize: 10, fill: AXIS, fontFamily: "var(--font-mono)" }}
            tickLine={{ stroke: GRID }}
            axisLine={{ stroke: "#e8e2df" }}
          />
          <ZAxis range={[55, 55]} />
          {/* y = x : en presupuesto */}
          <ReferenceLine
            ifOverflow="hidden"
            segment={[
              { x: domain[0], y: domain[0] },
              { x: domain[1], y: domain[1] },
            ]}
            stroke={CAFE}
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
          {/* línea de tendencia (regresión log-log) */}
          <ReferenceLine
            ifOverflow="hidden"
            segment={trendLine}
            stroke={TREND}
            strokeWidth={2}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ stroke: "#cbd0d4", strokeDasharray: "3 3" }}
          />
          <Scatter data={pts} fillOpacity={0.78}>
            {pts.map((p, i) => (
              <Cell
                key={i}
                fill={p.overrun ? DANGER : AZUL}
                stroke="#ffffff"
                strokeWidth={1}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>

      <p className="mt-3 font-mono text-[11px] leading-relaxed text-gris-500">
        Cada punto es un centro de costo en una obra · ejes en escala
        logarítmica. Mientras más arriba de la línea punteada, mayor el
        sobrecosto. Los puntos lejos de la línea de tendencia son los que se
        comportan distinto al resto.
        {excluded > 0 && (
          <> Se omiten {excluded} sin presupuesto o sin gasto a la fecha.</>
        )}
      </p>
    </div>
  );
}
