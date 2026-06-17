import { cn } from "@/lib/utils";
import { formatCLPCompact, formatPct } from "@/lib/format";

/**
 * Desvío = real − presupuesto.
 *   > 0  sobrecosto (real supera presupuesto)  → rojo
 *   < 0  bajo presupuesto (consumo parcial)    → verde
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
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium tabular",
        overrun
          ? "bg-red-50 text-red-700"
          : "bg-emerald-50 text-emerald-700",
        className,
      )}
    >
      {formatCLPCompact(monto)}
      {fraction != null && Number.isFinite(fraction) && (
        <span className="opacity-70">({formatPct(fraction)})</span>
      )}
    </span>
  );
}
