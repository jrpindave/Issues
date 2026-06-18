# Auditoría del Excel de tipologías — `Base de datos tipologías.xlsx`

Hoja **`DS49`**. Estructura: fila 2 título · fila 3 encabezados · fila 4 TOTALES · datos en filas **5–65**.
Columnas: **A** Tipología · **B** Ampliación · **C** Pisos · **D** Nombre · **E** Superficie.

Resultado: **3 correcciones** para depurar antes de congelar el catálogo. Tras corregir, las
56 filas de vivienda quedan en **53 tipologías únicas** y los 3 sistemas de codificación
generan códigos sin colisiones.

---

## 🔴 Problema 1 — Filas duplicadas (2 casos)

Dos tipologías están cargadas **dos veces, idénticas** en todas sus columnas:

| Tipología | Filas duplicadas | Celdas | Superficie |
|---|---|---|---|
| Aislada Estándar 2 Pisos + Mansarda | **fila 10** y **fila 18** | `A10:E10` ≡ `A18:E18` | 62,20 m² |
| Pareada Estándar 2 Pisos + Mansarda | **fila 11** y **fila 19** | `A11:E11` ≡ `A19:E19` | 60,65 m² |

**Acción sugerida:** eliminar las repeticiones de más abajo → **borrar filas 18 y 19**.

---

## 🔴 Problema 2 — Inconsistencia "AMPLIADA" (1 caso)

| Celda | Contenido actual | Debería ser |
|---|---|---|
| **`B49`** | `No` | `Si` |
| `D49` | `Aislada Estándar (L) 2 Pisos - AMPLIADA` | (correcto) |

**Evidencia** — comparación contra la versión no ampliada:

| | Fila | Ampliación (B) | Superficie (E) | 1er piso (K) |
|---|---|---|---|---|
| (L) normal | 9 | No | 48,12 m² | 24,15 |
| (L) "AMPLIADA" | **49** | **No** ⚠️ | **57,42 m²** | 33,45 |

La superficie de la fila 49 (57,42 m²) es ~9 m² mayor que la normal y coincide con el patrón
de las otras ampliadas (A/B amplían a ~56–57 m²). La vivienda **sí es ampliada**: el error
está solo en la celda `B49`.

---

## 🟡 Observación menor (no es error)

La columna **C (Pisos) está vacía** en las filas **10–24** (Mansardas y todas las Tren). No
rompe nada porque el dato está en el Nombre (col D), pero para consistencia conviene rellenar
`C10:C24`.

---

## ✅ Chequeos sin hallazgos

- Las dos columnas de superficie (**E** y **O**) coinciden en las 61 filas — sin descuadres.
- No hay otras filas con "AMPLIADA" mal marcadas ni más duplicados.

---

## Resumen de acciones

1. Borrar **fila 18** (Aislada Estándar 2 Pisos + Mansarda duplicada).
2. Borrar **fila 19** (Pareada Estándar 2 Pisos + Mansarda duplicada).
3. Cambiar **`B49`** de `No` a `Si`.
