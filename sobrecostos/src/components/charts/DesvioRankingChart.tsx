"use client";

import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { formatPct } from "@/lib/format";

export interface RankingDatum {
  obra: string;
  /** desvío relativo = (proyección − neto) / neto */
  pct: number;
}

const ROJO = "#c0392b";
const VERDE = "#3a8a5f";

/** Ranking divergente: una barra por obra, ordenada por magnitud del desvío %.
 *  Derecha (rojo) = sobrecosto proyectado; izquierda (verde) = ahorro. */
export function DesvioRankingChart({ data }: { data: RankingDatum[] }) {
  if (data.length === 0)
    return (
      <p className="py-12 text-center text-sm text-gris-500">Sin datos.</p>
    );
  const sorted = [...data].sort((a, b) => b.pct - a.pct);
  const max = Math.max(0.05, ...sorted.map((d) => Math.abs(d.pct)));

  return (
    <ResponsiveContainer width="100%" height={Math.max(260, sorted.length * 46)}>
      <BarChart
        data={sorted}
        layout="vertical"
        margin={{ left: 8, right: 56, top: 8, bottom: 8 }}
      >
        <XAxis
          type="number"
          domain={[-max * 1.15, max * 1.15]}
          tickFormatter={(v) => formatPct(v as number)}
          tick={{ fontSize: 10, fill: "#6e7378", fontFamily: "var(--font-mono)" }}
        />
        <YAxis
          type="category"
          dataKey="obra"
          width={72}
          tick={{ fontSize: 11, fill: "#3a3e41", fontFamily: "var(--font-mono)" }}
        />
        <ReferenceLine x={0} stroke="#b8aca8" />
        <Bar dataKey="pct" radius={1} isAnimationActive={false}>
          {sorted.map((d) => (
            <Cell key={d.obra} fill={d.pct > 0 ? ROJO : VERDE} />
          ))}
          <LabelList
            dataKey="pct"
            position="right"
            formatter={(v: unknown) =>
              typeof v === "number" ? formatPct(v) : ""
            }
            style={{ fontSize: 11, fontFamily: "var(--font-mono)", fill: "#3a3e41" }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
