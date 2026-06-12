# Incorporar Claude a Revit / Dynamo

Guía de investigación a partir del post de Reddit
[*"I built an open-source AI agent for Revit + Dynamo"*](https://www.reddit.com/r/bim/comments/1so7ibo/i_built_an_opensource_ai_agent_for_revit_dynamo/).

El proyecto del post se llama **BIBIM** (SquareZero Inc.) y es la vía más rápida y
ya construida para llevar Claude a Dynamo. Abajo se documentan **dos caminos**:

1. **Usar BIBIM** (recomendado para empezar hoy mismo).
2. **Construir tu propia integración** con la API de Claude (si quieres control total).

---

## 1. ¿Qué es BIBIM?

Agente de IA open-source que **escribe, valida y ejecuta** código para Revit y Dynamo
a partir de lenguaje natural. Hay dos releases separados:

| Repo | Qué hace | Lenguaje generado |
|------|----------|-------------------|
| [`SquareZero-Inc/bibim-dynamo`](https://github.com/SquareZero-Inc/bibim-dynamo) | Extensión de Dynamo: escribe Python validado directo en el grafo | Python |
| [`SquareZero-Inc/bibim-revit`](https://github.com/SquareZero-Inc/bibim-revit) | Add-in de Revit: escribe y compila C# | C# |
| Web | https://www.bibim.app | — |

**Modelo BYOK ("Bring Your Own Key")**: no hay suscripción, tú pones tu propia API key.
Despliegue local. Licencia Apache 2.0.

### Cómo funciona (arquitectura)
- Genera un **plan** antes de tocar nada.
- Lee el contexto del modelo y escribe código **consciente de la versión** de Revit/Dynamo.
- **Valida** el código y **reintenta** si falla, luego lo ejecuta.
- **RAG local**: indexa la documentación de la API de Revit desde `RevitAPI.xml` localmente
  (sin servicio externo).
- **Prompt caching**: cachea el system prompt 5 min → ~90 % de descuento en llamadas repetidas.

---

## 2. Proveedor de IA: Claude es el principal

BIBIM enruta entre varios proveedores mediante un patrón *factory*, pero:

> **Anthropic Claude es el único proveedor verificado de extremo a extremo en cargas de Dynamo.**

| Proveedor | Modelos | Estado | Coste aprox./sesión |
|-----------|---------|--------|---------------------|
| **Anthropic (Claude)** | `claude-sonnet-4-6` (recomendado), `claude-opus-4-7` | ✅ Verificado | ~$0.05 (Sonnet) / ~$0.28 (Opus) |
| OpenAI | `gpt-5.5` | ⚠️ Enrutado, sin verificar | ~$0.10 |
| Google | `gemini-3.1-pro` | ⚠️ Enrutado, sin verificar | ~$0.04 |

> **Nota sobre modelos:** El README de BIBIM recomienda `claude-sonnet-4-6`. Si quieres
> la máxima capacidad de Anthropic hoy, el modelo más reciente de la familia Opus es
> **`claude-opus-4-8`** (puedes editar `rag_config.json` y poner ese ID). Sonnet 4.6 es el
> mejor equilibrio coste/velocidad para uso de alto volumen; Opus para las tareas más difíciles.

---

## 3. Instalación de BIBIM en Dynamo (paso a paso)

### Requisitos
- Autodesk **Revit 2022 o superior** con Dynamo instalado.
- Una **API key de Anthropic** (`sk-ant-api03-...`) — obligatoria.
- (Opcional) keys de OpenAI / Google para proveedores alternativos.

### Versiones soportadas

| Revit | Dynamo | .NET |
|-------|--------|------|
| 2027 | 27.0 | 10 |
| 2026 | 3.4.1–3.6.1 | 8 |
| 2025 | 3.0.3–3.3.0 | 8 |
| 2024 | 2.17.0–2.19.3 | 4.8 |
| 2023 | 2.13.0–2.16.1 | 4.8 |
| 2022 | 2.12.0 | 4.8 |

### Pasos
1. **Obtén tu API key** en https://console.anthropic.com (formato `sk-ant-api03-...`).
2. **Descarga el release** de [`bibim-dynamo`](https://github.com/SquareZero-Inc/bibim-dynamo/releases)
   o copia el paquete manualmente en:
   ```
   %APPDATA%\Dynamo\Dynamo Revit\<version>\packages\BIBIM_MVP\
   ```
3. **Configura la key** en el primer arranque o en ⚙ *Settings → API Key Settings*.
   También puedes editar directamente `%APPDATA%\BIBIM\rag_config.json`:
   ```json
   {
     "claude_model": "claude-sonnet-4-6",
     "api_keys": {
       "anthropic_api_key": "sk-ant-...",
       "openai_api_key": "",
       "gemini_api_key": ""
     }
   }
   ```
   O por variable de entorno: `ANTHROPIC_API_KEY`.
4. En el **primer uso**, BIBIM indexa `RevitAPI.xml` localmente (~0.5 s).
5. Logs de depuración en `%APPDATA%\BIBIM\logs\bibim_debug.txt` (rotan a los 5 MB).

> El add-in de **Revit** (`bibim-revit`) se instala con su instalador desde *Releases* y
> se auto-registra para las versiones de Revit detectadas; la key se configura en la
> pestaña *BIBIM AI → Settings (⚙)*.

---

## 4. Construir tu propia integración (alternativa)

Si prefieres no depender de BIBIM, el patrón general es: el nodo de Dynamo (Python o
Zero-Touch C#) llama a la **API de Mensajes de Claude**, recibe código y/o resultados, y
los aplica al grafo o al modelo de Revit.

### Ejemplo mínimo — nodo Python de Dynamo (IronPython/CPython3)

> Dynamo moderno (Revit 2025+) usa CPython3, donde puedes usar `requests`. En IronPython
> conviene usar `urllib`/.NET `HttpClient`. Aquí, vía HTTP directo con `urllib` para máxima
> compatibilidad. **No incrustes la key en el grafo**: léela de una variable de entorno.

```python
import os, json, urllib.request

prompt = IN[0]   # entrada del nodo: lo que pide el usuario en lenguaje natural
api_key = os.environ["ANTHROPIC_API_KEY"]

body = json.dumps({
    "model": "claude-opus-4-8",          # o "claude-sonnet-4-6" para coste/velocidad
    "max_tokens": 16000,
    "system": ("Eres un asistente experto en la API de Revit y Dynamo. "
               "Devuelve solo código Python ejecutable en un nodo de Dynamo, sin explicaciones."),
    "messages": [{"role": "user", "content": prompt}],
}).encode("utf-8")

req = urllib.request.Request(
    "https://api.anthropic.com/v1/messages",
    data=body,
    headers={
        "content-type": "application/json",
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
    },
)
resp = json.loads(urllib.request.urlopen(req).read().decode("utf-8"))
OUT = "".join(b["text"] for b in resp["content"] if b["type"] == "text")
```

### Nodo listo para usar: [`dynamo_claude_node.py`](./dynamo_claude_node.py)

En este repo tienes un nodo ya construido con el patrón **genera → valida → reintenta**.

1. Define tu key en Windows (una sola vez) y reinicia Revit:
   ```cmd
   setx ANTHROPIC_API_KEY "sk-ant-api03-..."
   ```
2. En Dynamo, crea un nodo **Python Script** (motor **CPython3**, Revit 2025+) y pega
   todo el contenido de `dynamo_claude_node.py`.
3. Añade los puertos de entrada:
   - `IN[0]` → el prompt en lenguaje natural (string).
   - `IN[1]` → modelo (opcional; por defecto `claude-opus-4-8`).
   - `IN[2]` → ejecutar (bool, opcional; **por defecto `False` = solo devuelve el código para que lo revises**).
4. La salida `OUT` es el código generado (si `Ejecutar=False`) o el resultado de ejecutarlo (`True`).

> Por seguridad el modo por defecto **no ejecuta** nada contra el modelo: te devuelve el
> código para que lo revises antes de poner `IN[2] = True`. El nodo compila (`compile()`)
> el código antes de aceptarlo y, si hay error de sintaxis, se lo realimenta a Claude
> para que lo corrija (hasta 3 intentos).

### Buenas prácticas si construyes lo tuyo
- **Modelo:** por defecto `claude-opus-4-8` (lo más capaz). Para alto volumen, `claude-sonnet-4-6`.
- **`max_tokens`:** ~16000 en peticiones no-streaming; usa streaming para salidas largas.
- **Genera-valida-ejecuta:** igual que BIBIM, valida el código generado y reintenta antes
  de ejecutarlo contra el modelo (la API de Revit es destructiva: muchas operaciones no
  tienen *undo* fácil).
- **Contexto del modelo:** pásale a Claude la versión de Revit/Dynamo y un extracto de la
  API relevante (RAG) para que el código sea *version-aware*.
- **Prompt caching:** cachea el system prompt y la doc de la API para abaratar llamadas repetidas.
- **Tool use:** para un agente real, define herramientas (leer elementos, crear, modificar)
  y deja que Claude las orqueste, en lugar de pegar código a ciegas.
- **SDK oficial:** si tu integración corre fuera de Dynamo (un microservicio que el nodo
  llama), usa el SDK `anthropic` de Python en lugar de HTTP crudo.

---

## 5. Resumen / recomendación

- **Para empezar ya:** instala **BIBIM Dynamo**, mete tu **API key de Anthropic** y úsalo.
  Es open-source, BYOK, sin suscripción, y Claude es el proveedor verificado.
- **Para control total:** construye un nodo que llame a la **API de Mensajes de Claude**
  con el patrón *genera → valida → ejecuta*, idealmente con *tool use* y RAG de la API de Revit.

### Enlaces
- Reddit: https://www.reddit.com/r/bim/comments/1so7ibo/i_built_an_opensource_ai_agent_for_revit_dynamo/
- BIBIM: https://www.bibim.app
- BIBIM Dynamo: https://github.com/SquareZero-Inc/bibim-dynamo
- BIBIM Revit: https://github.com/SquareZero-Inc/bibim-revit
- Consola Anthropic (API key): https://console.anthropic.com
- Docs de la API de Claude: https://platform.claude.com/docs
