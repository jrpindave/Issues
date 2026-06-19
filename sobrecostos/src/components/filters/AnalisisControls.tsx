"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { Programa } from "@/lib/types";

interface ObraOpt {
  obra: string;
  programa: Programa;
  subsegmento: string | null;
}

const sel =
  "w-full rounded-[2px] border border-line-strong bg-white px-2 py-1.5 text-sm text-gris-700 focus:border-azul-500";

/** Controles de un panel de análisis: Programa → Subsegmento → Obra → Familia.
 *  El estado vive en la URL con prefijo (a/b) para no pisar el otro panel. */
export function AnalisisControls({
  prefix,
  obras,
  familias,
  programa,
  subsegmento,
  obra,
  familia,
}: {
  prefix: string;
  obras: ObraOpt[];
  familias: string[];
  programa: string;
  subsegmento: string;
  obra: string;
  familia: string;
}) {
  const router = useRouter();
  const params = useSearchParams();

  const setAll = (patch: Record<string, string>) => {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) sp.set(prefix + k, v);
      else sp.delete(prefix + k);
    }
    router.push(`/analisis?${sp.toString()}`, { scroll: false });
  };

  const subsegmentos = [
    ...new Set(
      obras
        .filter((o) => !programa || o.programa === programa)
        .map((o) => o.subsegmento ?? "(sin tipología)"),
    ),
  ].sort((a, b) => a.localeCompare(b, "es"));

  const obrasFiltradas = obras.filter(
    (o) =>
      (!programa || o.programa === programa) &&
      (!subsegmento || (o.subsegmento ?? "(sin tipología)") === subsegmento),
  );

  return (
    <div className="grid grid-cols-2 gap-2">
      <select
        className={sel}
        value={programa}
        onChange={(e) =>
          setAll({ p: e.target.value, s: "", o: "", f: "" })
        }
      >
        <option value="">Programa: todos</option>
        <option value="DS19">DS19</option>
        <option value="DS49">DS49</option>
      </select>

      <select
        className={sel}
        value={subsegmento}
        onChange={(e) => setAll({ s: e.target.value, o: "", f: "" })}
      >
        <option value="">Subsegmento: todos</option>
        {subsegmentos.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <select
        className={sel}
        value={obra}
        onChange={(e) => setAll({ o: e.target.value, f: "" })}
      >
        <option value="">Obra…</option>
        {obrasFiltradas.map((o) => (
          <option key={o.obra} value={o.obra}>
            {o.obra}
          </option>
        ))}
      </select>

      <select
        className={sel}
        value={familia}
        onChange={(e) => setAll({ f: e.target.value })}
        disabled={!obra}
      >
        <option value="">Familia / clase…</option>
        {familias.map((f) => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
      </select>
    </div>
  );
}
