# ETL Sobrecostos → Dashboard

Pipeline que convierte el Excel de control de costos (`source/Sobrecostos.xlsx`,
18 hojas = 9 obras × `ITEMIZADO` + `PRP-C`) en tablas normalizadas en Supabase
(proyecto **CGarcia-DataWarehouse**, prefijo `SobrecostosDboard_`).

## Modelo de datos

- **`SobrecostosDboard_obra`** — dimensión de obras (`obra`, `nombre`).
- **`SobrecostosDboard_prpc`** — PRP Contable consolidado. Jerarquía Centro de
  Costo → Cuenta contable (`es_centro_costo` marca las filas de centro de costo;
  `centro_costo` viene forward-filled). Medidas: presupuesto, programación,
  avance, real_contable, real_obra, traspaso.
- **`SobrecostosDboard_itemizado`** — control de costos consolidado. `nivel`
  distingue subtotal de centro de costo (`CC`) vs detalle de cuenta (`CTA`),
  detectado como "primera fila de cada `(obra, cc_codigo)` = CC". Medidas:
  pct, costo_neto, iva, costo_con_iva, comprado, recepcionado, real_contable,
  real_obra. **Para totales sin doble conteo, filtrar `nivel = 'CTA'`.**
- **`SobrecostosDboard_itemizado_proyeccion`** — proyecciones mensuales en
  formato largo (`obra`, `cc_codigo`, `item`, `periodo` date, `monto`). Solo se
  incluyen columnas `PROY.*` que parsean a un mes válido.

## Pasos

```bash
pip install openpyxl
python3 parse.py     # lee source/Sobrecostos.xlsx -> data/*.json (+ valida)
python3 gen_sql.py   # genera sql/00_ddl.sql y lotes de INSERT
# DDL: aplicar sql/00_ddl.sql en Supabase (vía MCP apply_migration o psql)
SUPABASE_ANON_KEY=... python3 load.py   # carga data/*.json vía PostgREST
```

`load.py` requiere egress de red permitido hacia `*.supabase.co`.

## Notas de calidad de datos

- **`ITEMIZADO SP_296` y `ITEMIZADO MU_293` son numéricamente idénticas** en el
  Excel origen (mismo nº de filas y mismos montos). Probable copia sin
  actualizar en la fuente — verificar con el equipo de obra.
- Los `ITEMIZADO` traen filas KPI al pie (MONTO CONTRATO, INGRESOS, MARGEN
  BRUTO, COSTO INICIAL…) que **no** son líneas de costo; se excluyen filtrando
  por código de centro de costo de 3 dígitos al inicio del item.
