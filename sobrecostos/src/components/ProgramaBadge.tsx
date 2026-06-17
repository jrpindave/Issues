import { cn } from "@/lib/utils";
import type { Programa } from "@/lib/types";

/** Etiqueta de programa: tag mono cuadrado (no pill), códigos del manual. */
const styles: Record<string, string> = {
  DS19: "border-azul-200 bg-azul-50 text-azul-700",
  DS49: "border-cafe-200 bg-cafe-50 text-cafe-700",
  "—": "border-gris-200 bg-gris-50 text-gris-500",
};

export function ProgramaBadge({
  programa,
  className,
}: {
  programa: Programa;
  className?: string;
}) {
  const label = programa ?? "—";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[2px] border px-1.5 py-0.5 font-mono text-[11px] font-medium tracking-wide",
        styles[label] ?? styles["—"],
        className,
      )}
    >
      {label}
    </span>
  );
}
