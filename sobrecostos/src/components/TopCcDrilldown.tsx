"use client";

import { Fragment, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DesvioPill } from "@/components/DesvioPill";
import { formatCLP, formatCLPCompact } from "@/lib/format";
import type { CentroGlobal } from "@/lib/cta";

/** Top centros de costo (global) con drill-down a familias. Al clickear una
 *  familia se fija en AMBOS paneles de dispersión (params af y bf). */
export function TopCcDrilldown({ centros }: { centros: CentroGlobal[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = useState<string | null>(null);

  const pickFamilia = (key: string) => {
    const sp = new URLSearchParams(params.toString());
    sp.set("af", key);
    sp.set("bf", key);
    router.push(`/analisis?${sp.toString()}`, { scroll: false });
    if (typeof window !== "undefined")
      window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left font-mono text-[10.5px] uppercase tracking-[0.08em] text-gris-500">
            <th className="px-5 py-2.5 font-medium">#</th>
            <th className="px-3 py-2.5 font-medium">Centro de costo</th>
            <th className="px-3 py-2.5 text-right font-medium">Costo neto</th>
            <th className="px-3 py-2.5 text-right font-medium">Proyección</th>
            <th className="px-3 py-2.5 text-right font-medium">Desvío</th>
            <th className="px-5 py-2.5 text-right font-medium">Incidencia</th>
          </tr>
        </thead>
        <tbody>
          {centros.map((c, i) => {
            const isOpen = open === c.cc_codigo;
            const fr = c.costo_neto ? c.desvio / c.costo_neto : null;
            return (
              <Fragment key={c.cc_codigo}>
                <tr
                  className="cursor-pointer border-b border-line hover:bg-cafe-50"
                  onClick={() => setOpen(isOpen ? null : c.cc_codigo)}
                >
                  <td className="px-5 py-2.5 tabular text-gris-400">{i + 1}</td>
                  <td className="px-3 py-2.5">
                    <span className="mr-1 inline-block w-3 text-gris-400">
                      {isOpen ? "▾" : "▸"}
                    </span>
                    <span className="font-mono text-xs text-gris-500">
                      {c.cc_codigo}
                    </span>{" "}
                    <span className="text-gris-800">{c.cc_nombre}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular text-gris-700">
                    {formatCLP(c.costo_neto)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular text-gris-700">
                    {formatCLP(c.proy_ultima)}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <DesvioPill monto={c.desvio} fraction={fr} />
                  </td>
                  <td className="px-5 py-2.5 text-right tabular text-gris-700">
                    {(c.incidencia * 100).toFixed(0)}%
                  </td>
                </tr>
                {isOpen && (
                  <tr className="border-b border-line bg-cafe-50/40">
                    <td colSpan={6} className="px-5 py-3">
                      <p className="mb-2 font-mono text-[10px] uppercase tracking-wide text-gris-400">
                        Familias con más desvío en {c.cc_codigo} — click para
                        verla en ambos paneles
                      </p>
                      <ul className="divide-y divide-line border border-line bg-white">
                        {c.familias.map((f) => (
                          <li key={f.key}>
                            <button
                              type="button"
                              onClick={() => pickFamilia(f.key)}
                              className="flex w-full items-center gap-3 px-3 py-1.5 text-left text-[13px] text-gris-700 transition-colors hover:bg-cafe-50"
                              title={`${f.clase} · neto ${formatCLP(f.costo_neto)} · proy ${formatCLP(f.proy_ultima)}`}
                            >
                              <span
                                aria-hidden
                                className={`h-1.5 w-1.5 shrink-0 ${f.desvio > 0 ? "bg-danger-500" : "bg-success-500"}`}
                              />
                              <span className="flex-1 truncate">{f.key}</span>
                              <span
                                className={`tabular ${f.desvio > 0 ? "text-danger-700" : "text-success-700"}`}
                              >
                                {formatCLPCompact(f.desvio)}
                              </span>
                              <span className="w-12 text-right tabular text-gris-500">
                                {((f.incidencia ?? 0) * 100).toFixed(0)}%
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
