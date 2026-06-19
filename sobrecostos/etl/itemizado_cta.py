#!/usr/bin/env python3
"""Detalle de cuentas/familia por obra y centro de costo, matcheado al maestro
de recursos (MaeRecurso) -> escribe src/data/cta.json (bundle de la app).

Uso:
    python3 itemizado_cta.py <Sobrecostos.xlsx> [salida.json]

Parsea las filas de DETALLE (outline_level 1) de cada hoja ITEMIZADO con el
mismo criterio de "última proyección completa" que itemizado_neto_proy.py, y
matchea la etiqueta de familia contra MaeRecurso_subclase (exacto normalizado →
prefijo → solapamiento de palabras Jaccard ≥ 0.45). El maestro se lee por la
API REST anon de solo lectura del proyecto Supabase.
"""
import sys, re, json, datetime, unicodedata, urllib.request
import openpyxl

REF = "vkmkfmjzgrugrkpxdrbe"
ANON_ENV = "SUPABASE_ANON_KEY"  # opcional; si no está, pasar como variable de entorno
MES = {'ENE':1,'FEB':2,'MAR':3,'ABR':4,'MAY':5,'JUN':6,'JUL':7,'AGO':8,'SEP':9,'OCT':10,'NOV':11,'DIC':12,
       'ENERO':1,'FEBRERO':2,'MARZO':3,'ABRIL':4,'MAYO':5,'JUNIO':6,'JULIO':7,'AGOSTO':8,'SEPTIEMBRE':9,
       'SEPT':9,'OCTUBRE':10,'NOVIEMBRE':11,'DICIEMBRE':12}


def parse_mes(h):
    u = re.sub(r'\s+', ' ', str(h)).strip().upper()
    u = u.replace('PROY', '').replace('PROYECCIÓN', '').replace('PROYECCION', '')
    m = re.search(r'([A-ZÁÉÍÓÚ]{3,10})[\.,\- ]*(\d{4}|\d{2})\b', u)
    if not m or m.group(1) not in MES:
        return None
    y = int(m.group(2)); y = y + 2000 if y < 100 else y
    return datetime.date(y, MES[m.group(1)], 1).isoformat()


def kind(h):
    u = re.sub(r'\s+', ' ', str(h)).strip().upper()
    if not u.startswith('PROY') or 'GASTAR' in u:
        return None
    if parse_mes(h):
        return 'mes'
    if 'MES ANT' in u or 'ANTERIOR' in u:
        return 'ant'
    return None


def num(v):
    return float(v) if isinstance(v, (int, float)) and not isinstance(v, bool) else 0.0


def obra_of(n):
    m = re.search(r'([A-Z]{2,4})[ _]+(\d{3})', n.upper())
    return f"{m.group(1)}_{m.group(2)}"


def parse_detalle(path):
    wb = openpyxl.load_workbook(path, data_only=True)
    rows = []
    for name in wb.sheetnames:
        if not name.upper().startswith('ITEMIZADO'):
            continue
        ws = wb[name]; obra = obra_of(name)
        hr = name_col = None
        for r in range(1, 21):
            for c in range(1, ws.max_column + 1):
                v = ws.cell(r, c).value
                if v and 'CENTROS DE CO' in str(v).upper():
                    hr, name_col = r, c; break
            if hr:
                break
        iva = next(c for c in range(1, ws.max_column + 1)
                   if str(ws.cell(hr, c).value).strip().upper() == 'IVA')
        neto_col = iva - 1
        cc_rows, det_rows = [], []
        for r in range(hr + 1, ws.max_row + 1):
            nm = ws.cell(r, name_col).value
            if nm is None or str(nm).strip() == '':
                break
            lvl = ws.row_dimensions[r].outline_level
            s = str(nm).strip()
            if not re.match(r'^\d{3}\b', s):
                continue
            (cc_rows if lvl == 0 else det_rows).append((r, s))
        elig = []
        for c in range(1, ws.max_column + 1):
            if not kind(ws.cell(hr, c).value):
                continue
            cov = sum(1 for r, _ in cc_rows if num(ws.cell(r, c).value) != 0) / len(cc_rows)
            elig.append((c, cov))
        full = [e for e in elig if e[1] >= 0.8]
        pc = (max(full, key=lambda e: e[0]) if full else max(elig, key=lambda e: (e[1], e[0])))[0]
        ccname = {re.match(r'^(\d{3})', s).group(1): re.sub(r'^\d{3}[\s\-]*', '', s)[:80]
                  for r, s in cc_rows}
        for r, s in det_rows:
            cc = re.match(r'^(\d{3})', s).group(1)
            neto = num(ws.cell(r, neto_col).value); pr = num(ws.cell(r, pc).value)
            if neto == 0 and pr == 0:
                continue
            rows.append(dict(obra=obra, cc_codigo=cc, cc_nombre=ccname.get(cc, cc),
                             familia=re.sub(r'^\d{3}[\s\-]*', '', s).strip()[:90],
                             costo_neto=round(neto), proy_ultima=round(pr)))
    return rows


def fetch(path):
    import os
    anon = os.environ.get(ANON_ENV)
    req = urllib.request.Request(f"https://{REF}.supabase.co/rest/v1/{path}",
                                 headers={"apikey": anon, "Authorization": f"Bearer {anon}"})
    return json.load(urllib.request.urlopen(req, timeout=60))


def norm(t):
    t = unicodedata.normalize('NFKD', str(t)).encode('ascii', 'ignore').decode()
    return re.sub(r'[^A-Za-z0-9 ]', ' ', t).upper()


def key(t):
    return re.sub(r'\s+', '', norm(t))


STOP = {'DE', 'Y', 'E', 'LA', 'EL', 'LOS', 'LAS', 'DEL', 'A', 'O', 'U', 'EN', 'CON'}


def wset(t):
    return {w for w in norm(t).split() if w and w not in STOP and len(w) > 1}


def build_matcher(sub, cla):
    exact = {}; wl = []
    for s in sub:
        info = (s["subclase_cod"], s["descripcion"], cla.get(s["clase_cod"], "?"))
        exact[key(s["descripcion"])] = info
        wl.append((wset(s["descripcion"]), info))

    def match(fam):
        k = key(fam)
        if k in exact:
            return exact[k]
        for kk, info in exact.items():
            if kk and (kk.startswith(k) or k.startswith(kk)) and min(len(kk), len(k)) >= 6:
                return info
        fw = wset(fam); best = None; bs = 0
        for sw, info in wl:
            if sw and fw:
                j = len(fw & sw) / len(fw | sw)
                if j > bs:
                    bs, best = j, info
        return best if best and bs >= 0.45 else ("—", fam, "SIN CLASIFICAR")
    return match


if __name__ == '__main__':
    src = sys.argv[1]
    out = sys.argv[2] if len(sys.argv) > 2 else 'src/data/cta.json'
    rows = parse_detalle(src)
    sub = fetch("MaeRecurso_subclase?select=subclase_cod,clase_cod,descripcion")
    cla = {c["clase_cod"]: c["descripcion"]
           for c in fetch("MaeRecurso_clase?select=clase_cod,descripcion")}
    match = build_matcher(sub, cla)
    hit = 0
    for r in rows:
        sc, sd, cd = match(r["familia"])
        r["subclase_cod"], r["subclase_desc"], r["clase_desc"] = sc, sd, cd
        if cd != "SIN CLASIFICAR":
            hit += 1
    json.dump(rows, open(out, 'w'), ensure_ascii=False, separators=(',', ':'))
    print(f"filas={len(rows)} matched={hit} ({hit/len(rows)*100:.1f}%) -> {out}")
