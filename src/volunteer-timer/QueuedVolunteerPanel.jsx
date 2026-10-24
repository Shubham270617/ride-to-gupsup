import {useEffect,useRef,useState} from 'react';
import {createTimingQueue} from '../lib/ridge/timingQueue';
import {assertTimingAssignment} from './timingController';
import VolunteerTimerPanel from './VolunteerTimerPanel';

// Taps are queued in the browser and saved in order, so timing carries on
// through a dropped connection and survives a reload (or, with localStorage,
// closing the tab).
export default function QueuedVolunteerPanel({initial,identity,read,write,checkIdentity,restore,storage,existingPending=false,onExit,canFinishRiders=false,canAddRiders=false,exitLabel='End code session'}){
 const [view,setView]=useState({state:initial.state,version:initial.version,pending:0,paused:existingPending,commands:[],message:existingPending?'An earlier request requires reconciliation before new timing.':'Records loaded.'});
 const [now,setNow]=useState(Date.now());const legacyPending=useRef(existingPending),queue=useRef(null),mounted=useRef(false),latest=useRef(initial),operations=useRef({read,write,checkIdentity,restore});operations.current={read,write,checkIdentity,restore};
 useEffect(()=>{mounted.current=true;
  try{queue.current=createTimingQueue({identity,initial,storage,recovered:initial.pending,read:async()=>{const data=await operations.current.read();latest.current=data;return data;},write:async(body,options)=>{const saved=await operations.current.write(body,options);if(saved?.state)latest.current=saved;return saved;},checkIdentity:()=>operations.current.checkIdentity(),restore:body=>operations.current.restore?.(body),validate:command=>{const assignment=latest.current.assignments?.find(a=>a.sessionId===command.sessionId);assertTimingAssignment({userId:identity,assignment:assignment?{...assignment,userId:identity}:null,command});},notify:snapshot=>{if(mounted.current)setView(snapshot);}});if(queue.current.pending)legacyPending.current=false;queue.current.snapshot();}catch(error){setView(v=>({...v,paused:true,message:error.message}));}
  const timer=setInterval(()=>setNow(Date.now()),250),warn=e=>{if(queue.current?.pending){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>{mounted.current=false;queue.current?.stop();queue.current=null;clearInterval(timer);window.removeEventListener('beforeunload',warn);};
 },[identity]); // eslint-disable-line react-hooks/exhaustive-deps
 const send=command=>{if(legacyPending.current&&!queue.current?.pending){setView(v=>({...v,paused:true,message:'Reconcile the earlier request before new timing.'}));return;}try{queue.current?.enqueue(command);}catch(error){setView(v=>({...v,message:error.message}));}};
 return <VolunteerTimerPanel connected sessions={view.state.sessions} riders={view.state.riders} previewActions={{send}} timingPaused={view.paused||legacyPending.current&&!view.pending} queuedCommands={view.commands} managementPending={view.pending>0} message={view.message} now={now} canFinishRiders={canFinishRiders} canAddRiders={canAddRiders} volunteerName={initial.volunteerName||''}>{view.paused&&view.pending>0&&<button className="vt-btn vt-btn-warn" onClick={()=>queue.current?.resume()}>Reconcile queued taps</button>}{onExit&&<button className="vt-btn vt-btn-ghost" disabled={view.pending>0} onClick={onExit}>{exitLabel}</button>}</VolunteerTimerPanel>;
}
