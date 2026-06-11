# Automatización de agrupación por parámetros en Navisworks (modelo IFC mal parametrizado)

Notas de coordinación BIM para evitar agrupar elemento a elemento con el **Buscador de
elementos** (Find Items). El objetivo es pasar de selecciones manuales a criterios
reutilizables y, en lo posible, programáticos.

## TL;DR — orden de preferencia

1. **Search Sets (Conjuntos de búsqueda)** en vez de Selection Sets → dinámicos y reutilizables.
2. **Exportar/Importar criterios y conjuntos en XML** → librería estándar entre proyectos.
3. **Appearance Profiler** → colorear/agrupar automáticamente por propiedad.
4. **API .NET / plugin** → cuando el flujo es masivo y recurrente.
5. **Arreglar el origen (export IFC)** → la solución de fondo: parametrizar bien en Revit/ArchiCAD.

---

## 1. Conjuntos de búsqueda (Search Sets), no de selección

El error más común es usar **Conjuntos de selección** (estáticos: guardan los elementos
concretos seleccionados). Usa **Conjuntos de búsqueda**:

- Guardan el *criterio*, no los elementos. Si el modelo se actualiza, el conjunto se
  recalcula solo.
- Se crean desde **Buscar elementos** → defines la condición → **Buscar todo** →
  botón derecho en el árbol de Conjuntos → *Guardar búsqueda*.

### Usa condiciones amplias en vez de nombre a nombre
En la columna **Condición** del buscador no estás limitado a `=`:

| Condición            | Uso típico                                              |
|----------------------|--------------------------------------------------------|
| `Contiene`           | `Nombre Contiene "Cercha"` captura todas las cerchas   |
| `Comodín` (wildcards)| `*_LA242_*`, `Madera*`                                  |
| `No igual / No contiene` | excluir basura                                     |
| `Definido / No definido` | encontrar elementos a los que les falta una propiedad |

Con una sola búsqueda con `Contiene` o comodines reemplazas decenas de selecciones manuales.

## 2. Exportar / Importar (la clave de la reutilización)

- **Buscar elementos → Importar/Exportar (botones inferiores):** guarda el criterio de
  búsqueda como **XML**. Lo reutilizas en cualquier modelo con la misma propiedad.
- **Panel Conjuntos → Exportar:** exporta TODOS los search sets a un único XML.
  Construyes una vez tu plantilla de conjuntos (estructura, MEP, madera, acero…) y la
  importas en cada proyecto nuevo.

> Recomendación: mantener un `search-sets-plantilla.xml` versionado en este repo como
> estándar de oficina.

## 3. Appearance Profiler

Ya lo tienes en tu cinta (*Herramientas*). Permite **asignar color/transparencia
automáticamente según una propiedad o un search set**. Ideal para auditar visualmente qué
está bien parametrizado y qué no (p. ej. todo lo que NO tiene material definido → rojo).

## 4. Automatización programática

Cuando el volumen lo justifica:

- **API .NET de Navisworks (`Autodesk.Navisworks.Api`)**: crear `SelectionSet` /
  `SearchSet` por código, recorrer `ModelItem` y sus `PropertyCategories`, y generar
  conjuntos masivamente. Se empaqueta como plugin (`.dll`) o como **add-in de automatización**.
- **Scripts batch + XML**: generar el XML de search sets desde una hoja de cálculo /
  script (Python) y luego *Importar* en Navisworks. Más simple que un plugin y sin compilar.
- **Dynamo / pyRevit (en origen)**: si el IFC sale de Revit, automatizar ahí los
  parámetros antes de exportar.

## 5. La solución de fondo: arreglar el export IFC

Navisworks solo lee lo que el IFC trae. Si está mal parametrizado, lo ideal es corregir el
**mapeo de Property Sets / clasificación** en la herramienta de origen (Revit IFC export
settings, configuración de Psets, parámetros compartidos). "Garbage in, garbage out":
automatizar la limpieza aguas abajo es un parche; parametrizar bien aguas arriba lo elimina.

---

### Flujo recomendado para tu caso (modelo IFC madera/estructura)

1. Crear search sets por `Material Contiene "Madera"`, `Nombre Contiene "Cercha"`, etc.
2. Exportar esos conjuntos a XML como plantilla de oficina.
3. Aplicar **Appearance Profiler** para auditar lo no parametrizado.
4. Si se repite en muchos modelos → script Python que genere el XML de conjuntos.
5. A medio plazo → corregir el export IFC en origen.
