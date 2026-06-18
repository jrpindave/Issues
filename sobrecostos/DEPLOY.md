# Deploy y operación — Dashboard Sobrecostos

> Runbook de despliegue del proyecto **`sobrecostos/`**. Mantener actualizado.
> Última actualización: 2026-06-18.

## Dónde vive

| | |
|---|---|
| **Repo** | `jrpindave/Issues` |
| **Branch** | `claude/happy-ramanujan-3x6pf1` |
| **Carpeta** | `sobrecostos/` (app Next.js en la raíz; `etl/` adentro) |
| **Producción** | https://cgarcia-sobrecostos.vercel.app |
| **Vercel** | team `constructora-garcia` (`team_EWcAVlQDWBDKQQS1cLx2LJ0V`) · proyecto `cgarcia-sobrecostos` (`prj_mK1WHAEE13EqNbATA1QHhVCSohkA`) |
| **Supabase** | org `Constructora Garcia Ltda` · proyecto `vkmkfmjzgrugrkpxdrbe` (DataWarehouse) |

## Estado

- Next.js 16 (App Router, RSC-first) · React 19 · Tailwind v4 · Recharts · Supabase SSR.
- UI alineada al **Design System García**: tema claro, papel cálido, azul `#2871B8`
  + cafés, tipografías Jost / IBM Plex, AppShell solo topbar (aún **Prototipo**).
- Rutas: `/` (resumen + DS19/DS49 + dispersión de CC + **costo neto vs última
  proyección**), `/comparar` (multiobra), `/obra/[obra]` (detalle + **desvío de
  proyección por CC** + **gasto por familia**).
- Datos en Supabase (ver `etl/MODELO_DATOS.md`): taxonomía de recursos
  `MaeRecurso_*` (`sql/02`), vistas de desvío de proyección y gasto por familia
  (`sql/03`). Migraciones ya aplicadas en el proyecto.
- `next build` + typecheck + lint en verde; verificado en local con datos reales.

## Variables de entorno (producción y local)

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://vkmkfmjzgrugrkpxdrbe.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | rol `anon`, **solo lectura** — Supabase → Project Settings → API → *anon/public* |

> La anon key es pública por diseño (solo lectura); es seguro exponerla en el
> cliente. **No** versionar `.env.local` (está en `.gitignore`).

## Deploy a producción (Vercel CLI)

**`VERCEL_TOKEN` ya está en las _Variables de entorno_ del entorno de Claude**
(junto a `SUPABASE_ACCESS_TOKEN`), así que está disponible como `$VERCEL_TOKEN`
en cualquier sesión nueva. **No** escribir el token literal en un comando (el
classifier lo bloquea por fuga de credencial): referenciarlo siempre como
`$VERCEL_TOKEN`. Requiere red hacia `vercel.com`, `*.vercel.com` y `*.vercel.app`.

> Si una sesión nueva no lo encuentra: confirmar que sigue en _Variables de
> entorno_ (no en el _Script de configuración_; ahí no se exporta al shell).

```bash
cd sobrecostos

# 1. Vincular al proyecto existente (idempotente)
npx vercel link --token="$VERCEL_TOKEN" --scope=constructora-garcia \
  --project=cgarcia-sobrecostos --yes

# 2. Deploy a producción (env NEXT_PUBLIC_SUPABASE_* ya configuradas en el proyecto)
npx vercel deploy --prod --yes --token="$VERCEL_TOKEN" --scope=constructora-garcia
```

> Las variables `NEXT_PUBLIC_SUPABASE_*` ya están cargadas en el proyecto Vercel.
> Para (re)cargarlas: `printf '%s' "<valor>" | npx vercel env add <VAR> production
> --token="$VERCEL_TOKEN" --scope=constructora-garcia`.

## Desarrollo local

```bash
cd sobrecostos
cat > .env.local <<'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://vkmkfmjzgrugrkpxdrbe.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY>
EOF
npm ci
npm run dev        # o: npm run build && npm run start
```

---

## Cuentas, secretos y continuidad

Los recursos del proyecto **no dependen de la cuenta de Claude Code**: viven en
GitHub, Vercel y Supabase. La sesión de Claude no guarda nada propio — todo el
estado del trabajo está commiteado y pusheado a git. Si se cambia de cuenta de
Claude (p. ej. a una corporativa), basta con **reconectar** esos servicios.

### Dónde vive cada cosa

| Servicio | Owner / cuenta | Recurso |
|---|---|---|
| **GitHub** | `jrpindave` | repo `Issues` · branch `claude/happy-ramanujan-3x6pf1` · carpeta `sobrecostos/` |
| **Vercel** | team `constructora-garcia` (operador `jrodriguez-5110`) | proyecto `cgarcia-sobrecostos` |
| **Supabase** | org `Constructora Garcia Ltda` | proyecto `vkmkfmjzgrugrkpxdrbe` |

### Variables de entorno del entorno de Claude

En _Variables de entorno_ (formato `.env`, disponibles como `$VAR` en toda sesión):

- `VERCEL_TOKEN` — deploy a Vercel (team `constructora-garcia`).
- `SUPABASE_ACCESS_TOKEN` — Management API de Supabase (DDL/carga vía `curl`
  a `https://api.supabase.com/v1/projects/<ref>/database/query`, ver `etl/`).

> Mantenerlas en _Variables de entorno_, **no** en el _Script de configuración_
> (ahí se setean sin `export` y no persisten en el shell de las herramientas).

### Continuar en otra cuenta de Claude Code (p. ej. corporativa)

Migrar la **cuenta de Claude Code** no toca GitHub/Vercel/Supabase; esos
servicios solo necesitan que la cuenta nueva tenga acceso/credenciales. Para
retomar el trabajo desde una cuenta nueva:

- [ ] Dar acceso al repo `jrpindave/Issues` (agregarlo al scope de la sesión) y
      seleccionar la branch `claude/happy-ramanujan-3x6pf1`.
- [ ] Reconectar los conectores MCP en la cuenta nueva: **GitHub**, **Vercel**,
      **Supabase**.
- [ ] Reponer las _Variables de entorno_ `VERCEL_TOKEN` y `SUPABASE_ACCESS_TOKEN`,
      y política de red que permita `vercel.com`, `*.vercel.com` y `*.vercel.app`.
- [ ] Verificar: `cd sobrecostos && npm ci && npm run build`.
