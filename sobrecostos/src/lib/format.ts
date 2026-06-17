// Formateo en convención chilena (CLP, sin decimales).

const clp = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

const clpCompact = new Intl.NumberFormat("es-CL", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const pct = new Intl.NumberFormat("es-CL", {
  style: "percent",
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
});

export function formatCLP(value: number | null | undefined): string {
  return clp.format(value ?? 0);
}

/** Monto compacto con prefijo $ (p. ej. $12,3 mil M). */
export function formatCLPCompact(value: number | null | undefined): string {
  return "$" + clpCompact.format(value ?? 0);
}

/** Recibe una fracción (0.12 = 12%). */
export function formatPct(fraction: number | null | undefined): string {
  if (fraction == null || !Number.isFinite(fraction)) return "—";
  return pct.format(fraction);
}

export function formatMonthYear(periodo: string): string {
  // periodo viene como 'YYYY-MM-DD'
  const d = new Date(periodo + "T00:00:00");
  return new Intl.DateTimeFormat("es-CL", {
    month: "short",
    year: "2-digit",
  }).format(d);
}
