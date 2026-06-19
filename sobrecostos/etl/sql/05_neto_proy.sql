-- Capa NETO vs última proyección registrada (parseo limpio de hojas ITEMIZADO).
-- Reemplaza el cálculo anterior (que sumaba el "Cuadro de Resumen" y duplicaba
-- el costo neto). Una fila por obra + centro de costo.
--
-- Reglas del parseo (ver etl/itemizado_neto_proy.py):
--  * Costo NETO = columna "COSTOS (NETO)" (la columna COSTOS inmediatamente a la
--    izquierda de "IVA"), sumada SOLO sobre las filas de centro de costo
--    (outline_level 0), en el bloque del itemizado (no el Cuadro de Resumen).
--  * Última proyección registrada = la columna PROY más a la derecha que esté
--    COMPLETA (cobertura >= 80% de los CC). Excluye "POR GASTAR" y "PROYECCION"
--    sin mes. Si la del último mes está a medio cargar (caso LA_179), cae a
--    "PROY. MES ANTERIOR".
--  * Validado: la suma de costo neto por obra reconcilia con el total de control
--    de cada hoja (CH_228 = 11.569.296.530, proy DIC-2025 = 12.122.064.667).

drop table if exists "SobrecostosDboard_neto_proy" cascade;
create table "SobrecostosDboard_neto_proy" (
  obra          text not null,
  cc_codigo     text not null,
  cc_nombre     text,
  costo_neto    numeric not null default 0,
  proy_ultima   numeric not null default 0,
  proy_periodo  date,           -- null si la última proyección es "mes anterior"
  proy_label    text            -- ej. 'DIC-2025' o 'Mes anterior'
);
alter table "SobrecostosDboard_neto_proy" enable row level security;
drop policy if exists neto_proy_read on "SobrecostosDboard_neto_proy";
create policy neto_proy_read on "SobrecostosDboard_neto_proy" for select to anon using (true);

-- Resumen por obra: NETO vs última proyección + desvío (proy - neto).
create or replace view "SobrecostosDboard_v_neto_proy_obra" as
select
  o.obra,
  ob.nombre,
  ob.programa,
  ob.subsegmento,
  max(o.proy_label)              as proy_label,
  max(o.proy_periodo)            as proy_periodo,
  coalesce(sum(o.costo_neto),0)  as costo_neto,
  coalesce(sum(o.proy_ultima),0) as proy_ultima,
  coalesce(sum(o.proy_ultima),0) - coalesce(sum(o.costo_neto),0) as desvio
from "SobrecostosDboard_neto_proy" o
join "SobrecostosDboard_obra" ob on ob.obra = o.obra
group by o.obra, ob.nombre, ob.programa, ob.subsegmento;

-- Detalle por centro de costo.
create or replace view "SobrecostosDboard_v_neto_proy_cc" as
select
  o.obra, ob.programa, ob.subsegmento,
  o.cc_codigo, o.cc_nombre, o.proy_label,
  o.costo_neto, o.proy_ultima,
  o.proy_ultima - o.costo_neto as desvio
from "SobrecostosDboard_neto_proy" o
join "SobrecostosDboard_obra" ob on ob.obra = o.obra;

grant select on "SobrecostosDboard_v_neto_proy_obra" to anon;
grant select on "SobrecostosDboard_v_neto_proy_cc" to anon;
