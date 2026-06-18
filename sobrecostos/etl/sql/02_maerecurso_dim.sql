-- Maestro de recursos (taxonomia ERP Unysoft): Clase -> SubClase -> Grupo -> Recurso
-- Origen: Recursos_Garcia.xlsx (ERP Unysoft > Tablas Maestras > Recurso).
-- Aplicado en Supabase (CGarcia-DataWarehouse). Prefijo: MaeRecurso_
--
-- Llave de negocio: recurso_cod = grupo_cod (prefijo, ej. 101ARI) + correlativo (ej. 0001).
-- recurso_cod normalizado (sin el '~' que trae el maestro) hace join directo con las vistas
-- ERP v_compras_detalle / v_pedidos_detalle / v_presupuesto_detalle / v_subcontratos_detalle.

create table if not exists "MaeRecurso_clase" (
  clase_cod   text primary key,          -- alfanumerico: 1..5, 9, A, B, C, E
  descripcion text not null
);

create table if not exists "MaeRecurso_subclase" (
  subclase_cod text primary key,         -- 3 digitos (ej. 101 = ARIDOS)
  clase_cod    text references "MaeRecurso_clase"(clase_cod),
  descripcion  text not null
);

create table if not exists "MaeRecurso_grupo" (
  grupo_cod    text primary key,         -- = prefijo de recurso_cod (ej. 101ARI)
  subclase_cod text references "MaeRecurso_subclase"(subclase_cod),
  clase_cod    text references "MaeRecurso_clase"(clase_cod),
  descripcion  text not null,
  unidad_def   text
);

create table if not exists "MaeRecurso_recurso" (
  recurso_cod      text primary key,      -- normalizado (sin ~); llave de join con ERP
  recurso_cod_orig text,                  -- como viene en el maestro (puede traer ~)
  grupo_cod        text references "MaeRecurso_grupo"(grupo_cod),
  subclase_cod     text,
  clase_cod        text,
  descripcion      text,
  unidad           text,
  moneda           text,
  precio_analisis  numeric,
  cuenta1          text,                   -- Cta. Provision (estandar por familia)
  cuenta2          text,                   -- Cta. Activo
  cuenta3          text,                   -- Cta. Costo
  cuenta4          text,                   -- Cta. Ingresos
  no_utilizar      text
);

create index if not exists ix_maerecurso_recurso_grupo on "MaeRecurso_recurso"(grupo_cod);
create index if not exists ix_maerecurso_grupo_subclase on "MaeRecurso_grupo"(subclase_cod);

-- Dimension aplanada: cada recurso con su familia (grupo/subclase/clase) y cuenta de costo.
create or replace view "MaeRecurso_v_dim" as
select
  r.recurso_cod,
  r.descripcion              as recurso_desc,
  r.unidad,
  r.precio_analisis,
  r.cuenta3                  as cuenta_costo,
  r.grupo_cod,
  g.descripcion              as grupo_desc,
  r.subclase_cod,
  sc.descripcion             as subclase_desc,
  r.clase_cod,
  cl.descripcion             as clase_desc,
  nullif(r.no_utilizar,'')   as no_utilizar
from "MaeRecurso_recurso" r
left join "MaeRecurso_grupo"    g  on g.grupo_cod     = r.grupo_cod
left join "MaeRecurso_subclase" sc on sc.subclase_cod = r.subclase_cod
left join "MaeRecurso_clase"    cl on cl.clase_cod    = r.clase_cod;

-- Cobertura validada (2026-06-18) contra mv_compras_detalle:
--   8.036 / 8.366 recursos distintos = 96,1%  ·  99,5% del gasto clasificado.
