"use client";

import { useEffect, useMemo, useState } from "react";
import { usePlanner } from "@/lib/store";
import { listConfigs, loadConfig, type ConfigRow } from "@/lib/supabase";
import type { FurnitureItem } from "@/lib/types";

const fmt = (n: number) => "$" + Math.round(n).toLocaleString("es-CL");

function summarize(items: FurnitureItem[]) {
  const map = new Map<string, { label: string; qty: number; total: number; link?: string; missing: number }>();
  let total = 0;
  for (const it of items) {
    const e = map.get(it.label) ?? { label: it.label, qty: 0, total: 0, link: it.link, missing: 0 };
    e.qty += 1;
    if (typeof it.price === "number") {
      e.total += it.price;
      total += it.price;
    } else {
      e.missing += 1;
    }
    if (!e.link && it.link) e.link = it.link;
    map.set(it.label, e);
  }
  return { rows: [...map.values()].sort((a, b) => b.total - a.total), total };
}

export default function CostPanel() {
  const items = usePlanner((s) => s.items);
  const current = useMemo(() => summarize(items), [items]);
  const missing = items.filter((i) => typeof i.price !== "number").length;

  const [configs, setConfigs] = useState<ConfigRow[]>([]);
  const [aItems, setAItems] = useState<FurnitureItem[] | null>(null);
  const [bItems, setBItems] = useState<FurnitureItem[] | null>(null);

  useEffect(() => {
    listConfigs().then(setConfigs);
  }, []);

  const pick = async (name: string, set: (v: FurnitureItem[] | null) => void) => {
    if (!name) return set(null);
    const data = (await loadConfig(name)) as { items?: FurnitureItem[] } | null;
    set(data?.items ?? []);
  };

  const cmp = useMemo(() => {
    if (!aItems || !bItems) return null;
    const A = summarize(aItems);
    const B = summarize(bItems);
    const ma = new Map(A.rows.map((r) => [r.label, r.total]));
    const mb = new Map(B.rows.map((r) => [r.label, r.total]));
    const labels = new Set<string>([...ma.keys(), ...mb.keys()]);
    const rows = [...labels]
      .map((l) => ({ label: l, a: ma.get(l) ?? 0, b: mb.get(l) ?? 0 }))
      .sort((x, y) => y.a + y.b - (x.a + x.b));
    return { rows, totalA: A.total, totalB: B.total };
  }, [aItems, bItems]);

  return (
    <div className="p-3 text-xs">
      <p className="secttl mb-1.5 text-[10px] uppercase tracking-wider text-zinc-500">Configuración actual</p>
      <table className="w-full">
        <thead className="text-zinc-500">
          <tr>
            <th className="text-left font-medium">Producto</th>
            <th className="w-8 text-right font-medium">Cant</th>
            <th className="w-24 text-right font-medium">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {current.rows.map((r) => (
            <tr key={r.label} className="border-t border-zinc-800/60">
              <td className="py-1 text-zinc-200">
                {r.link ? (
                  <a href={r.link} target="_blank" rel="noopener noreferrer" className="text-sky-300 hover:underline">
                    {r.label}
                  </a>
                ) : (
                  r.label
                )}
                {r.missing > 0 && <span className="ml-1 text-amber-400">⚠</span>}
              </td>
              <td className="py-1 text-right tabular-nums text-zinc-400">{r.qty}</td>
              <td className="py-1 text-right tabular-nums text-zinc-200">{r.total ? fmt(r.total) : "—"}</td>
            </tr>
          ))}
          {current.rows.length === 0 && (
            <tr>
              <td colSpan={3} className="py-3 text-zinc-500">
                Agrega muebles y ponles precio en el Inspector.
              </td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr className="border-t border-zinc-700">
            <td className="py-1.5 font-semibold text-zinc-100" colSpan={2}>
              Total
            </td>
            <td className="py-1.5 text-right font-semibold tabular-nums text-emerald-300">{fmt(current.total)}</td>
          </tr>
        </tfoot>
      </table>
      {missing > 0 && (
        <p className="mt-1 text-[10px] text-amber-400">⚠ {missing} pieza(s) sin precio (no suman al total).</p>
      )}

      <p className="secttl mb-1.5 mt-5 text-[10px] uppercase tracking-wider text-zinc-500">
        Comparar 2 configuraciones (nube)
      </p>
      <div className="mb-2 grid grid-cols-2 gap-2">
        <ConfigSelect configs={configs} label="A" onPick={(n) => pick(n, setAItems)} />
        <ConfigSelect configs={configs} label="B" onPick={(n) => pick(n, setBItems)} />
      </div>

      {cmp ? (
        <table className="w-full">
          <thead className="text-zinc-500">
            <tr>
              <th className="text-left font-medium">Producto</th>
              <th className="w-20 text-right font-medium">A</th>
              <th className="w-20 text-right font-medium">B</th>
            </tr>
          </thead>
          <tbody>
            {cmp.rows.map((r) => (
              <tr key={r.label} className="border-t border-zinc-800/60">
                <td className="py-1 text-zinc-200">{r.label}</td>
                <td className="py-1 text-right tabular-nums text-zinc-300">{r.a ? fmt(r.a) : "—"}</td>
                <td className="py-1 text-right tabular-nums text-zinc-300">{r.b ? fmt(r.b) : "—"}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-zinc-700">
              <td className="py-1.5 font-semibold text-zinc-100">Total</td>
              <td className="py-1.5 text-right font-semibold tabular-nums text-sky-300">{fmt(cmp.totalA)}</td>
              <td className="py-1.5 text-right font-semibold tabular-nums text-sky-300">{fmt(cmp.totalB)}</td>
            </tr>
            <tr>
              <td className="py-1 text-zinc-400">Diferencia (B − A)</td>
              <td
                colSpan={2}
                className={`py-1 text-right font-semibold tabular-nums ${
                  cmp.totalB - cmp.totalA <= 0 ? "text-emerald-300" : "text-red-300"
                }`}
              >
                {fmt(cmp.totalB - cmp.totalA)}
              </td>
            </tr>
          </tfoot>
        </table>
      ) : (
        <p className="text-[11px] leading-relaxed text-zinc-500">
          Elige dos configuraciones guardadas (☁ Guardar) para comparar sus costos lado a lado.
        </p>
      )}
    </div>
  );
}

function ConfigSelect({
  configs,
  label,
  onPick,
}: {
  configs: ConfigRow[];
  label: string;
  onPick: (name: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] text-zinc-500">Config {label}</span>
      <select
        defaultValue=""
        onChange={(e) => onPick(e.target.value)}
        className="rounded-md border border-zinc-800 bg-zinc-900 px-1.5 py-1 text-xs text-zinc-200 outline-none focus:border-sky-600"
      >
        <option value="">—</option>
        {configs.map((c) => (
          <option key={c.name} value={c.name}>
            {c.name}
          </option>
        ))}
      </select>
    </label>
  );
}
