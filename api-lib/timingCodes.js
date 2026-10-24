import {createHmac} from 'node:crypto';
import {getSupabaseAdmin} from './supabaseAdmin.js';
import {requireAdmin} from './requireAdmin.js';
import {createTimingCodeAuth} from './proposals/timingCodeAuth.js';
import {applyRidgeCommand} from '../src/lib/ridge/engine.js';
import {projectVolunteerWorkspace,validateVolunteerCommand} from './volunteerRidge.js';
// Vercel values pasted with a stray space, newline, quotes or trailing "/"
// (and an Origin header in different case) used to fail the exact match and
// refuse every request ("Request refused."). Compare cleaned values instead.
const cleanOrigin=v=>String(v??"").trim().replace(/^["']+|["']+$/g,"").trim().replace(/\/+$/,"").toLowerCase();
const owners=()=>new Set((process.env.RTG_LAYOUT_EDITOR_ADMIN_IDS||'').split(',').map(x=>x.trim()).filter(Boolean));
export function createTimingCodeHandler({getDb=getSupabaseAdmin,authorize=requireAdmin}={}){return async(req,res)=>{
 res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');
 if(process.env.RTG_TIMING_CODES_ENABLED!=='true')return res.status(503).json({error:'Code access is not activated.',enabled:false});
 const origin=cleanOrigin(process.env.RTG_TIMING_CODE_ORIGIN),pepper=String(process.env.RTG_TIMING_CODE_PEPPER??"").trim(),requestOrigin=cleanOrigin(req.headers.origin);
 if(!origin||!pepper)return res.status(503).json({error:'Code access unavailable.'});
 if(req.method==='GET'&&req.query?.action==='status')return res.status(200).json({enabled:true});
 if(req.method!=='POST'||requestOrigin!==origin)return res.status(403).json({error:'Request refused.'});
 const b=req.body;if(!b||JSON.stringify(b).length>20000)return res.status(400).json({error:'Invalid request.'});
 const db=getDb();if(!db)return res.status(503).json({error:'Code access unavailable.'});
 const hash=(kind,value)=>createHmac('sha256',pepper).update(kind+'\0'+value).digest('hex');
 const rpc=async(action,data)=>{const result=await db.rpc('ridge_code_access',{p_action:action,p_data:data});if(result.error){console.error('[timing-codes] rpc',action,result.error.code,result.error.message);throw Object.assign(new Error('Code operation unavailable.'),{dbMessage:result.error.message});}return result.data;};
 const store={
  consumeRateLimits:async limits=>rpc('rate',{keys:limits.map(x=>x.key),global:limits[1].key}),
  insertCredential:async data=>{const split=data.assignmentId?.indexOf(':');return rpc('issue',{actor:data.issuerId,scope:data.scope,codeHash:data.codeHash,expiresAt:new Date(data.expiresAt).toISOString(),userId:split>0?data.assignmentId.slice(0,split):null,sessionId:data.scope==='session_timing'?data.sessionId:split>0?data.assignmentId.slice(split+1):null,volunteerName:data.volunteerName||null});},
  exchangeCredential:async data=>{const access=await rpc('exchange',data);return access?.codeKind==='session_timing'&&process.env.RTG_SESSION_TIMING_CODES_ENABLED!=='true'?null:access;},
  readActiveSession:async sessionHash=>{const access=await rpc('read',{sessionHash});return access&&owners().has(access.issuerId)&&(access.codeKind!=='session_timing'||process.env.RTG_SESSION_TIMING_CODES_ENABLED==='true')?access:null;},
 };
 try{
  const auth=createTimingCodeAuth({store,pepper,origin});
  if(['issue','revoke','list','capabilities'].includes(b.action)){
   const owner=await authorize(req);if(!owner.ok||!owners().has(owner.user?.id))return res.status(403).json({error:'Owner login required.'});
   if(b.action==='capabilities')return res.status(200).json({sessionCodesEnabled:process.env.RTG_SESSION_TIMING_CODES_ENABLED==='true'});
   if(b.action==='issue'){if(b.scope==='session_timing'&&process.env.RTG_SESSION_TIMING_CODES_ENABLED!=='true')return res.status(503).json({error:'Session code activation is pending.'});let result;try{result=await auth.issue({issuer:{id:owner.user.id,verifiedOwner:true},scope:b.scope,assignmentId:b.assignmentId,sessionId:b.sessionId,expiresAt:Date.parse(b.expiresAt),volunteerName:b.volunteerName});}catch(e){return res.status(400).json({error:`Could not create the code: ${e.dbMessage||e.message}`,definitive:true});}return res.status(200).json(result);}
   return res.status(200).json(await rpc(b.action,{actor:owner.user.id,id:b.id}));
  }
  if(b.action==='exchange'){
   // Per-code plus global rate limits; no trust in caller-supplied IP headers.
   const result=await auth.exchange({origin:requestOrigin,code:b.code,networkKey:hash('attempt',String(b.code||'').slice(0,64))});
   res.setHeader('Set-Cookie',result.cookie);return res.status(200).json({scope:result.scope,expiresAt:result.expiresAt});
  }
  const cookies=String(req.headers.cookie||'').split(';').map(x=>x.trim()).filter(x=>x.startsWith('__Host-rtg-timing='));
  if(cookies.length!==1)return res.status(401).json({error:'Enter your timer code.'});
  const token=cookies[0].slice('__Host-rtg-timing='.length);if(!/^[A-Za-z0-9_-]{43}$/.test(token))return res.status(401).json({error:'Enter your assigned code.'});
  const sessionHash=hash('session',token);
  if(b.action==='logout'){await rpc('logout',{sessionHash});res.setHeader('Set-Cookie','__Host-rtg-timing=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0');return res.status(200).json({ok:true});}
  const access=await store.readActiveSession(sessionHash);if(!access||(access.codeKind==='session_timing'&&process.env.RTG_SESSION_TIMING_CODES_ENABLED!=='true'))return res.status(401).json({error:'Code expired or revoked. Ask the owner for access.'});
  const loaded=await db.from('ridge_workspace').select('state,version').eq('singleton',true).single();if(loaded.error)throw new Error('Ridge unavailable.');
  const workspace=loaded.data;
  if(b.action==='read'){
   if(!await store.readActiveSession(sessionHash))return res.status(401).json({error:'Code expired or revoked.'});
   return res.status(200).json({credentialId:access.credentialId,scope:'timing',volunteerName:access.volunteerName||null,...projectVolunteerWorkspace(workspace,[{session_id:access.sessionId,roster_rider_ids:access.rosterIds,expires_at:new Date(access.expiresAt).toISOString()}])});
  }
  if(b.action!=='write'||!Number.isSafeInteger(b.version)||!/^[0-9a-f-]{36}$/i.test(b.requestId||''))return res.status(400).json({error:'Invalid request.'});
  if(b.credentialId!==access.credentialId)return res.status(409).json({error:'Code session changed. Preserve this request for owner reconciliation.'});
  await auth.authorize({origin:requestOrigin,token,command:b.command});
  if(access.scope==='timing')validateVolunteerCommand(b.command,{session_id:access.sessionId,roster_rider_ids:access.rosterIds},{canAddRider:access.codeKind==='session_timing'});
  const prior=await db.from('ridge_audit').select('request_id').eq('request_id',b.requestId).maybeSingle();if(prior.error)throw new Error('Unable to reconcile request.');
  let result;
  if(!prior.data){if(workspace.version!==b.version)return res.status(409).json({error:'Records changed. Reload before another action.',definitive:true,rebaseAllowed:true});try{result=applyRidgeCommand(workspace.state,b.command);}catch(error){return res.status(400).json({error:error.message,definitive:true});}}
  const committed=await db.rpc('ridge_code_commit',{p_session_hash:sessionHash,p_credential:b.credentialId,p_expected:b.version,p_request:b.requestId,p_command:b.command,p_state:result?.state||workspace.state,p_feed:result?.feed||{},p_audit:result?.audit||{type:b.command.type,command:b.command}});
  if(committed.error){console.error('[timing-codes] commit failed',committed.error.code,committed.error.message);const definite=['40001','23505'].includes(committed.error.code);return res.status(definite?409:503).json({error:definite?'Access or records changed. Reconcile before another action.':'Save outcome unknown. Retry the same request.',definitive:definite,rebaseAllowed:committed.error.code==='40001'});}
  // Hand back the records as they now stand, so the timer needn't read again
  // after every tap. A replayed request returns the current records.
  const saved=result?{state:result.state,version:committed.data}:workspace;
  return res.status(200).json({ok:true,credentialId:access.credentialId,scope:'timing',volunteerName:access.volunteerName||null,...projectVolunteerWorkspace(saved,[{session_id:access.sessionId,roster_rider_ids:saved.state.riders.map(r=>r.id),expires_at:new Date(access.expiresAt).toISOString()}])});
 }catch(error){console.error('[timing-codes]',b?.action,error?.message||error);return res.status(403).json({error:'Code or operation unavailable. No new action should be repeated without reconciliation.'});}
};}
export default createTimingCodeHandler();
