"""Offline conversion of supplied private Google exports. No database/network calls.
Usage: python scripts/ridge/prepare-google-import.py /path/to/ridge-reference
Requires confirmed native-Rider-Identity-Map.json; never generates identity from a name.
"""
from pathlib import Path
from datetime import datetime
from decimal import Decimal, InvalidOperation
import hashlib, json, re, sys, uuid


def iso(value):
    if not isinstance(value, str) or not re.fullmatch(r'\d{2}-\d{2}-\d{4}', value):
        raise ValueError('Session date must be DD-MM-YYYY text')
    return datetime.strptime(value, '%d-%m-%Y').date().isoformat()


def num(value, nullable=False):
    if value is None or (isinstance(value, str) and not value.strip()):
        if nullable: return None
        raise ValueError('Required numeric score is missing')
    if isinstance(value, bool) or not re.fullmatch(r'[+-]?(?:\d+(?:\.\d*)?|\.\d+)', str(value).strip()):
        raise ValueError('Score must be a finite decimal')
    try: number = Decimal(str(value).strip())
    except InvalidOperation as error: raise ValueError('Invalid score') from error
    if not number.is_finite(): raise ValueError('Score must be finite')
    return float(number)


def canonical(name, aliases):
    value = str(name).strip()
    mapping = {}
    for alias, target in aliases.items():
        key = alias.strip().lower()
        if key in mapping and mapping[key] != target: raise ValueError('Ambiguous correction alias')
        mapping[key] = target
    seen = set()
    while value.lower() in mapping:
        key = value.lower()
        target = str(mapping[key]).strip()
        if not target: raise ValueError('Empty correction alias target')
        if target == value: break
        if key in seen: raise ValueError('Rider alias cycle')
        seen.add(key)
        value = target
    if not value: raise ValueError('Rider name is empty')
    return value


def identity_lookup(identities):
    lookup, ids = {}, set()
    for identity in identities:
        rid, name = identity.get('id'), identity.get('name')
        if not isinstance(rid, str) or not rid.strip() or not isinstance(name, str) or not name.strip() or rid in ids:
            raise ValueError('Invalid or duplicate stable rider identity')
        ids.add(rid)
        aliases = identity.get('aliases', [])
        if not isinstance(aliases, list): raise ValueError('Aliases must be a list')
        for alias in [name, *aliases]:
            if not isinstance(alias, str) or not alias.strip(): raise ValueError('Invalid identity alias')
            key = alias.strip().lower()
            if key in lookup and lookup[key]['id'] != rid: raise ValueError('Ambiguous identity alias')
            lookup[key] = identity
    return lookup


def duration(value):
    if value is None or value == '': return None
    text = str(value).lstrip("'")
    if not re.fullmatch(r'\d+(?::[0-5]\d){1,2}(?:\.\d{1,3})?', text): raise ValueError('Invalid duration')
    ms = int(sum(Decimal(v) * 60**i for i, v in enumerate(reversed(text.split(':')))) * 1000)
    if ms <= 0 or ms > 86400000: raise ValueError('Duration outside valid range')
    return ms


def timestamp(date, clock):
    return int(datetime.fromisoformat(date + 'T' + clock + '+05:30').timestamp() * 1000) if clock else None


def prepare(source):
    sources = {}
    def content(name):
        text = (source / name).read_text()
        sources[name] = hashlib.sha256(text.encode()).hexdigest()
        return text
    def read(name): return json.loads(content('native-' + name + '.json'))['values']
    uid = lambda text: str(uuid.uuid5(uuid.NAMESPACE_URL, 'https://rideteagupshup.com/ridge/' + text))
    identity_path = source / 'native-Rider-Identity-Map.json'
    if not identity_path.exists(): raise ValueError('Unresolved identities: provide confirmed native-Rider-Identity-Map.json; no name-derived IDs will be created')
    identities = identity_lookup(json.loads(content(identity_path.name))['identities'])
    code = content('RTG_Code_RIDER_PHOTOS_updated.txt')
    confirmed = json.loads(re.search(r'function rtgConfirmedSeptemberTimes_\(\)\{return (\{.*?\});', code, re.S).group(1))
    corrections = json.loads(read('RTG-Applied-Corrections')[0][0])
    canon = lambda name: canonical(name, corrections.get('aliases', {}))
    def rider(name):
        resolved = identities.get(canon(name).lower())
        if not resolved: raise ValueError('Unresolved rider identity: confirm mapping before import')
        return resolved
    rows = read('Session-Scores')[1:]
    if any(len(row) < 11 for row in rows): raise ValueError('Incomplete Session Scores row')
    photos = {rider(r[0])['id']: ''.join(str(v or '') for v in r[3:]) for r in read('Rider-Photos')[1:]}
    names = {rider(r[1])['id']: rider(r[1])['name'] for r in rows}
    state = {'schemaVersion': 1, 'riders': [{'id': rid, 'name': name, 'photo': ('data:image/jpeg;base64,' + photos[rid]) if rid in photos else ''} for rid, name in sorted(names.items())], 'sessions': []}
    expected, seen = [], set()
    for date in sorted(set(iso(r[0]) for r in rows)):
        display, entries = '-'.join(date.split('-')[::-1]), []
        weekly = read('RR-' + date)[1:] if date >= '2026-10-01' else []
        byid = {}
        for raw in weekly:
            if not raw or not raw[0]: continue
            rid = rider(raw[0])['id']
            if rid in byid: raise ValueError('Duplicate canonical rider in timer sheet')
            byid[rid] = raw
        for r in [r for r in rows if iso(r[0]) == date]:
            person = rider(r[1]); rid, name = person['id'], person['name']
            if (date, rid) in seen: raise ValueError('Duplicate canonical rider/session date')
            seen.add((date, rid))
            loops = num(r[8])
            if not loops.is_integer() or not 0 <= loops <= 5: raise ValueError('Invalid completed laps')
            loops = int(loops)
            points = [None] + [num(v, nullable=True) for v in r[3:7]]
            improvement, bonus, total = num(r[7], nullable=True), num(r[9]), num(r[10])
            if improvement is not None and abs(total - improvement - loops - bonus) > .011: raise ValueError('Published total does not reconcile')
            times = confirmed.get(display + '|' + canon(r[1]).lower(), [])
            raw = byid.get(rid)
            if raw: times = [raw[i] if i < len(raw) else '' for i in [3, 6, 11, 16, 21]]
            if not times: times = [r[2]]
            laps = []
            for i in range(5):
                lap = {'durationMs': duration(times[i] if i < len(times) else ''), 'source': 'Google published record'}
                if raw:
                    start_index = [1, 4, 9, 14, 19][i]
                    lap.update(start=timestamp(date, raw[start_index] if start_index < len(raw) else ''), end=timestamp(date, raw[start_index+1] if start_index+1 < len(raw) else ''))
                if i: lap['pointsOverride'] = points[i]
                laps.append(lap)
            official = {'version': 1, 'lapPoints': points, 'improvement': improvement, 'completedLaps': loops, 'highlightScore': bonus, 'totalScore': total}
            entries.append({'riderId': rid, 'laps': laps, 'adjustment': 0, 'officialScore': official})
            expected.append({'date': date, 'riderId': rid, 'name': name, 'loops': loops, 'progress': improvement, 'bonus': bonus, 'total': total, 'lapPoints': points})
        state['sessions'].append({'id': uid('session/' + date), 'date': date, 'mode': 'live', 'finished': True, 'entries': entries, 'awardOverrides': []})
    awards = {iso(r[0].removeprefix('session:')): json.loads(r[1]) for r in read('RTG-Unique-Spotlight')[1:]}
    for session in state['sessions']:
        official_awards = awards.get(session['date'])
        if not isinstance(official_awards, list) or [a['id'] for a in official_awards] != ['leader','endurance','fastest','improvement','finish','consistent']: raise ValueError('Incomplete official awards')
        used = set()
        for award in official_awards:
            ids = [rider(n)['id'] for n in award['winners']]
            if any(rid not in {entry['riderId'] for entry in session['entries']} for rid in ids): raise ValueError('Official award winner has no session entry')
            if len(set(ids)) != len(ids) or any(rid in used for rid in ids): raise ValueError('Duplicate official award winner')
            used.update(ids)
            session['awardOverrides'].append({'id': award['id'], 'riderIds': ids, 'metric': award['metric']})
    digest = hashlib.sha256(json.dumps(sources, sort_keys=True).encode()).hexdigest()
    for session in state['sessions']:
        for entry in session['entries']:
            entry['officialScore']['provenance'] = {'snapshotId': digest, 'sheet': 'Session Scores', 'sessionDate': session['date']}
    return state, corrections, {'expected': expected, 'awards': awards, 'sourceDigests': sources, 'snapshotId': digest}


def main():
    state, corrections, expected = prepare(Path(sys.argv[1]))
    out = Path('scripts/ridge/import'); out.mkdir(parents=True, exist_ok=True)
    legacy = out / 'legacy-audit.json'
    if legacy.exists(): state['legacyRecords'] = json.loads(legacy.read_text())
    for name, value in [('workspace.json', state), ('source-corrections.json', corrections), ('expected.json', expected)]:
        (out / name).write_text(json.dumps(value, ensure_ascii=False, indent=2))
    print(json.dumps({'riders': len(state['riders']), 'sessions': len(state['sessions']), 'results': len(expected['expected']), 'snapshotId': expected['snapshotId']}))


if __name__ == '__main__': main()
