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

## Cuentas, secretos y continuidad

Los recursos del proyecto **no dependen de la cuenta de Claude Code**: viven en
GitHub, Vercel y Supabase. La sesión de Claude no guarda nada propio — todo el
estado del trabajo está commiteado y pusheado a git. Si se cambia de cuenta de
Claude (p. ej. a una corporativa), basta con **reconectar** esos servicios.

### Dónde vive cada cosa

| Servicio | Owner / cuenta | Recurso |
|---|---|---|
| **GitHub** | `jrpindave` | repo `Issues` · branch `claude/blissful-fermat-plnq5x` · carpeta `sobrecostos/` |
| **Vercel** | team `constructora-garcia` (operador `jrodriguez-5110`) | proyecto `cgarcia-sobrecostos` |
| **Supabase** | org `Constructora Garcia Ltda` | proyecto `vkmkfmjzgrugrkpxdrbe` |

### Continuar en otra cuenta de Claude Code (p. ej. corporativa)

Migrar la **cuenta de Claude Code** no toca GitHub/Vercel/Supabase; esos
servicios solo necesitan que la cuenta nueva tenga acceso/credenciales. Para
retomar el trabajo desde una cuenta nueva:

- [ ] Dar acceso al repo `jrpindave/Issues` (agregarlo al scope de la sesión) y
      seleccionar la branch `claude/blissful-fermat-plnq5x`.
- [ ] Reconectar los conectores MCP en la cuenta nueva: **GitHub**, **Vercel**,
      **Supabase**.
- [ ] Configurar el entorno: env var `VERCEL_TOKEN` con acceso al team
      `constructora-garcia`, y política de red que permita `vercel.com`,
      `*.vercel.com` y `*.vercel.app`.
- [ ] Verificar: `cd sobrecostos && npm ci && npm run build`.
