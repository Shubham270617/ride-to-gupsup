import { describe, it, expect } from "vitest";
import { scoreEntry, buildPublicFeed, applyRidgeCommand } from "../../src/lib/ridge/engine.js";
import { execFileSync } from "node:child_process";
const at = Date.parse('2026-10-17T06:00:00+05:30');
const official = () => ({ version: 1, lapPoints: [null, 8, null, -3, 0], improvement: 5, completedLaps: 4, highlightScore: 2, totalScore: 11, provenance: {snapshotId:'synthetic-v1'} });
const state = () => ({schemaVersion:1,riders:[{id:'a',name:'Synthetic'}],sessions:[{id:'s',date:'2026-10-17',mode:'testing',finished:false,awardOverrides:[],entries:[{riderId:'a',laps:[],adjustment:0}]}]});
const run = (s, command) => applyRidgeCommand(s,{sessionId:'s',riderId:'a',...command},{now:at});

describe('source-verified Ridge parity', () => {
  it('prepares only synthetic snapshots with stable IDs, official gaps and duplicate rejection', () => {
    expect(execFileSync('python3',['tests/api-lib/ridge-import-synthetic.py'],{encoding:'utf8'})).toContain('synthetic full preparation passed');
  });
  it('preserves explicit numeric lap overrides without adjacent durations', () => {
    expect(scoreEntry({laps:[{}, {durationMs:600000,pointsOverride:7}]}).points).toEqual([null,7]);
    expect(scoreEntry({laps:[{durationMs:600000},{durationMs:540000,pointsOverride:null}]}).points).toEqual([null,10]);
  });
  it('preserves authoritative null/gaps/total independently of known durations', () => {
    const score=scoreEntry({laps:[{durationMs:600000},{},{}],officialScore:official()});
    expect(score.points).toEqual([null,8,null,-3,0]); expect(score.completed).toBe(4); expect(score.progress).toBe(5); expect(score.totalScore).toBe(11);
    expect(score.times).toEqual([600000,null,null,null,null]);
    expect(scoreEntry({laps:[],officialScore:{...official(),improvement:null,totalScore:22}}).progress).toBeNull();
  });
  it('feeds stable identity and exact official scalar fields', () => {
    const s=state();s.sessions[0].mode='live';s.sessions[0].entries[0].officialScore=official();
    const row=buildPublicFeed(s).results[0];
    expect(row).toMatchObject({athlete_id:'a',score_source:'official-published',session_date:'2026-10-17',improvement:5,completed_laps:4,highlight_score:2,total_score:11});
    expect(row.lap_points).toEqual([null,8,null,-3,0]);
    expect(() => run(s,{type:'correct_lap',lap:1,mode:'duration',duration:'20:00',reason:'change'})).toThrow(/source revision/);
  });
  it('does not fabricate an authoritative zero from null or accept inconsistent totals', () => {
    expect(()=>scoreEntry({officialScore:{...official(),totalScore:999}})).toThrow(/reconcile/);
    expect(scoreEntry({officialScore:{...official(),improvement:0,completedLaps:0,highlightScore:0,totalScore:0}}).totalScore).toBe(0);
  });
  it('allows clean promotion, rejects recorded promotion, retains live downgrade', () => {
    expect(run(state(),{type:'session_mode',mode:'live',reason:'Clean session'}).state.sessions[0].mode).toBe('live');
    const started=run(state(),{type:'start',lap:1,at}).state;
    const before=JSON.stringify(started);
    expect(()=>run(started,{type:'session_mode',mode:'live',reason:'test'})).toThrow(/test recordings/);
    expect(JSON.stringify(started)).toBe(before);
    started.sessions[0].mode='live';
    const down=run(started,{type:'session_mode',mode:'testing',reason:'Unpublish'});
    expect(down.feed.results).toEqual([]);expect(down.state.sessions[0].entries[0].laps[0].start).toBe(at);
  });
  it('locks running laps and reopens without discarding timestamps', () => {
    const started=run(state(),{type:'start',lap:1,at}).state;
    const locked=run(started,{type:'finish_session',reason:'Stop day'}).state;
    expect(locked.sessions[0].finished).toBe(true);
    expect(()=>run(locked,{type:'end',lap:1,at:at+1000})).toThrow(/locked/);
    expect(run(locked,{type:'reopen_session',reason:'Resume'}).state.sessions[0].entries[0].laps[0].start).toBe(at);
  });
  it('requires timestamp recovery for absent laps; duration correction allowed once recorded', () => {
    expect(()=>run(state(),{type:'correct_lap',lap:1,mode:'duration',duration:'20:00',reason:'Recover'})).toThrow(/missing lap/);
    const recovered=run(state(),{type:'correct_lap',lap:1,mode:'timestamps',start:new Date(at).toISOString(),end:new Date(at+1000).toISOString(),reason:'Recovered log'}).state;
    expect(recovered.sessions[0].entries[0].laps[0].end).toBe(at+1000);
    const started=run(state(),{type:'start',lap:1,at}).state;
    expect(run(started,{type:'correct_lap',lap:1,mode:'duration',duration:'20:00',reason:'Stopwatch'}).state.sessions[0].entries[0].laps[0].durationMs).toBe(1200000);
    expect(()=>run(state(),{type:'correct_lap',lap:2,mode:'duration',duration:'20:00',reason:'Missing'})).toThrow(/previous lap/);
  });
  it('validates importer calendar/null/alias chains and confirmed stable IDs without reading exports', () => {
    const script=`import importlib.util,sys\nsys.dont_write_bytecode=True\nspec=importlib.util.spec_from_file_location('ridge_import','scripts/ridge/prepare-google-import.py')\nm=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)\nassert m.iso('29-02-2024')=='2024-02-29'\nfor d in ['29-02-2026','31-04-2026','2026-10-03']:\n try: m.iso(d);raise AssertionError('accepted invalid date')\n except ValueError: pass\nassert m.num('',True) is None and m.num(0)==0\nassert m.canonical(' OLD ',{'old':'Middle','middle':'Final'})=='Final'\ntry: m.canonical('a',{'a':'b','b':'a'});raise AssertionError('cycle accepted')\nexcept ValueError: pass\nlookup=m.identity_lookup([{'id':'stable-1','name':'Final','aliases':['Old']}])\nassert lookup['old']['id']=='stable-1'\ntry: m.identity_lookup([{'id':'1','name':'Same'},{'id':'2','name':'same'}]);raise AssertionError('ambiguity accepted')\nexcept ValueError: pass\nassert m.duration('') is None\nprint('synthetic importer checks passed')`;
    expect(execFileSync('python3',['-c',script],{encoding:'utf8'})).toContain('synthetic importer checks passed');
  });
});
