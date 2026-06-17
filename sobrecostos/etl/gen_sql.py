import json, openpyxl, re
F='/root/.claude/uploads/71302bad-fd03-5633-84ee-7ab529a192e2/a4246e1f-Sobrecostos.xlsx'
prpc=json.load(open('sobrecostos_build/prpc.json'))
item=json.load(open('sobrecostos_build/item.json'))
proy=json.load(open('sobrecostos_build/proy.json'))

# obra display names from sheet metadata
wb=openpyxl.load_workbook(F, read_only=True, data_only=True)
def norm(s): return re.sub(r'\s+',' ',str(s)).strip() if s is not None else ''
def obra_of(n):
    m=re.search(r'([A-Z]{2,4})[ _]+?(\d{3})', n.upper()); return f"{m.group(1)}_{m.group(2)}" if m else n.upper()
names={}
for name in wb.sheetnames:
    if not name.upper().startswith('PRP'): continue
    o=obra_of(name); rows=list(wb[name].iter_rows(values_only=True))
    for r in rows[:3]:
        for c in r:
            t=norm(c)
            if re.search(r'[A-Za-z]{3}.*\d', t) and 'PRP' not in t.upper() and len(t)<40 and '/' not in t and '-' not in t[:12]:
                names.setdefault(o, re.split(r'\s+-\s+', t)[0].strip()); break
obras=sorted(set(r['obra'] for r in prpc) | set(r['obra'] for r in item))

def sq(v):
    if v is None or v=='': return 'NULL'
    return "'"+str(v).replace("'","''")+"'"
def n(v):
    return 'NULL' if v is None else repr(float(v))
def b(v): return 'true' if v else 'false'

out=[]
P='SobrecostosDboard_'
ddl=f'''
drop table if exists "{P}itemizado_proyeccion" cascade;
drop table if exists "{P}itemizado" cascade;
drop table if exists "{P}prpc" cascade;
drop table if exists "{P}obra" cascade;

create table "{P}obra" (
  obra text primary key,
  nombre text
);

create table "{P}prpc" (
  id bigserial primary key,
  obra text not null references "{P}obra"(obra),
  centro_costo text,
  etiqueta text,
  cuenta_codigo text,
  es_centro_costo boolean,
  presupuesto numeric, programacion numeric, avance numeric,
  real_contable numeric, real_obra numeric, traspaso numeric
);
create index on "{P}prpc"(obra);
create index on "{P}prpc"(centro_costo);

create table "{P}itemizado" (
  id bigserial primary key,
  obra text not null references "{P}obra"(obra),
  cc_codigo text, item text, nivel text, clase text, tipo text,
  pct numeric, costo_neto numeric, iva numeric, costo_con_iva numeric,
  comprado numeric, recepcionado numeric, real_contable numeric, real_obra numeric
);
create index on "{P}itemizado"(obra);
create index on "{P}itemizado"(cc_codigo);

create table "{P}itemizado_proyeccion" (
  id bigserial primary key,
  obra text not null references "{P}obra"(obra),
  cc_codigo text, item text, periodo date, col_idx int, monto numeric
);
create index on "{P}itemizado_proyeccion"(obra);
create index on "{P}itemizado_proyeccion"(periodo);
'''
open('sobrecostos_build/00_ddl.sql','w').write(ddl)

def write_chunks(fname_prefix, table, cols, rows, fmt, chunk=2500):
    files=[]
    for k in range(0,len(rows),chunk):
        part=rows[k:k+chunk]
        vals=',\n'.join('('+fmt(r)+')' for r in part)
        sql=f'insert into "{P}{table}" ({",".join(cols)}) values\n{vals};\n'
        fn=f'sobrecostos_build/{fname_prefix}_{k//chunk:03d}.sql'
        open(fn,'w').write(sql); files.append(fn)
    return files

f_obra=write_chunks('10_obra','obra',['obra','nombre'],
    [{'obra':o,'nombre':names.get(o)} for o in obras],
    lambda r:f"{sq(r['obra'])},{sq(r['nombre'])}")
f_prpc=write_chunks('20_prpc','prpc',
    ['obra','centro_costo','etiqueta','cuenta_codigo','es_centro_costo','presupuesto','programacion','avance','real_contable','real_obra','traspaso'],
    prpc, lambda r:f"{sq(r['obra'])},{sq(r['centro_costo'])},{sq(r['etiqueta'])},{sq(r['cuenta_codigo'])},{b(r['es_centro_costo'])},{n(r['presupuesto'])},{n(r['programacion'])},{n(r['avance'])},{n(r['real_contable'])},{n(r['real_obra'])},{n(r['traspaso'])}")
f_item=write_chunks('30_item','itemizado',
    ['obra','cc_codigo','item','nivel','clase','tipo','pct','costo_neto','iva','costo_con_iva','comprado','recepcionado','real_contable','real_obra'],
    item, lambda r:f"{sq(r['obra'])},{sq(r['cc_codigo'])},{sq(r['item'])},{sq(r['nivel'])},{sq(r['clase'])},{sq(r['tipo'])},{n(r['pct'])},{n(r['costo_neto'])},{n(r['iva'])},{n(r['costo_con_iva'])},{n(r['comprado'])},{n(r['recepcionado'])},{n(r['real_contable'])},{n(r['real_obra'])}")
f_proy=write_chunks('40_proy','itemizado_proyeccion',
    ['obra','cc_codigo','item','periodo','col_idx','monto'],
    proy, lambda r:f"{sq(r['obra'])},{sq(r['cc_codigo'])},{sq(r['item'])},{('NULL' if not r['periodo'] else sq(r['periodo']))},{r['col_idx']},{n(r['monto'])}")

print('obras names:', names)
print('chunks -> obra:%d prpc:%d item:%d proy:%d'%(len(f_obra),len(f_prpc),len(f_item),len(f_proy)))
import os
for f in ['sobrecostos_build/00_ddl.sql']+f_proy[:1]:
    print(f, os.path.getsize(f),'bytes')
