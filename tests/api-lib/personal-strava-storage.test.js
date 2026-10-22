import {beforeAll,afterAll,it,expect} from 'vitest';
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {createPersonalStore} from '../../api-lib/strava-personal/store.js';
import {createLifecycle} from '../../api-lib/strava-personal/lifecycle.js';
let db;const binding={clientId:'272337',userId:'00000000-0000-4000-8000-000000000001',athleteId:'456'},key=Buffer.alloc(32,7);
const rpc=async(action,data={})=>(await db.query('select public.rtg_personal_store($1,$2) as result',[action,{...data,...binding}])).rows[0].result;
const adapter={async rpc(_name,args){try{return {data:await rpc(args.p_action,args.p_data)};}catch(error){return {error};}}};
const store=()=>createPersonalStore({db:adapter,key,binding});
async function connect(){await rpc('erase');const revision=Number((await rpc('read')).revision);await store().saveConnection({...binding,expectedRevision:revision,authorizationStartedAt:Date.now()-1000,accessToken:'synthetic-access',refreshToken:'synthetic-refresh',expiresAt:Date.now()+3600000});}
beforeAll(async()=>{db=new PGlite();await db.exec('create schema auth;create table auth.users(id uuid primary key);create table auth.sessions(id uuid primary key,user_id uuid,not_after timestamptz);create role anon;create role authenticated;create role service_role bypassrls;grant usage on schema public to service_role,anon,authenticated;');await db.exec(readFileSync(new URL('../../supabase/proposals/personal-strava.sql',import.meta.url),'utf8'));await db.query('insert into auth.users values($1)',[binding.userId]);await db.exec('set role service_role');});
afterAll(async()=>db.close());
it('has no browser access or history update/delete grant',async()=>{const r=await db.query("select has_function_privilege('anon','public.rtg_personal_store(text,jsonb)','execute') a,has_schema_privilege('authenticated','rtg_personal','usage') b,has_table_privilege('service_role','rtg_personal.rule_history','update') c,has_table_privilege('service_role','rtg_personal.rule_history','delete') d");expect(r.rows[0]).toEqual({a:false,b:false,c:false,d:false});});
it('consumes OAuth state exactly once, bound to app/login and generation',async()=>{const s=store(),v={...binding,hash:'a'.repeat(64),loginId:'login1',expiresAt:Date.now()+300000};await s.putState(v);expect(await s.consumeState({...v,loginId:'other'})).toBeNull();const consumed=await s.consumeState(v);expect(Number.isInteger(consumed.revision)).toBe(true);expect(await s.consumeState(v)).toBeNull();await rpc('erase');await expect(s.saveConnection({...binding,expectedRevision:consumed.revision,accessToken:'a',refreshToken:'r',expiresAt:Date.now()+360000})).rejects.toThrow();});
it('encrypts storage and prevents concurrent instances or stale refresh resurrection',async()=>{await connect();const a=store(),b=store();await a.withConnectionLock(binding,async()=>{await expect(b.withConnectionLock(binding,async()=>{})).rejects.toThrow();const row=await a.readConnection(binding);expect(row.accessToken).toBe('synthetic-access');expect(JSON.stringify(await rpc('read'))).not.toContain('synthetic-access');await a.setStatus(binding,row.revision,'refreshing');await b.eraseConnectionAndCache(binding);await expect(a.replaceTokens(binding,row.revision,{accessToken:'later',refreshToken:'later',expiresAt:Date.now()+360000})).rejects.toThrow();});expect((await a.status()).status).toBe('deleted');});
it('persists refresh uncertainty across instances without replaying provider call',async()=>{await connect();await db.query('update rtg_personal.connections set expires_at=0');let calls=0;const life=createLifecycle({store:store(),provider:{refresh:async()=>{calls++;throw Error('lost response');}}});await expect(life.token(binding)).rejects.toThrow('unresolved');await expect(createLifecycle({store:store(),provider:{refresh:async()=>{calls++;}}}).token(binding)).rejects.toThrow();expect(calls).toBe(1);});
it('expired refresh lease requires reconnect rather than retry',async()=>{await connect();await rpc('lease',{leaseId:randomUUID()});await db.query("update rtg_personal.connections set status='refreshing',lease_until=now()-interval '1 second'");await store().withConnectionLock(binding,async()=>{expect((await store().status()).status).toBe('reconnect');});});
it('deletes local token even if provider revocation fails',async()=>{await connect();const result=await createLifecycle({store:store(),provider:{revoke:async()=>{throw Error();}}}).disconnect(binding);expect(result).toEqual({deleted:true,remoteRevocationConfirmed:false});expect((await rpc('read')).envelope).toBeNull();});
it('keeps immutable rule versions with CAS and idempotent retry',async()=>{const s=store(),document={schemaVersion:2,id:'synthetic-rules',version:1,sports:['Ride'],allowManual:false,allowTrainer:false,rules:[]},requestId=randomUUID();expect(await s.appendRules({document,requestId,expectedVersion:0})).toEqual(document);expect(await s.appendRules({document,requestId,expectedVersion:0})).toEqual(document);await expect(s.appendRules({document:{...document,allowManual:true},requestId,expectedVersion:0})).rejects.toThrow();await expect(s.appendRules({document:{...document,version:2},requestId:randomUUID(),expectedVersion:0})).rejects.toThrow();expect(await s.ruleHistory(document.id)).toEqual([document]);});
it('session check rejects revoked/expired or other-account login',async()=>{await db.exec('reset role');const id=randomUUID();await db.query('insert into auth.users values($1) on conflict do nothing',[binding.userId]);await db.query('insert into auth.sessions values($1,$2,null)',[id,binding.userId]);await db.exec('set role service_role');expect((await db.query('select rtg_personal_session_alive($1,$2) ok',[binding.userId,id])).rows[0].ok).toBe(true);expect((await db.query('select rtg_personal_session_alive($1,$2) ok',[randomUUID(),id])).rows[0].ok).toBe(false);await db.exec('reset role');await db.query("update auth.sessions set not_after=now()-interval '1 second' where id=$1",[id]);await db.exec('set role service_role');expect((await db.query('select rtg_personal_session_alive($1,$2) ok',[binding.userId,id])).rows[0].ok).toBe(false);});
it('runs mocked OAuth through the assembled service, durable vault and session guard',async()=>{
 await rpc('erase');
 const {createPersonalIntegration}=await import('../../api-lib/strava-personal/integration.js');const {mockReq,mockRes}=await import('../helpers/http.js');
 const loginId=randomUUID();await db.exec('reset role');await db.query('insert into auth.sessions values($1,$2,null)',[loginId,binding.userId]);await db.exec('set role service_role');
 const dbAdapter={auth:{getUser:async()=>({data:{user:{id:binding.userId}}})},async rpc(name,args){try{const keys=Object.keys(args),r=await db.query(`select public.${name}(${keys.map((_,i)=>'$'+(i+1)).join(',')}) result`,Object.values(args));return {data:r.rows[0].result};}catch(error){return {error};}}};
 const env={RTG_PERSONAL_STRAVA_ENABLED:'true',RTG_PERSONAL_STRAVA_ORIGIN:'https://rtg-website-three.vercel.app',SUPABASE_URL:'https://cxwfjrntfqlyaqppxggh.supabase.co',RTG_PERSONAL_STRAVA_CLIENT_ID:binding.clientId,RTG_PERSONAL_STRAVA_CLIENT_SECRET:'synthetic-secret',RTG_PERSONAL_STRAVA_USER_ID:binding.userId,RTG_PERSONAL_STRAVA_ATHLETE_ID:binding.athleteId,RTG_PERSONAL_STRAVA_VAULT_KEY:key.toString('base64')};
 const jwt='synthetic.'+Buffer.from(JSON.stringify({sub:binding.userId,session_id:loginId})).toString('base64url')+'.synthetic';
 let calls=0;const handler=createPersonalIntegration({env,db:dbAdapter,authorizeOwner:async()=>({ok:true,user:{id:binding.userId}}),fetchImpl:async()=>{calls++;return {ok:true,json:async()=>({athlete:{id:456},access_token:'synthetic-exchanged',refresh_token:'synthetic-refresh',expires_at:Math.floor(Date.now()/1000)+3600,scope:'activity:read read'})};}});
 const call=async body=>{const res=mockRes();await handler(mockReq({method:'POST',headers:{origin:env.RTG_PERSONAL_STRAVA_ORIGIN,authorization:'Bearer '+jwt},body}),res);return res;};
 const begin=await call({action:'begin'});expect(begin.statusCode).toBe(200);const state=new URL(begin.body.url).searchParams.get('state');const complete=await call({action:'complete',state,code:'synthetic-code',scope:'activity:read'});expect(complete.body.connected).toBe(true);expect((await store().status()).status).toBe('active');expect(JSON.stringify(await rpc('read'))).not.toContain('synthetic-exchanged');await call({action:'complete',state,code:'synthetic-code',scope:'activity:read'});expect(calls).toBe(1);
 await db.exec('reset role');await db.query('delete from auth.sessions where id=$1',[loginId]);await db.exec('set role service_role');expect((await call({action:'status'})).statusCode).toBe(403);
});
it('ignores an old deauthorization after reconnect and fences activity privacy changes',async()=>{await connect();const s=store(),before=await s.status();await s.deauthorize(1);expect((await s.status()).status).toBe('active');await s.invalidateActivities();expect((await s.status()).activityRevision).toBe(before.activityRevision+1);await s.deauthorize(Date.now()+1000);expect((await s.status()).status).toBe('deleted');});
it('blocks reconnect during stale disconnect and fences its late completion',async()=>{
 await connect();let release,entered;const ready=new Promise(r=>{entered=r;}),wait=new Promise(r=>{release=r;});
 const pending=createLifecycle({store:store(),provider:{revoke:async()=>{entered();await wait;}}}).disconnect(binding);await ready;
 await db.query("update rtg_personal.connections set lease_until=now()-interval '1 second'");
 const revision=Number((await rpc('read')).revision);
 await expect(store().saveConnection({...binding,expectedRevision:revision,authorizationStartedAt:Date.now()-1000,accessToken:'new',refreshToken:'new',expiresAt:Date.now()+3600000})).rejects.toThrow();
 // A confirmed deauthorization clears the old grant, allowing a new grant.
 await store().deauthorize(Date.now()+1000);await connect();const next=await store().status();
 release();await expect(pending).rejects.toThrow();expect(await store().status()).toEqual(next);expect(next.status).toBe('active');
});
it('remote revoke uncertainty purges tokens but blocks reconnect until deauthorization',async()=>{
 await connect();await createLifecycle({store:store(),provider:{revoke:async()=>{throw Error('lost response');}}}).disconnect(binding);
 expect((await store().status()).status).toBe('revocation_pending');expect((await rpc('read')).envelope).toBeNull();
 const revision=Number((await rpc('read')).revision);await expect(store().saveConnection({...binding,expectedRevision:revision,authorizationStartedAt:Date.now()-1000,accessToken:'new',refreshToken:'new',expiresAt:Date.now()+3600000})).rejects.toThrow();
 await store().deauthorize(Date.now()+1000);expect((await store().status()).status).toBe('deleted');
});
it('accepts revocation between OAuth start and slow persistence rather than ignoring it',async()=>{
 await rpc('erase');const s=store(),v={...binding,hash:'b'.repeat(64),loginId:'slow',expiresAt:Date.now()+300000};await s.putState(v);
 // Simulate elapsed provider exchange without sleeping; timestamp is DB-origin.
 await db.query('update rtg_personal.states set started_at=started_at-10000 where hash=$1',[v.hash]);const accepted=await s.consumeState(v);
 await s.saveConnection({...binding,expectedRevision:accepted.revision,authorizationStartedAt:accepted.startedAt,accessToken:'new',refreshToken:'new',expiresAt:Date.now()+3600000});
 await s.deauthorize(accepted.startedAt+5000);expect((await s.status()).status).toBe('deleted');
});
it('exposes definite rule CAS conflict separately from an uncertain outcome',async()=>{
 const s=store(),doc={schemaVersion:2,id:'conflict-review',version:1,sports:['Ride'],allowManual:false,allowTrainer:false,rules:[]};await s.appendRules({document:doc,expectedVersion:0,requestId:randomUUID()});
 await expect(s.appendRules({document:{...doc,version:2},expectedVersion:0,requestId:randomUUID()})).rejects.toMatchObject({code:'rule_conflict'});
});

it('removing the website account also erases its separate vault, OAuth states and rules',async()=>{await connect();await db.exec('reset role');await db.query('delete from auth.users where id=$1',[binding.userId]);for(const table of ['connections','states','rule_history'])expect((await db.query(`select count(*) n from rtg_personal.${table} where user_id=$1`,[binding.userId])).rows[0].n).toBe(0);await db.exec('set role service_role');});
