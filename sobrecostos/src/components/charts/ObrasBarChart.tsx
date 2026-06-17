"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCLP, formatCLPCompact } from "@/lib/format";

export interface ObraBarDatum {
  obra: string;
  presupuesto: number;
  comprado: number;
  recepcionado: number;
  real_obra: number;
}

const SERIES = [
  { key: "presupuesto", name: "Presupuesto", color: "#94a3b8" },
  { key: "comprado", name: "Comprado", color: "#60a5fa" },
  { key: "recepcionado", name: "Recepcionado", color: "#f59e0b" },
  { key: "real_obra", name: "Real obra", color: "#10b981" },
] as const;

export function ObrasBarChart({ data }: { data: ObraBarDatum[] }) {
  if (data.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-slate-500">
        Selecciona al menos una obra para comparar.
      </p>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={Math.max(280, data.length * 64)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ left: 8, right: 24, top: 8, bottom: 8 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
        <XAxis
          type="number"
          tickFormatter={(v) => formatCLPCompact(v as number)}
          tick={{ fontSize: 11, fill: "#64748b" }}
        />
        <YAxis
          type="category"
          dataKey="obra"
          width={72}
          tick={{ fontSize: 12, fill: "#334155" }}
        />
        <Tooltip
          formatter={(v, name) => [formatCLP(Number(v)), name]}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {SERIES.map((s) => (
          <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={2} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
