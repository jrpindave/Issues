# Instalar BIBIM AI (add-in de Revit) — la pantalla del post

Esto reproduce exactamente lo de la captura: la pestaña **BIBIM AI** en la cinta de
Revit y el panel de chat que genera un *Task Plan*, lo valida (*Safe APIs / Version
Warnings*) y aplica los cambios con **Apply Changes**. El motor es **Claude (Anthropic)**.

Objetivo: Revit **2024** (sirve igual para 2022–2027).

---

## Cómo funciona (lo que ves en la foto)
1. Escribes una orden en lenguaje natural (ej. *"print all the sheets which start with A1"*).
2. BIBIM hace preguntas si faltan datos y arma un **Task Plan**.
3. Muestra una **revisión**: Safe APIs, Version Warnings, Deprecated APIs, Affected Elements.
4. Tú revisas y pulsas **Apply Changes** (nada se ejecuta hasta que apruebas).

---

## Lo que te falta — paso a paso

### Paso 1 · Cuenta y API key de Anthropic  (5 min)
- [ ] Crea cuenta en https://console.anthropic.com
- [ ] Añade saldo / método de pago (es de pago por uso, ~$0.05–0.28 por sesión).
- [ ] Genera una **API key**: *Settings → API Keys → Create Key*. Formato `sk-ant-api03-...`
- [ ] Cópiala y guárdala (no se vuelve a mostrar completa).

### Paso 2 · Descargar el instalador  (2 min)
- [ ] Ve a los releases: https://github.com/SquareZero-Inc/bibim-revit/releases
- [ ] Descarga el release más reciente en inglés: **`v1.1.0_EN`**
      (el instalador es un `.exe` tipo `BIBIM_AI_Setup_v1.1.0.exe`).

### Paso 3 · Instalar el add-in  (2 min)
- [ ] Cierra Revit.
- [ ] Ejecuta el instalador. **Se auto-registra** para las versiones de Revit
      detectadas (incluida 2024). Requisito: .NET 4.8, que ya viene con Revit 2024.
- [ ] Si Windows SmartScreen avisa: *Más información → Ejecutar de todas formas*
      (es software open-source sin firma comercial).

### Paso 4 · Configurar la key en Revit  (2 min)
- [ ] Abre **Revit 2024** y un proyecto cualquiera.
- [ ] En la cinta verás la pestaña **BIBIM AI** → ábrela para mostrar el panel de chat.
- [ ] Entra en **Settings (⚙) → API Key Settings**.
- [ ] Pega tu `sk-ant-api03-...` en el campo de **Anthropic** y guarda.
- [ ] Modelo: deja **`claude-sonnet-4-6`** (recomendado, rápido y barato).
      Si quieres la máxima capacidad, cambia a **`claude-opus-4-8`**.

> Alternativa a pegar la key: variable de entorno en Windows
> `setx ANTHROPIC_API_KEY "sk-ant-api03-..."` y reinicia Revit.

### Paso 5 · Primera prueba  (2 min)
- [ ] En el panel, escribe algo simple, p. ej.:
      *"Lista todas las sheets cuyo número empieza por A1"*.
- [ ] Responde las preguntas que haga (dónde guardar, formato, etc.).
- [ ] Revisa el **Task Plan** y el panel de revisión (Safe APIs, etc.).
- [ ] Pulsa **Apply Changes** solo cuando estés conforme.

### Paso 6 · (Opcional) Dynamo también
Si además quieres IA dentro de Dynamo, instala el paquete `bibim-dynamo`
(ver el `README.md` de esta carpeta) o usa el nodo `dynamo_claude_node.py`.

---

## Solución de problemas
| Síntoma | Causa probable | Solución |
|--------|----------------|----------|
| No aparece la pestaña BIBIM AI | Add-in no registrado para 2024 | Reinstala con Revit cerrado; revisa `%APPDATA%\Autodesk\Revit\Addins\2024\` |
| "Invalid API key" / 401 | Key mal pegada o sin saldo | Regenera la key y verifica saldo en console.anthropic.com |
| Errores de red / timeout | Firewall/proxy corporativo | Permite salida HTTPS a `api.anthropic.com` |
| Logs para depurar | — | `%APPDATA%\BIBIM\logs\bibim_debug.txt` |

## Enlaces
- BIBIM Revit (releases): https://github.com/SquareZero-Inc/bibim-revit/releases
- BIBIM web: https://www.bibim.app
- API key: https://console.anthropic.com
