"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { cn } from "@/lib/utils";
import type { CentroCosto, Programa } from "@/lib/types";

interface ObraOpt {
  obra: string;
  nombre: string | null;
  programa: Programa;
}

const PROGRAMAS: { key: "todos" | "DS19" | "DS49"; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "DS19", label: "DS19" },
  { key: "DS49", label: "DS49" },
];

export function ObraFilterBar({
  obras,
  centros,
  selected,
  cc,
}: {
  obras: ObraOpt[];
  centros: CentroCosto[];
  selected: string[];
  cc: string;
}) {
  const router = useRouter();
  const params = useSearchParams();

  const push = useCallback(
    (next: { obras?: string[]; cc?: string }) => {
      const sp = new URLSearchParams(params.toString());
      if (next.obras !== undefined) {
        if (next.obras.length) sp.set("obras", next.obras.join(","));
        else sp.delete("obras");
      }
      if (next.cc !== undefined) {
        if (next.cc) sp.set("cc", next.cc);
        else sp.delete("cc");
      }
      router.push(`/comparar?${sp.toString()}`, { scroll: false });
    },
    [params, router],
  );

  const selectPrograma = (key: "todos" | "DS19" | "DS49") => {
    const next =
      key === "todos"
        ? obras.map((o) => o.obra)
        : obras.filter((o) => o.programa === key).map((o) => o.obra);
    push({ obras: next });
  };

  const toggleObra = (obra: string) => {
    const set = new Set(selected);
    if (set.has(obra)) set.delete(obra);
    else set.add(obra);
    push({ obras: obras.filter((o) => set.has(o.obra)).map((o) => o.obra) });
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Programa
        </span>
        <div className="inline-flex rounded-lg border border-slate-200 p-0.5">
          {PROGRAMAS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => selectPrograma(p.key)}
              className="rounded-md px-3 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              {p.label}
            </button>
          ))}
        </div>

        <span className="ml-auto text-xs font-medium uppercase tracking-wide text-slate-500">
          Centro de costo
        </span>
        <select
          value={cc}
          onChange={(e) => push({ cc: e.target.value })}
          className="max-w-xs rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700"
        >
          <option value="">Todos los centros</option>
          {centros.map((c) => (
            <option key={c.cc_codigo} value={c.cc_codigo}>
              {c.cc_codigo} · {c.cc_nombre ?? ""}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        {obras.map((o) => {
          const active = selected.includes(o.obra);
          return (
            <button
              key={o.obra}
              type="button"
              onClick={() => toggleObra(o.obra)}
              className={cn(
                "rounded-full border px-3 py-1 text-sm transition-colors",
                active
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50",
              )}
            >
              {o.obra}
            </button>
          );
        })}
      </div>
    </div>
  );
}
