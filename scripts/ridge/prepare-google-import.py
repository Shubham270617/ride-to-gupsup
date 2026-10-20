"""Read-only conversion of supplied Google exports; never connects to any database.
Usage: python scripts/ridge/prepare-google-import.py /path/to/ridge-reference
"""
from pathlib import Path
from datetime import datetime
from decimal import Decimal
import json, re, sys, uuid
source=Path(sys.argv[1]); out=Path('scripts/ridge/import');out.mkdir(parents=True,exist_ok=True)
read=lambda name:json.loads((source/('native-'+name+'.json')).read_text())['values']
uid=lambda text:str(uuid.uuid5(uuid.NAMESPACE_URL,'https://rideteagupshup.com/ridge/'+text))
iso=lambda d:'-'.join(d.split('-')[::-1])
num=lambda n:float(n or 0)
def duration(s):
 parts=str(s).lstrip("'").split(':');return int(sum(Decimal(v)*60**i for i,v in enumerate(reversed(parts)))*1000)
def timestamp(date,clock):
 return int(datetime.fromisoformat(date+'T'+clock+'+05:30').timestamp()*1000) if clock else None
code=(source/'RTG_Code_RIDER_PHOTOS_updated.txt').read_text()
confirmed=json.loads(re.search(r'function rtgConfirmedSeptemberTimes_\(\)\{return (\{.*?\});',code,re.S).group(1))
corrections=json.loads(read('RTG-Applied-Corrections')[0][0])
canonical=lambda name:corrections['aliases'].get(name,name).strip()
rows=read('Session-Scores')[1:]
names=sorted(set(canonical(r[1]) for r in rows))
photos={canonical(r[0]):''.join(str(v or '') for v in r[3:]) for r in read('Rider-Photos')[1:]}
state={'schemaVersion':1,'riders':[{'id':uid('rider/'+n.lower()),'name':n,'photo':('data:image/jpeg;base64,'+photos[n]) if n in photos else ''} for n in names],'sessions':[]}
expected=[]
for date in sorted(set(iso(r[0]) for r in rows)):
 display='-'.join(date.split('-')[::-1]);entries=[]
 weekly=read('RR-'+date)[1:] if date>='2026-10-01' else []
 byname={canonical(r[0]):r for r in weekly if r and r[0]}
 for r in [r for r in rows if iso(r[0])==date]:
  name=canonical(r[1]);times=confirmed.get(display+'|'+name.lower());raw=byname.get(name)
  if raw:times=[raw[i] if i<len(raw) else '' for i in [3,6,11,16,21]]
  assert times and all(times[:int(r[8])]),(date,name,'missing time')
  laps=[]
  for i in range(int(r[8])):
   lap={'durationMs':duration(times[i]),'source':'Google published record'}
   if raw:
    start_index=[1,4,9,14,19][i]
    lap.update(start=timestamp(date,raw[start_index]),end=timestamp(date,raw[start_index+1]))
   if i:lap['pointsOverride']=num(r[i+2])
   laps.append(lap)
  entry={'riderId':uid('rider/'+name.lower()),'laps':laps,'adjustment':round(num(r[10])-num(r[7])-num(r[8])-num(r[9]),2)}
  entries.append(entry)
  expected.append({'date':date,'name':name,'loops':int(r[8]),'progress':num(r[7]),'bonus':num(r[9]),'total':num(r[10])})
 state['sessions'].append({'id':uid('session/'+date),'date':date,'mode':'live','finished':True,'entries':entries,'awardOverrides':[]})
awards={iso(r[0].removeprefix('session:')):json.loads(r[1]) for r in read('RTG-Unique-Spotlight')[1:]}
legacy=out/'legacy-audit.json'
if legacy.exists():state['legacyRecords']=json.loads(legacy.read_text())
(out/'workspace.json').write_text(json.dumps(state,ensure_ascii=False,indent=2))
(out/'source-corrections.json').write_text(json.dumps(corrections,ensure_ascii=False,indent=2))
(out/'expected.json').write_text(json.dumps({'expected':expected,'awards':awards},ensure_ascii=False,indent=2))
print(json.dumps({'riders':len(names),'sessions':len(state['sessions']),'results':len(expected),'laps':sum(r['loops'] for r in expected),'photos':len(photos)}))
