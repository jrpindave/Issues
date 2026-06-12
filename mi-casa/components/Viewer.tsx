"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import RightPanel from "./RightPanel";
import Toolbar from "./Toolbar";

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

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      <header className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950/80 px-4 py-2.5 backdrop-blur">
        <div className="flex items-baseline gap-2">
          <h1 className="text-sm font-semibold tracking-wide text-zinc-100">Mi Casa</h1>
          <span className="text-xs text-zinc-500">Planificador 3D · 2 niveles</span>
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
