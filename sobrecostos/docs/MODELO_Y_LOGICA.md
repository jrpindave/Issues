# Modelo, datos y lógica — Dashboard Sobrecostos (Constructora García)

> Documento integral del proyecto: el modelo conceptual del negocio, los datos
> que viven en Supabase, la taxonomía de recursos, lo que se pidió sobre esos
> datos, las lógicas/decisiones que se definieron y todo lo avanzado.
> Complementa: `DEPLOY.md` (runbook) y `etl/MODELO_DATOS.md` (referencia técnica).
> Última actualización: 2026-06-19.

---

## 1. Objetivo

Dashboard de **control de costos por obra** para Constructora García, capaz de
medir **desviaciones monetarias** entre lo presupuestado y lo proyectado/gastado,
con cortes por **programa** (DS19 / DS49), **centro de costo** y **familia de
recurso**. Lee el Data Warehouse de la organización en Supabase
(`CGarcia-DataWarehouse`, proyecto `vkmkfmjzgrugrkpxdrbe`).

---

## 2. Modelo conceptual del negocio (cómo lo explicó el equipo)

La estructura de costos del ERP (Unysoft) es jerárquica:

```
Centro de costo  →  Cuenta contable  →  Recurso
```

- **Centro de costo**: agrupa la obra por partida constructiva (ej. `201
  Fundaciones`, `501 Instalación de faenas`).
- **Cuenta contable**: dentro de un centro de costo, agrupa por clase de material.
  El **prefijo de la cuenta = código del centro de costo**, por eso la misma
  familia puede repetirse en varios centros (ej. `501 ARIDOS` y `601 ARIDOS` son
  "Áridos" en dos centros distintos).
- **Recurso**: el insumo concreto (ej. *Arena gruesa*, *Cemento Melón 42.5 kg*).

**Cómo se llega a ese orden:** al generar el **APU**, la persona indica a qué
centro de costo pertenece. Entonces cada recurso del APU se clasifica
automáticamente en una cuenta contable = `código del centro de costo` +
`familia del material`. La familia del material viene de un **listado maestro de
recursos** que organiza los insumos por clase/familia.

### 2.1 La taxonomía maestra de recursos (ERP Unysoft)

El maestro (`Recursos_Garcia.xlsx`, ERP → Tablas Maestras → Recurso) es una
taxonomía normalizada de **4 niveles**:

```
Clase      (10)     1 MATERIALES · 2 REMUNERACIONES OBRAS · 3 SUBCONTRATOS ·
                    4 MAQUINARIA Y VEHICULOS · 5 GG DE OBRA · 9 REMUN. OF. CENTRAL ·
                    A GASTOS GRALES OF. CENTRAL · B HONORARIOS · C VEHICULOS OF.C · E JMGE
 └ SubClase (109)   101 ARIDOS · 102 ARTEFACTOS · 103 CEMENTO Y CAL · 104 CLAVOS… (familia numérica)
    └ Grupo  (114)   grupo_cod = 101ARI, 103CYC, 104CLT, 110MAD…  (3 díg. subclase + 3 letras)
       └ Recurso (12.441)  recurso_cod = grupo_cod + correlativo  (ej. 101ARI0001)
```

- **El código del recurso lleva embebida su familia.** `103CYC0004` →
  grupo `103CYC` (Cemento y Cal) → subclase `103` → clase `1` (Materiales).
- Sobre ese código el presupuestador hace el pareo en el PRP del Excel.
- Las cuentas contables financieras (`recCuenta1..4` = Provisión / Activo /
  **Costo** / Ingresos) son **estándar por familia** (ej. Áridos → `310101001`).

---

## 3. Qué hay en Supabase (DataWarehouse)

### 3.1 Espejo del ERP (vistas `v_*` sobre materializadas `mv_*`)

Replica el ERP. **No** salen en un `list_tables` básico (son vistas):

| Dominio | Vista | Filas aprox. | Identificador de obra |
|---|---|---|---|
| Compras (OC) | `v_compras_detalle` | 111.056 | `unidad_negocio` |
| Pedidos | `v_pedidos_detalle` | 99.837 | `unidad_negocio` |
| Contabilidad | `v_contabilidad_detalle` | 1.274.326 | — |
| Consumo bodega | `mv_bodega_consumo_detalle` | 1.273.101 | — |
| Presupuesto / APU | `v_presupuesto_detalle` | 33.704 | `unidad_negocio` |
| Subcontratos | `v_subcontratos_detalle` | 17.994 | — |

Columnas transversales: `recurso_cod` + `recurso_desc`, `cuenta_cod`/`cuenta_nom`
(plan contable financiero), `centro_costo_cod/nom`, `unidad_negocio_cod/nom`,
`partida_cod`, `indice` (APU).

### 3.2 Capa Sobrecostos (`SobrecostosDboard_*`) — importada del Excel

Itemizado y PRP-C por obra desde `Sobrecostos.xlsx` (9 obras). `nivel` distingue
subtotal de centro de costo (`CC`) del detalle de cuenta (`CTA`). **Para totales
sin doble conteo, filtrar `nivel='CTA'`.** Incluye `..._itemizado_proyeccion`
(columnas `PROY.*` en formato largo, con `col_idx` = posición de la columna en
el Excel).

### 3.3 Taxonomía de recursos — **incorporada en este trabajo** (`MaeRecurso_*`)

La clasificación de material **no existía como relación** en la BD: estaba solo
embebida en el `recurso_cod`. Se importó el maestro del ERP como dimensiones:

| Tabla | Filas | Contenido |
|---|---|---|
| `MaeRecurso_clase` | 10 | Clase (códigos texto: 1–5, 9, A, B, C, E) |
| `MaeRecurso_subclase` | 109 | SubClase (familia numérica) |
| `MaeRecurso_grupo` | 114 | Grupo (`grupo_cod` = prefijo del `recurso_cod`) |
| `MaeRecurso_recurso` | 12.441 | Recurso + cuentas estándar por familia |
| `MaeRecurso_v_dim` | vista | Recurso → grupo/subclase/clase aplanado + `cuenta_costo` |

- **Llave de join con el ERP:** `recurso_cod` normalizado (sin el `~` que trae
  el maestro) = `v_compras_detalle.recurso_cod`, etc.
- **Cobertura validada:** **96,1%** de los recursos distintos de compras y
  **99,5% del gasto** quedan clasificados por familia.
- DDL/ETL: `etl/sql/02_maerecurso_dim.sql`, `etl/maerecurso_parse.py`,
  `etl/maerecurso_load.py` (carga vía Management API de Supabase).

---

## 4. Qué se pidió sobre estos datos

1. **Desviación COSTO (NETO) vs última proyección.** Comparar la columna
   `COSTO (NETO)` del itemizado contra la **última proyección registrada**
   (ej. LA_365 → `PROY. MAR-25`). Solo datos monetarios.
2. **Segmentos y subsegmentos.** Sobre DS19/DS49, distinguir tipologías:
   *Vivienda 2 pisos*, *Vivienda 2 pisos ARQ. GF*, *Vivienda 2 pisos_Mansarda*.
3. **Clasificación de recursos por familia.** Vincular los recursos a su familia
   según su código (lo que motivó importar el maestro `MaeRecurso_*`).
4. **Explotar la taxonomía en el dashboard:** gasto por familia por obra.

---

## 5. Lógicas y decisiones que definimos

### 5.1 Clasificación por familia
- La familia se obtiene del **prefijo de `recurso_cod`** (= `grupo_cod`) y se
  resuelve contra `MaeRecurso_v_dim`. Cubre 96,1% de recursos / 99,5% del gasto.
- En la BD `cuenta_cod` es el **plan contable financiero** (ej. `310101001`),
  no la familia de material; está vacío para ~99% de los recursos → no sirve
  como clasificador de material. La familia vive en el código + el maestro.

### 5.2 "Última proyección registrada"
- **Definición:** la columna `PROY.` **más a la derecha** del Excel =
  `max(col_idx)` por obra. **No** es el período cronológicamente más reciente.
- Razón: hay obras con un segundo bloque de columnas a la derecha. En LA_365 el
  bloque feb-24→dic-25 va seguido de otro ene–mar-25; la última registrada es
  **`col_idx` 38 = MAR-25**, que coincide con lo indicado por el equipo.
- Verificado: LA_365 última proyección = **$13.139.545.060** (col MAR-25).

### 5.3 Métrica de desvío de proyección
- `desvío = última_proyección − costo_neto`. **Positivo = sobrecosto proyectado**
  (rojo); negativo = bajo presupuesto (verde). Consistente con el resto del
  dashboard.
- Se calcula sobre líneas `nivel='CTA'` (evita el doble conteo CC+CTA, que
  inflaba ~2× las sumas de proyección).
- **Cobertura:** se cuenta cuántas líneas CTA tienen valor en la última columna
  (`lineas_con_proy` / `lineas`). Si < 100%, la UI marca **"parcial"** —
  importante porque obras con una sola columna PROY parcial (LA_179, SP_296,
  MU_293) dan desvíos grandes y poco representativos.

### 5.4 Mapeo obra → unidad de negocio (para gasto por familia)
- En compras la obra se identifica por **`unidad_negocio`**, no por centro de
  costo. Se creó `SobrecostosDboard_obra_un` con las 9 obras:

  | obra | unidad_negocio_cod | nombre ERP |
  |---|---|---|
  | CH_228 | P013800000 | CHILLAN 228 DS19 |
  | HUA_202 | F015100000 | HUALQUI 202 ULTIMA ETAPA |
  | LA_179 | P025900000 | LOS ANGELES 179 II ETAPA |
  | LA_247 | P026200000 | LOS ANGELES 247 DS49 LOTE X7-1 |
  | LA_365 | P026300000 | LOS ANGELES 365 DS49 LOTE X7-2 |
  | MU_293 | F029900000 | MULCHEN 293 DS49 |
  | NA_162 | F026400000 | NACIMIENTO 162 II ETAPA DS49 |
  | NE_149 | F026700000 | NEGRETE 149 DS49 |
  | SP_296 | P013900000 | SAN PEDRO 296 |

### 5.5 Métrica histórica del dashboard
- El "Desvío" original del dashboard es `real_obra − presupuesto (costo_con_iva)`
  (positivo = sobrecosto). Convive con la nueva métrica de proyección; son cosas
  distintas y se muestran por separado.

---

## 6. Lo que se construyó

### 6.1 SQL (en Supabase, versionado en `etl/sql/`)
- `02_maerecurso_dim.sql` — dimensiones `MaeRecurso_*` + `MaeRecurso_v_dim`.
- `03_proyeccion_familia.sql`:
  - `SobrecostosDboard_v_desvio_proy_linea / _obra / _cc` — desvío COSTO NETO vs
    última proyección (con cobertura).
  - `SobrecostosDboard_obra_un` + `SobrecostosDboard_v_gasto_familia` — gasto de
    compras por obra y familia, clasificado vía el maestro.

### 6.2 Dashboard (Next.js 16, `sobrecostos/src/`)
- `/` (resumen): nueva sección **"Costo neto vs. última proyección"** por obra,
  con período (ej. MAR-25) y aviso "parcial" según cobertura.
- `/obra/[obra]` (detalle): **desvío de proyección por centro de costo** y
  **gasto por familia** (con barra de participación).
- Datos vía `src/lib/queries.ts` (tipos en `src/lib/types.ts`); RSC-first.
- Verificado: `tsc --noEmit`, `eslint`, `next build` en verde.

### 6.3 ETL reproducible (`sobrecostos/etl/`)
- `maerecurso_parse.py` (Excel → JSON) y `maerecurso_load.py` (JSON → Supabase
  vía Management API). Doc técnico en `etl/MODELO_DATOS.md`.

---

## 7. Hallazgos de calidad de datos

- **SP_296 = MU_293**: itemizados numéricamente idénticos en el Excel origen
  (probable copia sin actualizar) → sus desvíos de proyección salen iguales.
- **RLS**: las tablas tienen RLS; el dashboard usa la anon key (solo lectura) y
  las vistas ERP se leen vía wrappers (security definer). `anon` tiene `SELECT`
  en las vistas nuevas.
- **Proyecciones**: las columnas `PROY.*` son re-proyecciones **totales**
  (snapshots), no flujo mensual; por eso se compara la última columna contra el
  costo neto, filtrando `nivel='CTA'`.

---

## 8. Pendientes (parking)

- **Subsegmentos / tipologías** (Vivienda 2 pisos · ARQ GF · Mansarda): aún no
  están en la data; agregar como mapeo igual que `programa`. **Falta definir la
  tipología de `LA_179`.**
- **Nivel recurso fino**: el dashboard de sobrecostos llega a cuenta contable;
  el análisis por recurso individual usa la capa ERP (`v_compras_detalle`, etc.)
  ya clasificada por `MaeRecurso_v_dim`.
- **SP_296/MU_293**: verificar la fuente con el equipo de obra.
- **RLS productivo**: definir políticas de lectura explícitas si se abre a más
  usuarios.

---

## 9. Mapa de archivos

| Archivo | Qué es |
|---|---|
| `sobrecostos/README.md` | Visión general del dashboard |
| `sobrecostos/DEPLOY.md` | Runbook de deploy + continuidad de cuenta |
| `sobrecostos/docs/MODELO_Y_LOGICA.md` | **Este documento** |
| `sobrecostos/etl/MODELO_DATOS.md` | Referencia técnica del modelo de datos |
| `sobrecostos/etl/sql/00–03_*.sql` | DDL y vistas aplicadas en Supabase |
| `sobrecostos/etl/maerecurso_*.py` | ETL del maestro de recursos |
| `sobrecostos/src/` | App Next.js (queries, tipos, páginas, componentes) |
