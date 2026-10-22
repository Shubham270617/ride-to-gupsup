import {randomBytes} from 'node:crypto';
import {personalConfig} from './connection.js';
import {createPersonalIntegration} from './integration.js';
import {createPersonalStore} from './store.js';
import {createPersonalWebhook} from './webhook.js';
// Safe observability projection: NEVER retain query, path secret, body or headers.
export const personalLogContext=req=>({area:'personal-strava',method:['GET','POST'].includes(req.method)?req.method:'other'});
export function createPersonalRoutes({env,getDb,authorizeOwner,fetchImpl}){
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Content-Type-Options','nosniff');
  let config;try{config=personalConfig(env);}catch{return res.status(404).json({error:'personal_integration_inactive'});}
  const raw=typeof req.url==='string'?req.url:'';const parts=raw.split('?');const query=new URLSearchParams(parts.slice(1).join('?'));
  if(parts[0]!=='/api/admin/personal-strava'||query.getAll('operation').length!==1)return res.status(404).json({error:'unknown_personal_route'});
  const path='/api/personal-strava/'+query.get('operation');
  if(path==='/api/personal-strava/status'&&req.method==='GET')return res.status(200).json({enabled:true});
  if(path==='/api/personal-strava/callback'&&req.method==='GET'){
   const nonce=randomBytes(24).toString('base64');
   res.setHeader('Content-Security-Policy',`default-src 'none'; script-src 'nonce-${nonce}'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'`);
   res.setHeader('Content-Type','text/html; charset=utf-8');
   // OAuth payload is read from this browser URL only, never interpolated into HTML.
   return res.status(200).send(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="referrer" content="no-referrer"><title>Personal Strava connection</title><script nonce="${nonce}">(()=>{const q=new URLSearchParams(location.search);const payload={code:q.get('code'),state:q.get('state'),scope:q.get('scope'),error:q.get('error')};history.replaceState(null,'',location.pathname);addEventListener('DOMContentLoaded',()=>{const text=document.getElementById('message');if(!opener){text.textContent='Return to the personal dashboard and start a new connection. This callback cannot be replayed.';return;}opener.postMessage({type:'rtg-personal-callback',payload},${JSON.stringify(config.origin)});addEventListener('message',e=>{if(e.origin!==${JSON.stringify(config.origin)}||e.source!==opener||e.data?.type!=='rtg-personal-result')return;text.textContent=e.data.ok?'Connected. You may close this window.':'Connection not completed. Return to the dashboard to start again.';});});})();</script><body><main><h1>Personal Strava connection</h1><p id="message">Completing the connection in your dashboard…</p></main></body></html>`);
  }
  if(path==='/api/personal-strava/service'){
   const db=getDb();if(!db)return res.status(503).json({error:'storage_unavailable'});
   return createPersonalIntegration({env,db,authorizeOwner,fetchImpl})(req,res);
  }
  const hookKey=query.get('hook');const match=path==='/api/personal-strava/webhook'&&/^[A-Za-z0-9_-]{43}$/.test(hookKey||'')?[null,hookKey]:null;
  if(match){
   const key=Buffer.from(env.RTG_PERSONAL_STRAVA_VAULT_KEY||'','base64');if(key.length!==32)return res.status(503).json({error:'personal_integration_inactive'});
   const db=getDb();if(!db)return res.status(503).json({error:'storage_unavailable'});
   req.callbackSecret=match[1];
   try{return await createPersonalWebhook({config,store:createPersonalStore({db,key,binding:{clientId:config.clientId,userId:config.userId,athleteId:config.athleteId}}),pathSecret:env.RTG_PERSONAL_STRAVA_WEBHOOK_SECRET,verifyToken:env.RTG_PERSONAL_STRAVA_VERIFY_TOKEN,subscriptionId:env.RTG_PERSONAL_STRAVA_SUBSCRIPTION_ID,enabled:true})(req,res);}catch{return res.status(503).json({error:'event_not_recorded'});}
  }
  return res.status(404).json({error:'unknown_personal_route'});
 };
}
