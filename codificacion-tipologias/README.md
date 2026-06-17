# Codificación de tipologías de viviendas — Constructora García

Proyecto para asignar **códigos únicos** a las tipologías de vivienda del catálogo
(programa DS49). Fuente: `Base de datos tipologías.xlsx`, hoja `DS49`
(56 tipologías de vivienda + 5 sedes sociales, estas últimas fuera de este alcance).

## 1. Dimensiones que identifican una tipología

Del análisis del Excel, una tipología queda unívocamente definida por estos atributos:

| Atributo | Valores observados |
|---|---|
| **Disposición** | Pareada · Aislada · Tren |
| **Programa** | Estándar · Sensorial · Adulto Mayor · Discapacitado Físico |
| **Sub-tipo / variante** | Estándar: A, B, L · Sensorial: Mental, Auditivo, Visual, Físico (+ variante 3D) · Adulto Mayor: P, L |
| **Pisos** | 1 piso · 2 pisos · 2 pisos + mansarda |
| **Ampliación** | No · Sí (AMPLIADA) |
| **Tren (caso especial)** | N° de cuerpo (3, 4, Unidad) · posición (Interior, Derecho, Izquierdo) · vanos (con / sin) |

Cualquier código debe poder distinguir estas combinaciones sin ambigüedad.

---

## 2. Tres métodos de codificación propuestos

### Método 1 — Código "parlante" (semántico, segmentado)

Código legible por humanos, compuesto por segmentos separados por guion. Cada
segmento dice qué es la vivienda sin necesidad de consultar una tabla.

```
[DISPOSICIÓN]-[PROGRAMA]-[SUBTIPO]-[PISOS]-[AMP]
```

**Diccionario**

| Segmento | Código | Significado |
|---|---|---|
| Disposición | `PA` / `AI` / `TR` | Pareada / Aislada / Tren |
| Programa | `EST` / `SEN` / `AM` / `DF` | Estándar / Sensorial / Adulto Mayor / Discapacitado Físico |
| Subtipo Estándar | `A` / `B` / `L` | variante de planta |
| Subtipo Sensorial | `M` / `A` / `V` / `F` | Mental / Auditivo / Visual / Físico (sufijo `3D` si aplica) |
| Subtipo Adulto Mayor | `P` / `L` | variante de planta |
| Pisos | `1P` / `2P` / `2PM` | 1 piso / 2 pisos / 2 pisos + mansarda |
| Ampliación | `AMP` | solo presente cuando es ampliada |
| Tren | `TRN3` / `TRN4` / `TRNU` + `I`/`D`/`Z` + `CV`/`SV` | cuerpo + posición (Interior/Derecho/iZquierdo) + con/sin vanos |

**Ejemplos**: `PA-EST-A-2P` · `AI-SEN-V3D-2P` · `PA-AM-P-2P-AMP` · `TR-TRN4-D`

- ✅ Autoexplicativo, fácil de filtrar/ordenar, no requiere consultar tablas.
- ✅ Ideal para planos, cotizaciones, comunicación con obra y proveedores.
- ⚠️ Longitud variable; si cambia la nomenclatura hay que mantener el diccionario.

### Método 2 — Código numérico estructurado (posicional, por bloques)

Código 100% numérico de longitud fija. Cada par de dígitos es un campo que se
traduce con tablas maestras. Pensado para ERP, base de datos, códigos de barras y orden estable.

```
DD PP SS F A   →   Disposición(2) Programa(2) Subtipo(2) Pisos(1) Ampliación(1)
```

**Tablas**

| Campo | Valores |
|---|---|
| Disposición (DD) | 10 Pareada · 20 Aislada · 30 Tren |
| Programa (PP) | 01 Estándar · 02 Sensorial · 03 Adulto Mayor · 04 Discapacitado · 09 Tren |
| Subtipo (SS) | Estándar: 01 A, 02 B, 03 L, 09 +Mansarda · Sensorial: 01 Mental, 02 Auditivo, 03 Visual, 04 Físico (+10 si es 3D) · Adulto Mayor: 01 P, 02 L · Tren: dígito cuerpo + dígito posición |
| Pisos (F) | 1 un piso · 2 dos pisos · 3 dos pisos + mansarda |
| Ampliación (A) | 0 no · 1 sí (en Tren: 1 con vanos, 2 sin vanos) |

**Ejemplos**: `10010120` (Pareada Estándar A, 2 pisos) · `20021320` (Aislada Sensorial Visual 3D) · `10040011` (Pareada Discapacitado Físico ampliada)

- ✅ Compacto, longitud fija, ideal como clave en sistemas y para ordenar/indexar.
- ✅ Numérico puro: compatible con casi cualquier software y lectores de código de barras.
- ⚠️ No es legible a simple vista; obliga a mantener las tablas de traducción.

### Método 3 — Código correlativo con prefijo (catálogo / SKU)

Identificador corto y **estable** = prefijo de familia + número correlativo, respaldado por un catálogo maestro (este mismo archivo CSV). El código no "significa" nada por sí mismo: es solo una llave que apunta a la ficha.

```
CG-[FAMILIA]-[NNN]
```

**Prefijos**: `CG-PAR-###` Pareada · `CG-AIS-###` Aislada · `CG-TRN-###` Tren

**Ejemplos**: `CG-PAR-001` · `CG-AIS-014` · `CG-TRN-006`

- ✅ Muy corto y permanente: aunque cambie la forma de describir la vivienda, el código nunca cambia. Excelente como clave primaria.
- ✅ Imposible que quede "mal formado"; se asigna una sola vez en el catálogo.
- ⚠️ Opaco: hay que consultar el catálogo para saber qué es. Requiere disciplina para no reasignar números.

---

## 3. Recomendación

**Usar los tres en capas, no elegir uno solo:**

1. **Método 3 (`CG-PAR-001`)** como **clave primaria** interna/ERP — estable y permanente.
2. **Método 1 (`PA-EST-A-2P`)** como **etiqueta de uso diario** en planos, cotizaciones y obra — porque se entiende sin manual.
3. **Método 2 (`10010120`)** como **campo de integración** para sistemas que requieran numérico puro / códigos de barras.

El catálogo maestro ([`catalogo-tipologias.csv`](catalogo-tipologias.csv)) ya trae las tres columnas, así que se puede empezar con la que prefieran y mantener las otras como equivalencia.

---

## 4. Hallazgos de calidad de datos (a revisar en el Excel original)

Al generar los códigos aparecieron 3 colisiones que **no** son errores de codificación, sino del Excel de origen:

- **Filas duplicadas**: `Aislada Estándar 2 Pisos + Mansarda` y `Pareada Estándar 2 Pisos + Mansarda` aparecen dos veces cada una (filas distintas, mismos atributos).
- **Inconsistencia ampliación**: `Aislada Estándar (L) 2 Pisos - AMPLIADA` tiene la columna *Ampliación* = **No**, por lo que es idéntica a la versión no ampliada. Hay que definir si es ampliada o no.

> Nota: los Métodos 1 y 2 producen el **mismo** código para filas idénticas (comportamiento correcto y deseable). El Método 3, al ser correlativo, les daría números distintos — por eso conviene depurar los duplicados antes de congelar el catálogo.

---

## 5. Catálogo completo (56 tipologías, 3 códigos cada una)

| Tipología | Sup. m² | M1 Parlante | M2 Numérico | M3 Correlativo |
|---|---|---|---|---|
| Pareada Estándar (A) 2 Pisos | 47.34 | `PA-EST-A-2P` | `10010120` | `CG-PAR-001` |
| Pareada Estándar (B) 2 Pisos | 47.34 | `PA-EST-B-2P` | `10010220` | `CG-PAR-002` |
| Aislada Estándar (A) 2 Pisos | 48.12 | `AI-EST-A-2P` | `20010120` | `CG-AIS-001` |
| Aislada Estándar (B) 2 Pisos | 48.12 | `AI-EST-B-2P` | `20010220` | `CG-AIS-002` |
| Aislada Estándar (L) 2 Pisos | 48.12 | `AI-EST-L-2P` | `20010320` | `CG-AIS-003` |
| Aislada Estándar 2 Pisos + Mansarda | 62.2 | `AI-EST-2PM` | `20010930` | `CG-AIS-004` |
| Pareada Estándar 2 Pisos + Mansarda | 60.65 | `PA-EST-2PM` | `10010930` | `CG-PAR-003` |
| Tren 3 Interior | 180.55 | `TR-TRN3-I` | `30093100` | `CG-TRN-001` |
| Tren 3 Derecho | 180.55 | `TR-TRN3-D` | `30093200` | `CG-TRN-002` |
| Tren 3 Izquierdo | 180.55 | `TR-TRN3-Z` | `30093300` | `CG-TRN-003` |
| Tren 4 Interior | 239.75 | `TR-TRN4-I` | `30094100` | `CG-TRN-004` |
| Tren 4 Derecho | 239.75 | `TR-TRN4-D` | `30094200` | `CG-TRN-005` |
| Tren 4 Izquierdo | 239.75 | `TR-TRN4-Z` | `30094300` | `CG-TRN-006` |
| Aislada Estándar 2 Pisos + Mansarda | 62.2 | `AI-EST-2PM` | `20010930` | `CG-AIS-005` |
| Pareada Estándar 2 Pisos + Mansarda | 60.65 | `PA-EST-2PM` | `10010930` | `CG-PAR-004` |
| Tren Unidad Interior | 59.2 | `TR-TRNU-I` | `30099100` | `CG-TRN-007` |
| Tren Unidad Derecha sin vanos | 60.65 | `TR-TRNU-D-SV` | `30099202` | `CG-TRN-008` |
| Tren Unidad Izquierda sin vanos | 60.7 | `TR-TRNU-Z-SV` | `30099302` | `CG-TRN-009` |
| Tren Unidad Derecha con vanos | 60.65 | `TR-TRNU-D-CV` | `30099201` | `CG-TRN-010` |
| Tren Unidad Izquierda con vanos | 60.7 | `TR-TRNU-Z-CV` | `30099301` | `CG-TRN-011` |
| Pareada Sensorial Mental 2 Pisos | 55.53 | `PA-SEN-M-2P` | `10020120` | `CG-PAR-005` |
| Pareada Sensorial Auditivo 2 Pisos | 55.53 | `PA-SEN-A-2P` | `10020220` | `CG-PAR-006` |
| Pareada Sensorial Visual 2 Pisos | 55.53 | `PA-SEN-V-2P` | `10020320` | `CG-PAR-007` |
| Pareada Sensorial Físico 2 Pisos | 55.53 | `PA-SEN-F-2P` | `10020420` | `CG-PAR-008` |
| Aislada Sensorial Mental 2 Pisos | 56.53 | `AI-SEN-M-2P` | `20020120` | `CG-AIS-006` |
| Aislada Sensorial Auditivo 2 Pisos | 56.53 | `AI-SEN-A-2P` | `20020220` | `CG-AIS-007` |
| Aislada Sensorial Visual 2 Pisos | 56.53 | `AI-SEN-V-2P` | `20020320` | `CG-AIS-008` |
| Aislada Sensorial Físico 2 Pisos | 56.53 | `AI-SEN-F-2P` | `20020420` | `CG-AIS-009` |
| Pareada Adulto Mayor (P) 2 Pisos | 48.41 | `PA-AM-P-2P` | `10030120` | `CG-PAR-009` |
| Pareada Adulto Mayor (L) 2 Pisos | 55.57 | `PA-AM-L-2P` | `10030220` | `CG-PAR-010` |
| Pareada Discapacitado Físico 1 Piso | 55.89 | `PA-DF-1P` | `10040010` | `CG-PAR-011` |
| Aislada Discapacitado Físico 1 Piso | 56.44 | `AI-DF-1P` | `20040010` | `CG-AIS-010` |
| Pareada Sensorial Mental 3D 2 Pisos | 57.83 | `PA-SEN-M3D-2P` | `10021120` | `CG-PAR-012` |
| Pareada Sensorial Auditivo  3D 2 Pisos | 57.83 | `PA-SEN-A3D-2P` | `10021220` | `CG-PAR-013` |
| Pareada Sensorial Visual  3D 2 Pisos | 57.83 | `PA-SEN-V3D-2P` | `10021320` | `CG-PAR-014` |
| Pareada Sensorial Físico  3D 2 Pisos | 57.83 | `PA-SEN-F3D-2P` | `10021420` | `CG-PAR-015` |
| Aislada Sensorial Mental  3D 2 Pisos | 58.75 | `AI-SEN-M3D-2P` | `20021120` | `CG-AIS-011` |
| Aislada Sensorial Auditivo  3D 2 Pisos | 58.75 | `AI-SEN-A3D-2P` | `20021220` | `CG-AIS-012` |
| Aislada Sensorial Visual  3D 2 Pisos | 58.75 | `AI-SEN-V3D-2P` | `20021320` | `CG-AIS-013` |
| Aislada Sensorial Físico  3D 2 Pisos | 58.75 | `AI-SEN-F3D-2P` | `20021420` | `CG-AIS-014` |
| Pareada Estándar (A) 2 Pisos - AMPLIADA | 56.61 | `PA-EST-A-2P-AMP` | `10010121` | `CG-PAR-016` |
| Aislada Estándar (A) 2 Pisos - AMPLIADA | 57.57 | `AI-EST-A-2P-AMP` | `20010121` | `CG-AIS-015` |
| Pareada Estándar (B) 2 Pisos - AMPLIADA | 56.85 | `PA-EST-B-2P-AMP` | `10010221` | `CG-PAR-017` |
| Aislada Estándar (B) 2 Pisos - AMPLIADA | 57.43 | `AI-EST-B-2P-AMP` | `20010221` | `CG-AIS-016` |
| Aislada Estándar (L) 2 Pisos - AMPLIADA | 57.42 | `AI-EST-L-2P` | `20010320` | `CG-AIS-017` |
| Pareada Sensorial Mental 2 Pisos - AMPLIADA | 64.96 | `PA-SEN-M-2P-AMP` | `10020121` | `CG-PAR-018` |
| Pareada Sensorial Auditivo 2 Pisos - AMPLIADA | 64.96 | `PA-SEN-A-2P-AMP` | `10020221` | `CG-PAR-019` |
| Pareada Sensorial Visual 2 Pisos - AMPLIADA | 64.96 | `PA-SEN-V-2P-AMP` | `10020321` | `CG-PAR-020` |
| Pareada Sensorial Físico 2 Pisos - AMPLIADA | 64.96 | `PA-SEN-F-2P-AMP` | `10020421` | `CG-PAR-021` |
| Aislada Sensorial Mental 2 Pisos - AMPLIADA | 66.12 | `AI-SEN-M-2P-AMP` | `20020121` | `CG-AIS-018` |
| Aislada Sensorial Auditivo 2 Pisos - AMPLIADA | 66.12 | `AI-SEN-A-2P-AMP` | `20020221` | `CG-AIS-019` |
| Aislada Sensorial Visual 2 Pisos - AMPLIADA | 66.12 | `AI-SEN-V-2P-AMP` | `20020321` | `CG-AIS-020` |
| Aislada Sensorial Físico 2 Pisos - AMPLIADA | 66.12 | `AI-SEN-F-2P-AMP` | `20020421` | `CG-AIS-021` |
| Pareada Adulto Mayor (P) 2 Pisos - AMPLIADA | 58.03 | `PA-AM-P-2P-AMP` | `10030121` | `CG-PAR-022` |
| Pareada Discapacitado Físico 1 Piso - AMPLIADA | 65.26 | `PA-DF-1P-AMP` | `10040011` | `CG-PAR-023` |
| Aislada Discapacitado Físico 1 Piso - AMPLIADA | 65.81 | `AI-DF-1P-AMP` | `20040011` | `CG-AIS-022` |

> Generado automáticamente desde `Base de datos tipologías.xlsx` (hoja `DS49`).
