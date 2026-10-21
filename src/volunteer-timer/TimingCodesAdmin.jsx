import {useEffect,useRef,useState} from 'react';
import {supabase} from '../lib/supabaseClient';
import './timing-codes-admin.css';

const HOUR=3600000;
export const indiaInput=ms=>new Date(ms+330*60000).toISOString().slice(0,16);
export const indiaInstant=value=>Date.parse(value+'+05:30');
const displayTime=value=>new Intl.DateTimeFormat('en-IN',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Kolkata'}).format(new Date(value))+' IST';
export async function timingCodeRequest(action,payload={}) {
 const {data}=await supabase.auth.getSession();
 if(!data.session)throw Error('Owner login required.');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
 try {
  const overview=action==='overview';
  const response=await fetch(overview?'/api/admin/ridge-timing-owner?action=overview':'/api/admin/ridge-timing-codes',{
   method:overview?'GET':'POST',headers:{Authorization:`Bearer ${data.session.access_token}`,'Content-Type':'application/json'},
   ...(!overview?{body:JSON.stringify({action,...payload})}:{}),signal:controller.signal
  });
  const result=await response.json();
  if(!response.ok)throw Error(result.error||'Unable to load code management.');
  return result;
 } finally {clearTimeout(timer);}
}
export default function TimingCodesAdmin({request=timingCodeRequest}) {
 const [items,setItems]=useState([]),[overview,setOverview]=useState(null),[scope,setScope]=useState('timing'),[assignment,setAssignment]=useState('');
 const [expiry,setExpiry]=useState(()=>indiaInput(Date.now()+4*HOUR)),[message,setMessage]=useState(''),[issued,setIssued]=useState(null);
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[assignmentError,setAssignmentError]=useState(''),[listError,setListError]=useState(''),[review,setReview]=useState(null),[uncertain,setUncertain]=useState(false);
 const dialog=useRef(null),lock=useRef(false);
 const load=async()=>{
  setLoading(true);setAssignmentError('');setListError('');
  const results=await Promise.allSettled([request('list'),request('overview')]);
  if(results[0].status==='fulfilled')setItems(results[0].value);else setListError(results[0].reason.message);
  if(results[1].status==='fulfilled')setOverview(results[1].value);else setAssignmentError(results[1].reason.message);
  setLoading(false);
 };
 useEffect(()=>{load();},[request]);
 useEffect(()=>{if(review)dialog.current?.showModal?.();else dialog.current?.close?.();},[review]);
 const assignments=(overview?.assignments||[]).filter(a=>!a.revoked_at&&Date.parse(a.expires_at)>Date.now());
 const selected=assignments.find(a=>a.user_id+':'+a.session_id===assignment);
 const expiresAt=indiaInstant(expiry);
 const expiryError=!Number.isFinite(expiresAt)?'Choose an expiry in India time.':expiresAt<=Date.now()?'Expiry must be in the future.':expiresAt>Date.now()+24*HOUR?'Expiry must be within the next 24 hours.':scope==='timing'&&selected&&expiresAt>Date.parse(selected.expires_at)?'Code expiry cannot be later than the assignment expiry.':'';
 const label=a=>{const session=overview?.sessions?.find(s=>s.id===a.session_id);return `${session?session.date+' · '+session.mode:a.session_id} · Account ${a.user_id}`;};
 const prepare=()=>{
  if(expiryError||(scope==='timing'&&!selected))return;
  setReview({scope,assignmentId:scope==='timing'?assignment:undefined,expiresAt:new Date(expiresAt).toISOString(),label:scope==='timing'?label(selected):'Owner Advanced Settings'});
 };
 const issue=async()=>{
  if(lock.current||!review)return;lock.current=true;setBusy(true);setMessage('');setIssued(null);
  try {const result=await request('issue',{scope:review.scope,assignmentId:review.assignmentId,expiresAt:review.expiresAt});setIssued(result);setReview(null);setMessage('Code generated. It is shown once below.');try{setItems(await request('list'));}catch{setListError('Code generated, but list refresh failed. Do not generate another code.');}}
  catch(e){setUncertain(true);setReview(null);setMessage(`Issuance was not confirmed: ${e.message}. Refresh the code list and reconcile any new entry before issuing again. Reload this page only after reconciliation.`);}
  finally{lock.current=false;setBusy(false);}
 };
 return <main className="timing-codes-admin">
  <header className="tc-banner"><p>RIDGE · OWNER ACCESS</p><h1>Timer access codes</h1><p>Create a limited volunteer code or a separate owner code. Your main admin login stays unchanged.</p><a href="/volunteer/ridge/code">Open code entry →</a></header>
  {message&&<p className="tc-notice" role="status">{message}</p>}
  <section className="tc-card" aria-labelledby="tc-create"><h2 id="tc-create">Create an access code</h2><p>Choose what the operator can do, then review before generating. No access is granted until you confirm.</p>
   <div className="tc-fields"><label htmlFor="tc-scope">Access scope<select id="tc-scope" disabled={busy} value={scope} onChange={e=>{setScope(e.target.value);setReview(null);}}><option value="timing">Assigned volunteer timing</option><option value="advanced">Owner Advanced Settings</option></select></label>
   <p className="tc-help">{scope==='timing'?'Attendance and lap timing for one existing assignment only.':'Owner session setup and corrections. This does not require a volunteer assignment.'}</p>
   {scope==='timing'&&<><label htmlFor="tc-assignment">Existing volunteer assignment<select id="tc-assignment" disabled={busy||loading||!assignments.length||!!assignmentError} value={assignment} onChange={e=>{setAssignment(e.target.value);setReview(null);}}><option value="">{loading?'Loading assignments…':'Select account and session'}</option>{assignments.map(a=><option key={a.user_id+':'+a.session_id} value={a.user_id+':'+a.session_id}>{label(a)}</option>)}</select></label>
    {assignmentError?<p role="alert" className="tc-notice">Assignments could not be loaded: {assignmentError} <button type="button" disabled={loading} onClick={load}>Retry loading</button></p>:!loading&&!assignments.length?<p className="tc-notice">No active volunteer assignments. <a href="/admin/ridge-volunteers">Manage volunteer assignments</a> to approve an existing account and session first. For your own access, choose Owner Advanced Settings above.</p>:selected&&<p className="tc-help">Assignment ends {displayTime(selected.expires_at)}.</p>}</>}
   <label htmlFor="tc-expiry">Code expiry · India time (IST, UTC+05:30)<input id="tc-expiry" type="datetime-local" disabled={busy} value={expiry} min={indiaInput(Date.now()+60000)} max={indiaInput(Date.now()+24*HOUR)} aria-describedby="tc-expiry-help" aria-invalid={!!expiryError} onChange={e=>{setExpiry(e.target.value);setReview(null);}}/></label>
   <p id="tc-expiry-help" className="tc-help">{expiryError||`Expires ${displayTime(expiresAt)}. Maximum 24 hours; volunteer codes cannot outlast their assignment.`}</p></div>
   <button className="tc-primary" disabled={busy||uncertain||!!expiryError||(scope==='timing'&&(!selected||!!assignmentError||loading))} onClick={prepare}>Review code issuance</button>
  </section>
  <dialog ref={dialog} className="tc-dialog" aria-labelledby="tc-review-title" onCancel={e=>{if(busy)e.preventDefault();else setReview(null);}}>{review&&<><h2 id="tc-review-title">Review access before generating</h2><p><strong>{review.label}</strong></p><p>Expires {displayTime(review.expiresAt)}.</p><p>Anyone holding this code can use its allowed actions until expiry or revocation. Share it privately.</p><div className="tc-actions"><button disabled={busy} onClick={()=>setReview(null)}>Cancel</button><button className="tc-primary" disabled={busy} onClick={issue}>{busy?'Generating…':'Confirm and generate code'}</button></div></>}</dialog>
  {issued&&<section className="tc-card"><h2>Your new code</h2><p>Shown once in this view. Share privately with the intended operator. Reloading hides it.</p><output className="tc-secret">{issued.code}</output><button onClick={()=>setIssued(null)}>Hide code</button></section>}
  <section className="tc-card" aria-labelledby="tc-list"><div className="tc-actions"><h2 id="tc-list">Issued codes</h2><button disabled={busy||loading} onClick={load}>{loading?'Loading…':'Refresh codes and assignments'}</button></div>
   {listError&&<p role="alert" className="tc-notice">{listError}</p>}{!loading&&!listError&&!items.length&&<p>No codes have been issued.</p>}
   {items.map(item=><article className="tc-code" key={item.id}><div><strong>{item.scope==='advanced'?'Owner Advanced Settings':'Assigned volunteer timing'}</strong><p>{item.sessionId||'Owner settings'} · {item.revokedAt?'Revoked':Date.parse(item.expiresAt)<=Date.now()?'Expired':'Active'}</p><p>Expires {displayTime(item.expiresAt)}</p><small>Code ID: {item.id}</small></div><button disabled={busy||!!item.revokedAt} onClick={async()=>{if(lock.current)return;lock.current=true;setBusy(true);try{await request('revoke',{id:item.id});setItems(await request('list'));}catch(e){setMessage('Revocation could not be confirmed. Refresh the list before trying again. '+e.message);}finally{lock.current=false;setBusy(false);}}}>Revoke code</button></article>)}
  </section>
 </main>;
}
