
drop table if exists "SobrecostosDboard_itemizado_proyeccion" cascade;
drop table if exists "SobrecostosDboard_itemizado" cascade;
drop table if exists "SobrecostosDboard_prpc" cascade;
drop table if exists "SobrecostosDboard_obra" cascade;

create table "SobrecostosDboard_obra" (
  obra text primary key,
  nombre text
);

create table "SobrecostosDboard_prpc" (
  id bigserial primary key,
  obra text not null references "SobrecostosDboard_obra"(obra),
  centro_costo text,
  etiqueta text,
  cuenta_codigo text,
  es_centro_costo boolean,
  presupuesto numeric, programacion numeric, avance numeric,
  real_contable numeric, real_obra numeric, traspaso numeric
);
create index on "SobrecostosDboard_prpc"(obra);
create index on "SobrecostosDboard_prpc"(centro_costo);

create table "SobrecostosDboard_itemizado" (
  id bigserial primary key,
  obra text not null references "SobrecostosDboard_obra"(obra),
  cc_codigo text, cc text, item text, nivel text, clase text, tipo text,
  pct numeric, costo_neto numeric, iva numeric, costo_con_iva numeric,
  comprado numeric, recepcionado numeric, real_contable numeric, real_obra numeric
);
create index on "SobrecostosDboard_itemizado"(obra);
create index on "SobrecostosDboard_itemizado"(cc_codigo);

create table "SobrecostosDboard_itemizado_proyeccion" (
  id bigserial primary key,
  obra text not null references "SobrecostosDboard_obra"(obra),
  cc_codigo text, item text, periodo date, col_idx int, monto numeric
);
create index on "SobrecostosDboard_itemizado_proyeccion"(obra);
create index on "SobrecostosDboard_itemizado_proyeccion"(periodo);
