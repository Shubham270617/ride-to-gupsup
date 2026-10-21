// Cookie credentials are never read or stored by JavaScript. Pending commands
// contain no code/token; they are bound to the server-returned credential ID.
export function createCodeTransport({fetcher=fetch,storage=sessionStorage,now=Date.now}={}){
 let credential=null;
 const key=id=>'rtg-code-pending:'+id;
 const api=async body=>{const c=new AbortController(),timer=setTimeout(()=>c.abort(),20000);try{const r=await fetcher('/api/admin/ridge-timing-codes',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:c.signal});const data=await r.json();if(!r.ok)throw Object.assign(new Error(data.error||'Request failed.'),{definitive:data.definitive===true});return data;}finally{clearTimeout(timer);}};
 return {api,
  async read(){const data=await api({action:'read'});credential=data.credentialId;let pending=null;try{pending=JSON.parse(storage.getItem(key(credential))||'null');}catch{throw new Error('Recovery record is unreadable. Ask the owner to reconcile before timing.');}return{...data,pending,expired:pending&&now()-pending.createdAt>1800000};},
  async write(body,retry=false){if(!credential)throw new Error('Load your code session first.');const existing=JSON.parse(storage.getItem(key(credential))||'null');if(existing&&!retry)throw new Error('Reconcile the earlier request first.');if(retry&&(!existing||now()-existing.createdAt>1800000))throw new Error('Recovery expired. Ask the owner to reconcile.');const request=retry?existing.body:body;
   // Recheck the active cookie identity before dispatch; never replay for a different code.
   const active=await api({action:'read'});if(active.credentialId!==credential)throw new Error('Code session changed. Reload before continuing.');
   storage.setItem(key(credential),JSON.stringify({createdAt:existing?.createdAt||now(),body:request}));
   try{const result=await api({action:'write',...request,credentialId:credential});storage.removeItem(key(credential));return result;}catch(e){if(e.definitive)storage.removeItem(key(credential));throw e;}
  },
 };
}
