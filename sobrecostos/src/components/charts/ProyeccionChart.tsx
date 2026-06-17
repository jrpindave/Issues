"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCLP, formatCLPCompact, formatMonthYear } from "@/lib/format";

export function ProyeccionChart({
  data,
}: {
  data: { periodo: string; monto: number }[];
}) {
  if (data.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-gris-500">
        Sin proyección para esta selección.
      </p>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
        <defs>
          <linearGradient id="proy" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2871b8" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#2871b8" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0ebe8" />
        <XAxis
          dataKey="periodo"
          tickFormatter={(v) => formatMonthYear(v as string)}
          tick={{ fontSize: 10, fill: "#6e7378", fontFamily: "var(--font-mono)" }}
          minTickGap={16}
        />
        <YAxis
          tickFormatter={(v) => formatCLPCompact(v as number)}
          tick={{ fontSize: 10, fill: "#6e7378", fontFamily: "var(--font-mono)" }}
          width={64}
        />
        <Tooltip
          labelFormatter={(v) => formatMonthYear(v as string)}
          formatter={(v) => [formatCLP(Number(v)), "Proyectado"]}
          contentStyle={{
            fontSize: 12,
            borderRadius: 3,
            border: "1px solid #e8e2df",
            fontFamily: "var(--font-mono)",
          }}
        />
        <Area
          type="monotone"
          dataKey="monto"
          stroke="#21609f"
          strokeWidth={2}
          fill="url(#proy)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
