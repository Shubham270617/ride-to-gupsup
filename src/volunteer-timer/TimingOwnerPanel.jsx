import {useEffect,useState} from 'react';
import {supabase} from '../lib/supabaseClient';
import './volunteer-timer.css';

async function timingOwnerRequest(action,payload={}) {
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
 try {
  const {data}=await supabase.auth.getSession();if(!data.session)throw new Error('Owner sign-in required.');
  const read=action==='overview';
  const response=await fetch('/api/admin/ridge-timing-owner'+(read?'?action=overview':''),{method:read?'GET':'POST',signal:controller.signal,headers:{Authorization:`Bearer ${data.session.access_token}`,'Content-Type':'application/json'},...(!read?{body:JSON.stringify({action,...payload})}:{})});
  const result=await response.json();if(!response.ok)throw new Error(result.error||'Owner action failed.');return result;
 } finally {clearTimeout(timer);}
}
export default function TimingOwnerPanel({request=timingOwnerRequest}) {
 const [data,setData]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [email,setEmail]=useState(''),[person,setPerson]=useState(null),[sessionId,setSessionId]=useState(''),[roster,setRoster]=useState([]),[expiry,setExpiry]=useState('');
 const [review,setReview]=useState(null),[uncertain,setUncertain]=useState(false),[notice,setNotice]=useState('');
 const [requestId,setRequestId]=useState(''),[receipt,setReceipt]=useState(null),[operatorId,setOperatorId]=useState('');
 useEffect(()=>{let active=true;request('overview').then(v=>{if(active)setData(v);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[request]);
 const perform=async fn=>{if(busy)return;setBusy(true);setError('');try{await fn();}catch(e){setError(e.message);}finally{setBusy(false);}};
 const prepare=()=>{
  setError('');
  if(!person||!sessionId||!roster.length||!Number.isFinite(Date.parse(expiry))){setError('Verify one account, choose an open session, riders and expiry.');return;}
  const prior=data.assignments.find(a=>a.user_id===person.id&&a.session_id===sessionId);
  setReview({action:'grant',userId:person.id,verifiedEmail:person.email,sessionId,rosterIds:roster,expiresAt:new Date(expiry).toISOString(),expectedRevision:prior?.revision||0,requestId:crypto.randomUUID()});setNotice('');
 };
 const commit=()=>perform(async()=>{
  if(!data.activationReady||!review)return;
  try{await request(review.action,review);}
  catch(e){setUncertain(true);throw e;}
  setUncertain(false);setReview(null);setNotice('Assignment saved.');
  try{setData(await request('overview'));}catch{setError('Assignment saved, but overview refresh failed. Reload to inspect it; do not submit a new grant.');}
 });
 return <main className="vt-panel"><h1>Ridge volunteer access</h1>
  <p>Owner only. Volunteers receive attendance and lap timing on explicitly assigned sessions. No main admin, corrections, photos, closing or publishing access.</p>
  {!data?.activationReady&&<p role="status">Preview mode · access activation is pending review. No real grants can be submitted.</p>}
  {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
  {!data?<p>Loading owner overview…</p>:<>
   <fieldset disabled={busy||uncertain}><legend>Prepare a named assignment</legend>
    <label>Existing account email<input type="email" value={email} onChange={e=>{setEmail(e.target.value);setPerson(null);setReview(null);}}/></label>
    <button onClick={()=>perform(async()=>{const result=await request('resolve',{email});setPerson(result.user);setOperatorId(result.user.id);setReview(null);})}>Verify existing account</button>
    {person&&<p>Verified: {person.email} · {person.id}</p>}
    <label>Assigned session<select value={sessionId} onChange={e=>{setSessionId(e.target.value);setReview(null);}}><option value="">Choose session</option>{data.sessions.filter(s=>!s.finished&&['testing','live'].includes(s.mode)).map(s=><option key={s.id} value={s.id}>{s.date} · {s.mode}</option>)}</select></label>
    <label>Expiry (your local time; maximum seven days)<input type="datetime-local" value={expiry} onChange={e=>{setExpiry(e.target.value);setReview(null);}}/></label>
    <p>Assigned roster (include all attending riders)</p>{data.riders.map(r=><label className="vt-roster" key={r.id}><input type="checkbox" checked={roster.includes(r.id)} onChange={e=>{setRoster(e.target.checked?[...roster,r.id]:roster.filter(id=>id!==r.id));setReview(null);}}/>{r.name}</label>)}
    <button onClick={prepare}>Review assignment</button>
   </fieldset>
   <h2>Existing assignments</h2>{!data.assignments.length&&<p>No assignments.</p>}{data.assignments.map(a=><article key={a.user_id+a.session_id}><p>{a.user_id} · {a.session_id} · expires {a.expires_at} · {a.revoked_at?'revoked':'active or expired'}</p><button disabled={busy||uncertain||!!a.revoked_at} onClick={()=>setReview({action:'revoke',userId:a.user_id,sessionId:a.session_id,expectedRevision:a.revision,requestId:crypto.randomUUID()})}>Review revoke</button></article>)}
   {review&&<section aria-label="Assignment review"><h2>{review.action==='grant'?'Review grant':'Review revocation'}</h2><p>Account: {review.verifiedEmail||review.userId}</p><p>Session: {review.sessionId}</p>{review.action==='grant'&&<><p>Roster: {review.rosterIds.map(id=>data.riders.find(r=>r.id===id)?.name||id).join(', ')}</p><p>Expires: {review.expiresAt}</p><p>Attendance and timing only. Live-session timing updates existing public results.</p></>}<p>Request ID: {review.requestId}</p><button disabled={busy||!data.activationReady} onClick={commit}>{uncertain?'Retry same access request':review.action==='grant'?'Confirm grant':'Confirm revoke'}</button><button disabled={busy||uncertain} onClick={()=>setReview(null)}>Cancel review</button>{uncertain&&<p>Outcome unconfirmed. Keep this request ID; do not prepare another grant.</p>}</section>}
   <h2>Reconcile timing after a reload</h2><p>Read-only receipt lookup. This never repeats or corrects a timing action.</p>
   <label>Original timing request ID<input value={requestId} onChange={e=>setRequestId(e.target.value)}/></label><button disabled={busy} onClick={()=>perform(async()=>setReceipt(await request('reconcile',{requestId})))}>Check receipt</button>
   <label>Operator UUID<input value={operatorId} onChange={e=>setOperatorId(e.target.value)}/></label>
   <label>Reconciliation session<select value={sessionId} onChange={e=>setSessionId(e.target.value)}><option value="">Choose session</option>{data.sessions.map(s=><option key={s.id} value={s.id}>{s.date} · {s.mode}</option>)}</select></label>
   <button disabled={busy} onClick={()=>perform(async()=>setReceipt(await request('recent',{userId:operatorId,sessionId})))}>Find recent timing receipts</button>
   {receipt&&<section aria-label="Reconciliation result"><h3>{receipt.status==='committed'?'Committed receipt found':'Receipt lookup result'}</h3>{receipt.message&&<p>{receipt.message}</p>}<pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify(receipt.receipt||receipt.receipts||{},null,2)}</pre><p>Check operator, session, lap and captured time before resuming. A missing receipt is not permission to duplicate a tap.</p></section>}
  </>}
 </main>;
}
