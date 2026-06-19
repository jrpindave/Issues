"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
const BASE_H = 320;
const MIN = 1;
const MAX = 8;

export function ScatterNetoProy({ data }: { data: ScatterPoint[] }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const focal = useRef<{ fx: number; fy: number; cx: number; cy: number } | null>(
    null,
  );
  const [zoom, setZoom] = useState(1);
  const [grabbing, setGrabbing] = useState(false);

  // Zoom con la rueda (centrado en el cursor). Listener nativo no-pasivo.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      focal.current = {
        fx: (el.scrollLeft + cx) / el.scrollWidth,
        fy: (el.scrollTop + cy) / el.scrollHeight,
        cx,
        cy,
      };
      setZoom((z) =>
        Math.min(MAX, Math.max(MIN, +(z + (e.deltaY < 0 ? 0.5 : -0.5)).toFixed(2))),
      );
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Tras cambiar el zoom, mantener el punto bajo el cursor.
  useLayoutEffect(() => {
    const el = boxRef.current;
    const f = focal.current;
    if (!el || !f) return;
    el.scrollLeft = f.fx * el.scrollWidth - f.cx;
    el.scrollTop = f.fy * el.scrollHeight - f.cy;
  }, [zoom]);

  // Paneo con el botón central (rueda) presionado.
  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 1) return;
    e.preventDefault();
    const el = boxRef.current;
    if (!el) return;
    const start = { x: e.clientX, y: e.clientY, sl: el.scrollLeft, st: el.scrollTop };
    setGrabbing(true);
    const move = (ev: MouseEvent) => {
      el.scrollLeft = start.sl - (ev.clientX - start.x);
      el.scrollTop = start.st - (ev.clientY - start.y);
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      setGrabbing(false);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

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
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-wide text-gris-400">
          Rueda = zoom · click-rueda + arrastrar = paneo
        </span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-gris-400">{zoom.toFixed(1)}×</span>
          <button
            type="button"
            onClick={() => setZoom(1)}
            disabled={zoom === 1}
            className="rounded-[2px] border border-line-strong bg-white px-2 py-0.5 text-[11px] text-gris-600 hover:bg-cafe-50 disabled:opacity-40"
          >
            Reset
          </button>
        </div>
      </div>

      <div
        ref={boxRef}
        onMouseDown={onMouseDown}
        className="overflow-auto"
        style={{
          height: BASE_H + 28,
          cursor: grabbing ? "grabbing" : "default",
        }}
      >
        <div style={{ width: `${zoom * 100}%`, height: zoom * BASE_H }}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ left: 8, right: 16, top: 8, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0ebe8" />
              <XAxis
                type="number"
                dataKey="costo_neto"
                name="Costo neto"
                domain={[0, max * 1.05]}
                tickFormatter={(v) => formatCLPCompact(v as number)}
                tick={{ fontSize: 10, fill: "#6e7378", fontFamily: "var(--font-mono)" }}
              />
              <YAxis
                type="number"
                dataKey="proy_ultima"
                name="Proyección"
                domain={[0, max * 1.05]}
                tickFormatter={(v) => formatCLPCompact(v as number)}
                tick={{ fontSize: 10, fill: "#6e7378", fontFamily: "var(--font-mono)" }}
              />
              <ZAxis range={[60, 60]} />
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
                        className={
                          p.desvio > 0 ? "text-danger-700" : "text-success-700"
                        }
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
        </div>
      </div>
    </div>
  );
}
