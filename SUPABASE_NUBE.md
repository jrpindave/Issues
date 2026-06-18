# Supabase en sesiones de nube — Handoff para Claude

> Documento para que una sesión futura (local o nube) entienda el setup y lo verifique.
> **No contiene tokens ni secretos.**

## Objetivo
Acceder a las DOS organizaciones Supabase del usuario desde sesiones de nube de Claude Code:

| Organización | Tipo | Slug |
|---|---|---|
| Constructora Garcia Ltda | Empresa | `sikocmuxduwqrwqlvjcm` |
| MVP Base de datos | Personal (FREE) | `wwsrkqjkzzuewpnuoexm` |

## Cómo está resuelto
- **Constructora García** → conector OAuth de Supabase (a nivel de cuenta Claude).
  Limitación confirmada: **un conector OAuth = UNA sola org**. Por eso la personal NO entra por aquí.
- **Ambas orgs** → servidor MCP propio que usa un **Personal Access Token (PAT)** `sbp_...`,
  que es *user-scoped* y por tanto **ve las dos organizaciones** con una sola credencial.

## Setup en la nube (entorno "DefaultJrp")
1. **Variable de entorno** del entorno de nube (NO en ningún repo):
   ```
   SUPABASE_ACCESS_TOKEN=sbp_...
   ```
2. **Script de configuración** del entorno (se ejecuta antes de lanzar Claude Code):
   ```bash
   claude mcp add supabase-personal -s user -- npx -y @supabase/mcp-server-supabase@latest
   ```

Resultado: cada sesión de nube nueva levanta el servidor `supabase-personal`, que hereda
`SUPABASE_ACCESS_TOKEN` y ve ambas orgs.

## Qué debe hacer una sesión NUEVA (verificación)
1. Comprobar que existe el servidor MCP `supabase-personal` (herramientas `mcp__supabase-personal__*`).
2. Llamar `mcp__supabase-personal__list_organizations` → debe devolver **LAS DOS** orgs.
3. El conector OAuth `Supabase` (García) sigue funcionando aparte; es independiente.
4. **Si `supabase-personal` NO aparece** → el `claude mcp add` del script no se aplicó.
   Plan B: crear un `.mcp.json` en la raíz del repo (SIN token; hereda `SUPABASE_ACCESS_TOKEN`):
   ```json
   {
     "mcpServers": {
       "supabase-personal": {
         "command": "npx",
         "args": ["-y", "@supabase/mcp-server-supabase@latest"]
       }
     }
   }
   ```

## Reglas (NO romper)
- 🚫 **Nunca** escribir el PAT (`sbp_...`) en ningún archivo del repo. Este repo y especialmente
  `Constructora-Garcia/Utilidades` se publican a GitHub.
- ✅ El PAT vive **solo** en "Variables de entorno" del entorno de nube (no se publica a GitHub).
- 🚫 **No revocar** el grant OAuth de Constructora García.
- ✅ En local ya funciona (PAT en variable de Usuario de Windows `SUPABASE_ACCESS_TOKEN`
  + servidor `supabase-personal` con scope `user`). No tocar esa config local.
