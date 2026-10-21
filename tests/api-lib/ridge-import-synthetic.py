"""Synthetic-only offline importer exercise; no participant exports or main() writes."""
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('ridge_import', 'scripts/ridge/prepare-google-import.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
with tempfile.TemporaryDirectory(prefix='ridge-synthetic-import-') as tmp:
    root = Path(tmp)
    def write(name, value): (root / name).write_text(json.dumps(value))
    def sheet(name, values): write('native-' + name + '.json', {'values': values})
    write('native-Rider-Identity-Map.json', {'identities': [{'id': 'stable-synthetic', 'name': 'Synthetic Canonical', 'aliases': ['Old Synthetic']}]})
    (root / 'RTG_Code_RIDER_PHOTOS_updated.txt').write_text('function rtgConfirmedSeptemberTimes_(){return {}; }')
    sheet('RTG-Applied-Corrections', [[json.dumps({'aliases': {'old synthetic': 'Synthetic Canonical'}})]])
    header = ['Session Date', 'Rider', 'L1 Time', 'L2 % points', 'L3 % points', 'L4 % points', 'L5 % points', 'Lap Improvement Score', 'Total Laps', 'Session Highlight Score', 'Total Score']
    row = ['19-09-2026', 'Old Synthetic', '20:00', 8, '', -3, 0, 5, 4, 0, 9]
    sheet('Session-Scores', [header, row])
    sheet('Rider-Photos', [['Rider']])
    awards = [{'id': id, 'winners': [], 'metric': 'No eligible rider'} for id in ['leader', 'endurance', 'fastest', 'improvement', 'finish', 'consistent']]
    sheet('RTG-Unique-Spotlight', [['Session', 'Awards'], ['session:19-09-2026', json.dumps(awards)]])
    state, corrections, expected = m.prepare(root)
    entry = state['sessions'][0]['entries'][0]
    assert entry['riderId'] == 'stable-synthetic'
    assert entry['officialScore']['lapPoints'] == [None, 8, None, -3, 0]
    assert entry['officialScore']['completedLaps'] == 4
    assert entry['laps'][1]['durationMs'] is None
    assert len(entry['laps']) == 5
    assert len(state['sessions'][0]['awardOverrides']) == 6
    assert len(entry['officialScore']['provenance']['snapshotId']) == 64
    assert not (root / 'workspace.json').exists()
    sheet('Session-Scores', [header, row, row])
    try:
        m.prepare(root)
        raise AssertionError('Duplicate accepted')
    except ValueError as error:
        assert 'Duplicate' in str(error)
print('synthetic full preparation passed')
