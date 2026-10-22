import {it,expect} from 'vitest';
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {prepareStagedImport} from '../../scripts/ridge/staged-import.mjs';
import {buildPublicFeed} from '../../src/lib/ridge/engine.js';
import {prepareReviewedPublication} from '../../scripts/ridge/reviewed-publication.mjs';
const actorId='00000000-0000-4000-8000-000000000001', requestId='00000000-0000-4000-8000-000000000002';
const options={actorId,requestId,snapshotId:'synthetic'};
const source=()=>({schemaVersion:1,riders:[{id:'r',name:'Synthetic'}],sessions:[{id:'s',date:'2026-10-17',mode:'live',entries:[{riderId:'r',laps:[{durationMs:600000}],officialScore:{version:1,lapPoints:[null,8,null,-3,0],improvement:null,completedLaps:4,highlightScore:2,totalScore:17.125,provenance:{snapshotId:'synthetic'}}}],awardOverrides:[]}]});
it('preserves unknown and exact official values, does not mutate input or expose staged sessions',()=>{
 const input=source(), before=structuredClone(input), result=prepareStagedImport(input,options);
 expect(input).toEqual(before);expect(result.state.sessions[0]).toMatchObject({mode:'testing',finished:true});
 expect(result.state.sessions[0].entries).toEqual(input.sessions[0].entries);
 expect(buildPublicFeed(result.state).results).toEqual([]);
});
it('rejects ambiguous identities, duplicates, provenance mismatch and invalid official totals',()=>{
 const a=source();a.riders.push({id:'other',name:'SYNTHETIC'});expect(()=>prepareStagedImport(a,options)).toThrow(/Ambiguous/);
 const b=source();b.sessions[0].entries.push(b.sessions[0].entries[0]);expect(()=>prepareStagedImport(b,options)).toThrow(/duplicate/);
 expect(()=>prepareStagedImport(source(),{...options,snapshotId:'wrong'})).toThrow(/snapshot mismatch/);
 const c=source();c.sessions[0].entries[0].officialScore.improvement=99;expect(()=>prepareStagedImport(c,options)).toThrow(/reconcile/);
});
it('stages atomically with audit/version, exact retry, conflict rejection and unchanged publication',async()=>{
 const db=new PGlite();
 try {
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create function auth.uid() returns uuid language sql as $$select null::uuid$$;create function public.is_admin() returns boolean language sql as $$select false$$;create table admin_profiles(id uuid);insert into admin_profiles values('${actorId}');create table lab_registrations(user_id uuid,programme_slug text);`);
 await db.exec(readFileSync('supabase/migrations/20261020211425_native_ridge_workspace.sql','utf8'));
 const original=(await db.query('select feed from ridge_publication')).rows[0].feed;
 const prepared=prepareStagedImport(source(),options);
 await db.exec("create function reject_audit() returns trigger language plpgsql as $$begin raise exception 'Synthetic audit failure';end$$;create trigger reject_audit before insert on ridge_audit for each row execute function reject_audit();");
 await expect(db.exec(prepared.sql)).rejects.toThrow(/Synthetic audit failure/);await db.exec('rollback');
 expect((await db.query('select version from ridge_workspace')).rows[0].version).toBe(0);
 expect((await db.query('select feed from ridge_publication')).rows[0].feed).toEqual(original);
 await db.exec('drop trigger reject_audit on ridge_audit');
 await db.exec(prepared.sql);await db.exec(prepared.sql);
 expect((await db.query('select version,state from ridge_workspace')).rows[0]).toEqual({version:1,state:prepared.state});
 expect((await db.query('select count(*)::int as n from ridge_audit')).rows[0].n).toBe(1);
 expect((await db.query('select feed from ridge_publication')).rows[0].feed).toEqual(original);
 const changed=source();changed.sessions[0].entries[0].officialScore.totalScore=18;
 await expect(db.exec(prepareStagedImport(changed,options).sql)).rejects.toThrow(/Request ID/);await db.exec('rollback');
 await expect(db.exec(prepareStagedImport(source(),{...options,requestId:'00000000-0000-4000-8000-000000000003'}).sql)).rejects.toThrow(/no longer empty/);await db.exec('rollback');
 expect((await db.query('select version from ridge_workspace')).rows[0].version).toBe(1);
 const publishOptions={...options,requestId:'00000000-0000-4000-8000-000000000004',expectedVersion:1};
 expect(()=>prepareReviewedPublication(prepared.state,publishOptions)).toThrow(/approval/);
 const publication=prepareReviewedPublication(prepared.state,{...publishOptions,approved:true});
 expect(publication.feed.results[0]).not.toHaveProperty('provenance');
 expect(publication.feed.results[0].photo_url).toBe('');
 await db.exec(publication.sql);await db.exec(publication.sql);
 expect((await db.query('select version,feed from ridge_publication')).rows[0]).toEqual({version:2,feed:publication.feed});
 expect((await db.query('select count(*)::int as n from ridge_audit')).rows[0].n).toBe(2);
 const stale=prepareReviewedPublication(prepared.state,{...publishOptions,approved:true,requestId:'00000000-0000-4000-8000-000000000005'});
 await expect(db.exec(stale.sql)).rejects.toThrow(/staging changed/);await db.exec('rollback');
 expect((await db.query('select version from ridge_workspace')).rows[0].version).toBe(2);
 }finally{await db.close();}
},20000);
