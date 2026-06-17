-- Dashboard Sobrecostos — clasificación de programa y vistas de agregación.
-- Aplicado en Supabase (CGarcia-DataWarehouse) vía MCP apply_migration.

-- 1) Clasificación de programa en la dimensión de obras (DS19 / DS49)
alter table "SobrecostosDboard_obra" add column if not exists programa text;

update "SobrecostosDboard_obra" set programa = 'DS19'
  where obra in ('CH_228','SP_296','LA_179');
update "SobrecostosDboard_obra" set programa = 'DS49'
  where obra in ('HUA_202','LA_247','LA_365','NA_162','MU_293','NE_149');

-- 2) Resumen por obra (itemizado sin doble conteo: nivel = 'CTA')
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
  coalesce(sum(i.real_obra), 0) - coalesce(sum(i.costo_con_iva), 0) as sobrecosto
from "SobrecostosDboard_obra" o
left join "SobrecostosDboard_itemizado" i
  on i.obra = o.obra and i.nivel = 'CTA'
group by o.obra, o.nombre, o.programa;

-- 3) Resumen por centro de costo y obra (comparar un mismo CC entre obras)
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
  coalesce(sum(i.real_obra), 0) - coalesce(sum(i.costo_con_iva), 0) as sobrecosto
from "SobrecostosDboard_itemizado" i
join "SobrecostosDboard_obra" o on o.obra = i.obra
left join lateral (
  select c.item
  from "SobrecostosDboard_itemizado" c
  where c.obra = i.obra and c.cc_codigo = i.cc_codigo and c.nivel = 'CC'
  limit 1
) cc on true
where i.nivel = 'CTA'
group by i.obra, o.nombre, o.programa, i.cc_codigo, cc.item;

-- 4) Proyección mensual agregada (obra, centro de costo, periodo)
create or replace view "SobrecostosDboard_v_proyeccion_mensual" as
select obra, cc_codigo, periodo, coalesce(sum(monto),0) as monto
from "SobrecostosDboard_itemizado_proyeccion"
group by obra, cc_codigo, periodo;
