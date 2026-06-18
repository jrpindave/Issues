"""Parsea el maestro de recursos del ERP Unysoft (Recursos_Garcia.xlsx) a JSON.

Hojas: maeRecursoClase / maeRecursoSubClase / maeRecursoGrupo / maeRecurso.
Salida: maerecurso_data/{clase,subclase,grupo,recurso}.json

Uso:  python3 maerecurso_parse.py <ruta/Recursos_Garcia.xlsx> [dir_salida]
"""
import openpyxl, json, re, sys, os

SRC = sys.argv[1] if len(sys.argv) > 1 else "source/Recursos_Garcia.xlsx"
OUT = sys.argv[2] if len(sys.argv) > 2 else "maerecurso_data"
os.makedirs(OUT, exist_ok=True)

wb = openpyxl.load_workbook(SRC, read_only=True, data_only=True)


def S(v):
    if v is None:
        return None
    s = re.sub(r"\s+", " ", str(v)).strip()
    return s if s not in ("", ".", "...", "......") else None


def NUM(v):
    if v in (None, ""):
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        try:
            return float(re.sub(r"[^0-9.\-]", "", str(v)))
        except ValueError:
            return None


def rows(name):
    return list(wb[name].iter_rows(values_only=True))


clase = [
    {"clase_cod": S(r[0]), "descripcion": S(r[1])}
    for r in rows("maeRecursoClase")[1:]
    if S(r[0]) and S(r[1]) and "SUBANALISIS" not in (S(r[1]) or "")
]
subclase = [
    {"clase_cod": S(r[0]), "subclase_cod": S(r[1]), "descripcion": S(r[2])}
    for r in rows("maeRecursoSubClase")[1:]
    if S(r[1]) and S(r[2]) and "SUBANALISIS" not in (S(r[2]) or "")
]
grupo = [
    {"clase_cod": S(r[0]), "subclase_cod": S(r[1]), "grupo_cod": S(r[2]),
     "descripcion": S(r[3]), "unidad_def": S(r[6])}
    for r in rows("maeRecursoGrupo")[1:]
    if S(r[2]) and S(r[3]) and "SUBANALISIS" not in (S(r[3]) or "")
]

recurso = []
for r in rows("maeRecurso")[1:]:
    raw = S(r[3])
    if not raw:
        continue
    recurso.append({
        "recurso_cod": raw.lstrip("~").strip(),
        "recurso_cod_orig": raw,
        "clase_cod": S(r[0]), "subclase_cod": S(r[1]), "grupo_cod": S(r[2]),
        "descripcion": S(r[4]), "unidad": S(r[6]), "moneda": S(r[7]),
        "precio_analisis": NUM(r[8]),
        "cuenta1": S(r[17]), "cuenta2": S(r[18]), "cuenta3": S(r[19]), "cuenta4": S(r[35]),
        "no_utilizar": S(r[36]),
    })

for name, data in [("clase", clase), ("subclase", subclase), ("grupo", grupo), ("recurso", recurso)]:
    json.dump(data, open(f"{OUT}/{name}.json", "w"), ensure_ascii=False)

print(f"clase:{len(clase)} subclase:{len(subclase)} grupo:{len(grupo)} recurso:{len(recurso)}")
