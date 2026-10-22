import {timingSafeEqual} from 'node:crypto';
const equal=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.length>=32&&Buffer.byteLength(a)===Buffer.byteLength(b)&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
// Inactive handler factory. Strava does not sign events: a random callback path
// is required, redacted from access logs. Subscription ID alone is NOT auth.
// No activity cache exists; events invalidate no retained activity records.
export function createPersonalWebhook({config,store,pathSecret,verifyToken,subscriptionId,enabled=false}){
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(!enabled)return res.status(503).json({error:'personal_integration_inactive'});
  if(!equal(req.callbackSecret,pathSecret))return res.status(404).json({error:'not_found'});
  if(req.method==='GET'){
   if(req.query?.['hub.mode']!=='subscribe'||!equal(req.query?.['hub.verify_token'],verifyToken)||typeof req.query?.['hub.challenge']!=='string'||req.query['hub.challenge'].length>256)return res.status(403).json({error:'verification_refused'});
   return res.status(200).json({'hub.challenge':req.query['hub.challenge']});
  }
  if(req.method!=='POST')return res.status(405).json({error:'method_not_allowed'});
  const event=req.body;
  if(!subscriptionId||String(event?.subscription_id)!==String(subscriptionId)||String(event?.owner_id)!==config.athleteId)return res.status(403).json({error:'event_refused'});
  if(!Number.isSafeInteger(event.event_time)||event.event_time<0)return res.status(400).json({error:'event_refused'});
  if(event.object_type==='athlete'&&event.updates?.authorized==='false')await store.deauthorize(event.event_time*1000+999);
  else if(event.object_type==='activity')await store.invalidateActivities();
  // Create/update/delete activities are re-read on the athlete's next request.
  return res.status(200).json({received:true});
 };
}
