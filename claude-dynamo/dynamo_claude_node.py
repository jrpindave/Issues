# =============================================================================
#  Nodo de Dynamo: "Claude → código Python para Dynamo/Revit"
#  Pega TODO este contenido en un nodo Python Script de Dynamo (CPython3).
#  Requiere Revit 2025+ / Dynamo 3.x (motor CPython3).
#
#  ENTRADAS del nodo (haz clic en el "+" para añadir puertos):
#    IN[0]  (str)   Prompt en lenguaje natural. Ej: "Selecciona todos los muros
#                   del nivel 1 y devuelve su área total en m2".
#    IN[1]  (str)   Modelo. Opcional. Por defecto "claude-opus-4-8".
#                   Usa "claude-sonnet-4-6" para más velocidad / menor coste.
#    IN[2]  (bool)  Ejecutar. Opcional, por defecto False.
#                   False = solo DEVUELVE el código generado (revísalo tú).
#                   True  = ejecuta el código (¡cuidado! modifica el modelo).
#
#  SALIDA:
#    OUT  ->  Si Ejecutar=False: el código Python generado (string).
#             Si Ejecutar=True : el resultado de ejecutar ese código.
#
#  CLAVE API: NO se incrusta en el grafo. Define la variable de entorno
#             ANTHROPIC_API_KEY en Windows antes de abrir Revit:
#               setx ANTHROPIC_API_KEY "sk-ant-api03-..."
#             (cierra y reabre Revit para que tome la variable).
# =============================================================================

import os
import json
import urllib.request
import urllib.error

# ---------------------------------------------------------------------------
# 1) Parámetros de entrada
# ---------------------------------------------------------------------------
prompt   = IN[0] if len(IN) > 0 and IN[0] else ""
model    = IN[1] if len(IN) > 1 and IN[1] else "claude-opus-4-8"
ejecutar = bool(IN[2]) if len(IN) > 2 else False

MAX_INTENTOS = 3   # genera -> valida -> reintenta hasta N veces

# ---------------------------------------------------------------------------
# 2) System prompt: define exactamente qué debe devolver Claude
# ---------------------------------------------------------------------------
SYSTEM = (
    "Eres un experto en la API de Autodesk Revit y en Dynamo. "
    "Generas SOLO código Python ejecutable dentro de un nodo Python Script de "
    "Dynamo con motor CPython3. Reglas estrictas:\n"
    "1. Devuelve UNICAMENTE el código, sin explicaciones, sin markdown, sin ```.\n"
    "2. Asigna el resultado final a la variable OUT.\n"
    "3. Para acceder al documento usa:\n"
    "   import clr\n"
    "   clr.AddReference('RevitServices')\n"
    "   from RevitServices.Persistence import DocumentManager\n"
    "   from RevitServices.Transactions import TransactionManager\n"
    "   doc = DocumentManager.Instance.CurrentDBDocument\n"
    "4. Si el código MODIFICA el modelo, envuelve los cambios en una transacción:\n"
    "   TransactionManager.Instance.EnsureInTransaction(doc)\n"
    "   ... cambios ...\n"
    "   TransactionManager.Instance.TransactionTaskDone()\n"
    "5. Importa de Autodesk.Revit.DB lo que necesites "
    "(FilteredElementCollector, BuiltInCategory, etc.).\n"
    "6. No uses funciones que no existan en la API de Revit."
)


def _strip_fences(texto):
    """Quita ```python ... ``` por si el modelo los añade pese a las reglas."""
    t = texto.strip()
    if t.startswith("```"):
        lineas = t.splitlines()
        lineas = lineas[1:]                       # descarta la primera línea ```python
        if lineas and lineas[-1].strip().startswith("```"):
            lineas = lineas[:-1]                  # descarta el ``` final
        t = "\n".join(lineas)
    return t.strip()


def _llamar_claude(mensajes):
    """Llamada a la API de Mensajes de Claude. Devuelve el texto de la respuesta."""
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError(
            "Falta ANTHROPIC_API_KEY. Define la variable de entorno en Windows "
            "(setx ANTHROPIC_API_KEY \"sk-ant-...\") y reinicia Revit."
        )

    body = json.dumps({
        "model": model,
        "max_tokens": 16000,
        "system": SYSTEM,
        "messages": mensajes,
    }).encode("utf-8")

    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=body,
        headers={
            "content-type": "application/json",
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            data = json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        detalle = e.read().decode("utf-8", "ignore")
        raise RuntimeError("Error HTTP {0} de la API de Claude: {1}".format(e.code, detalle))

    if data.get("stop_reason") == "refusal":
        raise RuntimeError("Claude rechazó la petición por seguridad.")

    return "".join(b.get("text", "") for b in data.get("content", []) if b.get("type") == "text")


# ---------------------------------------------------------------------------
# 3) Bucle genera -> valida (compila) -> reintenta
# ---------------------------------------------------------------------------
if not prompt:
    OUT = "ERROR: conecta un prompt de texto en IN[0]."
else:
    mensajes = [{"role": "user", "content": prompt}]
    codigo = None
    ultimo_error = None

    for intento in range(MAX_INTENTOS):
        respuesta = _strip_fences(_llamar_claude(mensajes))
        try:
            compile(respuesta, "<codigo_claude>", "exec")   # VALIDA la sintaxis
            codigo = respuesta
            break
        except SyntaxError as se:
            ultimo_error = str(se)
            # realimenta el error para que Claude lo corrija
            mensajes.append({"role": "assistant", "content": respuesta})
            mensajes.append({
                "role": "user",
                "content": ("El código anterior tiene un error de sintaxis: {0}. "
                            "Corrígelo y devuelve solo el código.").format(ultimo_error),
            })

    if codigo is None:
        OUT = "ERROR: no se obtuvo código válido tras {0} intentos. Último error: {1}".format(
            MAX_INTENTOS, ultimo_error)
    elif not ejecutar:
        # Modo seguro por defecto: solo devuelve el código para que lo revises.
        OUT = codigo
    else:
        # Ejecuta el código generado. OUT lo define el propio código generado.
        ambito = {"IN": IN, "OUT": None}
        try:
            exec(codigo, ambito)
            OUT = ambito.get("OUT")
        except Exception as ex:
            OUT = "ERROR al ejecutar el código generado: {0}\n\n--- CODIGO ---\n{1}".format(ex, codigo)
