import { getSupabaseAdmin } from './supabaseAdmin.js';
import { applyRidgeCommand } from '../src/lib/ridge/engine.js';
const keys = {attendance:['type','sessionId','riderIds'],group_start:['type','sessionId','at'],start:['type','sessionId','riderId','lap','at'],end:['type','sessionId','riderId','lap','at'],pass:['type','sessionId','riderId','lap','at']};
export function validateVolunteerCommand(command, assignment) {
  if (!command || !Object.hasOwn(keys,command.type) || command.sessionId !== assignment.session_id ||
    Object.keys(command).some(key=>!keys[command.type].includes(key))) throw new Error('Action not permitted.');
  const roster=new Set(assignment.roster_rider_ids);
  if (command.type==='attendance' && (!Array.isArray(command.riderIds) || command.riderIds.some(id=>!roster.has(id)))) throw new Error('Rider not assigned.');
  if (command.riderId && !roster.has(command.riderId)) throw new Error('Rider not assigned.');
}
export function projectVolunteerWorkspace(workspace, assignments) {
  const roster=new Set(assignments.flatMap(a=>a.roster_rider_ids));
  return {version:workspace.version,assignments:assignments.map(a=>({sessionId:a.session_id,expiresAt:Date.parse(a.expires_at)})),state:{riders:workspace.state.riders.filter(r=>roster.has(r.id)).map(r=>({id:r.id,name:r.name})),
    sessions:workspace.state.sessions.filter(s=>assignments.some(a=>a.session_id===s.id)).map(s=>{
      const allowed=new Set(assignments.find(a=>a.session_id===s.id).roster_rider_ids);
      return {id:s.id,date:s.date,mode:s.mode,finished:s.finished,entries:s.entries.filter(e=>allowed.has(e.riderId)).map(e=>({riderId:e.riderId,officialScore:e.officialScore?true:undefined,laps:e.laps.map(l=>({start:l.start??null,end:l.end??null,durationMs:l.durationMs??null}))}))};
    })}};
}
export function createVolunteerHandler(getDb=getSupabaseAdmin) {
  return async (req,res)=>{
    res.setHeader('Cache-Control','no-store');
    if (!['GET','POST'].includes(req.method)) return res.status(405).json({error:'Method not allowed.'});
    const token=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
    if(!token)return res.status(401).json({error:'Sign in with your assigned account.'});
    const db=getDb();if(!db)return res.status(503).json({error:'Timing is unavailable.'});
    const identity=await db.auth.getUser(token);
    if(identity.error||!identity.data?.user||identity.data.user.is_anonymous)return res.status(401).json({error:'A valid individual login is required.'});
    const actor=identity.data.user.id;
    // Navigation hint only; owner data/writes still use the existing admin API.
    if(req.method==='GET'&&(process.env.RTG_LAYOUT_EDITOR_ADMIN_IDS||'').split(',').map(s=>s.trim()).includes(actor)){
      const owner=await db.from('admin_profiles').select('id').eq('id',actor).maybeSingle();
      if(!owner.error&&owner.data?.id===actor)return res.status(200).json({role:'owner'});
    }
    const grant=await db.from('ridge_timing_assignments').select('session_id,roster_rider_ids,expires_at,revoked_at').eq('user_id',actor);
    if(grant.error)return res.status(503).json({error:'Volunteer timing has not been activated.'});
    const assignments=(grant.data||[]).filter(a=>!a.revoked_at&&Date.parse(a.expires_at)>Date.now());
    if(!assignments.length){
      let canManage=false;
      if(req.method==='GET'&&(process.env.RTG_LAYOUT_EDITOR_ADMIN_IDS||'').split(',').map(s=>s.trim()).includes(actor)){
        const owner=await db.from('admin_profiles').select('id').eq('id',actor).maybeSingle();
        canManage=!owner.error&&owner.data?.id===actor;
      }
      return res.status(403).json({code:'no_assignment',canManage,error:'No active timing sessions are assigned to this account.'});
    }
    const body=req.body;
    if(req.method==='POST'){
      if(!body||Object.keys(body).some(k=>!['version','requestId','command'].includes(k))||!Number.isSafeInteger(body.version)||body.version<0||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.requestId||'')||JSON.stringify(body).length>20000)return res.status(400).json({error:'Invalid timing request.'});
      const assignment=assignments.find(a=>a.session_id===body.command?.sessionId);
      if(!assignment)return res.status(403).json({error:'Session not assigned.'});
      try{validateVolunteerCommand(body.command,assignment);}catch{return res.status(403).json({error:'Action or rider not permitted.'});}
    }
    const loaded=await db.from('ridge_workspace').select('state,version').eq('singleton',true).single();
    if(loaded.error||!loaded.data)return res.status(503).json({error:'Timing records unavailable.'});
    const workspace=loaded.data;
    if(req.method==='GET')return res.status(200).json(projectVolunteerWorkspace(workspace,assignments));
    // Database checks prior receipts before CAS and rechecks assignment under lock.
    // For a stale retry, use the old request receipt without evaluating a second lap.
    const prior=await db.from('ridge_audit').select('actor_id,details,version').eq('request_id',body.requestId).maybeSingle();
    if(prior.error)return res.status(503).json({error:'Unable to reconcile the previous action.'});
    let result;
    if(!prior.data){
      if(body.version!==workspace.version)return res.status(409).json({error:'Records changed. Refresh before starting another action.',definitive:true,rebaseAllowed:true});
      const s=workspace.state.sessions.find(s=>s.id===body.command.sessionId);
      const assignment=assignments.find(a=>a.session_id===body.command.sessionId);
      if(!s||s.entries.some(e=>!assignment.roster_rider_ids.includes(e.riderId)))return res.status(403).json({error:'The owner must update the assigned roster.'});
      try{result=applyRidgeCommand(workspace.state,body.command);}catch(error){return res.status(400).json({error:error.message,definitive:true});}
    }
    const commit=await db.rpc('ridge_timing_commit',{p_expected:body.version,p_request:body.requestId,p_actor:actor,p_command:body.command,p_state:result?.state||workspace.state,p_feed:result?.feed||{}});
    if(commit.error){const status=commit.error.code==='42501'?403:['40001','23505'].includes(commit.error.code)?409:503;return res.status(status).json({error:status===403?'Assignment is no longer valid.':status===409?'Records changed or request ID conflicts.':'Save outcome is unconfirmed. Retry the same action.',definitive:status===409,rebaseAllowed:commit.error.code==='40001'});}
    // Separate read is deliberate: returns current state even on an old receipt.
    const fresh=await db.from('ridge_workspace').select('state,version').eq('singleton',true).single();
    if(fresh.error)return res.status(503).json({error:'Saved, but refreshed records are unavailable. Retry the same action.'});
    const refreshedGrants=await db.from('ridge_timing_assignments').select('session_id,roster_rider_ids,expires_at,revoked_at').eq('user_id',actor);
    if(refreshedGrants.error)return res.status(503).json({error:'Saved; current access could not be checked. Retry the same action.'});
    const active=(refreshedGrants.data||[]).filter(a=>!a.revoked_at&&Date.parse(a.expires_at)>Date.now());
    if(!active.some(a=>a.session_id===body.command.sessionId))return res.status(403).json({error:'Access ended. Ask the owner to reconcile the recorded request.'});
    return res.status(200).json(projectVolunteerWorkspace(fresh.data,active));
  };
}
export default createVolunteerHandler();
