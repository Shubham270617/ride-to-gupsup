import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {supabase} from '../lib/supabaseClient';
import {codeSetupFlow} from './codeSetupFlow';
import './timing-codes-admin.css';
import SecretCode from './SecretCode';
const HOUR=3600000;
export const indiaInput=ms=>new Date(ms+330*60000).toISOString().slice(0,16);
export const indiaInstant=value=>Date.parse(value+'+05:30');
const displayTime=value=>new Intl.DateTimeFormat('en-IN',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Kolkata'}).format(new Date(value))+' IST';
export async function timingCodeRequest(action,payload={},expectedOwner) {
 const {data}=await supabase.auth.getSession();
 if(!data.session)throw Error('Owner login required.');
 const identity=JSON.stringify([data.session.user.id,data.session.user.last_sign_in_at]);
 if(action==='identity')return identity;
 if(expectedOwner&&expectedOwner!==identity)throw Error('Owner session changed. Sign in again before continuing.');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
 try {
  const overview=action==='overview',owner=['overview','resolve','grant'].includes(action);
  const response=await fetch(owner?'/api/admin/ridge-timing-owner'+(overview?'?action=overview':''):'/api/admin/ridge-timing-codes',{
   method:overview?'GET':'POST',headers:{Authorization:`Bearer ${data.session.access_token}`,'Content-Type':'application/json'},
   ...(!overview?{body:JSON.stringify({action,...payload})}:{}),signal:controller.signal
  });
  const result=await response.json();if(!response.ok)throw Error(result.error||'Unable to load code management.');return result;
 } finally {clearTimeout(timer);}
}
export default function TimingCodesAdmin({request=timingCodeRequest}) {
 const [items,setItems]=useState([]),[overview,setOverview]=useState(null),[scope,setScope]=useState('advanced');
 const [sessionId,setSessionId]=useState(''),[sessionCodesEnabled,setSessionCodesEnabled]=useState(false);
 const [expiry,setExpiry]=useState(()=>indiaInput(Date.now()+4*HOUR)),[message,setMessage]=useState(''),[issued,setIssued]=useState(null);
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[overviewError,setOverviewError]=useState(''),[listError,setListError]=useState(''),[review,setReview]=useState(null),[pending,setPending]=useState(null),[flowReady,setFlowReady]=useState(false);
 const dialog=useRef(null),lock=useRef(false),flow=useMemo(()=>codeSetupFlow({request}),[request]);
 const load=useCallback(async()=>{
  setLoading(true);setOverviewError('');setListError('');
  const results=await Promise.allSettled([request('list'),request('overview'),request('capabilities')]);
  if(results[0].status==='fulfilled')setItems(results[0].value);else setListError(results[0].reason.message);
  if(results[1].status==='fulfilled')setOverview(results[1].value);else setOverviewError(results[1].reason.message);
  setSessionCodesEnabled(results[2].status==='fulfilled'&&results[2].value.sessionCodesEnabled===true);
  setLoading(false);
 },[request]);
 useEffect(()=>{load();let active=true;flow.load().then(value=>{if(active){setPending(value);setFlowReady(true);}}).catch(e=>{if(active)setMessage('Cannot safely prepare access: '+e.message);});return()=>{active=false;};},[load,flow]);
 useEffect(()=>{if(review)dialog.current?.showModal?.();else dialog.current?.close?.();},[review]);
 const expiresAt=indiaInstant(expiry),sessions=(overview?.sessions||[]).filter(s=>!s.finished&&['testing','live'].includes(s.mode)),selected=sessions.find(s=>s.id===sessionId);
 const expiryError=!Number.isFinite(expiresAt)?'Choose an expiry in India time.':expiresAt<=Date.now()?'Expiry must be in the future.':expiresAt>Date.now()+24*HOUR?'Expiry must be within the next 24 hours.':'';
 const blocked=busy||!!pending;
 const prepare=()=>{
  if(expiryError||!flowReady||pending||(scope==='session_timing'&&(!selected||!sessionCodesEnabled)))return;
  setReview({label:scope==='advanced'?'My owner code':`Session timing code · ${selected.date} · ${selected.mode==='testing'?'Practice':'Live'}`,code:{scope,sessionId:scope==='session_timing'?sessionId:undefined,expiresAt:new Date(expiresAt).toISOString()},mode:selected?.mode});
 };
 const run=async fresh=>{
  if(lock.current)return;lock.current=true;setBusy(true);setMessage('');setIssued(null);
  try {
   if(fresh)await flow.begin(fresh);
   setPending(flow.current);setReview(null);
   const result=await flow.run();setPending(null);setIssued(result);setMessage('Code ready. Share it privately with the operator.');await load();
  }catch(e){setPending(flow.current);setReview(null);setMessage(e.message);}
  finally{lock.current=false;setBusy(false);}
 };
 return <main className="timing-codes-admin">
  <header className="tc-banner"><p>RIDGE · OWNER ACCESS</p><h1>Create a timer code</h1><p>Choose who will use the timer.</p><a href="/volunteer/ridge/code">Open timer code entry →</a></header>
  {message&&<p className="tc-notice" role="status">{message}</p>}
  {pending&&<section className="tc-card" aria-label="Pending code setup"><h2>Finish your previous request</h2><p>{pending.label}</p>{pending.phase==='issuing'?<p>The code response was not confirmed. Do not generate another code. Refresh the list below and revoke any newly created code you cannot retrieve. This request remains blocked until {displayTime(pending.code.expiresAt)} so an in-flight response cannot cause duplicate access.</p>:<><p>{pending.phase==='grant'?'Session approval needs confirmation. Continuing reuses the same request; it does not create a second approval.':'Session access is approved. Continue to generate the code.'}</p><button disabled={busy} onClick={()=>run()}>Continue previous request</button></>}{Date.parse(pending.code.expiresAt)<=Date.now()&&<button disabled={busy} onClick={async()=>{try{await flow.clearExpired();setPending(null);}catch(e){setMessage(e.message);}}}>Clear expired request</button>}</section>}
  <section className="tc-card" aria-labelledby="tc-create"><h2 id="tc-create">Who is this code for?</h2>
   <div className="tc-choices" role="group" aria-label="Code type"><button aria-pressed={scope==='advanced'} disabled={blocked} onClick={()=>{setScope('advanced');setReview(null);}}>My owner code<span>Session setup and advanced controls</span></button><button aria-pressed={scope==='session_timing'} disabled={blocked} onClick={()=>{setScope('session_timing');setReview(null);}}>Volunteer timing code<span>Attendance and laps for one session</span></button></div>
   <div className="tc-fields">
   {scope==='advanced'?<p>Use this code yourself to open owner controls in the timer.</p>:<>
    <label htmlFor="tc-session">Session<select id="tc-session" disabled={blocked||loading||!!overviewError} value={sessionId} onChange={e=>{setSessionId(e.target.value);setReview(null);}}><option value="">{loading?'Loading sessions…':'Choose a session'}</option>{sessions.map(s=><option key={s.id} value={s.id}>{s.date} · {s.mode==='testing'?'Practice':'Live'}</option>)}</select></label>
    {overviewError?<p className="tc-notice" role="alert">Sessions could not be loaded: {overviewError} <button disabled={loading} onClick={load}>Retry</button></p>:!loading&&!sessions.length?<p className="tc-notice">No open sessions yet. <a href="/volunteer/ridge">Create a session in the timer</a>, then refresh this page.</p>:null}
    {!sessionCodesEnabled&&<p role="status" className="tc-notice">Session codes are prepared but awaiting activation. No email or website account will be required.</p>}
    <p className="tc-help">Share the timer link and code with anyone you choose. They can mark attendance and record laps for this session only. No website account is needed.</p>
   </>}
   <label htmlFor="tc-expiry">Code expiry · India time (IST, UTC+05:30)<input id="tc-expiry" type="datetime-local" disabled={blocked} value={expiry} min={indiaInput(Date.now()+60000)} max={indiaInput(Date.now()+24*HOUR)} aria-describedby="tc-expiry-help" aria-invalid={!!expiryError} onChange={e=>{setExpiry(e.target.value);setReview(null);}}/></label>
   <p id="tc-expiry-help" className="tc-help">{expiryError||`Expires ${displayTime(expiresAt)}. Maximum 24 hours.`}</p></div>
   <button className="tc-primary" disabled={blocked||!flowReady||!!expiryError||(scope==='session_timing'&&(!selected||!sessionCodesEnabled||!!overviewError||loading))} onClick={prepare}>Review and create code</button>
  </section>
  <dialog ref={dialog} className="tc-dialog" aria-labelledby="tc-review-title" onCancel={e=>{if(busy)e.preventDefault();else setReview(null);}}>{review&&<><h2 id="tc-review-title">{review.code.scope==='session_timing'?'Create a session timing code':'Create your owner code'}</h2><p><strong>{review.label}</strong></p><p>Expires {displayTime(review.code.expiresAt)}.</p>{review.code.scope==='session_timing'&&<><p>Anyone you share this code with can mark attendance and record laps for this session. No registration or login is required.</p><p>It does not grant corrections, photos, closing, publishing, or main admin access.</p>{review.mode==='live'&&<p>Live-session timing updates the public results.</p>}</>}<p>Anyone holding the code can use these actions until expiry or revocation. Share it privately.</p><div className="tc-actions"><button disabled={busy} onClick={()=>setReview(null)}>Cancel</button><button className="tc-primary" disabled={busy} onClick={()=>run(review)}>{busy?'Creating…':review.code.scope==='session_timing'?'Create session code':'Create my owner code'}</button></div></>}</dialog>
  {issued&&<section className="tc-card"><h2>Your new code</h2><p>Shown once in this view. Share privately with the intended operator. Reloading hides it.</p><SecretCode code={issued.code}/><button onClick={()=>setIssued(null)}>Hide code</button></section>}
  <section className="tc-card" aria-labelledby="tc-list"><div className="tc-actions"><h2 id="tc-list">Issued codes</h2><button disabled={busy||loading} onClick={load}>{loading?'Loading…':'Refresh codes'}</button></div>
   {listError&&<p role="alert" className="tc-notice">{listError}</p>}{!loading&&!listError&&!items.length&&<p>No codes have been issued.</p>}
   {items.map(item=><article className="tc-code" key={item.id}><div><strong>{item.scope==='advanced'?'My owner code':'Volunteer timing code'}</strong><p>{item.sessionId||'Owner controls'} · {item.revokedAt?'Revoked':Date.parse(item.expiresAt)<=Date.now()?'Expired':'Active'}</p><p>Expires {displayTime(item.expiresAt)}</p><small>Code ID: {item.id}</small></div><button disabled={busy||!!item.revokedAt} onClick={async()=>{if(lock.current)return;lock.current=true;setBusy(true);try{await request('revoke',{id:item.id});setItems(await request('list'));}catch(e){setMessage('Revocation could not be confirmed. Refresh the list before trying again. '+e.message);}finally{lock.current=false;setBusy(false);}}}>Revoke code</button></article>)}
  </section>
 </main>;
}
