// Storage lifecycle contract only; no database adapter/route is installed.
// Adapter lock must span the full refresh and persistence transaction across
// server instances. An in-process mutex is insufficient in deployment.
export function createLifecycle({store,provider,now=Date.now}){
 return {
  async token(binding){return store.withConnectionLock(binding,async()=>{
   const row=await store.readConnection(binding);
   if(!row||row.status!=='active'||row.clientId!==binding.clientId||row.userId!==binding.userId||row.athleteId!==binding.athleteId)throw Error('Active matching connection required.');
   if(row.expiresAt>now()+60000)return row.accessToken;
   // Persist uncertainty BEFORE contacting provider. If refresh rotates but its
   // response/storage is lost, do not blindly retry the stale refresh token.
   await store.setStatus(binding,row.revision,'refreshing');
   try{const fresh=await provider.refresh(row.refreshToken);
    if(!fresh?.accessToken||!fresh.refreshToken||!Number.isFinite(fresh.expiresAt)||fresh.expiresAt<=now())throw Error('Invalid refresh.');
    await store.replaceTokens(binding,row.revision,fresh);
    return fresh.accessToken;
   }catch{await store.requireReconnect(binding);throw Error('Refresh outcome unresolved. Reconnect before further reads.');}
  });},
  async disconnect(binding){return store.withConnectionLock(binding,async()=>{
   const row=await store.readConnection(binding);if(!row)return {deleted:true};
   if(row.clientId!==binding.clientId||row.userId!==binding.userId||row.athleteId!==binding.athleteId)throw Error('Connection binding mismatch.');
   // Block reads first; remote revoke is retried only through separately
   // reconciled deletion handling. Never report complete after provider failure.
   await store.setStatus(binding,row.revision,'deleting');
   let revoked=false;try{await provider.revoke(row.accessToken);revoked=true;}catch{/* local privacy deletion still proceeds */}
   await store.completeDeletion(binding,row.revision,revoked);
   return {deleted:true,remoteRevocationConfirmed:revoked};
  });}
 };
}
