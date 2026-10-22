import {personalConfig,createPersonalConnection} from './connection.js';
import {createLifecycle} from './lifecycle.js';
import {previewRevision} from './rulesV2.js';
// Not mounted. All auth is injected from the existing server-verified login.
export function createPersonalService({env,authenticate,store,provider,fetchImpl}){
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');
  let config;try{config=personalConfig(env);}catch{return res.status(503).json({error:'personal_integration_inactive'});}
  if(req.method!=='POST')return res.status(405).json({error:'method_not_allowed'});
  if(req.headers.origin!==config.origin)return res.status(403).json({error:'origin_refused'});
  let identity;try{identity=await authenticate(req);}catch{return res.status(401).json({error:'login_required'});}
  if(!identity?.verified||!identity.loginId||identity.userId!==config.userId)return res.status(403).json({error:'personal_login_required'});
  try{
   const b=req.body||{},flow=createPersonalConnection({config,store,fetchImpl}),lifecycle=createLifecycle({store,provider});
   let result;
   switch(b.action){
    case 'begin':result=await flow.begin(identity,req.headers.origin);break;
    case 'complete':result=await flow.complete(identity,b);break;
    case 'status':result=await store.status();break;
    case 'disconnect':result=await lifecycle.disconnect(config);break;
    case 'activities':{
     const token=await lifecycle.token(config),before=await store.status();
     if(before.status!=='active')throw Error('Connection ended.');
     result=await provider.activities(token,{page:b.page});
     const after=await store.status();
     if(after.status!=='active'||before.revision!==after.revision||before.activityRevision!==after.activityRevision)throw Error('Connection changed during read.');
     break;
    }
    case 'rules.history':if(!identity.owner)throw Error('Owner required.');result=await store.ruleHistory(b.ruleId);break;
    case 'rules.preview':if(!identity.owner)throw Error('Owner required.');result=previewRevision(b.activities,b.current,b.candidate);break;
    case 'rules.save':if(!identity.owner)throw Error('Owner required.');result=await store.appendRules(b);break;
    default:return res.status(400).json({error:'unknown_action'});
   }
   return res.status(200).json(result);
  }catch(error){if(error.code==='rule_conflict')return res.status(409).json({error:'rule_conflict',definitive:true,next:'Load the latest rule revision and explicitly review a new preview.'});return res.status(409).json({error:'personal_operation_not_completed',next:'Refresh status. Reconnect if required. For rule saves, reconcile the same request ID before retrying.'});}
 };
}
