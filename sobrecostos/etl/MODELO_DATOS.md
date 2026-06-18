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

## Pendientes (parking)

- **Métrica COSTO (NETO) vs última proyección**: el dashboard hoy calcula
  `real_obra − costo_con_iva`, no esto. Las columnas `PROY.*` son re-proyecciones
  totales (snapshots), no flujo mensual; la tabla duplica CC+CTA (filtrar `nivel='CTA'`).
  Falta definir "última proyección" (p. ej. LA_365 → `PROY. MAR-25`, col AO).
- **Subsegmentos / tipologías** (Vivienda 2 pisos · ARQ GF · Mansarda): no están
  en la data; agregar como mapeo igual que `programa`. Falta tipología de `LA_179`.
