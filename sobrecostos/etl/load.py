import json, urllib.request, sys
URL="https://vkmkfmjzgrugrkpxdrbe.supabase.co/rest/v1/"
import os
KEY=os.environ.get("SUPABASE_ANON_KEY","")
def post(table, rows, batch=3000):
    total=0
    for i in range(0,len(rows),batch):
        chunk=rows[i:i+batch]
        data=json.dumps(chunk).encode()
        req=urllib.request.Request(URL+table, data=data, method='POST',
            headers={'apikey':KEY,'Authorization':'Bearer '+KEY,
                     'Content-Type':'application/json','Prefer':'return=minimal'})
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                total+=len(chunk)
        except urllib.error.HTTPError as e:
            print(f'  ERROR {table} batch@{i}: {e.code} {e.read().decode()[:300]}'); return total
    print(f'  {table}: {total} filas insertadas')
    return total
post('SobrecostosDboard_prpc', json.load(open('etl/sobrecostos/data/prpc.json')))
post('SobrecostosDboard_itemizado', json.load(open('etl/sobrecostos/data/item.json')))
post('SobrecostosDboard_itemizado_proyeccion', json.load(open('etl/sobrecostos/data/proy.json')))
