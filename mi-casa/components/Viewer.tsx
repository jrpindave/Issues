"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import RightPanel from "./RightPanel";
import Toolbar from "./Toolbar";
import { usePlanner } from "@/lib/store";

// Bump on every deploy so you can confirm the new build actually loaded.
const APP_VERSION = "v13 · sofa-L+gizmoY";

// web-ifc + three only run in the browser.
const Scene3D = dynamic(() => import("./Scene3D"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-zinc-400">
      Cargando visualizador…
    </div>
  ),
});

export default function Viewer() {
  const [panelOpen, setPanelOpen] = useState(true);
  const modelStatus = usePlanner((s) => s.modelStatus);
  const modelError = usePlanner((s) => s.modelError);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      <header className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950/80 px-4 py-2.5 backdrop-blur">
        <div className="flex items-baseline gap-2">
          <h1 className="text-sm font-semibold tracking-wide text-zinc-100">Mi Casa</h1>
          <span className="text-xs text-zinc-500">Planificador 3D · 2 niveles</span>
          <span className="rounded bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-medium text-sky-300">
            {APP_VERSION}
          </span>
        </div>
        <button
          onClick={() => setPanelOpen((v) => !v)}
          className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
        >
          {panelOpen ? "Ocultar panel" : "Mostrar panel"}
        </button>
      </header>

      <div className="relative flex min-h-0 flex-1">
        <main className="relative min-w-0 flex-1">
          <Scene3D />
          <Toolbar />

          {modelStatus === "loading" && (
            <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-zinc-700 bg-zinc-950/80 px-3 py-1.5 text-xs text-zinc-300 backdrop-blur">
              <span className="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-zinc-600 border-t-sky-400 align-[-2px]" />
              Cargando modelo IFC…
            </div>
          )}

          {modelStatus === "error" && (
            <div className="absolute bottom-4 left-1/2 max-w-[90%] -translate-x-1/2 rounded-lg border border-red-900/60 bg-red-950/70 px-3.5 py-2.5 text-xs text-red-200 backdrop-blur">
              <p className="mb-1 font-semibold text-red-300">No se pudo cargar la casa (IFC)</p>
              <p className="break-words font-mono text-[11px] leading-relaxed text-red-200/90">
                {modelError ?? "Error desconocido"}
              </p>
            </div>
          )}
        </main>

        {panelOpen && (
          <aside className="w-[320px] shrink-0 border-l border-zinc-800 bg-zinc-950/95">
            <RightPanel />
          </aside>
        )}
      </div>
    </div>
  );
}
