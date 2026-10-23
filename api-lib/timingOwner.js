import { requireAdmin } from './requireAdmin.js';
const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export function createTimingOwnerHandler(authorize=requireAdmin) {
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(!['GET','POST'].includes(req.method))return res.status(405).json({error:'Method not allowed.'});
  const auth=await authorize(req);if(!auth.ok)return res.status(auth.status).json({error:auth.error});
  // Reuse the reviewed deployment's explicit owner allowlist; no new seat or
  // editable user_metadata may authorize assignment management.
  const owners=(process.env.RTG_LAYOUT_EDITOR_ADMIN_IDS||'').split(',').map(s=>s.trim()).filter(Boolean);
  if(!owners.includes(auth.user.id))return res.status(403).json({error:'Owner access required.'});
  const db=auth.supabaseAdmin, action=req.method==='GET'?req.query?.action:req.body?.action;
  try {
   if(req.method==='GET'&&action==='overview'){
    const [workspace,assignments]=await Promise.all([db.from('ridge_workspace').select('state').eq('singleton',true).single(),db.from('ridge_timing_assignments').select('user_id,session_id,roster_rider_ids,expires_at,revoked_at,revision')]);
    // Owner-only endpoint, so the database's own reason is safe to show and
    // is the only way to tell "no workspace row" from a permission problem.
    if(workspace.error){console.error('[timing-owner] ridge_workspace read failed',workspace.error);return res.status(503).json({error:`Unable to load Ridge sessions (${workspace.error.code||'db'}: ${workspace.error.message||'unknown'}).`});}
    return res.status(200).json({activationReady:!assignments.error&&process.env.RTG_VOLUNTEER_TIMING_ACCESS_ENABLED==='true',assignments:assignments.error?[]:assignments.data,
     sessions:workspace.data.state.sessions.map(s=>({id:s.id,date:s.date,name:s.name||'',mode:s.mode,finished:s.finished})),riders:workspace.data.state.riders.map(r=>({id:r.id,name:r.name}))});
   }
   if(req.method==='POST'&&action==='resolve'){
    const email=String(req.body.email||'').trim().toLowerCase();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)return res.status(400).json({error:'Enter an exact account email.'});
    const profile=await db.from('profiles').select('id').eq('email',email).maybeSingle();
    if(profile.error||!profile.data)return res.status(404).json({error:'No unique existing account matches that email.'});
    const target=await db.auth.admin.getUserById(profile.data.id),user=target.data?.user;
    if(target.error||!user||user.is_anonymous||!user.email_confirmed_at||user.email?.toLowerCase()!==email)return res.status(409).json({error:'The exact account must have a verified email before assignment.'});
    return res.status(200).json({user:{id:user.id,email:user.email}});
   }
   if(req.method==='POST'&&action==='reconcile'){
    if(!uuid(req.body.requestId))return res.status(400).json({error:'Enter the original request ID.'});
    const receipt=await db.from('ridge_audit').select('request_id,actor_id,version,action,created_at,details').eq('request_id',req.body.requestId).maybeSingle();
    if(receipt.error)return res.status(503).json({error:'Receipt lookup failed; outcome remains unknown.'});
    if(!receipt.data)return res.status(200).json({status:'not_found',message:'No committed receipt found at this instant. A request may still be in flight; do not repeat it as a new action.'});
    const r=receipt.data,c=r.details?.command||{};
    return res.status(200).json({status:'committed',receipt:{requestId:r.request_id,actorId:r.actor_id,version:r.version,action:r.action,createdAt:r.created_at,sessionId:c.sessionId,riderId:c.riderId,lap:c.lap,at:c.at}});
   }
   if(req.method==='POST'&&action==='recent'){
    if(!uuid(req.body.userId)||typeof req.body.sessionId!=='string'||!req.body.sessionId)return res.status(400).json({error:'Select the exact operator and session.'});
    const result=await db.from('ridge_audit').select('request_id,version,action,created_at,details').eq('actor_id',req.body.userId).contains('details',{command:{sessionId:req.body.sessionId}}).order('created_at',{ascending:false}).limit(20);
    if(result.error)return res.status(503).json({error:'Unable to read timing receipts.'});
    return res.status(200).json({receipts:(result.data||[]).map(r=>({requestId:r.request_id,version:r.version,action:r.action,createdAt:r.created_at,lap:r.details?.command?.lap,riderId:r.details?.command?.riderId,at:r.details?.command?.at})),message:'Latest 20 committed actions for this operator and session. No receipt does not rule out an in-flight request. Do not repeat a tap as a new action.'});
   }
   if(req.method==='POST'&&['grant','revoke'].includes(action)){
    if(process.env.RTG_VOLUNTEER_TIMING_ACCESS_ENABLED!=='true')return res.status(503).json({error:'Access activation is awaiting review. No grant was made.'});
    const b=req.body;
    if(!uuid(b.userId)||!uuid(b.requestId)||typeof b.sessionId!=='string'||!Number.isSafeInteger(b.expectedRevision)||b.expectedRevision<0)return res.status(400).json({error:'Invalid assignment request.'});
    const target=await db.auth.admin.getUserById(b.userId),user=target.data?.user;
    if(target.error||!user||user.is_anonymous||!user.email_confirmed_at)return res.status(409).json({error:'Account is no longer verified.'});
    if(action==='grant'&&(user.email?.toLowerCase()!==b.verifiedEmail?.toLowerCase()||!Array.isArray(b.rosterIds)||!b.rosterIds.length||b.rosterIds.length>500||!Number.isFinite(Date.parse(b.expiresAt))))return res.status(400).json({error:'Review the exact account, roster and expiry.'});
    const result=await db.rpc('ridge_manage_timing_assignment',{p_actor:auth.user.id,p_request:b.requestId,p_user:b.userId,p_session:b.sessionId,p_roster:action==='grant'?b.rosterIds:[],p_expires:action==='grant'?b.expiresAt:null,p_revoke:action==='revoke',p_expected:b.expectedRevision});
    if(result.error)return res.status(['40001','23505'].includes(result.error.code)?409:503).json({error:'Assignment outcome requires reconciliation. Reuse the original request ID.',uncertain:true});
    return res.status(200).json({revision:result.data});
   }
   return res.status(400).json({error:'Unknown owner operation.'});
  }catch{return res.status(503).json({error:'Owner operation unavailable. Do not repeat a grant with a new request ID.'});}
 };
}
export default createTimingOwnerHandler();
