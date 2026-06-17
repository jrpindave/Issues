import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sobrecostos · Constructora García",
  description:
    "Control de costos y desvíos por obra y centro de costo (DS19 / DS49).",
};

const nav = [
  { href: "/", label: "Resumen" },
  { href: "/comparar", label: "Comparar obras" },
];

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <div className="flex min-h-screen flex-col md:flex-row">
          <aside className="flex shrink-0 flex-col gap-1 border-b border-slate-800 bg-slate-900 px-4 py-4 text-slate-300 md:w-60 md:border-b-0 md:border-r md:px-5 md:py-6">
            <Link href="/" className="mb-4 block px-2">
              <span className="block text-base font-semibold text-white">
                Sobrecostos
              </span>
              <span className="block text-xs text-slate-400">
                Constructora García
              </span>
            </Link>
            <nav className="flex gap-1 md:flex-col">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>
          <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
