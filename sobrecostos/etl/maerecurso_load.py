"""Carga maerecurso_data/*.json a Supabase (CGarcia-DataWarehouse) vvia Management API.

Requiere DDL aplicado (sql/02_maerecurso_dim.sql) y la env var SUPABASE_ACCESS_TOKEN.
Uso:  python3 maerecurso_load.py [dir_datos]
"""
import json, os, subprocess, sys

D = sys.argv[1] if len(sys.argv) > 1 else "maerecurso_data"
REF = "vkmkfmjzgrugrkpxdrbe"
TOK = os.environ["SUPABASE_ACCESS_TOKEN"]
URL = f"https://api.supabase.com/v1/projects/{REF}/database/query"


def q(s):
    return "null" if s is None else "'" + str(s).replace("'", "''") + "'"


def n(v):
    return "null" if v is None else repr(float(v))


def post(sql):
    body = json.dumps({"query": sql})
    p = subprocess.run(
        ["curl", "-s", "-X", "POST", URL, "-H", f"Authorization: Bearer {TOK}",
         "-H", "Content-Type: application/json", "-d", "@-"],
        input=body, capture_output=True, text=True,
    )
    out = p.stdout.strip()
    if '"error"' in out.lower() or '"message"' in out.lower():
        sys.exit(f"ERROR: {out[:400]}")
    return out


def load(jsonf):
    return json.load(open(f"{D}/{jsonf}"))


cl = load("clase.json")
post('insert into "MaeRecurso_clase"(clase_cod,descripcion) values '
     + ",".join(f"({q(x['clase_cod'])},{q(x['descripcion'])})" for x in cl)
     + " on conflict (clase_cod) do nothing;")

sc = load("subclase.json")
post('insert into "MaeRecurso_subclase"(subclase_cod,clase_cod,descripcion) values '
     + ",".join(f"({q(x['subclase_cod'])},{q(x['clase_cod'])},{q(x['descripcion'])})" for x in sc)
     + " on conflict (subclase_cod) do nothing;")

g = load("grupo.json")
post('insert into "MaeRecurso_grupo"(grupo_cod,subclase_cod,clase_cod,descripcion,unidad_def) values '
     + ",".join(f"({q(x['grupo_cod'])},{q(x['subclase_cod'])},{q(x['clase_cod'])},{q(x['descripcion'])},{q(x['unidad_def'])})" for x in g)
     + " on conflict (grupo_cod) do nothing;")

rec = load("recurso.json")
cols = ("recurso_cod,recurso_cod_orig,grupo_cod,subclase_cod,clase_cod,descripcion,"
        "unidad,moneda,precio_analisis,cuenta1,cuenta2,cuenta3,cuenta4,no_utilizar")
B = 2000
for i in range(0, len(rec), B):
    vals = ",".join(
        "(" + ",".join([
            q(x["recurso_cod"]), q(x["recurso_cod_orig"]), q(x["grupo_cod"]),
            q(x["subclase_cod"]), q(x["clase_cod"]), q(x["descripcion"]),
            q(x["unidad"]), q(x["moneda"]), n(x["precio_analisis"]),
            q(x["cuenta1"]), q(x["cuenta2"]), q(x["cuenta3"]), q(x["cuenta4"]),
            q(x["no_utilizar"]),
        ]) + ")"
        for x in rec[i:i + B]
    )
    post(f'insert into "MaeRecurso_recurso"({cols}) values {vals} on conflict (recurso_cod) do nothing;')

print("OK ->", post('select '
      '(select count(*) from "MaeRecurso_clase") clase,'
      '(select count(*) from "MaeRecurso_subclase") subclase,'
      '(select count(*) from "MaeRecurso_grupo") grupo,'
      '(select count(*) from "MaeRecurso_recurso") recurso;'))
