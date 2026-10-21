import {it,expect} from 'vitest';
import {createCodeTransport} from '../../../src/volunteer-timer/codeTransport';
import {createTimingQueue} from '../../../src/lib/ridge/timingQueue';
import {applyRidgeCommand} from '../../../src/lib/ridge/engine';
const flush=async()=>{for(let i=0;i<100;i++)await Promise.resolve();};
it('code queue recovers lost committed response across reload without duplicates, and retains taps on revocation',async()=>{
 const map=new Map(),storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};const receipts=new Set(),writes=[];let lost=true,revoked=false;let data={credentialId:'code-A',scope:'timing',version:0,assignments:[{sessionId:'s',expiresAt:Date.now()+3600000}],state:{riders:['a','b'].map(id=>({id,name:id})),sessions:[{id:'s',date:'2000-10-22',mode:'testing',finished:false,entries:['a','b'].map(riderId=>({riderId,laps:[],adjustment:0}))}]}};
 const fetcher=async(_u,o)=>{const b=JSON.parse(o.body);if(revoked)return{ok:false,json:async()=>({error:'Revoked'})};if(b.action==='read')return{ok:true,json:async()=>data};writes.push(b);expect(b.credentialId).toBe('code-A');if(!receipts.has(b.requestId)){receipts.add(b.requestId);data={...data,version:data.version+1,state:applyRidgeCommand(data.state,b.command).state};}if(lost)throw Error('Response lost');return{ok:true,json:async()=>({ok:true})};};
 const make=async()=>{const t=createCodeTransport({fetcher,storage});const initial=await t.read();return createTimingQueue({identity:'code-A',initial,storage,read:()=>t.read(),checkIdentity:t.identity,write:(body,{retry})=>t.write(body,retry,'code-A'),restore:body=>t.restorePending(body,'code-A')});};
 const q=await make(),at=Date.now();q.enqueue({type:'start',sessionId:'s',riderId:'a',lap:1,at});q.enqueue({type:'start',sessionId:'s',riderId:'b',lap:1,at:at+100});await flush();expect(q.paused).toBe(true);expect(q.pending).toBe(2);q.stop();lost=false;const restored=await make();restored.resume();await flush();expect(writes[1]).toEqual(writes[0]);expect(restored.pending).toBe(0);expect(data.version).toBe(2);
 revoked=true;restored.enqueue({type:'end',sessionId:'s',riderId:'a',lap:1,at:at+200});await flush();expect(restored.paused).toBe(true);expect(restored.pending).toBe(1);expect(map.get('rtg-timing-queue:code-A')).toContain('end');expect(data.version).toBe(2);
});
