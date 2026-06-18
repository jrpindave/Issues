# Deploy y operación — Dashboard Sobrecostos

> Runbook de despliegue del proyecto **`sobrecostos/`**. Mantener actualizado.
> Última actualización: 2026-06-18.

## Dónde vive

| | |
|---|---|
| **Repo** | `jrpindave/Issues` |
| **Branch** | `claude/blissful-fermat-plnq5x` |
| **Carpeta** | `sobrecostos/` (app Next.js en la raíz; `etl/` adentro) |
| **Producción** | https://cgarcia-sobrecostos.vercel.app |
| **Vercel** | team `constructora-garcia` · proyecto `cgarcia-sobrecostos` |
| **Supabase** | org `Constructora Garcia Ltda` · proyecto `vkmkfmjzgrugrkpxdrbe` |

## Estado

- Next.js 16 (App Router, RSC-first) · React 19 · Tailwind v4 · Recharts · Supabase SSR.
- UI alineada al **Design System García** (`Constructora-Garcia/Utilidades`):
  tema claro, papel cálido, azul `#2871B8` + cafés, tipografías Jost / IBM Plex,
  AppShell **solo topbar** (sin sidebar; aún **Prototipo**, no Entorno CJMG).
- Rutas: `/` (resumen + DS19 vs DS49 + **dispersión de centros de costo**),
  `/comparar` (multiobra + filtro por centro de costo), `/obra/[obra]` (detalle).
- `next build` + typecheck + lint en verde; verificado en local con datos reales.

## Variables de entorno (producción y local)

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://vkmkfmjzgrugrkpxdrbe.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | rol `anon`, **solo lectura** — Supabase → Project Settings → API → *anon/public* |

> La anon key es pública por diseño (solo lectura); es seguro exponerla en el
> cliente. **No** versionar `.env.local` (está en `.gitignore`).

## Deploy a producción (Vercel CLI)

Requisitos: `VERCEL_TOKEN` con acceso al team, y red que permita `vercel.com`,
`*.vercel.com` **y** `*.vercel.app` (los deploys se sirven en `vercel.app`).

```bash
cd sobrecostos

# 1. Vincular (crea el proyecto si no existe)
npx vercel link --token="$VERCEL_TOKEN" --scope=constructora-garcia \
  --project=cgarcia-sobrecostos --yes

# 2. Variables (si no están cargadas todavía)
printf '%s' "https://vkmkfmjzgrugrkpxdrbe.supabase.co" \
  | npx vercel env add NEXT_PUBLIC_SUPABASE_URL production --token="$VERCEL_TOKEN" --scope=constructora-garcia
printf '%s' "<ANON_KEY>" \
  | npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production --token="$VERCEL_TOKEN" --scope=constructora-garcia

# 3. Deploy a producción
npx vercel deploy --prod --token="$VERCEL_TOKEN" --scope=constructora-garcia
```

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

## Migración a cuenta corporativa

Inventario de **propiedad actual** de cada servicio. Algunas piezas ya están en
cuentas corporativas; lo que sigue siendo personal está marcado ⚠️.

| Servicio | Owner / cuenta actual | Tipo | Recurso |
|---|---|---|---|
| **GitHub** | `jrpindave` ⚠️ | Personal | repo `Issues` (carpeta `sobrecostos/`) |
| **Vercel** | team `constructora-garcia` · operador `jrodriguez-5110` ⚠️ (token personal) | Team corporativo + operador personal | proyecto `cgarcia-sobrecostos` |
| **Supabase** | org `Constructora Garcia Ltda` | Corporativo | proyecto `vkmkfmjzgrugrkpxdrbe` |

**Cuenta corporativa destino:** _por definir_.

### Checklist por servicio

**GitHub — `jrpindave` → org corporativa**
- [ ] Crear / confirmar la organización corporativa en GitHub.
- [ ] Transferir el repo `Issues` (Settings → Transfer ownership) **o** mover solo
      `sobrecostos/` a un repo nuevo de la org.
- [ ] Actualizar `git remote set-url origin …` en clones y en la integración de
      Claude Code (el repo en scope de la sesión cambia).
- [ ] Revisar accesos / equipos / branch protection en la org.

**Vercel — operador personal → cuenta/servicio corporativo**
- [ ] El team `constructora-garcia` ya es corporativo; falta dejar de depender del
      usuario personal `jrodriguez-5110`.
- [ ] Reconectar el proyecto `cgarcia-sobrecostos` al **nuevo repo** (Git
      Integration) tras la migración de GitHub.
- [ ] Emitir un **token de servicio** del team (no personal) y reemplazar
      `VERCEL_TOKEN` en el entorno de Claude Code / CI.
- [ ] Confirmar que las env vars de producción siguen presentes tras reconectar.

**Supabase — ya corporativo**
- [ ] Org `Constructora Garcia Ltda` ya es corporativa: sin migración de owner.
- [ ] (Recomendado) Activar **RLS** con políticas de solo lectura antes de abrir
      acceso amplio (hoy RLS está desactivado; ver README).
- [ ] Si se rota la anon key, actualizar la env var en Vercel.

### Orden sugerido
1. GitHub (transferencia del repo) → 2. Vercel (reconectar git + token de servicio)
→ 3. Re-deploy de verificación → 4. Supabase (RLS/keys, opcional).
