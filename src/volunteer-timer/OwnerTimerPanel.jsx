import {useEffect,useMemo,useRef,useState} from 'react';
import {supabase} from '../lib/supabaseClient';
import {createRidgeRequest} from '../lib/ridge/request';
import {createTimingQueue} from '../lib/ridge/timingQueue';
import VolunteerTimerPanel from './VolunteerTimerPanel';

// Reuses the existing admin API and its login-bound recovery. No assignment,
// additional privilege, or alternate database writer is created for an owner.
export default function OwnerTimerPanel({requestTransport}){
 const request=useMemo(()=>requestTransport||createRidgeRequest({getSession:()=>supabase.auth.getSession()}),[requestTransport]);
 const [data,setData]=useState(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('Loading Ridge records…'),[pending,setPending]=useState(null),[now,setNow]=useState(Date.now());
 const queue=useRef(null),[queued,setQueued]=useState({pending:0,paused:false,commands:[]});
 const current=useRef(null),flight=useRef(false),mounted=useRef(false),controller=useRef(null),uncertain=useRef(null),readSequence=useRef(0);
 const refresh=async()=>{
  const sequence=++readSequence.current;
  try{const next=await request(undefined,controller.current?.signal);if(!mounted.current||sequence!==readSequence.current)return null;current.current=next;setData(next);uncertain.current=next.recovery?.body||null;setPending(next.recovery||null);queue.current?.replace(next);if(!queue.current&&request.identity){const identity=await request.identity();if(!mounted.current)return null;queue.current=createTimingQueue({identity,initial:next,read:()=>request(),write:(body,options)=>request(body,undefined,options),checkIdentity:request.identity,restore:request.restorePending,notify:snapshot=>{if(mounted.current){setData({state:snapshot.state,version:snapshot.version});setQueued(snapshot);setMessage(snapshot.message);current.current={state:snapshot.state,version:snapshot.version};}}});if(queue.current.pending){uncertain.current=null;setPending(null);}queue.current.snapshot();}
  setMessage(next.recovery?'An earlier action needs reconciliation. Do not enter it again.':'Ridge records loaded.');return next;}catch(e){if(mounted.current&&sequence===readSequence.current)setMessage(e.message);return null;}
 };
 useEffect(()=>{mounted.current=true;controller.current=new AbortController();refresh();const timer=setInterval(()=>setNow(Date.now()),250);const warn=e=>{if(uncertain.current||queue.current?.pending){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>{mounted.current=false;queue.current?.stop();queue.current=null;++readSequence.current;controller.current?.abort();clearInterval(timer);window.removeEventListener('beforeunload',warn);};},[request]); // eslint-disable-line react-hooks/exhaustive-deps
 const send=async(command,retry=false)=>{
  if(!pending&&!uncertain.current&&['group_start','start','pass','end'].includes(command?.type)&&queue.current){try{queue.current.enqueue(command);}catch(e){setMessage(e.message);}return null;}
  if(queue.current?.pending){setMessage('Wait for pending taps to save before changing session settings.');return null;}
  if(flight.current||!current.current)return null;
  if(uncertain.current&&!retry){setMessage('Retry the unconfirmed action before another change.');return null;}
  if(pending&&!uncertain.current){setMessage('Recovery needs owner reconciliation before further changes.');return null;}
  const body=retry?uncertain.current:{version:current.current.version,requestId:crypto.randomUUID(),command};if(!body)return null;
  flight.current=true;setBusy(true);uncertain.current=body;setPending({body});++readSequence.current;
  try{await request(body,controller.current?.signal,{retry});if(!mounted.current)return null;uncertain.current=null;setPending(null);const next=await refresh();if(!next){setMessage('Saved on the server. Refresh before further changes.');}else if(queue.current){queue.current.stop();queue.current=null;await refresh();}return next;}catch(e){if(mounted.current){if(!e.uncertain){uncertain.current=null;setPending(null);}setMessage(e.message);}return null;}finally{flight.current=false;if(mounted.current)setBusy(false);}
 };
 const controls={
  refresh:()=>{if(!flight.current&&!uncertain.current&&!queue.current?.pending)return refresh();},
  addRider:name=>send({type:'create_rider',name}),
  createSession:async date=>{const next=await send({type:'create_session',date});return next?.state.sessions.find(s=>s.date===date&&s.mode!=='archived')?.id;},
  finishSession:sessionId=>send({type:'finish_session',sessionId,reason:'Owner finished session from standalone timer'}),
  correct:send,
 };
 return <>{queued.paused&&<button onClick={()=>queue.current?.resume()}>Reconcile queued taps</button>}<VolunteerTimerPanel connected canManage sessions={data?.state.sessions||[]} riders={data?.state.riders||[]} ownerActions={controls} previewActions={data?{send,retry:()=>send(null,true)}:null} busy={busy||!data} pending={!!pending} timingPaused={queued.paused} queuedCommands={queued.commands} managementPending={queued.pending>0} message={message} now={now} onRefresh={()=>{if(!flight.current&&!queue.current?.pending)refresh();}}/>{pending&&!uncertain.current&&<p role="alert">Recovery expired or cannot be retried here. <a href="/admin/ridge-volunteers">Reconcile the request with owner controls</a>.</p>}</>;
}
