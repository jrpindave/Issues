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
  costo_neto: number;
  proy_ultima: number;
}

const SERIES = [
  { key: "costo_neto", name: "Costo neto", color: "#beb4b1" },
  { key: "proy_ultima", name: "Última proyección", color: "#2871b8" },
] as const;

export function ObrasBarChart({ data }: { data: ObraBarDatum[] }) {
  if (data.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-gris-500">
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
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0ebe8" />
        <XAxis
          type="number"
          tickFormatter={(v) => formatCLPCompact(v as number)}
          tick={{ fontSize: 10, fill: "#6e7378", fontFamily: "var(--font-mono)" }}
        />
        <YAxis
          type="category"
          dataKey="obra"
          width={72}
          tick={{ fontSize: 11, fill: "#3a3e41", fontFamily: "var(--font-mono)" }}
        />
        <Tooltip
          formatter={(v, name) => [formatCLP(Number(v)), name]}
          contentStyle={{
            fontSize: 12,
            borderRadius: 3,
            border: "1px solid #e8e2df",
            fontFamily: "var(--font-mono)",
          }}
        />
        <Legend wrapperStyle={{ fontSize: 11, fontFamily: "var(--font-mono)" }} />
        {SERIES.map((s) => (
          <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={1} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
