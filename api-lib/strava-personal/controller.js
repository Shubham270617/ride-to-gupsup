// Unwired controller factory. authenticate must verify current server-side
// account AND login session; storage must fulfill the atomic vault contract.
import {personalConfig,createPersonalConnection} from './connection.js';
export function createPersonalController({env,authenticate,store,fetchImpl}){
 return async function(req,res){
  res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');
  let config;try{config=personalConfig(env);}catch{return res.status(503).json({error:'personal_integration_inactive'});}
  if(req.method!=='POST')return res.status(405).json({error:'method_not_allowed'});
  if(req.headers.origin!==config.origin)return res.status(403).json({error:'origin_refused'});
  let identity;try{identity=await authenticate(req);}catch{return res.status(401).json({error:'personal_login_required'});}
  if(!identity?.verified||identity.userId!==config.userId||!identity.loginId)return res.status(403).json({error:'personal_login_required'});
  const flow=createPersonalConnection({config,store,fetchImpl});
  try{
   if(req.body?.action==='begin')return res.status(200).json(await flow.begin(identity,req.headers.origin));
   // Browser callback page will POST the returned code/state after resolving
   // the same login; it must clear query parameters and load no third parties.
   if(req.body?.action==='complete')return res.status(200).json(await flow.complete(identity,req.body));
   return res.status(400).json({error:'unknown_action'});
  }catch{return res.status(400).json({error:'connection_not_completed',next:'Start a new connection. No existing LIVE connection was used.'});}
 };
}
