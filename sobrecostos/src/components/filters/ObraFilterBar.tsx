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
    <div className="flex flex-col gap-4 rounded-[3px] border border-line bg-white p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.1em] text-gris-500">
          Programa
        </span>
        <div className="inline-flex rounded-[2px] border border-line p-0.5">
          {PROGRAMAS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => selectPrograma(p.key)}
              className="rounded-[2px] px-3 py-1 text-sm font-medium text-gris-600 transition-colors hover:bg-cafe-50 hover:text-gris-900"
            >
              {p.label}
            </button>
          ))}
        </div>

        <span className="ml-auto font-mono text-[10.5px] font-medium uppercase tracking-[0.1em] text-gris-500">
          Centro de costo
        </span>
        <select
          value={cc}
          onChange={(e) => push({ cc: e.target.value })}
          className="max-w-xs rounded-[2px] border border-line-strong bg-white px-2 py-1.5 text-sm text-gris-700 focus:border-azul-500"
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
                "rounded-[2px] border px-3 py-1 font-mono text-[12px] font-medium transition-colors",
                active
                  ? "border-azul-600 bg-azul-500 text-white"
                  : "border-line-strong bg-white text-gris-600 hover:bg-cafe-50",
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
