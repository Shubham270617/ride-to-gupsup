import {useEffect,useRef,useState} from 'react';
import useSession from '../lib/useSession';
import {supabase} from '../lib/supabaseClient';
import AuthGate from '../components/AuthGate';
import {useAuthGate} from '../lib/AuthGateContext';
import QueuedVolunteerPanel from './QueuedVolunteerPanel';
import OwnerTimerPanel from './OwnerTimerPanel';
import VolunteerTimerPanel from './VolunteerTimerPanel';

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
function AssignedPanel({initial,userId,binding}) {
 const identity=JSON.stringify([userId,binding]);
 const checkIdentity=async()=>{const {data}=await supabase.auth.getSession();return JSON.stringify([data.session?.user.id,data.session?.user.last_sign_in_at]);};
 const bounded=async body=>{const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),20000);try{return await request(body,controller.signal);}finally{clearTimeout(timer);}};
 return <QueuedVolunteerPanel key={identity} initial={initial} identity={identity} checkIdentity={checkIdentity} read={()=>bounded()} write={body=>bounded({...body,userId,binding})}/>;
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
  if(!session)return <main className="vt-panel"><h1>Ridge volunteer timing</h1><p>Sign in with your existing owner or assigned volunteer account.</p><button onClick={()=>requestLogin('login')}>Sign in</button><AuthGate/></main>;
  if(error)return <VolunteerTimerPanel connected message={error.message} canManage={error.canManage} onRefresh={()=>setAttempt(n=>n+1)}/>;
  if(!loaded || loaded.userId!==session.user.id)return <main className="vt-panel">Loading assigned sessions…</main>;
  if(loaded.data.role==='owner')return <OwnerTimerPanel key={session.user.id+':'+session.user.last_sign_in_at}/>;
  return <AssignedPanel key={session.user.id+':'+session.user.last_sign_in_at} initial={loaded.data} userId={session.user.id} binding={session.user.last_sign_in_at} currentUser={currentUser}/>;
}
