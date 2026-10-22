import {personalConfig} from './connection.js';
import {createPersonalStore} from './store.js';
import {createPersonalProvider} from './provider.js';
import {createPersonalAuthenticator} from './authenticate.js';
import {createPersonalService} from './service.js';
// Factory deliberately NOT imported by api routes until activation is approved.
export function createPersonalIntegration({env,db,authorizeOwner,fetchImpl}){
 return async(req,res)=>{
  let config,key;
  try{config=personalConfig(env);key=Buffer.from(env.RTG_PERSONAL_STRAVA_VAULT_KEY||'','base64');if(key.length!==32)throw Error();}
  catch{return res.status(503).json({error:'personal_integration_inactive'});}
  const binding={clientId:config.clientId,userId:config.userId,athleteId:config.athleteId};
  return createPersonalService({env,authenticate:createPersonalAuthenticator({db,authorizeOwner}),store:createPersonalStore({db,key,binding}),provider:createPersonalProvider({config,fetchImpl}),fetchImpl})(req,res);
 };
}
