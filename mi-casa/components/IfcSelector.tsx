"use client";

import { useEffect, useState } from "react";
import { ifcPublicUrl, listIfcs } from "@/lib/supabase";

/** Dropdown to choose which IFC (from the Supabase bucket) the app loads. */
export default function IfcSelector() {
  const [names, setNames] = useState<string[]>(["casa.ifc"]);
  const [current, setCurrent] = useState("casa.ifc");

  useEffect(() => {
    try {
      setCurrent(localStorage.getItem("mi-casa-ifc-name") || "casa.ifc");
    } catch {
      /* ignore */
    }
    listIfcs().then((list) => setNames([...new Set(["casa.ifc", ...list])]));
  }, []);

  const onChange = (name: string) => {
    try {
      localStorage.setItem("mi-casa-ifc-name", name);
      localStorage.setItem("mi-casa-ifc-url", ifcPublicUrl(name));
    } catch {
      /* ignore */
    }
    window.location.reload();
  };

  return (
    <select
      value={current}
      onChange={(e) => onChange(e.target.value)}
      title="Elegir versión del IFC (desde Supabase)"
      className="max-w-[160px] rounded-md border border-zinc-700 bg-zinc-900 px-1.5 py-1 text-xs text-zinc-200 outline-none focus:border-sky-600"
    >
      {names.map((n) => (
        <option key={n} value={n}>
          {n}
        </option>
      ))}
    </select>
  );
}
