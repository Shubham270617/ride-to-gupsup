import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {supabase} from '../lib/supabaseClient';
import {codeSetupFlow} from './codeSetupFlow';
import './timing-codes-admin.css';
import SecretCode from './SecretCode';
import QuickSession from './QuickSession';

// Admin -> Ridge — Access codes. Three plain steps:
//   1. Create a session (name, date, from–to time, Live/Testing)
//   2. Create a volunteer code: pick the session, the volunteer's name and
//      how many hours it works (1–24) — one click, no review dialog
//   3. Share it, and see/revoke every code issued
// codeSetupFlow keeps the safety rule: if a code's response is lost, no
// second code is made until the first is accounted for.
const HOUR=3600000;
const HOURS=[1,2,4,6,12,24];
export const indiaInput=ms=>new Date(ms+330*60000).toISOString().slice(0,16);
export const indiaInstant=value=>Date.parse(value+'+05:30');
const displayTime=value=>new Intl.DateTimeFormat('en-IN',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Kolkata'}).format(new Date(value))+' IST';
const niceDate=date=>{const d=new Date(`${date}T00:00:00Z`);return Number.isNaN(d.getTime())?date:d.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});};
export const sessionLabel=s=>[niceDate(s.date),s.name,s.startTime||s.endTime?`${s.startTime||'…'}–${s.endTime||'…'}`:'',s.mode==='testing'?'Practice':'Live'].filter(Boolean).join(' · ');

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
  const result=await response.json();if(!response.ok)throw Object.assign(Error(result.error||'Unable to load code management.'),{status:response.status,definitive:result.definitive===true});return result;
 } finally {clearTimeout(timer);}
}

function Step({n,title,hint,children}){
 return <section className="tc-card tc-step" aria-labelledby={`tc-step-${n}`}>
  <div className="tc-step-head"><span className="tc-step-num" aria-hidden="true">{n}</span><div><h2 id={`tc-step-${n}`}>{title}</h2>{hint&&<p className="tc-help">{hint}</p>}</div></div>
  {children}
 </section>;
}

export default function TimingCodesAdmin({request=timingCodeRequest,ridgeRequest}) {
 const [items,setItems]=useState([]),[overview,setOverview]=useState(null),[loading,setLoading]=useState(true);
 const [overviewError,setOverviewError]=useState(''),[listError,setListError]=useState(''),[sessionCodesEnabled,setSessionCodesEnabled]=useState(false);
 const [sessionId,setSessionId]=useState(''),[volunteerName,setVolunteerName]=useState(''),[hours,setHours]=useState(6);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[issued,setIssued]=useState(null),[pending,setPending]=useState(null),[flowReady,setFlowReady]=useState(false),[copied,setCopied]=useState(false);
 const lock=useRef(false),flow=useMemo(()=>codeSetupFlow({request}),[request]);

 const load=useCallback(async()=>{
  setLoading(true);setOverviewError('');setListError('');
  const results=await Promise.allSettled([request('list'),request('overview'),request('capabilities')]);
  if(results[0].status==='fulfilled')setItems(results[0].value);else setListError(results[0].reason.message);
  if(results[1].status==='fulfilled')setOverview(results[1].value);else setOverviewError(results[1].reason.message);
  setSessionCodesEnabled(results[2].status==='fulfilled'&&results[2].value.sessionCodesEnabled===true);
  setLoading(false);
 },[request]);
 // After creating a session only the session list needs refreshing.
 const loadSessions=async()=>{try{setOverview(await request('overview'));setOverviewError('');}catch(e){setOverviewError(e.message);}};
 useEffect(()=>{load();let active=true;flow.load().then(value=>{if(active){setPending(value);setFlowReady(true);}}).catch(e=>{if(active)setMessage('Cannot safely prepare access: '+e.message);});return()=>{active=false;};},[load,flow]);

 const sessions=useMemo(()=>(overview?.sessions||[]).filter(s=>!s.finished&&['testing','live'].includes(s.mode)).sort((a,b)=>b.date.localeCompare(a.date)||(a.startTime||'').localeCompare(b.startTime||'')),[overview]);
 const selected=sessions.find(s=>s.id===sessionId);
 const expiresAt=Date.now()+hours*HOUR-(hours===24?60000:0);
 const canCreate=flowReady&&!pending&&!busy&&!!selected&&sessionCodesEnabled&&!loading;

 const create=async()=>{
  if(!canCreate||lock.current)return;lock.current=true;setBusy(true);setMessage('');setIssued(null);setCopied(false);
  const name=volunteerName.trim();
  const plan={label:`Volunteer timing code · ${name||'volunteer'} · ${sessionLabel(selected)}`,code:{scope:'session_timing',sessionId,expiresAt:new Date(Date.now()+hours*HOUR-(hours===24?60000:0)).toISOString(),...(name?{volunteerName:name}:{})}};
  try{
   await flow.begin(plan);setPending(flow.current);
   const result=await flow.run();setPending(null);
   const item={id:result.id,scope:'session_timing',sessionId,expiresAt:new Date(result.expiresAt).toISOString(),volunteerName:result.volunteerName??(name||null),createdAt:new Date().toISOString()};
   setIssued({...result,volunteerName:item.volunteerName,session:selected});
   setItems(list=>[item,...list.filter(x=>x.id!==item.id)]);
   setVolunteerName('');
  }catch(e){setPending(flow.current);setMessage(e.message);}
  finally{lock.current=false;setBusy(false);}
 };
 const resume=async()=>{if(lock.current)return;lock.current=true;setBusy(true);try{const result=await flow.run();setPending(null);setIssued(result);await load();}catch(e){setPending(flow.current);setMessage(e.message);}finally{lock.current=false;setBusy(false);}};
 const shareText=issued&&`RTG Ridge Repeats timer\nOpen: ${window.location.origin}/volunteer/ridge/code\nCode: ${issued.code}\n${issued.session?`Session: ${sessionLabel(issued.session)}\n`:''}Valid until: ${displayTime(issued.expiresAt)}`;
 const copyMessage=async()=>{try{await navigator.clipboard.writeText(shareText);setCopied(true);setTimeout(()=>setCopied(false),2000);}catch{setMessage('Copy failed — select the code and copy it by hand.');}};
 const revoke=async id=>{if(lock.current)return;lock.current=true;setBusy(true);try{await request('revoke',{id});setItems(await request('list'));}catch(e){setMessage('Revocation could not be confirmed. Refresh the list before trying again. '+e.message);}finally{lock.current=false;setBusy(false);}};
 const sessionOf=id=>(overview?.sessions||[]).find(s=>s.id===id);

 return <main className="timing-codes-admin">
  <header className="tc-banner">
   <p>RIDGE · VOLUNTEER ACCESS</p><h1>Volunteer timing codes</h1>
   <ol className="tc-flow"><li>Create a session</li><li>Create the volunteer's code</li><li>Share it</li></ol>
   <a href="/volunteer/ridge/code">Open timer code entry →</a>
  </header>
  {message&&<p className="tc-notice" role="status">{message}</p>}
  {pending&&<section className="tc-card" aria-label="Pending code setup"><h2>Finish your previous request</h2><p>{pending.label}</p>{pending.phase==='issuing'?<p>The last code's response was not confirmed. Check the list below and revoke any code you didn't receive. A new code can be made after {displayTime(pending.code.expiresAt)}, so the same request can never create two codes.</p>:<button disabled={busy} onClick={resume}>Continue previous request</button>}{Date.parse(pending.code.expiresAt)<=Date.now()&&<button disabled={busy} onClick={async()=>{try{await flow.clearExpired();setPending(null);}catch(e){setMessage(e.message);}}}>Clear expired request</button>}</section>}

  <Step n={1} title="Create a session" hint="Skip this if the session already exists.">
   {!overviewError&&<QuickSession riderCount={overview?.riders?.length||0} request={ridgeRequest} onReady={async id=>{await loadSessions();setSessionId(id);}}/>}
  </Step>

  <Step n={2} title="Create the volunteer's code" hint="The volunteer can mark attendance and time laps for this one session. No website account needed.">
   <div className="tc-grid">
    <label htmlFor="tc-session" className="tc-wide">Session<select id="tc-session" disabled={busy||loading||!!overviewError} value={sessionId} onChange={e=>setSessionId(e.target.value)}><option value="">{loading?'Loading sessions…':sessions.length?'Choose a session':'No open sessions — create one in step 1'}</option>{sessions.map(s=><option key={s.id} value={s.id}>{sessionLabel(s)}</option>)}</select></label>
    <label htmlFor="tc-volunteer" className="tc-wide">Volunteer's name<input id="tc-volunteer" maxLength={80} placeholder="e.g. Rohit Kumar" disabled={busy} value={volunteerName} onChange={e=>setVolunteerName(e.target.value)}/></label>
   </div>
   {overviewError&&<p className="tc-notice" role="alert">Sessions could not be loaded: {overviewError} <button disabled={loading} onClick={load}>Retry</button></p>}
   <p className="tc-label" id="tc-hours-label">Code works for</p>
   <div className="tc-hours" role="group" aria-labelledby="tc-hours-label">{HOURS.map(h=><button key={h} type="button" aria-pressed={hours===h} disabled={busy} onClick={()=>setHours(h)}>{h} {h===1?'hour':'hours'}</button>)}</div>
   <p className="tc-help">Expires {displayTime(expiresAt)}. For a 5-hour event, 6 hours leaves a 1-hour buffer.</p>
   {!loading&&!sessionCodesEnabled&&<p role="status" className="tc-notice">Volunteer codes are awaiting activation (RTG_SESSION_TIMING_CODES_ENABLED in Vercel).</p>}
   <button className="tc-primary tc-big" disabled={!canCreate} onClick={create}>{busy?'Creating code…':'Create code'}</button>
  </Step>

  {issued&&<section className="tc-card tc-result" aria-labelledby="tc-new-code">
   <h2 id="tc-new-code">✓ Code ready{issued.volunteerName?` for ${issued.volunteerName}`:''}</h2>
   <p className="tc-help">{issued.session?sessionLabel(issued.session)+' · ':''}valid until {displayTime(issued.expiresAt)}. It's shown only here — copy it now.</p>
   <SecretCode code={issued.code}/>
   <div className="tc-actions"><button className="tc-primary" onClick={copyMessage}>{copied?'Copied ✓':'Copy message for the volunteer'}</button><button onClick={()=>setIssued(null)}>Hide code</button></div>
   <p className="tc-help">The message has the timer link, the code and when it expires — paste it into WhatsApp.</p>
  </section>}

  <Step n={3} title="Issued codes" hint="Newest first. Revoke a code to stop it at once.">
   <div className="tc-actions"><span/><button disabled={busy||loading} onClick={load}>Refresh codes</button></div>
   {listError?<p className="tc-notice" role="alert">{listError}</p>:items.length===0?<p>No codes have been issued.</p>:
   items.map(item=>{const s=sessionOf(item.sessionId);const state=item.revokedAt?'Revoked':Date.parse(item.expiresAt)<=Date.now()?'Expired':'Active';return <article className="tc-code" key={item.id}>
    <div><strong>{item.volunteerName||'Volunteer'}</strong> <span className={`tc-state tc-state-${state.toLowerCase()}`}>{state}</span>
     <p>{s?sessionLabel(s):'Session'}</p><small>Expires {displayTime(item.expiresAt)} · Code ID {item.id.slice(0,8)}</small></div>
    <button disabled={busy||!!item.revokedAt||state==='Expired'} onClick={()=>revoke(item.id)}>Revoke code</button>
   </article>;})}
  </Step>
 </main>;
}
