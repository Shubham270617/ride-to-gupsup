import {useEffect,useRef,useState} from 'react';
import QueuedVolunteerPanel from './QueuedVolunteerPanel';
import {createCodeTransport} from './codeTransport';
import {CodeInput} from './SecretCode';
import './volunteer-timer.css';

// /volunteer/ridge/code — a volunteer opens the Ridge timer with the code from
// Admin -> Ridge — Access codes: attendance and laps for that one session.
// (Owner codes were removed; the owner works in Admin -> Ridge.)
export default function CodeTimerRoute(){
 const [transport]=useState(()=>createCodeTransport()),[enabled,setEnabled]=useState(false),[data,setData]=useState(null),[code,setCode]=useState(''),[message,setMessage]=useState('Checking code access…'),[busy,setBusy]=useState(false);const flight=useRef(false),alive=useRef(true);
 const read=async()=>{const next=await transport.read();if(alive.current)setData(next);return next;};
 useEffect(()=>{alive.current=true;const c=new AbortController();fetch('/api/admin/ridge-timing-codes?action=status',{signal:c.signal}).then(r=>r.json()).then(async status=>{if(!alive.current)return;setEnabled(status.enabled===true);setMessage(status.enabled?'Enter the code issued by the owner.':'Code access is not activated. Existing account login remains available.');if(status.enabled)try{await read();}catch{/* no active cookie */}}).catch(()=>{if(alive.current)setMessage('Unable to check code access.');});return()=>{alive.current=false;c.abort();};},[transport]); // eslint-disable-line react-hooks/exhaustive-deps
 const login=async e=>{e.preventDefault();if(flight.current)return;flight.current=true;setBusy(true);try{const result=await transport.api({action:'exchange',code});setCode('');if(result.scope!=='timing'){await transport.api({action:'logout'});throw new Error('This is not a volunteer timing code.');}await read();setMessage('Code accepted.');}catch(e){setMessage(e.message);}finally{flight.current=false;setBusy(false);}};

 if(!data)return <main className="vt-panel">
  <header className="vt-hero"><p className="vt-eyebrow">RTG · Ridge Repeats</p><h1>Ridge Repeats Timer</h1><p className="vt-status" role="status"><span className="vt-role">{message}</span></p></header>
  {enabled&&<section className="vt-card vt-login">
   <h2>Open the timer with your code</h2>
   <ol className="vt-login-steps"><li>Paste the volunteer code you were given.</li><li>Press <b>Enter timer</b>.</li></ol>
   <form onSubmit={login}>
    <label className="vt-field">Access code<CodeInput value={code} onChange={e=>setCode(e.target.value.trim())}/></label>
    <button className="vt-btn vt-btn-primary vt-btn-big" disabled={busy||!code}>Enter timer</button>
   </form>
  </section>}
  <p className="vt-links"><a href="/volunteer/ridge">Sign in with an account instead</a></p>
 </main>;

 // The queued timer is offline-safe: taps are kept in localStorage (so
 // closing the tab doesn't lose them) and saved in order once online.
 return <QueuedVolunteerPanel canFinishRiders canAddRiders storage={window.localStorage} key={data.credentialId} identity={data.credentialId} initial={data} read={()=>transport.read()} checkIdentity={transport.identity} write={(body,{retry})=>transport.write(body,retry,data.credentialId)} restore={body=>transport.restorePending(body,data.credentialId)} existingPending={!!data.pending} onExit={async()=>{
  // Back to the code entry on this same page (/volunteer/ridge/code), even if the network is down.
  try{await transport.api({action:'logout'});}catch{/* the cookie expires on its own */}
  setData(null);setMessage('Code session ended. Enter a code to start again.');
  if(window.location.pathname!=='/volunteer/ridge/code')window.history.replaceState(null,'','/volunteer/ridge/code');window.scrollTo({top:0,behavior:'smooth'});}}/>;
}
