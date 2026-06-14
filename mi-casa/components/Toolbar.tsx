"use client";

import { useRef } from "react";
import { usePlanner } from "@/lib/store";
import { listConfigs, loadConfig, saveConfig } from "@/lib/supabase";

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
  const snapEnabled = usePlanner((s) => s.snapEnabled);
  const setSnapEnabled = usePlanner((s) => s.setSnapEnabled);
  const paintMode = usePlanner((s) => s.paintMode);
  const setPaintMode = usePlanner((s) => s.setPaintMode);
  const paintColor = usePlanner((s) => s.paintColor);
  const setPaintColor = usePlanner((s) => s.setPaintColor);
  const resetWalls = usePlanner((s) => s.resetWalls);
  const gizmoMode = usePlanner((s) => s.gizmoMode);
  const setGizmoMode = usePlanner((s) => s.setGizmoMode);
  const measureMode = usePlanner((s) => s.measureMode);
  const setMeasureMode = usePlanner((s) => s.setMeasureMode);
  const clearMeasures = usePlanner((s) => s.clearMeasures);
  const items = usePlanner((s) => s.items);
  const importLayout = usePlanner((s) => s.importLayout);
  const wallColors = usePlanner((s) => s.wallColors);
  const setWallColors = usePlanner((s) => s.setWallColors);

  const saveCloud = async () => {
    const name = window.prompt("Nombre de la configuración (nube):");
    if (!name) return;
    try {
      await saveConfig(name, { items, wallColors });
      window.alert("Guardado en la nube ✓");
    } catch (e) {
      window.alert("Error al guardar: " + (e as Error).message);
    }
  };
  const loadCloud = async () => {
    const list = await listConfigs();
    if (!list.length) return window.alert("No hay configuraciones guardadas en la nube.");
    const name = window.prompt(
      "Cargar configuración:\n" + list.map((c) => "• " + c.name).join("\n"),
      list[0].name
    );
    if (!name) return;
    try {
      const data = (await loadConfig(name)) as { items?: unknown; wallColors?: Record<string, string> } | null;
      if (data?.items) {
        importLayout(data.items as Parameters<typeof importLayout>[0]);
        setWallColors(data.wallColors ?? {});
      } else {
        window.alert("No encontré esa configuración.");
      }
    } catch (e) {
      window.alert("Error al cargar: " + (e as Error).message);
    }
  };
  const fileRef = useRef<HTMLInputElement>(null);

  const exportLayout = () => {
    const blob = new Blob([JSON.stringify({ version: 1, items }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mi-casa-distribucion.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then((txt) => {
      try {
        const data = JSON.parse(txt);
        if (Array.isArray(data.items)) importLayout(data.items);
      } catch {
        /* archivo inválido: se ignora */
      }
    });
    e.target.value = "";
  };

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
        <Chip
          active={gizmoMode !== "translate"}
          onClick={() =>
            setGizmoMode(
              gizmoMode === "translate" ? "rotate" : gizmoMode === "rotate" ? "scale" : "translate"
            )
          }
          title="Gizmo de la pieza: ciclar Mover → Rotar → Redimensionar"
        >
          {gizmoMode === "translate"
            ? "Gizmo: Mover"
            : gizmoMode === "rotate"
              ? "Gizmo: Rotar"
              : "Gizmo: Redimensionar"}
        </Chip>
        <Chip active={planView} onClick={() => setPlanView(!planView)} title="Vista en planta (cenital)">
          {planView ? "Vista planta" : "Vista órbita"}
        </Chip>
        <Chip active={showGrid} onClick={() => setShowGrid(!showGrid)} title="Mostrar grilla">
          Grilla
        </Chip>
        <Chip
          active={measureMode}
          onClick={() => setMeasureMode(!measureMode)}
          title="Medir: toca dos puntos sobre la geometría para ver la distancia"
        >
          📏 Medir
        </Chip>
        {measureMode && (
          <Chip onClick={clearMeasures} title="Borrar todas las cotas">
            Limpiar cotas
          </Chip>
        )}
        <Chip
          active={snapEnabled}
          onClick={() => setSnapEnabled(!snapEnabled)}
          title="Al soltar, pega la pieza a los muros del IFC"
        >
          Snap muros
        </Chip>
        <Chip onClick={clearMovable} title="Quitar todos los muebles agregados">
          Vaciar
        </Chip>
      </div>

      <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950/80 p-1.5 backdrop-blur">
        <span className="px-1 text-[10px] uppercase tracking-wider text-zinc-500">Config</span>
        <Chip onClick={exportLayout} title="Descargar tu distribución como archivo .json">
          Guardar
        </Chip>
        <Chip onClick={() => fileRef.current?.click()} title="Cargar una distribución desde un .json">
          Cargar
        </Chip>
        <Chip onClick={saveCloud} title="Guardar la configuración en Supabase (nube)">
          ☁ Guardar
        </Chip>
        <Chip onClick={loadCloud} title="Cargar una configuración desde Supabase (nube)">
          ☁ Cargar
        </Chip>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={onImportFile}
        />
      </div>

      <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950/80 p-1.5 backdrop-blur">
        <span className="px-1 text-[10px] uppercase tracking-wider text-zinc-500">Pintura</span>
        <Chip
          active={paintMode}
          onClick={() => setPaintMode(!paintMode)}
          title="Activa y toca un muro para pintarlo con el color elegido"
        >
          {paintMode ? "Pintando muros" : "Pintar muros"}
        </Chip>
        <input
          type="color"
          value={paintColor}
          onChange={(e) => setPaintColor(e.target.value)}
          title="Color de pintura"
          className="h-6 w-8 cursor-pointer rounded border border-zinc-700 bg-transparent"
        />
        <Chip onClick={resetWalls} title="Quitar la pintura de todos los muros">
          Restablecer
        </Chip>
      </div>
    </div>
  );
}
