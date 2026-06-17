import { cn } from "@/lib/utils";
import { formatCLPCompact, formatPct } from "@/lib/format";

/**
 * Desvío = real − presupuesto. Marcador cuadrado de estado + cifra mono.
 *   > 0  sobrecosto (real supera presupuesto)  → rojo (crítico)
 *   ≤ 0  dentro de presupuesto                 → verde
 */
export function DesvioPill({
  monto,
  fraction,
  className,
}: {
  monto: number;
  fraction?: number | null;
  className?: string;
}) {
  const overrun = monto > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-mono text-[12px] font-medium tabular-nums",
        overrun ? "text-danger-700" : "text-success-700",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "h-2 w-2 shrink-0",
          overrun ? "bg-danger-500" : "bg-success-500",
        )}
      />
      {formatCLPCompact(monto)}
      {fraction != null && Number.isFinite(fraction) && (
        <span className="text-gris-400">({formatPct(fraction)})</span>
      )}
    </span>
  );
}
