# Dashboard Sobrecostos — Constructora García

Dashboard de control de costos por obra y centro de costo, con distinción de
programa **DS19** / **DS49**. Lee el data warehouse en Supabase (proyecto
`CGarcia-DataWarehouse`, tablas `SobrecostosDboard_*`).

## Stack

- **Next.js 16** (App Router, RSC-first) · **React 19** · **TypeScript** strict
- **Tailwind CSS v4** · **Recharts** (gráficos)
- **Supabase** vía `@supabase/ssr` (cliente de servidor, solo lectura, anon key)

## Pantallas

| Ruta | Descripción |
|---|---|
| `/` | Resumen ejecutivo: KPIs globales, comparación DS19 vs DS49, tabla por obra |
| `/comparar` | Comparador de obras (multiselección) con filtro por centro de costo |
| `/obra/[obra]` | Detalle de una obra: centros de costo, cuentas, proyección mensual |

## Datos

Las páginas consultan vistas creadas en `etl/sobrecostos/sql/01_dashboard.sql`:

- `SobrecostosDboard_v_obra_resumen` — totales por obra (itemizado `nivel='CTA'`).
- `SobrecostosDboard_v_cc_obra` — totales por centro de costo y obra.
- `SobrecostosDboard_v_proyeccion_mensual` — proyección mensual agregada.

La clasificación DS19/DS49 vive en la columna `programa` de
`SobrecostosDboard_obra`.

**Métrica de desvío:** `desvío = real_obra − presupuesto (costo_con_iva)`.
Negativo = aún bajo presupuesto (consumo parcial); positivo = sobrecosto.

## Desarrollo

```bash
cp .env.example .env.local   # completar NEXT_PUBLIC_SUPABASE_ANON_KEY
npm install
npm run dev
```

## Deploy (Vercel)

- Producción: **https://cgarcia-sobrecostos.vercel.app** · team **Constructora
  García** · proyecto `cgarcia-sobrecostos` · Root Directory: `sobrecostos/`.
- Variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Pasos detallados, desarrollo local e **inventario para la migración a cuenta
  corporativa**: ver [`DEPLOY.md`](./DEPLOY.md).

## Notas

- ⚠️ Las tablas tienen **RLS desactivado**; el dashboard usa la anon key en modo
  solo lectura. Para producción, activar RLS con políticas de lectura.
- ⚠️ `SP_296` y `MU_293` traen itemizados idénticos en el Excel origen
  (probable copia sin actualizar) — verificar con obra.
