import { cn } from "@/lib/utils";

/**
 * Tarjeta del DS: blanca, hairline cálido, radio tight (3px), plana.
 * `accent` añade la regla azul de 3px superior (eco del cuadrado de marca).
 */
export function Card({
  className,
  accent = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { accent?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-[3px] border border-line bg-white shadow-[var(--shadow-ds-xs)]",
        accent && "border-t-[3px] border-t-azul-500",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-between border-b border-line px-5 py-3",
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "font-display text-[13px] font-semibold tracking-wide text-gris-800",
        className,
      )}
      {...props}
    />
  );
}

export function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5", className)} {...props} />;
}
