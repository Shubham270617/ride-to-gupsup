import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import useSession from '../lib/useSession';
import {supabase} from '../lib/supabaseClient';
import AuthGate from '../components/AuthGate';
import {useAuthGate} from '../lib/AuthGateContext';
import {createTimingController} from './timingController';
import VolunteerTimerPanel from './VolunteerTimerPanel';

// Token-free, tab-memory recovery across SPA route changes. Full reload cannot
// preserve this memory; beforeunload warns while the outcome is uncertain.
const recovery = new Map();

async function request(body, signal) {
  const {data}=await supabase.auth.getSession();
  if(!data.session)throw new Error('Sign in to continue.');
  if(body && data.session.user.id!==body.userId)throw Object.assign(new Error('Login changed; no action was sent.'),{definitive:true});
  if(body && data.session.user.last_sign_in_at!==body.binding)throw Object.assign(new Error('Login session changed; no action was sent.'),{definitive:true});
  const response=await fetch('/api/admin/volunteer-ridge',{method:body?'POST':'GET',signal,
    headers:{Authorization:`Bearer ${data.session.access_token}`,'Content-Type':'application/json'},
    ...(body?{body:JSON.stringify({version:body.version,requestId:body.requestId,command:body.command})}:{})});
  const result=await response.json();
  if(!response.ok)throw Object.assign(new Error(result.error||'Timing unavailable.'),{definitive:result.definitive===true,canManage:result.canManage===true,code:result.code});
  return result;
}
function AssignedPanel({initial,userId,binding,currentUser}) {
  const [controller]=useState(()=>{
    const key=userId+':'+(binding||'');
    const prior=recovery.get(key);
    if(prior?.controller.getSnapshot().pending){prior.context.current=currentUser;return prior.controller;}
    // Keep at most eight token-free operator contexts, never persist credentials.
    for(const [id,item] of recovery)if(!item.controller.getSnapshot().pending)recovery.delete(id);
    if(recovery.size>=8)throw new Error('Too many unresolved timing operators in this tab. Reconcile existing requests first.');
    const context={current:currentUser};
    const created=createTimingController({initial,transport:body=>request(body),
      getAuthorization:sessionId=>({userId:context.current.current?.userId,binding:context.current.current?.binding,assignment:{userId,...initial.assignments.find(a=>a.sessionId===sessionId)}})});
    recovery.set(key,{controller:created,context});return created;
  });
  const snapshot=useSyncExternalStore(controller.subscribe,controller.getSnapshot);
  const [now,setNow]=useState(Date.now());
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),250);return()=>clearInterval(timer);},[]);
  useEffect(()=>{const warn=e=>{if(controller.getSnapshot().pending){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[controller]);
  return <VolunteerTimerPanel connected sessions={snapshot.data.state.sessions} riders={snapshot.data.state.riders} previewActions={controller} busy={snapshot.busy} pending={!!snapshot.pending} message={snapshot.message} now={now}/>;
}
export default function VolunteerTimerRoute() {
  const {session,loading}=useSession();const {requestLogin}=useAuthGate();
  const currentUser=useRef(null);currentUser.current=session?{userId:session.user.id,binding:session.user.last_sign_in_at}:null;
  const [loaded,setLoaded]=useState(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
  useEffect(()=>{
    setLoaded(null);setError('');if(!session?.user.id)return;
    let active=true;const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),20000);
    request(undefined,controller.signal).then(data=>{if(active)setLoaded({userId:session.user.id,data});}).catch(e=>{if(active)setError({message:e.name==='AbortError'?'Loading took too long. Try again.':e.message,canManage:e.canManage===true,code:e.code});}).finally(()=>clearTimeout(timer));
    return()=>{active=false;clearTimeout(timer);controller.abort();};
  },[session?.user.id,attempt]);
  if(loading)return <main className="vt-panel">Checking login…</main>;
  if(!session)return <main className="vt-panel"><h1>Ridge volunteer timing</h1><p>Use your own assigned account.</p><button onClick={()=>requestLogin('login')}>Sign in</button><AuthGate/></main>;
  if(error)return <VolunteerTimerPanel connected message={error.message} canManage={error.canManage} onRefresh={()=>setAttempt(n=>n+1)}/>;
  if(!loaded || loaded.userId!==session.user.id)return <main className="vt-panel">Loading assigned sessions…</main>;
  return <AssignedPanel key={session.user.id+':'+session.user.last_sign_in_at} initial={loaded.data} userId={session.user.id} binding={session.user.last_sign_in_at} currentUser={currentUser}/>;
}
