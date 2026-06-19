"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Resumen" },
  { href: "/comparar", label: "Reportes" },
  { href: "/analisis", label: "Análisis" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/" || pathname.startsWith("/obra");
  return pathname === href || pathname.startsWith(href + "/");
}

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-[60px] w-full max-w-[1280px] items-center gap-6 px-5 md:px-8">
        {/* Wordmark + motivo del cuadrado en escorzo */}
        <Link href="/" className="group flex items-center gap-3 no-underline">
          <span
            aria-hidden
            className="inline-block h-3.5 w-3.5 rotate-45 bg-azul-500"
          />
          <span className="flex flex-col leading-none">
            <span className="font-display text-[15px] font-bold tracking-tight text-gris-900">
              GARCÍA
            </span>
            <span className="eyebrow text-[8.5px] text-cafe-500">
              Constructora
            </span>
          </span>
        </Link>

        <span className="hidden h-7 w-px bg-line md:block" />

        <span className="hidden font-display text-sm font-semibold text-gris-700 md:inline">
          Sobrecostos
        </span>

        {/* Navegación horizontal */}
        <nav className="ml-2 flex items-center gap-1 md:ml-4">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative px-3 py-2 text-sm font-medium no-underline transition-colors hover:text-gris-900",
                  active ? "text-gris-900" : "text-gris-500",
                )}
              >
                {item.label}
                {active && (
                  <span className="absolute inset-x-3 -bottom-px h-[3px] bg-azul-500" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Marca de entorno: aún prototipo, no "Entorno CJMG" */}
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-[2px] border border-cafe-200 bg-cafe-50 px-2 py-1">
          <span aria-hidden className="h-1.5 w-1.5 bg-cafe-400" />
          <span className="font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-cafe-600">
            Prototipo
          </span>
        </span>
      </div>
    </header>
  );
}
