import {beforeAll,beforeEach,afterAll,it,expect,vi} from 'vitest';
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {createHmac} from 'node:crypto';
import {createTimingCodeHandler} from '../../api-lib/timingCodes';
import {applyRidgeCommand} from '../../src/lib/ridge/engine';
import {mockReq,mockRes} from '../helpers/http';
let db,credential,cookie;const owner='00000000-0000-4000-8000-000000000001',pepper='synthetic-only-pepper-0000000000000000000',origin='https://test.invalid';
const state={schemaVersion:1,riders:[{id:'r1',name:'Synthetic A'},{id:'r2',name:'Synthetic B'}],sessions:[{id:'s',date:'2000-10-22',mode:'testing',finished:false,awardOverrides:[],entries:[]}]};
const sql=p=>readFileSync(new URL('../../supabase/'+p,import.meta.url),'utf8');
const adapter={from(table){let columns='*',filters=[],values=[],one=false;const q={select(c){columns=c;return q;},eq(k,v){values.push(v);filters.push(`${k}=$${values.length}`);return q;},single(){one=true;return q;},maybeSingle(){one=true;return q;},async then(resolve){try{const result=await db.query(`select ${columns} from ${table}${filters.length?' where '+filters.join(' and '):''}`,values);return resolve({data:one?result.rows[0]||null:result.rows});}catch(error){return resolve({error});}}};return q;},async rpc(name,args){try{const entries=Object.entries(args),r=await db.query(`select ${name}(${entries.map(([k],i)=>`${k}=>$${i+1}`).join(',')}) as result`,entries.map(([,v])=>v));return {data:r.rows[0].result};}catch(error){return {error};}}};
const rpc=async(action,data)=>{const r=await adapter.rpc('ridge_code_access',{p_action:action,p_data:data});if(r.error)throw r.error;return r.data;};
const handler=createTimingCodeHandler({getDb:()=>adapter,authorize:async()=>({ok:true,user:{id:owner}})});
const api=async body=>{const res=mockRes();await handler(mockReq({method:'POST',headers:{origin,...(cookie?{cookie}:{})},body}),res);return res;};
beforeAll(async()=>{
 db=new PGlite();await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select null::uuid$$;create table admin_profiles(id uuid primary key);insert into admin_profiles values('${owner}');create table lab_registrations(user_id uuid,programme_slug text);create function is_admin() returns boolean language sql as $$select false$$;grant usage on schema auth,public to service_role,authenticated,anon;grant select on admin_profiles,auth.users to service_role;`);
 for(const p of ['migrations/20261020211425_native_ridge_workspace.sql','migrations/20261021152152_ridge_volunteer_timing_access.sql','migrations/20261021170333_ridge_scoped_code_access_and_testing_dates.sql','migrations/20261021174900_session_timing_codes.sql'])await db.exec(sql(p));
 await db.query('update ridge_workspace set state=$1,version=0',[state]);await db.exec('set role service_role');
 vi.stubEnv('RTG_TIMING_CODES_ENABLED','true');vi.stubEnv('RTG_TIMING_CODE_ORIGIN',origin);vi.stubEnv('RTG_TIMING_CODE_PEPPER',pepper);vi.stubEnv('RTG_LAYOUT_EDITOR_ADMIN_IDS',owner);
},20000);
beforeEach(()=>{vi.stubEnv('RTG_TIMING_CODES_ENABLED','true');vi.stubEnv('RTG_SESSION_TIMING_CODES_ENABLED','true');vi.stubEnv('RTG_TIMING_CODE_ORIGIN',origin);vi.stubEnv('RTG_TIMING_CODE_PEPPER',pepper);vi.stubEnv('RTG_LAYOUT_EDITOR_ADMIN_IDS',owner);});
afterAll(async()=>{vi.unstubAllEnvs();await db?.close();});
it('fails closed before explicit session-code flag activation',async()=>{vi.stubEnv('RTG_SESSION_TIMING_CODES_ENABLED','false');expect((await api({action:'issue',scope:'session_timing',sessionId:'s',expiresAt:new Date(Date.now()+3600000).toISOString()})).statusCode).toBe(503);expect((await db.query('select count(*) n from ridge_timing_codes')).rows[0].n).toBe(0);});
it('issues/redeems through real API+SQL with no registered account or assignment',async()=>{
 vi.stubEnv('RTG_SESSION_TIMING_CODES_ENABLED','true');const issued=await api({action:'issue',scope:'session_timing',sessionId:'s',expiresAt:new Date(Date.now()+3600000).toISOString()});expect(issued.statusCode,JSON.stringify(issued.body)).toBe(200);credential=issued.body.id;
 const exchanged=await api({action:'exchange',code:issued.body.code});expect(exchanged.statusCode,JSON.stringify(exchanged.body)).toBe(200);cookie=exchanged.headers['set-cookie'].split(';')[0];expect((await api({action:'read'})).body.state.riders).toHaveLength(2);
 expect((await db.query('select count(*) n from ridge_timing_assignments')).rows[0].n).toBe(0);const row=(await db.query('select user_id,roster_rider_ids from ridge_timing_codes where id=$1',[credential])).rows[0];expect(row.user_id).toBeNull();expect(row.roster_rider_ids).toEqual(['r1','r2']);
});
it('enforces attendance, subsecond original taps, pass/finish and idempotent receipts',async()=>{
 const stale=await api({action:'write',credentialId:credential,version:99,requestId:'00000000-0000-4000-8000-000000000777',command:{type:'attendance',sessionId:'s',riderIds:['r1','r2']}});expect(stale.statusCode).toBe(409);expect(stale.body).toMatchObject({definitive:true,rebaseAllowed:true});
 const at=Date.now()-4000,commands=[{type:'attendance',sessionId:'s',riderIds:['r1','r2']},{type:'start',sessionId:'s',riderId:'r1',lap:1,at},{type:'start',sessionId:'s',riderId:'r2',lap:1,at:at+100},{type:'pass',sessionId:'s',riderId:'r1',lap:1,at:at+1000},{type:'end',sessionId:'s',riderId:'r1',lap:2,at:at+2000}];
 for(let i=0;i<commands.length;i++){const body={action:'write',credentialId:credential,version:i,requestId:`00000000-0000-4000-8000-00000000001${i}`,command:commands[i]};expect((await api(body)).statusCode).toBe(200);expect((await api(body)).statusCode).toBe(200);}
 const w=(await db.query('select state,version from ridge_workspace')).rows[0];expect(w.version).toBe(5);expect(w.state.sessions[0].entries[1].laps[0].start-w.state.sessions[0].entries[0].laps[0].start).toBe(100);
 const audit=(await db.query('select details from ridge_audit order by version limit 1')).rows[0].details;expect(audit).toMatchObject({credentialId:credential,operatorScope:'session_code',operatorIdentity:'unverified code holder'});
});
it('denies wrong session, advanced actions, cookie mismatch and forged state diff',async()=>{
 for(const command of [{type:'attendance',sessionId:'other',riderIds:[]},{type:'finish_session',sessionId:'s'}])expect((await api({action:'write',credentialId:credential,version:5,requestId:'00000000-0000-4000-8000-000000000099',command})).statusCode).not.toBe(200);
 const w=(await db.query('select state from ridge_workspace')).rows[0],command={type:'attendance',sessionId:'s',riderIds:['r1','r2']},r=applyRidgeCommand(w.state,command);r.state.riders[0].name='FORGED';const token=cookie.split('=')[1],hash=createHmac('sha256',pepper).update('session\0'+token).digest('hex');
 await expect(db.query('select ridge_session_code_commit($1,$2,5,$3,$4,$5,$6)',[hash,credential,'00000000-0000-4000-8000-000000000098',command,r.state,r.feed])).rejects.toMatchObject({code:'42501'});
 expect((await api({action:'write',credentialId:'00000000-0000-4000-8000-000000000888',version:5,requestId:'00000000-0000-4000-8000-000000000097',command})).statusCode).toBe(409);
});
it('revocation and expiry deny existing sessions; no browser table or RPC grants',async()=>{
 await rpc('revoke',{actor:owner,id:credential});expect((await api({action:'read'})).statusCode).toBe(401);
 await db.exec('reset role');await db.query("update ridge_timing_codes set revoked_at=null,expires_at=now()-interval '1 minute' where id=$1",[credential]);await db.exec('set role service_role');expect((await api({action:'read'})).statusCode).toBe(401);
 for(const role of ['anon','authenticated']){await db.exec('reset role;set role '+role);await expect(db.query('select * from ridge_timing_codes')).rejects.toMatchObject({code:'42501'});await expect(db.query('select ridge_session_code_commit(null,null,null,null,null,null,null)')).rejects.toMatchObject({code:'42501'});}await db.exec('reset role');
});
