"use client";

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
import { formatCLP, formatCLPCompact } from "@/lib/format";

export interface ScatterPoint {
  cc_codigo: string;
  cc_nombre: string | null;
  costo_neto: number;
  proy_ultima: number;
  desvio: number;
}

const ROJO = "#c0392b";
const VERDE = "#3a8a5f";

export function ScatterNetoProy({ data }: { data: ScatterPoint[] }) {
  if (data.length === 0)
    return (
      <p className="py-16 text-center text-sm text-gris-500">
        Elegí obra y familia para ver la dispersión.
      </p>
    );
  const max = Math.max(
    1,
    ...data.map((d) => Math.max(d.costo_neto, d.proy_ultima)),
  );
  return (
    <ResponsiveContainer width="100%" height={340}>
      <ScatterChart margin={{ left: 8, right: 16, top: 8, bottom: 24 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0ebe8" />
        <XAxis
          type="number"
          dataKey="costo_neto"
          name="Costo neto"
          domain={[0, max * 1.05]}
          tickFormatter={(v) => formatCLPCompact(v as number)}
          tick={{ fontSize: 10, fill: "#6e7378", fontFamily: "var(--font-mono)" }}
        >
        </XAxis>
        <YAxis
          type="number"
          dataKey="proy_ultima"
          name="Proyección"
          domain={[0, max * 1.05]}
          tickFormatter={(v) => formatCLPCompact(v as number)}
          tick={{ fontSize: 10, fill: "#6e7378", fontFamily: "var(--font-mono)" }}
        />
        <ZAxis range={[60, 60]} />
        {/* Línea de referencia y = x (sin desvío). */}
        <ReferenceLine
          stroke="#b8aca8"
          strokeDasharray="4 4"
          segment={[
            { x: 0, y: 0 },
            { x: max, y: max },
          ]}
          ifOverflow="extendDomain"
        />
        <Tooltip
          cursor={{ strokeDasharray: "3 3" }}
          formatter={(v, name) => [formatCLP(Number(v)), name]}
          labelFormatter={() => ""}
          content={({ payload }) => {
            if (!payload || !payload.length) return null;
            const p = payload[0].payload as ScatterPoint;
            return (
              <div className="rounded-[3px] border border-line bg-white px-3 py-2 text-xs shadow-sm">
                <div className="font-mono font-medium text-gris-900">
                  {p.cc_codigo} · {p.cc_nombre}
                </div>
                <div className="mt-1 text-gris-600">
                  Neto: {formatCLP(p.costo_neto)}
                </div>
                <div className="text-gris-600">
                  Proy: {formatCLP(p.proy_ultima)}
                </div>
                <div
                  className={p.desvio > 0 ? "text-danger-700" : "text-success-700"}
                >
                  Desvío: {formatCLP(p.desvio)}
                </div>
              </div>
            );
          }}
        />
        <Scatter data={data} isAnimationActive={false}>
          {data.map((d) => (
            <Cell key={d.cc_codigo} fill={d.desvio > 0 ? ROJO : VERDE} />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}
