import {randomUUID} from 'node:crypto';
import {sealTokens,openTokens} from './vault.js';
import {validateRuleSet} from './rulesV2.js';
// A new adapter per request. The SQL lease, not this closure, coordinates instances.
export function createPersonalStore({db,key,binding}){
 let leaseId=null;
 const checked=b=>{if(b.clientId!==binding.clientId||b.userId!==binding.userId||(b.athleteId&&b.athleteId!==binding.athleteId))throw Error('Store binding mismatch.');};
 const rpc=async(action,data={})=>{const r=await db.rpc('rtg_personal_store',{p_action:action,p_data:{...data,...binding}});if(r.error){const e=Error('Personal storage operation failed.');if(r.error.code==='P4091')e.code='rule_conflict';throw e;}return r.data;};
 const locked=()=>{if(!leaseId)throw Error('Connection lease required.');return leaseId;};
 return {
  async putState(v){checked(v);return rpc('state.put',v);},
  async consumeState(v){checked(v);return rpc('state.consume',v);},
  async saveConnection(v){checked(v);if(!Number.isSafeInteger(v.expectedRevision))throw Error('Connection generation required.');const revision=v.expectedRevision+1;return rpc('connect',{expectedRevision:v.expectedRevision,authorizationStartedAt:v.authorizationStartedAt,expiresAt:v.expiresAt,envelope:sealTokens({accessToken:v.accessToken,refreshToken:v.refreshToken},key,{...binding,revision})});},
  async withConnectionLock(b,fn){checked(b);if(leaseId)throw Error('Nested lease refused.');const id=randomUUID();await rpc('lease',{leaseId:id});leaseId=id;try{return await fn();}finally{leaseId=null;await rpc('release',{leaseId:id});}},
  async readConnection(b){checked(b);const r=await rpc('read');if(!r||!r.envelope)return null;const tokens=openTokens(r.envelope,key,{...binding,revision:Number(r.revision)});return {...binding,...tokens,revision:Number(r.revision),status:r.status,expiresAt:Number(r.expires_at)};},
  async status(){const r=await rpc('read');return {status:r.status,revision:Number(r.revision),activityRevision:Number(r.activity_revision)};},
  async setStatus(b,revision,status){checked(b);return rpc('status',{revision,status,leaseId:locked()});},
  async replaceTokens(b,revision,tokens){checked(b);return rpc('tokens',{revision,leaseId:locked(),expiresAt:tokens.expiresAt,envelope:sealTokens(tokens,key,{...binding,revision:revision+1})});},
  async requireReconnect(b){checked(b);return rpc('reconnect',{leaseId:locked()});},
  async completeDeletion(b,revision,remoteRevocationConfirmed){checked(b);return rpc('delete.complete',{revision,leaseId:locked(),remoteRevocationConfirmed});},
  async eraseConnectionAndCache(b){checked(b);return rpc('erase');},
  async deauthorize(eventTime){if(!Number.isSafeInteger(eventTime))throw Error('Event time required.');return rpc('deauthorize',{eventTime});},
  async invalidateActivities(){return rpc('invalidate');},
  async ruleHistory(ruleId){return rpc('rules.list',{ruleId});},
  async appendRules({document,expectedVersion,requestId}){const rules=validateRuleSet(document);if(!Number.isSafeInteger(expectedVersion)||expectedVersion<0||! /^[\da-f]{8}-[\da-f-]{27}$/i.test(requestId||''))throw Error('Version and request ID required.');return rpc('rules.append',{document:rules,expectedVersion,requestId});}
 };
}
