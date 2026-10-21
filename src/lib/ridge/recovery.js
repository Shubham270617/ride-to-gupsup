// Tab memory only. No tokens, credentials, localStorage or cross-account replay.
export function recoveryIdentity(session) {
  const {id,last_sign_in_at:login} = session?.user || {};
  if(!id || !login) throw new Error('Sign in again before timing: this login could not be identified.');
  return JSON.stringify([id,login]);
}
export function createRidgeRecovery({now=Date.now,ttlMs=30*60*1000}={}) {
  const records=new Map();
  function read(owner){
    const r=records.get(owner);if(!r)return null;
    if(now()-r.created>=ttlMs){r.body=null;r.expired=true;}
    return {body:r.body?structuredClone(r.body):null,expired:Boolean(r.expired),reviewed:r.reviewed};
  }
  return {
    read,
    begin(owner,body,retry=false){
      const prior=read(owner);
      if(retry&&(!prior?.body || JSON.stringify(prior.body)!==JSON.stringify(body)))throw new Error('Recovery is unavailable for this login. Refresh records and review the audit; no action was sent.');
      if(!retry&&prior)throw new Error('Review the unresolved action before entering another one. No action was sent.');
      if(!prior){
        if(records.size>=8)throw new Error('Recovery reminders are full. Review and clear an existing reminder first.');
        const record={body:structuredClone(body),id:body.requestId,created:now(),reviewed:false};
        record.timer=setTimeout(()=>{record.body=null;record.expired=true;},ttlMs);record.timer?.unref?.();
        records.set(owner,record);
      } else records.get(owner).reviewed=false;
    },
    reviewed(owner){if(records.has(owner))records.get(owner).reviewed=true;return read(owner);},
    finish(owner,id){if(records.get(owner)?.id===id){clearTimeout(records.get(owner).timer);records.delete(owner);}},
    clear(owner){if(!read(owner)?.reviewed)throw new Error('Refresh records before clearing this reminder.');clearTimeout(records.get(owner).timer);records.delete(owner);},
  };
}
export const ridgeRecovery=createRidgeRecovery();
