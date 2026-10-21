import {it,expect,vi,afterEach} from 'vitest';
import {assertTimingAssignment,createTimingController} from '../../../src/volunteer-timer/timingController';
const auth=()=>({userId:'operator',assignment:{userId:'operator',sessionId:'s',expiresAt:2000}});
const command={type:'start',sessionId:'s',riderId:'a',lap:1,at:1000};
afterEach(()=>vi.useRealTimers());
it('denies anonymous, unassigned, expired, revoked and cross-session requests',()=>{
  for(const authorization of [{},{userId:'operator'}, {...auth(),userId:'other'}, {...auth(),assignment:{...auth().assignment,expiresAt:1000}}, {...auth(),assignment:{...auth().assignment,revoked:true}}, {...auth(),assignment:{...auth().assignment,sessionId:'other'}}]) {
    expect(()=>assertTimingAssignment({...authorization,command,now:1000})).toThrow();
  }
});
it('denies every owner operation and allows only the five timing commands',()=>{
  for(const type of ['create_session','mode','finish_session','edit_rider','correct_lap','publish','archive','unknown']) expect(()=>assertTimingAssignment({...auth(),command:{...command,type},now:1000})).toThrow();
  for(const type of ['attendance','group_start','start','pass','end']) expect(()=>assertTimingAssignment({...auth(),command:{...command,type},now:1000})).not.toThrow();
});
it('bounds an uncertain write, blocks new commands, retries same payload and ignores late completion',async()=>{
  vi.useFakeTimers();let finish;
  const transport=vi.fn().mockImplementationOnce(()=>new Promise(resolve=>finish=resolve)).mockResolvedValue({version:1});
  const c=createTimingController({transport,getAuthorization:auth,initial:{version:0},now:()=>1000,newId:()=> 'request',timeoutMs:20});
  const first=c.send(command);await vi.advanceTimersByTimeAsync(20);await first;
  expect(c.getSnapshot().pending.requestId).toBe('request');
  await c.send({...command,type:'pass'});expect(transport).toHaveBeenCalledTimes(1);
  await c.retry();expect(transport.mock.calls[1][0]).toEqual(transport.mock.calls[0][0]);
  finish({version:99});await Promise.resolve();expect(c.getSnapshot().data.version).toBe(1);
});
it('preserves uncertain operations on offline failure and blocks duplicate in-flight taps',async()=>{
  let reject;const transport=vi.fn(()=>new Promise((_,r)=>reject=r));
  const c=createTimingController({transport,getAuthorization:auth,initial:{version:0},now:()=>1000});
  const first=c.send(command);await Promise.resolve();await c.send(command);expect(transport).toHaveBeenCalledTimes(1);
  reject(new Error('Offline'));await first;expect(c.getSnapshot().pending).not.toBeNull();
});
it('rechecks account and revocation on retries without sending a new mutation',async()=>{
  let current=auth();const transport=vi.fn().mockRejectedValue(new Error('Offline'));
  const c=createTimingController({transport,getAuthorization:()=>current,initial:{version:0},now:()=>1000});
  await c.send(command);current={...auth(),userId:'other'};await c.retry();
  current={...auth(),assignment:{...auth().assignment,revoked:true}};await c.retry();
  expect(transport).toHaveBeenCalledTimes(1);expect(c.getSnapshot().pending).not.toBeNull();
});
it('clears only a definitive non-commit failure',async()=>{
  const c=createTimingController({transport:async()=>{throw Object.assign(new Error('Invalid lap'),{definitive:true});},getAuthorization:auth,initial:{version:0},now:()=>1000});
  await c.send(command);expect(c.getSnapshot().pending).toBeNull();expect(c.getSnapshot().message).toBe('Invalid lap');
});
it('keeps the request across subscriber remounts, refuses a new login and expires recovery',async()=>{
  let time=1000,binding='login-one';const transport=vi.fn().mockRejectedValue(new Error('Offline'));
  const c=createTimingController({transport,getAuthorization:()=>({...auth(),binding}),initial:{version:0},now:()=>time});
  const unsubscribe=c.subscribe(()=>{});await c.send(command);const original=c.getSnapshot().pending;unsubscribe();c.subscribe(()=>{});
  expect(c.getSnapshot().pending).toBe(original);
  binding='login-two';await c.retry();expect(transport).toHaveBeenCalledTimes(1);
  binding='login-one';time+=1800001;await c.retry();expect(c.getSnapshot().message).toMatch(/Recovery expired/);expect(transport).toHaveBeenCalledTimes(1);
});
