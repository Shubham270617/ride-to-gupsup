import {randomBytes,createHash} from 'node:crypto';
const TEST_ORIGIN='https://rtg-website-three.vercel.app';
const digest=value=>createHash('sha256').update(value).digest('hex');
// Inactive preparation only: not imported by a deployed route. A persistent,
// atomic state/token adapter and approved activation are required first.
export function personalConfig(env={}) {
 if(env.RTG_PERSONAL_STRAVA_ENABLED!=='true')throw Error('Personal integration is inactive.');
 if(env.RTG_PERSONAL_STRAVA_ORIGIN!==TEST_ORIGIN || env.SUPABASE_URL!=='https://cxwfjrntfqlyaqppxggh.supabase.co')throw Error('TEST isolation configuration required.');
 if(env.RTG_PERSONAL_STRAVA_CLIENT_ID!=='272337' || !/^\d+$/.test(env.RTG_PERSONAL_STRAVA_ATHLETE_ID||'') || !env.RTG_PERSONAL_STRAVA_CLIENT_SECRET || !env.RTG_PERSONAL_STRAVA_USER_ID)throw Error('Personal app configuration incomplete.');
 return {clientId:env.RTG_PERSONAL_STRAVA_CLIENT_ID,secret:env.RTG_PERSONAL_STRAVA_CLIENT_SECRET,athleteId:env.RTG_PERSONAL_STRAVA_ATHLETE_ID,userId:env.RTG_PERSONAL_STRAVA_USER_ID,origin:TEST_ORIGIN,callback:TEST_ORIGIN+'/api/admin/personal-strava?operation=callback'};
}
export function createPersonalConnection({config,store,fetchImpl=fetch,now=Date.now}) {
 const check=identity=>{if(!identity?.verified || identity.userId!==config.userId || !identity.loginId)throw Error('Verified personal TEST login required.');};
 return {
  async begin(identity,origin){
   check(identity);if(origin!==config.origin)throw Error('Origin refused.');
   const state=randomBytes(32).toString('base64url');
   await store.putState({hash:digest(state),userId:identity.userId,loginId:identity.loginId,clientId:config.clientId,expiresAt:now()+600000});
   const url=new URL('https://www.strava.com/oauth/authorize');
   for(const [key,value] of Object.entries({client_id:config.clientId,redirect_uri:config.callback,response_type:'code',scope:'read,activity:read',approval_prompt:'force',state}))url.searchParams.set(key,value);
   return {url:url.toString()};
  },
  async complete(identity,{state,code,scope,error}){
   check(identity);
   if(!/^[A-Za-z0-9_-]{43}$/.test(state||'') || typeof code!=='string' || !code || code.length>2048 || error)throw Error('Authorization was not completed.');
   // Adapter MUST atomically consume only a matching, unexpired row. Never
   // consume another user's state; never retry a consumed authorization code.
   const accepted=await store.consumeState({hash:digest(state),userId:identity.userId,loginId:identity.loginId,clientId:config.clientId,now:now()});
   if(!accepted)throw Error('Authorization expired or already used. Start again.');
   const scopes=new Set(String(scope||'').split(/[ ,]+/));
   if(!scopes.has('activity:read'))throw Error('Activity read permission was not granted.');
   let response,data;
   try {response=await fetchImpl('https://www.strava.com/api/v3/oauth/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:config.clientId,client_secret:config.secret,code,grant_type:'authorization_code'}),signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error();data=await response.json();}catch{throw Error('Authorization exchange failed. Start a new connection; do not repeat the callback.');}
   if(data.scope!=null&&!new Set(String(data.scope).split(/[ ,]+/)).has('activity:read'))throw Error('Provider did not grant activity read permission.');
   if(String(data.athlete?.id)!==config.athleteId)throw Error('This TEST app accepts only its configured personal athlete. No connection was stored.');
   if(typeof data.access_token!=='string'||!data.access_token||typeof data.refresh_token!=='string'||!data.refresh_token||!Number.isFinite(data.expires_at)||data.expires_at*1000<=now())throw Error('Invalid token response. No connection was stored.');
   // Separate app-bound vault; never profiles.strava_* or LIVE token storage.
   await store.saveConnection({userId:identity.userId,clientId:config.clientId,athleteId:config.athleteId,accessToken:data.access_token,refreshToken:data.refresh_token,expiresAt:data.expires_at*1000,expectedRevision:accepted.revision,authorizationStartedAt:accepted.startedAt,scopes:[...scopes]});
   return {connected:true,athleteId:config.athleteId};
  }
 };
}
