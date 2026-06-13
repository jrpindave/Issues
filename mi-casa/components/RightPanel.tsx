"use client";

import { useEffect, useState } from "react";
import { CATALOG, CATEGORIES } from "@/lib/catalog";
import { usePlanner } from "@/lib/store";
import type { FurnitureItem } from "@/lib/types";

export default function RightPanel() {
  const [tab, setTab] = useState<"lib" | "insp">("lib");
  const selectedId = usePlanner((s) => s.selectedId);

  // Jump to the inspector when the user picks a piece.
  useEffect(() => {
    if (selectedId) setTab("insp");
  }, [selectedId]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex border-b border-zinc-800">
        <TabButton active={tab === "lib"} onClick={() => setTab("lib")}>
          Biblioteca
        </TabButton>
        <TabButton active={tab === "insp"} onClick={() => setTab("insp")}>
          Inspector
        </TabButton>
      </div>
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
        {tab === "lib" ? <Library /> : <Inspector />}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 px-3 py-2.5 text-xs font-semibold tracking-wide transition-colors ${
        active ? "bg-zinc-900 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
      }`}
    >
      {children}
    </button>
  );
}

// ── Library ────────────────────────────────────────────────────
function Library() {
  const levels = usePlanner((s) => s.levels);
  const addTemplate = usePlanner((s) => s.addTemplate);
  const [target, setTarget] = useState(0);

  const levelNames = levels.length
    ? levels.map((l) => l.name)
    : ["Nivel 1", "Nivel 2"];

  return (
    <div className="p-3">
      <div className="mb-3">
        <p className="mb-1.5 text-[10px] uppercase tracking-wider text-zinc-500">
          Agregar al nivel
        </p>
        <div className="flex gap-1.5">
          {levelNames.map((name, i) => (
            <button
              key={i}
              onClick={() => setTarget(i)}
              className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-medium ${
                target === i
                  ? "border-sky-500/60 bg-sky-500/15 text-sky-200"
                  : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {CATEGORIES.map((cat) => (
        <div key={cat} className="mb-4">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            {cat}
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {CATALOG.filter((t) => t.category === cat).map((t) => (
              <button
                key={t.type}
                onClick={() => addTemplate(t, target)}
                className="group flex flex-col gap-1 rounded-md border border-zinc-800 bg-zinc-900/60 p-2 text-left hover:border-zinc-600 hover:bg-zinc-800/80"
              >
                <span className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-3 w-3 shrink-0 rounded-sm"
                    style={{ backgroundColor: t.color }}
                  />
                  <span className="truncate text-xs text-zinc-200">{t.label}</span>
                </span>
                <span className="text-[10px] tabular-nums text-zinc-500">
                  {t.width}×{t.depth}×{t.height} m
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}

      <p className="mt-2 text-[10px] leading-relaxed text-zinc-600">
        Clic para agregar. Selecciona una pieza en la escena para moverla con el gizmo o
        editar sus medidas en el Inspector.
      </p>
    </div>
  );
}

// ── Inspector ──────────────────────────────────────────────────
function Inspector() {
  const items = usePlanner((s) => s.items);
  const selectedId = usePlanner((s) => s.selectedId);
  const levels = usePlanner((s) => s.levels);
  const updateItem = usePlanner((s) => s.updateItem);
  const removeItem = usePlanner((s) => s.removeItem);
  const duplicateItem = usePlanner((s) => s.duplicateItem);

  const item = items.find((it) => it.id === selectedId) ?? null;

  if (!item) {
    return (
      <div className="p-4 text-xs leading-relaxed text-zinc-500">
        Ninguna pieza seleccionada. Haz clic sobre un mueble en la escena para editar sus
        dimensiones, color, rotación y nivel.
      </div>
    );
  }

  const levelNames = levels.length ? levels.map((l) => l.name) : ["Nivel 1", "Nivel 2"];

  return (
    <div className="p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <input
          value={item.label}
          onChange={(e) => updateItem(item.id, { label: e.target.value })}
          className="min-w-0 flex-1 rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-sm text-zinc-100 outline-none focus:border-sky-600"
        />
        {item.fixture && (
          <span className="shrink-0 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
            fijo
          </span>
        )}
      </div>

      <Section title="Dimensiones (m)">
        <DimRow label="Ancho" value={item.width} onChange={(v) => updateItem(item.id, { width: v })} />
        <DimRow label="Fondo" value={item.depth} onChange={(v) => updateItem(item.id, { depth: v })} />
        <DimRow label="Alto" value={item.height} onChange={(v) => updateItem(item.id, { height: v })} />
        {item.shape === "L" && (
          <DimRow
            label="Asiento"
            value={item.arm ?? 0.9}
            onChange={(v) => updateItem(item.id, { arm: v })}
          />
        )}
        {(item.yOffset ?? 0) !== 0 && (
          <button
            onClick={() => updateItem(item.id, { yOffset: 0 })}
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 py-1 text-[11px] text-zinc-300 hover:bg-zinc-800"
          >
            Apoyar en el piso (elevación {(item.yOffset ?? 0).toFixed(2)} m → 0)
          </button>
        )}
      </Section>

      <Section title="Rotación">
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={360}
            step={5}
            value={Math.round((item.rotationY * 180) / Math.PI)}
            onChange={(e) =>
              updateItem(item.id, { rotationY: (Number(e.target.value) * Math.PI) / 180 })
            }
            className="flex-1"
          />
          <span className="w-12 text-right text-xs tabular-nums text-zinc-400">
            {Math.round((item.rotationY * 180) / Math.PI)}°
          </span>
        </div>
        <div className="mt-1.5 flex gap-1.5">
          {[0, 90, 180, 270].map((deg) => (
            <button
              key={deg}
              onClick={() => updateItem(item.id, { rotationY: (deg * Math.PI) / 180 })}
              className="flex-1 rounded border border-zinc-700 bg-zinc-900 py-1 text-[11px] text-zinc-300 hover:bg-zinc-800"
            >
              {deg}°
            </button>
          ))}
        </div>
      </Section>

      <Section title="Posición (m)">
        <PosRow label="X (ancho)" value={item.x} onChange={(v) => updateItem(item.id, { x: v })} />
        <PosRow label="Z (largo)" value={item.z} onChange={(v) => updateItem(item.id, { z: v })} />
        <p className="mt-1 text-[10px] leading-relaxed text-zinc-600">
          También puedes arrastrar la pieza con el gizmo en la escena.
        </p>
      </Section>

      <Section title="Nivel">
        <div className="flex gap-1.5">
          {levelNames.map((name, i) => (
            <button
              key={i}
              onClick={() => updateItem(item.id, { level: i })}
              className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-medium ${
                item.level === i
                  ? "border-sky-500/60 bg-sky-500/15 text-sky-200"
                  : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Color">
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={item.color}
            onChange={(e) => updateItem(item.id, { color: e.target.value })}
            className="h-8 w-12 cursor-pointer rounded border border-zinc-700 bg-transparent"
          />
          <span className="text-xs tabular-nums text-zinc-500">{item.color}</span>
        </div>
      </Section>

      <Section title="Enlace al producto">
        <div className="flex items-center gap-2">
          <input
            type="url"
            inputMode="url"
            placeholder="https://tienda.com/producto…"
            value={item.link ?? ""}
            onChange={(e) => updateItem(item.id, { link: e.target.value })}
            className="min-w-0 flex-1 rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-200 outline-none focus:border-sky-600"
          />
          {item.link && (
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-md border border-sky-700/60 bg-sky-500/10 px-2 py-1 text-xs text-sky-200 hover:bg-sky-500/20"
            >
              Abrir
            </a>
          )}
        </div>
      </Section>

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => duplicateItem(item.id)}
          className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800"
        >
          Duplicar
        </button>
        <button
          onClick={() => removeItem(item.id)}
          className="flex-1 rounded-md border border-red-900/60 bg-red-950/40 py-1.5 text-xs text-red-300 hover:bg-red-900/40"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3.5">
      <p className="mb-1.5 text-[10px] uppercase tracking-wider text-zinc-500">{title}</p>
      {children}
    </div>
  );
}

function PosRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const round = (v: number) => Math.round(v * 100) / 100;
  return (
    <div className="mb-1.5 flex items-center gap-2">
      <span className="w-16 text-xs text-zinc-400">{label}</span>
      <button
        onClick={() => onChange(round(value - 0.1))}
        className="h-7 w-7 rounded border border-zinc-700 bg-zinc-900 text-sm text-zinc-300 hover:bg-zinc-800"
      >
        −
      </button>
      <input
        type="number"
        step={0.05}
        value={round(value)}
        onChange={(e) => onChange(round(Number(e.target.value)))}
        className="w-20 rounded border border-zinc-800 bg-zinc-900 px-1.5 py-1 text-right text-xs tabular-nums text-zinc-200 outline-none focus:border-sky-600"
      />
      <button
        onClick={() => onChange(round(value + 0.1))}
        className="h-7 w-7 rounded border border-zinc-700 bg-zinc-900 text-sm text-zinc-300 hover:bg-zinc-800"
      >
        +
      </button>
    </div>
  );
}

function DimRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const clamp = (v: number) => Math.max(0.05, Math.min(6, v));
  return (
    <div className="mb-1.5 flex items-center gap-2">
      <span className="w-12 text-xs text-zinc-400">{label}</span>
      <input
        type="range"
        min={0.1}
        max={4}
        step={0.05}
        value={value}
        onChange={(e) => onChange(clamp(Number(e.target.value)))}
        className="flex-1"
      />
      <input
        type="number"
        min={0.05}
        max={6}
        step={0.05}
        value={Number(value.toFixed(2))}
        onChange={(e) => onChange(clamp(Number(e.target.value)))}
        className="w-16 rounded border border-zinc-800 bg-zinc-900 px-1.5 py-1 text-right text-xs tabular-nums text-zinc-200 outline-none focus:border-sky-600"
      />
    </div>
  );
}
