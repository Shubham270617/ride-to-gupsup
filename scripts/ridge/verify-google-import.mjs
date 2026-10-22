// Offline comparison using git-ignored local source exports, never synthetic data.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildPublicFeed,sessionSpotlight,round2} from '../../src/lib/ridge/engine.js';
const read=name=>JSON.parse(readFileSync(new URL('./import/'+name,import.meta.url),'utf8'));
const state=read('workspace.json'),{expected,awards}=read('expected.json'),feed=buildPublicFeed(state);
assert.equal(feed.results.length,expected.length);
assert.equal(new Set(expected.map(r=>r.date+'|'+r.riderId)).size,expected.length,'Duplicate source rider/date');
assert.equal(new Set(feed.results.map(r=>r.session_date+'|'+r.athlete_id)).size,feed.results.length,'Duplicate feed rider/date');
for(const row of expected){
 const session=state.sessions.find(s=>s.date===row.date);
 const actual=feed.results.find(r=>r.session_slug===session.id&&r.athlete_id===row.riderId);
 assert.ok(actual,'Missing result');assert.equal(actual.completed_laps,row.loops);assert.equal(actual.progress_points,row.progress);assert.equal(actual.spotlight_points,row.bonus);assert.equal(actual.total_score,row.total);
 assert.equal(actual.score_source,'official-published');assert.deepEqual(actual.lap_points,row.lapPoints);assert.ok(session.entries.find(e=>e.riderId===row.riderId)?.officialScore?.provenance?.snapshotId,'Missing private snapshot identity');assert.equal(actual.provenance,undefined,'Private provenance leaked');
 if(row.progress!==null)assert.ok(Math.abs(actual.total_score-round2(actual.progress_points+actual.completed_laps+actual.spotlight_points))<=0.011,'Total reconciliation failed');
}
for(const session of state.sessions){
 const project=a=>({id:a.id,winners:a.winners,metric:a.metric});
 assert.deepEqual(sessionSpotlight(state,session).map(project),awards[session.date].map(project));
}
console.log(`Verified ${expected.length} published results and all Spotlight decisions across ${state.sessions.length} sessions. No network calls or database changes.`);


