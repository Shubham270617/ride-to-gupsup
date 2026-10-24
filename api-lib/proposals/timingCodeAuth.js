// Hash-only code authentication. Session bearer scope is separately activation-gated.
import {randomBytes,createHmac} from 'node:crypto';
const timingCommands=new Set(['create_rider','attendance','group_start','start','end','pass','rider_finish','rider_resume']);
// Owner ("Advanced Settings") codes were removed (migration 035): the only
// codes are volunteer timing codes. The owner works in Admin -> Ridge.
export function createTimingCodeAuth({store,pepper,origin,now=Date.now,random=randomBytes}){
 if(typeof pepper!=='string'||Buffer.byteLength(pepper)<32)throw new Error('A dedicated server secret is required.');
 if(!origin?.startsWith('https://'))throw new Error('HTTPS origin is required.');
 const digest=(kind,value)=>createHmac('sha256',pepper).update(kind+'\0'+value).digest('hex');
 const fail=()=>{throw new Error('Code unavailable or invalid.');};
 const checkOrigin=req=>{if(req.origin!==origin)throw new Error('Request origin refused.');};
 return {
  async issue({issuer,scope,assignmentId=null,sessionId=null,expiresAt,volunteerName=null}){
   // Adapter must resolve this from established server-verified owner identity,
   // never from client claims. Recheck owner/assignment in the atomic insert.
   if(!issuer?.verifiedOwner||!['timing','session_timing'].includes(scope)||!Number.isFinite(expiresAt)||expiresAt<=now()||expiresAt>now()+86400000)throw new Error('Invalid owner issuance request.');
   if(scope==='timing'&&!assignmentId)throw new Error('An existing explicit assignment is required.');
   if(scope==='session_timing'&&(typeof sessionId!=='string'||!sessionId||sessionId.length>200))throw new Error('Choose one session.');
   const code=random(24).toString('base64url');
   // Who the code is for, shown in the code list and on their timer.
   const name=typeof volunteerName==='string'?volunteerName.trim().slice(0,80):'';
   const result=await store.insertCredential({issuerId:issuer.id,scope,assignmentId,sessionId,expiresAt,codeHash:digest('code',code),volunteerName:name||null});
   return {id:result.id,code,volunteerName:name||null,expiresAt:result.expiresAt ? Date.parse(result.expiresAt) : expiresAt}; // one-time display only, never log
  },
  async exchange({code,networkKey,...req}){
   checkOrigin(req);
   // Atomic shared-store counters must increment even for malformed codes.
   const permitted=await store.consumeRateLimits([
    {key:digest('network',String(networkKey)),limit:5,windowMs:60000},
    {key:digest('global','exchange'),limit:100,windowMs:60000},
   ],now());
   if(!permitted||typeof code!=='string'||!/^[A-Za-z0-9_-]{32}$/.test(code))return fail();
   const token=random(32).toString('base64url');
   // Must lock credential, check expiry/revocation/current owner or assignment,
   // and insert session atomically; stores hashes only. No role grants.
   const session=await store.exchangeCredential({codeHash:digest('code',code),sessionHash:digest('session',token),now:now(),maxExpiresAt:now()+20*60000});
   if(!session)return fail();
   return {cookie:`__Host-rtg-timing=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${Math.max(0,Math.floor((session.expiresAt-now())/1000))}`,scope:session.scope,expiresAt:session.expiresAt};
  },
  async authorize({token,command,...req}){
   checkOrigin(req);
   if(typeof token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(token))return fail();
   // Store rechecks credential+session revocation and current assignment/owner
   // on EVERY request, and writer repeats check under its workspace lock.
   const session=await store.readActiveSession(digest('session',token),now());
   if(!session||session.expiresAt<=now())return fail();
   if(session.scope==='timing'){
    if(!timingCommands.has(command?.type)||command.sessionId!==session.sessionId)throw new Error('Timing scope refused.');
    // A volunteer may add a missing rider (migration 038); the new id is not on the roster yet.
    const ids=command.type==='attendance'?command.riderIds:command.type==='create_rider'?[]:[command.riderId].filter(Boolean);
    if(!Array.isArray(ids)||ids.some(id=>!session.rosterIds.includes(id)))throw new Error('Roster scope refused.');
   }else throw new Error('Code scope refused.');
   return {credentialId:session.credentialId,actorId:session.issuerId,scope:session.scope,assignmentId:session.assignmentId};
  },
 };
}
