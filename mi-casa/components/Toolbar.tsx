"use client";

import { usePlanner } from "@/lib/store";

function Chip({
  active,
  onClick,
  children,
  title,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-sky-500/60 bg-sky-500/15 text-sky-200"
          : "border-zinc-700 bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800"
      }`}
    >
      {children}
    </button>
  );
}

export default function Toolbar() {
  const levels = usePlanner((s) => s.levels);
  const levelVisible = usePlanner((s) => s.levelVisible);
  const toggleLevel = usePlanner((s) => s.toggleLevel);
  const showGrid = usePlanner((s) => s.showGrid);
  const setShowGrid = usePlanner((s) => s.setShowGrid);
  const planView = usePlanner((s) => s.planView);
  const setPlanView = usePlanner((s) => s.setPlanView);
  const clearMovable = usePlanner((s) => s.clearMovable);
  const restoreFixtures = usePlanner((s) => s.restoreFixtures);

  return (
    <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-2">
      <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950/80 p-1.5 backdrop-blur">
        <span className="px-1 text-[10px] uppercase tracking-wider text-zinc-500">Niveles</span>
        {(levels.length ? levels : [{ index: 0, name: "Nivel 1" }, { index: 1, name: "Nivel 2" }]).map(
          (lvl) => (
            <Chip
              key={lvl.index}
              active={levelVisible[lvl.index] ?? true}
              onClick={() => toggleLevel(lvl.index)}
              title={`Mostrar/ocultar ${lvl.name}`}
            >
              {lvl.name}
            </Chip>
          )
        )}
      </div>

      <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950/80 p-1.5 backdrop-blur">
        <Chip active={planView} onClick={() => setPlanView(!planView)} title="Vista en planta (cenital)">
          {planView ? "Vista planta" : "Vista órbita"}
        </Chip>
        <Chip active={showGrid} onClick={() => setShowGrid(!showGrid)} title="Mostrar grilla">
          Grilla
        </Chip>
        <Chip onClick={restoreFixtures} title="Reponer cocina, lavadora, despensa y clósets">
          Restaurar fijos
        </Chip>
        <Chip onClick={clearMovable} title="Quitar todos los muebles agregados (deja los fijos)">
          Limpiar
        </Chip>
      </div>
    </div>
  );
}
