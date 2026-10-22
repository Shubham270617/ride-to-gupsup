import {beforeAll,beforeEach,afterAll,it,expect,vi} from 'vitest';
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {createHmac} from 'node:crypto';
import {createVolunteerHandler} from '../../api-lib/volunteerRidge';
import {createTimingCodeHandler} from '../../api-lib/timingCodes';
import {applyRidgeCommand} from '../../src/lib/ridge/engine';
import {mockReq,mockRes} from '../helpers/http';
let db,credential;const owner='00000000-0000-4000-8000-000000000001',actor='00000000-0000-4000-8000-000000000002';
const pepper='synthetic-only-0000000000000000000000000',token='a'.repeat(43);
const base=()=>({schemaVersion:1,riders:Array.from({length:4},(_,i)=>({id:`r${i}`,name:`Synthetic ${i}`})),sessions:[{id:'s',date:'2000-10-22',mode:'testing',finished:false,awardOverrides:[],entries:Array.from({length:4},(_,i)=>({riderId:`r${i}`,laps:[],adjustment:0}))}]});
const sqlFile=p=>readFileSync(new URL('../../supabase/'+p,import.meta.url),'utf8');
const adapter={auth:{getUser:async()=>({data:{user:{id:actor}}})},from(table){let columns='*',filters=[],values=[],one=false;const q={select(c){columns=c;return q;},eq(k,v){values.push(v);filters.push(`${k}=$${values.length}`);return q;},single(){one=true;return q;},maybeSingle(){one=true;return q;},async then(resolve,reject){try{const result=await db.query(`select ${columns} from ${table}${filters.length?' where '+filters.join(' and '):''}`,values);return resolve({data:one?result.rows[0]||null:result.rows});}catch(error){return resolve({error});}}};return q;},async rpc(name,args){try{const entries=Object.entries(args);const r=await db.query(`select ${name}(${entries.map(([k],i)=>`${k}=>$${i+1}`).join(',')}) as result`,entries.map(([,v])=>v));return{data:r.rows[0].result};}catch(error){return{error};}}};
beforeAll(async()=>{
 db=new PGlite();await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);insert into auth.users values('${actor}');create function auth.uid() returns uuid language sql as $$select null::uuid$$;create table admin_profiles(id uuid primary key);insert into admin_profiles values('${owner}');create table lab_registrations(user_id uuid,programme_slug text);create function is_admin() returns boolean language sql as $$select false$$;grant usage on schema auth,public to service_role,authenticated,anon;grant select on admin_profiles,auth.users to service_role;`);
 for(const p of ['migrations/20261020211425_native_ridge_workspace.sql','migrations/20261021152152_ridge_volunteer_timing_access.sql','migrations/20261021170333_ridge_scoped_code_access_and_testing_dates.sql'])await db.exec(sqlFile(p));
 await db.query("insert into ridge_timing_assignments(user_id,session_id,roster_rider_ids,expires_at,assigned_by) values($1,'s',$2,now()+interval '1 hour',$3)",[actor,['r0','r1','r2','r3'],owner]);
 await db.exec('set role service_role');
 const issued=await adapter.rpc('ridge_code_access',{p_action:'issue',p_data:{actor:owner,scope:'timing',userId:actor,sessionId:'s',codeHash:'b'.repeat(64),expiresAt:new Date(Date.now()+3600000).toISOString()}});credential=issued.data.id;
 await adapter.rpc('ridge_code_access',{p_action:'exchange',p_data:{codeHash:'b'.repeat(64),sessionHash:createHmac('sha256',pepper).update('session\0'+token).digest('hex')}});

},20000);
beforeEach(()=>{ vi.stubEnv('RTG_TIMING_CODES_ENABLED','true');vi.stubEnv('RTG_TIMING_CODE_ORIGIN','https://test.invalid');vi.stubEnv('RTG_TIMING_CODE_PEPPER',pepper);vi.stubEnv('RTG_LAYOUT_EDITOR_ADMIN_IDS',owner);});
afterAll(async()=>{vi.unstubAllEnvs();await db?.close();});
for(const path of ['account','code'])it(`${path} API reaches actual scoped SQL for wrong-date TEST start/pass/finish with unchanged session date`,async()=>{
 await db.query('update ridge_workspace set state=$1,version=0',[base()]);await db.query('delete from ridge_audit');
 const handler=path==='account'?createVolunteerHandler(()=>adapter):createTimingCodeHandler({getDb:()=>adapter});const at=Date.now()-3000;
 const commands=[{type:'group_start',sessionId:'s',at},{type:'pass',sessionId:'s',riderId:'r0',lap:1,at:at+1000},{type:'end',sessionId:'s',riderId:'r0',lap:2,at:at+2000}];
 for(let i=0;i<commands.length;i++){const body={version:i,requestId:`00000000-0000-4000-8000-0000000000${path==='account'?'1':'2'}${i}`,command:commands[i],...(path==='code'?{action:'write',credentialId:credential}:{})};const res=mockRes();await handler(mockReq({method:'POST',body,headers:path==='account'?{authorization:'Bearer synthetic'}:{origin:'https://test.invalid',cookie:'__Host-rtg-timing='+token}}),res);expect(res.statusCode,JSON.stringify(res.body)).toBe(200);}
 const saved=(await db.query('select state,version from ridge_workspace')).rows[0];expect(saved.version).toBe(3);expect(saved.state.sessions[0].date).toBe('2000-10-22');expect(saved.state.sessions[0].entries.every(e=>e.laps[0].start===at)).toBe(true);expect(saved.state.sessions[0].entries[0].laps[1].end).toBe(at+2000);
});
it('actual SQL still rejects wrong-date LIVE taps and stale TEST clocks',async()=>{
 const state=base(),at=Date.now(),command={type:'group_start',sessionId:'s',at};const result=applyRidgeCommand(state,command);state.sessions[0].mode='live';await db.query('update ridge_workspace set state=$1,version=0',[state]);const call=cmd=>adapter.rpc('ridge_timing_commit',{p_expected:0,p_request:'00000000-0000-4000-8000-000000000999',p_actor:actor,p_command:cmd,p_state:result.state,p_feed:result.feed});expect((await call(command)).error.message).toContain('Invalid tap time');state.sessions[0].mode='testing';await db.query('update ridge_workspace set state=$1',[state]);expect((await call({...command,at:at-700000})).error.message).toContain('Invalid tap time');expect((await db.query('select version from ridge_workspace')).rows[0].version).toBe(0);
});
