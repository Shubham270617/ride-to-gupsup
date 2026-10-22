import {mapOwnActivity} from './metrics.js';
// Never used by existing Strava routes. Tests inject fetch; no background scans.
export function createPersonalProvider({config,fetchImpl=fetch}){
 async function request(path,options={}){
  const response=await fetchImpl('https://www.strava.com/api/v3/'+path,{...options,signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw Error(response.status===429?'Provider rate limit. Try later.':'Provider request failed.');
  return response.json();
 }
 return {
  async refresh(refreshToken){const t=await request('oauth/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:config.clientId,client_secret:config.secret,refresh_token:refreshToken,grant_type:'refresh_token'})});return {accessToken:t.access_token,refreshToken:t.refresh_token,expiresAt:t.expires_at*1000};},
  async revoke(token){const response=await fetchImpl('https://www.strava.com/oauth/revoke',{method:'POST',headers:{Authorization:'Basic '+Buffer.from(config.clientId+':'+config.secret).toString('base64'),'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({token,token_type_hint:'access_token'}),signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('Provider revocation was not confirmed.');return true;},
  async activities(token,{page=1}={}){
   if(!Number.isSafeInteger(page)||page<1||page>10)throw Error('Invalid page.');
   const rows=await request('athlete/activities?per_page=30&page='+page,{headers:{Authorization:'Bearer '+token}});
   if(!Array.isArray(rows)||rows.length>30)throw Error('Invalid provider response.');
   return rows.map(row=>mapOwnActivity(row,config.athleteId));
  }
 };
}
