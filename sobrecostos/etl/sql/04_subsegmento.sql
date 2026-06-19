-- Dashboard Sobrecostos — subsegmento / tipología por obra.
-- El subsegmento NO viene del ERP ni del Excel: es un mapeo manual obra→tipología
-- (igual criterio que `programa`, ver sql/01). Aplicado en Supabase
-- (CGarcia-DataWarehouse) vía MCP apply_migration.

-- 1) Columna de subsegmento en la dimensión de obras
alter table "SobrecostosDboard_obra" add column if not exists subsegmento text;

-- DS19
update "SobrecostosDboard_obra" set subsegmento = 'Vivienda 2 pisos ARQ. GF'
  where obra in ('CH_228','SP_296');
update "SobrecostosDboard_obra" set subsegmento = 'Vivienda 2 pisos ARQ. BV'
  where obra in ('LA_179');

-- DS49
update "SobrecostosDboard_obra" set subsegmento = 'Vivienda 2 pisos'
  where obra in ('HUA_202','NE_149','LA_247','LA_365');
update "SobrecostosDboard_obra" set subsegmento = 'Vivienda 2 pisos_Mansarda'
  where obra in ('NA_162','MU_293');

-- 2) Exponer subsegmento en las vistas de resumen (columna añadida al final,
--    requisito de CREATE OR REPLACE VIEW).
create or replace view "SobrecostosDboard_v_obra_resumen" as
select
  o.obra,
  o.nombre,
  o.programa,
  coalesce(sum(i.costo_con_iva), 0)  as presupuesto,
  coalesce(sum(i.comprado), 0)       as comprado,
  coalesce(sum(i.recepcionado), 0)   as recepcionado,
  coalesce(sum(i.real_contable), 0)  as real_contable,
  coalesce(sum(i.real_obra), 0)      as real_obra,
  coalesce(sum(i.real_obra), 0) - coalesce(sum(i.costo_con_iva), 0) as sobrecosto,
  o.subsegmento
from "SobrecostosDboard_obra" o
left join "SobrecostosDboard_itemizado" i
  on i.obra = o.obra and i.nivel = 'CTA'
group by o.obra, o.nombre, o.programa, o.subsegmento;

create or replace view "SobrecostosDboard_v_cc_obra" as
select
  i.obra,
  o.nombre   as obra_nombre,
  o.programa,
  i.cc_codigo,
  cc.item    as cc_nombre,
  coalesce(sum(i.costo_con_iva), 0) as presupuesto,
  coalesce(sum(i.comprado), 0)      as comprado,
  coalesce(sum(i.recepcionado), 0)  as recepcionado,
  coalesce(sum(i.real_contable), 0) as real_contable,
  coalesce(sum(i.real_obra), 0)     as real_obra,
  coalesce(sum(i.real_obra), 0) - coalesce(sum(i.costo_con_iva), 0) as sobrecosto,
  o.subsegmento
from "SobrecostosDboard_itemizado" i
join "SobrecostosDboard_obra" o on o.obra = i.obra
left join lateral (
  select c.item
  from "SobrecostosDboard_itemizado" c
  where c.obra = i.obra and c.cc_codigo = i.cc_codigo and c.nivel = 'CC'
  limit 1
) cc on true
where i.nivel = 'CTA'
group by i.obra, o.nombre, o.programa, i.cc_codigo, cc.item, o.subsegmento;
