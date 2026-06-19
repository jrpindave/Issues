<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Proyecto: Dashboard Sobrecostos (Constructora García)

Stack: Next.js 16 (App Router, RSC-first) · React 19 · TS strict · Tailwind v4 ·
Recharts · Supabase (`@supabase/ssr`, server client, solo lectura, anon key).

Convenciones:

- **RSC-first**: Server Components por defecto; `"use client"` solo en gráficos
  (Recharts) y controles de filtro. El estado de filtros vive en la **URL**
  (`searchParams`), no en estado de cliente.
- **Datos**: todo acceso a datos pasa por `src/lib/queries.ts` (tipado en
  `src/lib/types.ts`). Las agregaciones viven en vistas SQL del data warehouse
  (`etl/sobrecostos/sql/01_dashboard.sql`), no en el cliente.
- **`params` y `searchParams` son Promises** (Next 16): siempre `await`.
- **Formato** de montos/porcentajes: `src/lib/format.ts` (CLP, es-CL).
- Programas: **DS19** = CH_228, SP_296, LA_179 · **DS49** = HUA_202, LA_247,
  LA_365, NA_162, MU_293, NE_149 (columna `programa` en `SobrecostosDboard_obra`).
- Subsegmento (tipología) = mapeo manual obra→tipología, mismo criterio que
  `programa` (columna `subsegmento`, ver `etl/sql/04`). Dimensión de comparación
  en `/comparar`.
- Desvío = `real_obra − presupuesto`. Verde si < 0 (bajo presupuesto), rojo si > 0.
