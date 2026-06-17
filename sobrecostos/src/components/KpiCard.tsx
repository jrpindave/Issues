import { cn } from "@/lib/utils";

/**
 * KPI estilo "tablero de instrumento": plano, hairline cálido, número mono
 * grande, etiqueta en versales con tracking. Sin sombra flotante.
 */
export function KpiCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "positive" | "negative";
}) {
  return (
    <div className="relative rounded-[3px] border border-line bg-white p-4">
      <span
        aria-hidden
        className={cn(
          "absolute left-0 top-0 h-full w-[3px]",
          tone === "positive" && "bg-success-500",
          tone === "negative" && "bg-danger-500",
          tone === "default" && "bg-cafe-200",
        )}
      />
      <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.1em] text-gris-500">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 font-mono text-2xl font-semibold tabular-nums",
          tone === "positive" && "text-success-700",
          tone === "negative" && "text-danger-700",
          tone === "default" && "text-gris-900",
        )}
      >
        {value}
      </p>
      {hint && (
        <p className="mt-1 font-mono text-[11px] text-gris-500">{hint}</p>
      )}
    </div>
  );
}
