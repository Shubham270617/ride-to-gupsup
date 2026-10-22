import {beforeAll,afterAll,it,expect} from 'vitest';
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {applyRidgeCommand} from '../../src/lib/ridge/engine.js';
let db;let version=0;let state;
const owner='00000000-0000-4000-8000-000000000001',actor='00000000-0000-4000-8000-000000000002';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const call=(command,result,request=id(10),expected=version)=>db.query('select ridge_timing_commit($1,$2,$3,$4,$5,$6) as version',[expected,request,actor,command,result.state,result.feed]);
beforeAll(async()=>{
 db=new PGlite();await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);insert into auth.users values('${actor}');create function auth.uid() returns uuid language sql as $$select null::uuid$$;create table admin_profiles(id uuid primary key);insert into admin_profiles values('${owner}');create table lab_registrations(user_id uuid,programme_slug text);create function is_admin() returns boolean language sql as $$select false$$;grant usage on schema auth,public to service_role,authenticated,anon;grant select on admin_profiles,auth.users to service_role;`);
 await db.exec(readFileSync(new URL('../../supabase/migrations/20261020211425_native_ridge_workspace.sql',import.meta.url),'utf8'));
 await db.exec(readFileSync(new URL('../../supabase/migrations/20261021152152_ridge_volunteer_timing_access.sql',import.meta.url),'utf8'));
 state={schemaVersion:1,riders:[{id:'a',name:'Synthetic A',privateNote:'NEVER RETURN'},{id:'b',name:'Synthetic B'}],sessions:[{id:'s',date:new Date(Date.now()+19800000).toISOString().slice(0,10),mode:'testing',finished:false,awardOverrides:[],entries:[]}]};
 await db.query('update ridge_workspace set state=$1',[state]);
 await db.query('insert into ridge_timing_assignments(user_id,session_id,roster_rider_ids,expires_at,assigned_by) values($1,$2,$3,now()+interval \'1 hour\',$4)',[actor,'s',['a','b'],owner]);
},20000);
afterAll(async()=>db?.close());
it('denies browser roles at the table and function boundary',async()=>{
 for(const role of ['anon','authenticated']){await db.exec(`set role ${role}`);await expect(db.query('select * from ridge_timing_assignments')).rejects.toMatchObject({code:'42501'});await expect(call({type:'attendance',sessionId:'s',riderIds:['a']},{state,feed:{}})).rejects.toMatchObject({code:'42501'});await db.exec('reset role');}
});
it('saves native attendance and timing atomically with original volunteer actor, CAS and idempotent receipt',async()=>{
 await db.exec('set role service_role');
 const commands=[{type:'attendance',sessionId:'s',riderIds:['a']},{type:'group_start',sessionId:'s',at:Date.now()-3000},{type:'pass',sessionId:'s',riderId:'a',lap:1,at:Date.now()-2000},{type:'end',sessionId:'s',riderId:'a',lap:2,at:Date.now()-1000},{type:'attendance',sessionId:'s',riderIds:['a','b']},{type:'start',sessionId:'s',riderId:'b',lap:1,at:Date.now()}];
 for(const command of commands){const result=applyRidgeCommand(state,command);const request=id(10+version);const expected=version;expect((await call(command,result,request)).rows[0].version).toBe(version+1);expect((await call(command,result,request,expected)).rows[0].version).toBe(version+1);version++;state=result.state;}
 const audits=(await db.query('select actor_id from ridge_audit')).rows;expect(audits).toHaveLength(6);expect(audits.every(a=>a.actor_id===actor)).toBe(true);
 expect((await db.query('select version from ridge_publication')).rows[0].version).toBe(version);
 await expect(call(commands[0],{state,feed:{}},id(99),0)).rejects.toMatchObject({code:'40001'});
 await expect(call({...commands[0],riderIds:[]},{state,feed:{}},id(10),0)).rejects.toMatchObject({code:'23505'});
 await db.exec('reset role');
});
it('rejects cross-session, owner commands, malicious state and revoked retries',async()=>{
 await db.exec('set role service_role');
 await expect(call({type:'attendance',sessionId:'elsewhere',riderIds:[]},{state,feed:{}})).rejects.toMatchObject({code:'42501'});
 await expect(call({type:'session_mode',sessionId:'s',mode:'live'},{state,feed:{}})).rejects.toMatchObject({code:'42501'});
 const command={type:'attendance',sessionId:'s',riderIds:['a','b']};const result=applyRidgeCommand(state,command);result.state.riders[0].name='Escalated';
 await expect(call(command,result,id(100))).rejects.toMatchObject({code:'42501'});
 await db.query('update ridge_timing_assignments set revoked_at=now()');
 await expect(call({type:'attendance',sessionId:'s',riderIds:['a']},{state,feed:{}},id(10),0)).rejects.toMatchObject({code:'42501'});
 expect((await db.query('select version from ridge_workspace')).rows[0].version).toBe(version);
 await db.exec('reset role');
});
it('audits owner grants and revocation with CAS and idempotency without changing timing history',async()=>{
 const expires=new Date(Date.now()+3600000).toISOString();
 const manage=(request,expected,revoke=false)=>db.query('select ridge_manage_timing_assignment($1,$2,$3,$4,$5,$6,$7,$8) as revision',[owner,request,actor,'s',revoke?[]:['a','b'],revoke?null:expires,revoke,expected]);
 await db.exec('set role service_role');
 expect((await manage(id(201),1)).rows[0].revision).toBe(2);
 expect((await manage(id(201),1)).rows[0].revision).toBe(2);
 await expect(manage(id(202),1)).rejects.toMatchObject({code:'40001'});
 await expect(manage(id(201),2,true)).rejects.toMatchObject({code:'23505'});
 expect((await manage(id(203),2,true)).rows[0].revision).toBe(3);
 expect((await db.query('select * from ridge_timing_access_audit')).rows).toHaveLength(2);
 expect((await db.query('select version from ridge_workspace')).rows[0].version).toBe(version);
 expect((await db.query('select version from ridge_publication')).rows[0].version).toBe(version);
 await db.exec('reset role');
 for(const role of ['anon','authenticated']){await db.exec(`set role ${role}`);await expect(manage(id(204),3)).rejects.toMatchObject({code:'42501'});await expect(db.query('select * from ridge_timing_access_audit')).rejects.toMatchObject({code:'42501'});await db.exec('reset role');}
});
it('rolls assignment change back if its access audit cannot be saved',async()=>{
 await db.exec(`create function reject_synthetic_access_audit() returns trigger language plpgsql as $$begin raise exception 'synthetic audit failure';end$$;create trigger synthetic_failure before insert on ridge_timing_access_audit for each row execute function reject_synthetic_access_audit();set role service_role;`);
 await expect(db.query('select ridge_manage_timing_assignment($1,$2,$3,$4,$5,$6,$7,$8)',[owner,id(205),actor,'s',['a','b'],new Date(Date.now()+3600000).toISOString(),false,3])).rejects.toThrow(/synthetic audit failure/);
 expect((await db.query('select revision,revoked_at from ridge_timing_assignments')).rows[0].revision).toBe(3);
 expect((await db.query('select revision,revoked_at from ridge_timing_assignments')).rows[0].revoked_at).not.toBeNull();
 await db.exec('reset role;drop trigger synthetic_failure on ridge_timing_access_audit;drop function reject_synthetic_access_audit();');
});
