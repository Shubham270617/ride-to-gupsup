import {applyRidgeCommand} from './engine';
// One tab, one login. Only command data and request IDs are persisted, never tokens.
export function createTimingQueue({identity,initial,read,write,checkIdentity,restore,storage=sessionStorage,now=Date.now,id=()=>crypto.randomUUID(),notify=()=>{}}){
 const key='rtg-timing-queue:'+identity;let base=initial,items=[],active=false,stopped=false,paused=false,message='Records loaded.';
 const raw=storage.getItem(key);if(raw){const saved=JSON.parse(raw);if(saved.identity!==identity)throw Error('Queue login mismatch.');items=saved.items;paused=items.length>0;message='Saved taps need reconciliation. Resume the same queue; do not enter them again.';}
 const persist=()=>{if(items.length)storage.setItem(key,JSON.stringify({identity,items}));else storage.removeItem(key);};
 const project=()=>{let state=base.state;for(const item of items){try{state=applyRidgeCommand(state,item.command,{now:item.command.at}).state;}catch{/* A saved-but-unconfirmed tap may already be in the returned workspace. */}}return state;};
 const emit=()=>notify({state:project(),version:base.version,pending:items.length,paused,message,commands:items.map(x=>x.command)});
 async function drain(){if(active||paused||stopped)return;active=true;try{while(items.length&&!paused&&!stopped){const item=items[0];try{
   if(now()-item.created>1800000)throw Error('Queued taps expired. Owner reconciliation is required; they have been preserved.');
   if(await checkIdentity()!==identity)throw Error('Login changed. These taps remain bound to the original login.');
   if(!item.saved){if(!item.body)item.body={version:base.version,requestId:item.requestId,command:item.command};const retry=!!item.attempted;if(retry)await restore?.(item.body);item.attempted=true;persist();await write(item.body,{retry});item.saved=true;persist();}
   const fresh=await read();base=fresh;items.shift();persist();message=items.length?'Saving queued taps…':'All taps saved.';emit();
  }catch(e){paused=true;message=e.message+' Pending taps are preserved; no new taps will be accepted until reconciliation.';emit();}}
 }finally{active=false;}}
 return {replace(next){if(!items.length&&!active){base=next;emit();}},snapshot(){emit();},enqueue(command){if(paused||stopped)throw Error('Reconcile the pending queue before recording more taps.');if(items.length>=100)throw Error('Queue is full. Wait for saves before recording more taps.');applyRidgeCommand(project(),command,{now:command.at});const item={requestId:id(),command:structuredClone(command),created:now()};items.push(item);try{persist();}catch(e){items.pop();throw Error('Unable to preserve this tap locally. It was not accepted.');}message='Saving queued taps…';emit();void drain();},resume(){if(active)return;paused=false;emit();void drain();},stop(){stopped=true;},get pending(){return items.length;},get paused(){return paused;}};
}
