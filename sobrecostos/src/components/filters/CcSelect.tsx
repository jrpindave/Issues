"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CentroCosto } from "@/lib/types";

export function CcSelect({
  centros,
  cc,
}: {
  centros: CentroCosto[];
  cc: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const onChange = (value: string) => {
    const sp = new URLSearchParams(params.toString());
    if (value) sp.set("cc", value);
    else sp.delete("cc");
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <select
      value={cc}
      onChange={(e) => onChange(e.target.value)}
      className="max-w-md rounded-[2px] border border-line-strong bg-white px-2 py-1.5 text-sm text-gris-700 focus:border-azul-500"
    >
      <option value="">Todos los centros de costo</option>
      {centros.map((c) => (
        <option key={c.cc_codigo} value={c.cc_codigo}>
          {c.cc_codigo} · {c.cc_nombre ?? ""}
        </option>
      ))}
    </select>
  );
}
