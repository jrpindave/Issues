# Modelo de datos — DataWarehouse Constructora García

> Proyecto Supabase **`CGarcia-DataWarehouse`** (`vkmkfmjzgrugrkpxdrbe`).
> Última actualización: 2026-06-18.

## 1. Espejo del ERP Unysoft (vistas `v_*` sobre materializadas `mv_*`)

La DataWarehouse replica el ERP en vistas de detalle. Las `v_*` son wrappers de
las `mv_*` (materializadas). No aparecen en un `list_tables` básico porque son
vistas, no tablas base.

| Dominio | Vista | Filas aprox. |
|---|---|---|
| Compras (OC) | `v_compras_detalle` | 111.056 |
| Pedidos | `v_pedidos_detalle` | 99.837 |
| Contabilidad | `v_contabilidad_detalle` | 1.274.326 |
| Consumo bodega | `mv_bodega_consumo_detalle` | 1.273.101 |
| Presupuesto / APU | `v_presupuesto_detalle` | 33.704 |
| Subcontratos | `v_subcontratos_detalle` | 17.994 |
| Ingresos | `mv_ingresos_detalle` | 21.844 |

Columnas transversales clave: `recurso_cod` + `recurso_desc`, `cuenta_cod` +
`cuenta_nom` (plan de cuentas **contable financiero**, p. ej. `310101001`),
`centro_costo_cod/nom`, y en presupuesto `partida_cod` + `indice` (índice APU).

## 2. Taxonomía de recursos (Clase → SubClase → Grupo → Recurso)

La clasificación de materiales **no existía como relación** en la BD: estaba
embebida en el `recurso_cod`. El maestro del ERP (`Recursos_Garcia.xlsx`,
Tablas Maestras → Recurso) la provee como 4 niveles, ahora importados con
prefijo **`MaeRecurso_`** (ver `sql/02_maerecurso_dim.sql`).

```
Clase     (MaeRecurso_clase, 10)      1 MATERIALES · 2 REMUNERACIONES · 3 SUBCONTRATOS ·
                                       4 MAQUINARIA · 5 GG DE OBRA · 9/A/B/C OF. CENTRAL · E JMGE
 └ SubClase (MaeRecurso_subclase, 109) 101 ARIDOS · 103 CEMENTO Y CAL · 110 MADERAS …
    └ Grupo  (MaeRecurso_grupo, 114)    grupo_cod = 101ARI, 103CYC, 110MAD …  (= prefijo recurso_cod)
       └ Recurso (MaeRecurso_recurso, 12.441)  recurso_cod = grupo_cod + correlativo (101ARI0001)
```

- **Llave de join con el ERP:** `recurso_cod` (normalizado, sin el `~` que trae
  el maestro) = `v_compras_detalle.recurso_cod`, etc.
- El código del recurso = `grupo_cod` (3 díg. subclase + 3 letras) + correlativo.
  Sobre ese código el presupuestador hace el pareo en el PRP.
- Las cuentas (`recCuenta1..4` → Provisión / Activo / **Costo** / Ingresos) son
  estándar por familia (Áridos → `310101001`). La vista expone `cuenta3` como
  `cuenta_costo`.

**Dimensión aplanada:** `MaeRecurso_v_dim` (recurso → grupo/subclase/clase +
cuenta de costo). Permite agrupar compras / consumo / presupuesto por **familia**.

**Cobertura validada (2026-06-18)** contra `mv_compras_detalle`:
**96,1%** de los recursos distintos y **99,5% del gasto** quedan clasificados.

### Reproducir la carga

```bash
cd sobrecostos/etl
python3 maerecurso_parse.py <ruta>/Recursos_Garcia.xlsx   # -> maerecurso_data/*.json
# aplicar sql/02_maerecurso_dim.sql en Supabase (MCP apply_migration o psql)
SUPABASE_ACCESS_TOKEN=... python3 maerecurso_load.py       # carga vía Management API
```

## 3. Capa Sobrecostos (`SobrecostosDboard_*`)

Importada aparte desde `Sobrecostos.xlsx` (ver `README.md`). Itemizado y PRP-C
por obra, con `cc_codigo` (centro de costo) y `nivel` CC/CTA.

## 4. Desvío COSTO NETO vs última proyección (`sql/03_proyeccion_familia.sql`)

- **"Última proyección" = columna PROY más a la derecha del Excel** = `max(col_idx)`
  por obra (NO el período más reciente). Ej. LA_365 → `col_idx` 38 = **PROY. MAR-25**,
  porque hay un segundo bloque ene–mar-25 a la derecha del bloque feb24–dic25.
- Métrica: `desvío = proy_ultima − costo_neto` (positivo = sobrecosto proyectado).
- Vistas: `..._v_desvio_proy_linea` (CTA), `..._v_desvio_proy_obra` (con cobertura
  `lineas_con_proy`/`lineas`), `..._v_desvio_proy_cc`.
- ⚠️ Obras con una sola columna PROY parcial (LA_179, SP_296, MU_293) dan desvíos
  grandes y poco representativos → la UI marca "parcial" cuando la cobertura < 100%.

## 5. Gasto por familia (`sql/03_proyeccion_familia.sql`)

- `SobrecostosDboard_obra_un`: mapea las 9 obras → `unidad_negocio_cod` del ERP
  (la obra se identifica por **unidad de negocio** en compras, no por centro de costo).
- `SobrecostosDboard_v_gasto_familia`: compras (`v_compras_detalle`) por obra +
  familia (subclase), clasificadas vía `MaeRecurso_v_dim`.

Ambas alimentan el dashboard: `/` (costo neto vs última proyección por obra) y
`/obra/[obra]` (desvío por centro de costo + gasto por familia).

## 6. Subsegmento / tipología (`sql/04_subsegmento.sql`)

El **subsegmento** (tipología de vivienda) no viene del ERP ni del Excel: es un
mapeo manual obra→tipología, mismo criterio que `programa` (sql/01). Columna
`subsegmento` en `SobrecostosDboard_obra`, expuesta en `..._v_obra_resumen` y
`..._v_cc_obra`. Alimenta `/comparar` como dimensión de comparación.

| Programa | Subsegmento | Obras |
|---|---|---|
| DS19 | Vivienda 2 pisos ARQ. GF | CH_228, SP_296 |
| DS19 | Vivienda 2 pisos ARQ. BV | LA_179 |
| DS49 | Vivienda 2 pisos | HUA_202, NE_149, LA_247, LA_365 |
| DS49 | Vivienda 2 pisos_Mansarda | NA_162, MU_293 |

## Pendientes (parking)

- **SP_296 = MU_293**: itemizado idéntico en el Excel origen (copia sin actualizar).
