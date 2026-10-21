import {afterEach,expect,it,vi} from 'vitest';
import {createRidgeRequest} from '../../../../src/lib/ridge/request';
import {createRidgeRecovery} from '../../../../src/lib/ridge/recovery';
afterEach(()=>vi.useRealTimers());
const session=(id='owner',login='login1')=>({data:{session:{access_token:'fixture',user:{id,last_sign_in_at:login}}}});
const ok=()=>({ok:true,json:async()=>({version:1,state:{}})});
const make=(options)=>createRidgeRequest({getSession:async()=>session(),recovery:createRidgeRecovery(),...options});
const body={requestId:'same-id',version:1,command:{type:'start',at:100}};
it('bounds a stalled read and aborts fetch',async()=>{vi.useFakeTimers();const fetcher=vi.fn(()=>new Promise(()=>{}));const request=make({fetcher,timeoutMs:20});const p=request().catch(e=>e);await vi.advanceTimersByTimeAsync(20);expect((await p).uncertain).toBe(false);expect(fetcher.mock.calls[0][1].signal.aborted).toBe(true);});
it('retains an uncertain commit across transport remount and retries exact body explicitly',async()=>{
 vi.useFakeTimers();const recovery=createRidgeRecovery();let committed=0,postBody;
 const fetcher=vi.fn(async(_url,o)=>{if(o.method==='GET')return ok();if(!postBody){postBody=o.body;committed++;return new Promise(()=>{});}expect(o.body).toBe(postBody);return ok();});
 let request=make({recovery,fetcher,timeoutMs:20});await request();const p=request(body).catch(e=>e);await vi.advanceTimersByTimeAsync(20);expect((await p).uncertain).toBe(true);
 request=make({recovery,fetcher});const loaded=await request();expect(loaded.recovery.body).toEqual(body);expect(committed).toBe(1);
 await expect(request({...body,requestId:'new'})).rejects.toThrow('unresolved');
 await request(body,undefined,{retry:true});expect(committed).toBe(1);expect((await request()).recovery).toBeNull();
});
it('does not replay recovery for another account or a new login of the same account',async()=>{
 const recovery=createRidgeRecovery();let identity=session();const fetcher=vi.fn(async(_u,o)=>o.method==='GET'?ok():new Promise(()=>{}));
 const request=make({getSession:async()=>identity,recovery,fetcher});await request();const controller=new AbortController();const p=request(body,controller.signal).catch(e=>e);await Promise.resolve();controller.abort();expect((await p).uncertain).toBe(true);
 for(const next of [session('other'),session('owner','login2')]){identity=next;await expect(request(body,undefined,{retry:true})).rejects.toThrow('login changed');expect((await request()).recovery).toBeNull();await expect(request(body,undefined,{retry:true})).rejects.toThrow('unavailable');}
 expect(fetcher.mock.calls.filter(([,o])=>o.method==='POST')).toHaveLength(1);
});
it('expires command details, requires a fresh read and explicit reconciliation, never resubmits',async()=>{
 let now=0;const recovery=createRidgeRecovery({now:()=>now,ttlMs:20});const fetcher=vi.fn(async(_u,o)=>o.method==='GET'?ok():new Promise(()=>{}));const request=make({recovery,fetcher});await request();const c=new AbortController();const p=request(body,c.signal).catch(e=>e);await Promise.resolve();c.abort();await p;
 expect(()=>request.clearRecovery()).toThrow('Refresh');now=21;const r=await request();expect(r.recovery).toEqual({body:null,expired:true,reviewed:true});await expect(request(body,undefined,{retry:true})).rejects.toThrow('unavailable');request.clearRecovery();expect((await request()).recovery).toBeNull();expect(fetcher.mock.calls.filter(([,o])=>o.method==='POST')).toHaveLength(1);
});
it('late session lookup cannot dispatch after timeout or pre-abort',async()=>{
 vi.useFakeTimers();let resolve;const fetcher=vi.fn();const request=make({getSession:()=>new Promise(r=>resolve=r),fetcher,timeoutMs:20});const p=request().catch(e=>e);await vi.advanceTimersByTimeAsync(20);expect((await p).code).toBe('ridge_timeout');resolve(session());await Promise.resolve();expect(fetcher).not.toHaveBeenCalled();
});
it('late completion cannot erase uncertain recovery after cancellation',async()=>{
 let resolve;const recovery=createRidgeRecovery();const fetcher=vi.fn(async(_u,o)=>o.method==='GET'?ok():new Promise(r=>resolve=r));const request=make({recovery,fetcher});await request();const c=new AbortController();const p=request(body,c.signal).catch(e=>e);await Promise.resolve();c.abort();expect((await p).uncertain).toBe(true);resolve(ok());await Promise.resolve();expect((await request()).recovery.body).toEqual(body);
});
