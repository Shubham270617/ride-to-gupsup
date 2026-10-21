import {useEffect,useMemo,useRef,useState} from 'react';
import {supabase} from '../lib/supabaseClient';
import {createRidgeRequest} from '../lib/ridge/request';
import VolunteerTimerPanel from './VolunteerTimerPanel';

// Reuses the existing admin API and its login-bound recovery. No assignment,
// additional privilege, or alternate database writer is created for an owner.
export default function OwnerTimerPanel({requestTransport}){
 const request=useMemo(()=>requestTransport||createRidgeRequest({getSession:()=>supabase.auth.getSession()}),[requestTransport]);
 const [data,setData]=useState(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('Loading Ridge records…'),[pending,setPending]=useState(null),[now,setNow]=useState(Date.now());
 const current=useRef(null),flight=useRef(false),mounted=useRef(false),controller=useRef(null),uncertain=useRef(null),readSequence=useRef(0);
 const refresh=async()=>{
  const sequence=++readSequence.current;
  try{const next=await request(undefined,controller.current?.signal);if(!mounted.current||sequence!==readSequence.current)return null;current.current=next;setData(next);uncertain.current=next.recovery?.body||null;setPending(next.recovery||null);setMessage(next.recovery?'An earlier action needs reconciliation. Do not enter it again.':'Ridge records loaded.');return next;}catch(e){if(mounted.current&&sequence===readSequence.current)setMessage(e.message);return null;}
 };
 useEffect(()=>{mounted.current=true;controller.current=new AbortController();refresh();const timer=setInterval(()=>setNow(Date.now()),250);const warn=e=>{if(uncertain.current){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>{mounted.current=false;++readSequence.current;controller.current?.abort();clearInterval(timer);window.removeEventListener('beforeunload',warn);};},[request]); // eslint-disable-line react-hooks/exhaustive-deps
 const send=async(command,retry=false)=>{
  if(flight.current||!current.current)return null;
  if(uncertain.current&&!retry){setMessage('Retry the unconfirmed action before another change.');return null;}
  if(pending&&!uncertain.current){setMessage('Recovery needs owner reconciliation before further changes.');return null;}
  const body=retry?uncertain.current:{version:current.current.version,requestId:crypto.randomUUID(),command};if(!body)return null;
  flight.current=true;setBusy(true);uncertain.current=body;setPending({body});++readSequence.current;
  try{await request(body,controller.current?.signal,{retry});if(!mounted.current)return null;uncertain.current=null;setPending(null);const next=await refresh();if(!next){current.current=null;setData(null);setMessage('Saved on the server. Refresh before further changes.');}return next;}catch(e){if(mounted.current){if(!e.uncertain){uncertain.current=null;setPending(null);}setMessage(e.message);}return null;}finally{flight.current=false;if(mounted.current)setBusy(false);}
 };
 const controls={
  refresh:()=>{if(!flight.current&&!uncertain.current)return refresh();},
  addRider:name=>send({type:'create_rider',name}),
  createSession:async date=>{const next=await send({type:'create_session',date});return next?.state.sessions.find(s=>s.date===date&&s.mode!=='archived')?.id;},
  finishSession:sessionId=>send({type:'finish_session',sessionId,reason:'Owner finished session from standalone timer'}),
  correct:send,
 };
 return <><VolunteerTimerPanel connected canManage sessions={data?.state.sessions||[]} riders={data?.state.riders||[]} ownerActions={controls} previewActions={data?{send,retry:()=>send(null,true)}:null} busy={busy||!data} pending={!!pending} message={message} now={now} onRefresh={()=>{if(!flight.current)refresh();}}/>{pending&&!uncertain.current&&<p role="alert">Recovery expired or cannot be retried here. <a href="/admin/ridge-volunteers">Reconcile the request with owner controls</a>.</p>}</>;
}
