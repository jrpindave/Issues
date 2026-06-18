-- Dashboard Sobrecostos — vistas para:
--   (1) Desvio COSTO NETO vs ultima proyeccion registrada
--   (2) Gasto por familia de recurso (taxonomia MaeRecurso_)
-- Aplicado en Supabase (CGarcia-DataWarehouse).

-- ============================================================
-- (1) Desvio COSTO NETO vs ULTIMA proyeccion
-- "ultima proyeccion" = columna PROY mas a la derecha del Excel = max(col_idx) por obra
-- (p. ej. LA_365 -> col_idx 38 = PROY. MAR-25). NO es el periodo mas reciente.
-- ============================================================
create or replace view "SobrecostosDboard_v_desvio_proy_linea" as
with ult as (
  select obra, max(col_idx) as col_idx
  from "SobrecostosDboard_itemizado_proyeccion"
  group by obra
)
select
  it.obra, o.nombre as obra_nombre, o.programa,
  it.cc_codigo, it.cc, it.item,
  it.costo_neto,
  pr.monto   as proy_ultima,
  pr.periodo as proy_periodo,
  coalesce(pr.monto,0) - coalesce(it.costo_neto,0) as desvio
from "SobrecostosDboard_itemizado" it
join "SobrecostosDboard_obra" o on o.obra = it.obra
join ult on ult.obra = it.obra
left join "SobrecostosDboard_itemizado_proyeccion" pr
  on pr.obra = it.obra and pr.item = it.item
 and pr.cc_codigo = it.cc_codigo and pr.col_idx = ult.col_idx
where it.nivel = 'CTA';

create or replace view "SobrecostosDboard_v_desvio_proy_obra" as
select obra, obra_nombre, programa,
       max(proy_periodo)                              as proy_periodo,
       coalesce(sum(costo_neto),0)                    as costo_neto,
       coalesce(sum(proy_ultima),0)                   as proy_ultima,
       coalesce(sum(desvio),0)                        as desvio,
       count(*)                                       as lineas,
       count(*) filter (where proy_ultima is not null and proy_ultima <> 0) as lineas_con_proy
from "SobrecostosDboard_v_desvio_proy_linea"
group by obra, obra_nombre, programa;

create or replace view "SobrecostosDboard_v_desvio_proy_cc" as
select obra, programa, cc_codigo,
       max(cc) filter (where cc is not null and cc <> '') as cc_nombre,
       coalesce(sum(costo_neto),0)  as costo_neto,
       coalesce(sum(proy_ultima),0) as proy_ultima,
       coalesce(sum(desvio),0)      as desvio
from "SobrecostosDboard_v_desvio_proy_linea"
group by obra, programa, cc_codigo;

-- ============================================================
-- (2) Gasto por familia (compras del ERP clasificadas por el maestro)
-- ============================================================
create table if not exists "SobrecostosDboard_obra_un" (
  obra               text primary key,
  unidad_negocio_cod text not null,
  unidad_negocio_nom text
);

insert into "SobrecostosDboard_obra_un"(obra,unidad_negocio_cod,unidad_negocio_nom) values
  ('CH_228','P013800000','CHILLAN 228 DS19'),
  ('HUA_202','F015100000','HUALQUI 202 ULTIMA ETAPA'),
  ('LA_179','P025900000','LOS ANGELES 179 II ETAPA DE 299 B+V'),
  ('LA_247','P026200000','LOS ANGELES 247 DS49 LOTE X7-1'),
  ('LA_365','P026300000','LOS ANGELES 365 DS49 LOTE X7-2'),
  ('MU_293','F029900000','MULCHEN 293 DS49'),
  ('NA_162','F026400000','NACIMIENTO 162 II ETAPA DE LAS 160 VIV DS 49'),
  ('NE_149','F026700000','NEGRETE 149 DS49'),
  ('SP_296','P013900000','SAN PEDRO 296')
on conflict (obra) do nothing;

create or replace view "SobrecostosDboard_v_gasto_familia" as
select
  m.obra,
  coalesce(d.clase_desc,'(sin clasificar)')    as clase,
  coalesce(d.subclase_cod,'')                  as subclase_cod,
  coalesce(d.subclase_desc,'(sin clasificar)') as familia,
  count(*)                                     as lineas,
  coalesce(sum(c.total),0)                     as gasto
from v_compras_detalle c
join "SobrecostosDboard_obra_un" m on m.unidad_negocio_cod = c.unidad_negocio_cod
left join "MaeRecurso_v_dim" d on d.recurso_cod = c.recurso_cod
where c.recurso_cod <> ''
group by m.obra, d.clase_desc, d.subclase_cod, d.subclase_desc;

-- Nota: SP_296 y MU_293 comparten itemizado identico en el Excel origen (copia sin
-- actualizar); sus desvios de proyeccion saldran iguales hasta corregir la fuente.