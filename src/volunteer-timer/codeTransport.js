// Cookie credentials are never read or stored by JavaScript. Pending commands
// contain no code/token; they are bound to the server-returned credential ID.
export function createCodeTransport({fetcher=fetch,storage=sessionStorage,now=Date.now}={}){
 let credential=null;
 const key=id=>'rtg-code-pending:'+id;
 const api=async body=>{const c=new AbortController(),timer=setTimeout(()=>c.abort(),20000);try{const r=await fetcher('/api/admin/ridge-timing-codes',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:c.signal});const data=await r.json();if(!r.ok)throw Object.assign(new Error(data.error||'Request failed.'),{definitive:data.definitive===true,rebaseAllowed:data.rebaseAllowed===true&&data.definitive===true});return data;}finally{clearTimeout(timer);}};
 return {api,
  // The code seen by the last read; a read after a cookie switch reveals it.
  identity:async()=> credential ?? (await api({action:'read'})).credentialId,
  async restorePending(body,expectedCredential){const active=await api({action:'read'});if(active.credentialId!==expectedCredential)throw Error('Code session changed.');const existing=JSON.parse(storage.getItem(key(expectedCredential))||'null');if(existing&&JSON.stringify(existing.body)!==JSON.stringify(body))throw Error('Another request needs reconciliation.');if(!existing)storage.setItem(key(expectedCredential),JSON.stringify({createdAt:now(),body}));},
  async read(){const data=await api({action:'read'});credential=data.credentialId;let pending=null;try{pending=JSON.parse(storage.getItem(key(credential))||'null');}catch{throw new Error('Recovery record is unreadable. Ask the owner to reconcile before timing.');}return{...data,pending,expired:pending&&now()-pending.createdAt>1800000};},
  async write(body,retry=false,expectedCredential=credential){const writeCredential=expectedCredential;if(!writeCredential)throw new Error('Load your code session first.');const existing=JSON.parse(storage.getItem(key(writeCredential))||'null');if(existing&&!retry)throw new Error('Reconcile the earlier request first.');if(retry&&(!existing||now()-existing.createdAt>1800000))throw new Error('Recovery expired. Ask the owner to reconcile.');const request=retry?existing.body:body;
   // Every write names its code and the server refuses it under another
   // cookie. A retry also rechecks first, so it is never replayed for a different code.
   if(retry){const active=await api({action:'read'});if(active.credentialId!==writeCredential)throw new Error('Code session changed. Reload before continuing.');}
   storage.setItem(key(writeCredential),JSON.stringify({createdAt:existing?.createdAt||now(),body:request}));
   try{const result=await api({action:'write',...request,credentialId:writeCredential});storage.removeItem(key(writeCredential));return result;}catch(e){if(e.definitive)storage.removeItem(key(writeCredential));throw e;}
  },
 };
}
