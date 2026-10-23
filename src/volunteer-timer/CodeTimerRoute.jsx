import {useEffect,useRef,useState} from 'react';
import QueuedVolunteerPanel from './QueuedVolunteerPanel';
import VolunteerTimerPanel from './VolunteerTimerPanel';
import {createCodeTransport} from './codeTransport';
import {CodeInput} from './SecretCode';
import './volunteer-timer.css';

// /volunteer/ridge/code — open the Ridge timer with a code from
// Admin -> Ridge — Access codes. An owner code can do everything (riders,
// sessions, attendance and timing); a volunteer code times one session.
export default function CodeTimerRoute(){
 const [transport]=useState(()=>createCodeTransport()),[enabled,setEnabled]=useState(false),[data,setData]=useState(null),[code,setCode]=useState(''),[kind,setKind]=useState('timing'),[message,setMessage]=useState('Checking code access…'),[busy,setBusy]=useState(false),[now,setNow]=useState(Date.now());const flight=useRef(false),alive=useRef(true);
 const read=async()=>{const next=await transport.read();if(alive.current)setData(next);return next;};
 useEffect(()=>{alive.current=true;const c=new AbortController();fetch('/api/admin/ridge-timing-codes?action=status',{signal:c.signal}).then(r=>r.json()).then(async status=>{if(!alive.current)return;setEnabled(status.enabled===true);setMessage(status.enabled?'Enter the code issued by the owner.':'Code access is not activated. Existing account login remains available.');if(status.enabled)try{await read();}catch{/* no active cookie */}}).catch(()=>{if(alive.current)setMessage('Unable to check code access.');});const timer=setInterval(()=>setNow(Date.now()),250);return()=>{alive.current=false;c.abort();clearInterval(timer);};},[transport]); // eslint-disable-line react-hooks/exhaustive-deps
 const login=async e=>{e.preventDefault();if(flight.current)return;flight.current=true;setBusy(true);try{const result=await transport.api({action:'exchange',code});setCode('');if(result.scope!==kind){await transport.api({action:'logout'});throw new Error('That code is for the other access type.');}await read();setMessage('Code accepted.');}catch(e){setMessage(e.message);}finally{flight.current=false;setBusy(false);}};
 const send=async(command,retry=false)=>{if(flight.current||!data||data.expired)return null;flight.current=true;setBusy(true);try{await transport.write({version:data.version,requestId:crypto.randomUUID(),command},retry);const next=await read();setMessage('Saved.');return next;}catch(e){setMessage(e.message);try{await read();}catch{setData(null);}return null;}finally{flight.current=false;setBusy(false);}};
 const logout=async()=>{await transport.api({action:'logout'});setData(null);setMessage('Code session ended. Enter a code to start again.');};

 if(!data)return <main className="vt-panel">
  <header className="vt-hero"><p className="vt-eyebrow">RTG · Ridge Repeats</p><h1>Ridge Repeats Timer</h1><p className="vt-status" role="status"><span className="vt-role">{message}</span></p></header>
  {enabled&&<section className="vt-card vt-login">
   <h2>Open the timer with your code</h2>
   <ol className="vt-login-steps"><li>Choose who the code is for.</li><li>Paste the code you were given.</li><li>Press <b>Enter timer</b>.</li></ol>
   <form onSubmit={login}>
    <label className="vt-field">Access type<select value={kind} onChange={e=>setKind(e.target.value)}><option value="timing">Volunteer timing code</option><option value="advanced">Owner Advanced Settings code</option></select></label>
    <label className="vt-field">Access code<CodeInput value={code} onChange={e=>setCode(e.target.value.trim())}/></label>
    <button className="vt-btn vt-btn-primary vt-btn-big" disabled={busy||!code}>Enter timer</button>
   </form>
  </section>}
  <p className="vt-links"><a href="/volunteer/ridge">Sign in with an account instead</a></p>
 </main>;

 if(data.scope==='timing')return <QueuedVolunteerPanel key={data.credentialId} identity={data.credentialId} initial={data} read={()=>transport.read()} checkIdentity={transport.identity} write={(body,{retry})=>transport.write(body,retry,data.credentialId)} restore={body=>transport.restorePending(body,data.credentialId)} existingPending={!!data.pending} onExit={async()=>{await transport.api({action:'logout'});setData(null);}}/>;

 // Owner code: set-up, attendance and timing on one page.
 const controls={addRider:name=>send({type:'create_rider',name}),createSession:async date=>(await send({type:'create_session',date}))?.state.sessions.find(s=>s.date===date&&s.mode!=='archived')?.id,finishSession:sessionId=>send({type:'finish_session',sessionId,reason:'Owner code session closure'}),correct:send,refresh:read};
 return <>
  <VolunteerTimerPanel connected sessions={data.state.sessions} riders={data.state.riders} ownerActions={controls} previewActions={{send,retry:()=>send(null,true)}} busy={busy} pending={!!data.pending} message={message} now={now}/>
  <div className="vt-session-bar">
   {data.pending&&<button className="vt-btn vt-btn-warn" disabled={busy||data.expired} onClick={()=>send(null,true)}>Retry same owner action</button>}
   {data.expired&&<p role="alert">Recovery expired. Ask the owner to reconcile the saved request before further changes.</p>}
   <button className="vt-btn vt-btn-ghost" disabled={busy||!!data.pending} onClick={logout}>End code session</button>
  </div>
 </>;
}
