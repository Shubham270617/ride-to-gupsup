// getUser verifies the JWT remotely; decoding occurs only AFTER verification.
// The narrow session RPC also checks revocation/deletion of that exact login.
export function createPersonalAuthenticator({db,authorizeOwner}){
 return async req=>{
  const header=req.headers.authorization||'';
  if(!header.startsWith('Bearer ')||header.length>16000)return null;
  const token=header.slice(7),result=await db.auth.getUser(token);
  if(result.error||!result.data?.user)return null;
  let claims;try{claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString('utf8'));}catch{return null;}
  const userId=result.data.user.id,loginId=claims.session_id;
  if(claims.sub!==userId||! /^[\da-f]{8}-[\da-f-]{27}$/i.test(loginId||''))return null;
  const check=await db.rpc('rtg_personal_session_alive',{p_user:userId,p_session:loginId});
  if(check.error||check.data!==true)return null;
  const owner=await authorizeOwner(req);
  return {verified:true,userId,loginId,owner:owner?.ok===true&&owner.user?.id===userId};
 };
}
