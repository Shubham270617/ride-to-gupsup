// A grant can be retried with its original audited request ID. Issuance cannot:
// after a lost response, keep the flow blocked rather than generate another secret.
export function codeSetupFlow({request,storage=sessionStorage}) {
 let owner=null,current=null;
 const key=()=>`rtg-code-setup:${owner}`;
 const persist=value=>{storage.setItem(key(),JSON.stringify(value));current=value;};
 const sameOwner=async()=>{if(await request('identity')!==owner)throw Error('Owner session changed. Sign in again before continuing.');};
 return {
  async load(){owner=await request('identity');const saved=storage.getItem(key());current=saved?JSON.parse(saved):null;return current;},
  get current(){return current;},
  async begin(plan){await sameOwner();if(current)throw Error('Finish the previous code request first.');persist({...plan,phase:plan.grant?'grant':'ready',createdAt:Date.now()});},
  async run(){
   await sameOwner();if(!current)throw Error('Review access first.');
   if(current.phase==='issuing')throw Error('Code outcome unknown. Do not generate another code.');
   if(current.phase==='grant'){
    await request('grant',current.grant,owner);
    persist({...current,phase:'ready'});
   }
   await sameOwner();
   persist({...current,phase:'issuing'});
   let result;
   try{result=await request('issue',current.code,owner);}
   catch(e){if(e.definitive){storage.removeItem(key());current=null;}throw e;}
   storage.removeItem(key());current=null;return result;
  },
  async clearExpired(){await sameOwner();if(!current||Date.parse(current.code.expiresAt)>Date.now())throw Error('This request has not expired.');storage.removeItem(key());current=null;}
 };
}
