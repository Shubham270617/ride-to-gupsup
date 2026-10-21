import {beforeEach,it,expect,vi} from 'vitest';
import {createFakeSupabase} from '../helpers/fakeSupabase';
import {mockReq,mockRes} from '../helpers/http';
import {createVolunteerHandler} from '../../api-lib/volunteerRidge';
let db,handler;
const command={type:'attendance',sessionId:'s',riderIds:['a']};
const body={version:0,requestId:'00000000-0000-4000-8000-000000000010',command};
const call=async(options={})=>{const res=mockRes();await handler(mockReq({headers:{authorization:'Bearer synthetic'},body,...options}),res);return res;};
beforeEach(()=>{
 db=createFakeSupabase();db.auth={getUser:vi.fn().mockResolvedValue({data:{user:{id:'operator'}}})};db.rpc=vi.fn().mockResolvedValue({data:1});handler=createVolunteerHandler(()=>db);
 db.on('ridge_timing_assignments',{data:[{session_id:'s',roster_rider_ids:['a'],expires_at:new Date(Date.now()+60000).toISOString()}]});
 db.on('ridge_workspace',{data:{version:0,state:{schemaVersion:1,riders:[{id:'a',name:'Synthetic A',email:'private',photo:'private-photo'},{id:'other',name:'HIDDEN'}],sessions:[{id:'s',date:'2026-10-21',mode:'testing',finished:false,awardOverrides:[],privateNote:'SECRET',entries:[]},{id:'unassigned',date:'2026-10-01',entries:[]}]}}});
});
it('denies anonymous direct requests without database access',async()=>{expect((await call({headers:{}})).statusCode).toBe(401);expect(db.queries).toHaveLength(0);});
it('rejects anonymous Supabase identities and failed auth',async()=>{db.auth.getUser.mockResolvedValue({data:{user:{id:'operator',is_anonymous:true}}});expect((await call()).statusCode).toBe(401);expect(db.queries).toHaveLength(0);});
it('projects only assigned names and timing, no contact/photos/private records/audit',async()=>{const res=await call({method:'GET'});expect(res.statusCode).toBe(200);expect(res.body.state.sessions).toHaveLength(1);expect(res.body.state.riders).toEqual([{id:'a',name:'Synthetic A'}]);expect(JSON.stringify(res.body)).not.toMatch(/private|SECRET|HIDDEN|unassigned/);});
it('rejects owner commands, hidden extra fields, cross-session and unassigned riders before loading workspace',async()=>{
 for(const cmd of [{type:'session_mode',sessionId:'s',mode:'live'},{...command,adjustment:99},{...command,sessionId:'other'},{...command,riderIds:['other']}])expect((await call({body:{...body,command:cmd}})).statusCode).toBe(403);
 expect(db.queries.every(q=>q.table==='ridge_timing_assignments')).toBe(true);expect(db.rpc).not.toHaveBeenCalled();
});
it('uses verified actor, derives state natively and calls only scoped RPC',async()=>{expect((await call()).statusCode).toBe(200);expect(db.rpc.mock.calls[0][0]).toBe('ridge_timing_commit');const args=db.rpc.mock.calls[0][1];expect(args.p_actor).toBe('operator');expect(args.p_state.sessions[0].entries[0].riderId).toBe('a');});
it('rejects stale version without mutation and leaves unconfirmed database failures retryable',async()=>{expect((await call({body:{...body,version:9}})).statusCode).toBe(409);expect(db.rpc).not.toHaveBeenCalled();db.rpc.mockResolvedValue({error:{code:'unavailable'}});const res=await call();expect(res.statusCode).toBe(503);expect(res.body.definitive).toBe(false);});
it('treats database revocation as refusal, without falling back to owner writer',async()=>{db.rpc.mockResolvedValue({error:{code:'42501'}});expect((await call()).statusCode).toBe(403);expect(db.rpc).toHaveBeenCalledTimes(1);});
it('returns an empty shell signal without leaking workspace or enabling writes',async()=>{
 db=createFakeSupabase();db.auth={getUser:vi.fn().mockResolvedValue({data:{user:{id:'operator'}}})};db.rpc=vi.fn();handler=createVolunteerHandler(()=>db);db.on('ridge_timing_assignments',{data:[]});
 const res=await call({method:'GET'});expect(res.statusCode).toBe(403);expect(res.body).toMatchObject({code:'no_assignment',canManage:false});
 expect(db.queries.some(q=>q.table==='ridge_workspace')).toBe(false);expect(db.rpc).not.toHaveBeenCalled();
});
it('offers owner navigation only for both allowlisted and verified admin identity',async()=>{
 vi.stubEnv('RTG_LAYOUT_EDITOR_ADMIN_IDS','operator');
 try {
 db=createFakeSupabase();db.auth={getUser:vi.fn().mockResolvedValue({data:{user:{id:'operator'}}})};db.rpc=vi.fn();handler=createVolunteerHandler(()=>db);db.on('ridge_timing_assignments',{data:[]});db.on('admin_profiles',{data:{id:'operator'}},{times:1});
 expect((await call({method:'GET'})).body.canManage).toBe(true);
 db.on('admin_profiles',{data:null});expect((await call({method:'GET'})).body.canManage).toBe(false);
 expect((await call()).body.canManage).toBe(false);expect(db.rpc).not.toHaveBeenCalled();
 }finally{vi.unstubAllEnvs();}
});
