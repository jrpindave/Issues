import { cn } from "@/lib/utils";
import type { Programa } from "@/lib/types";

const styles: Record<string, string> = {
  DS19: "bg-blue-50 text-blue-700 ring-blue-600/20",
  DS49: "bg-amber-50 text-amber-700 ring-amber-600/20",
  "—": "bg-slate-100 text-slate-500 ring-slate-500/20",
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
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        styles[label] ?? styles["—"],
        className,
      )}
    >
      {label}
    </span>
  );
}
