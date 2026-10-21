import {useEffect,useRef,useState} from 'react';
import {applyRidgeCommand} from '../lib/ridge/engine';
import VolunteerTimerPanel from './VolunteerTimerPanel';

// Public demonstration only: no transport, credentials, storage, or real data.
export default function VolunteerTimerDemo(){
 const [state,setState]=useState(()=>({schemaVersion:1,riders:[{id:'demo-a',name:'Example rider A'},{id:'demo-b',name:'Example rider B'}],sessions:[{id:'demo-session',date:new Date(Date.now()+19800000).toISOString().slice(0,10),mode:'testing',finished:false,entries:[],awardOverrides:[]}]}));
 const current=useRef(state);current.current=state;
 const [photos,setPhotos]=useState({});const photoUrls=useRef({});
 useEffect(()=>()=>{Object.values(photoUrls.current).forEach(url=>URL.revokeObjectURL(url));},[]);
 const setPhoto=(id,file)=>{if(photoUrls.current[id])URL.revokeObjectURL(photoUrls.current[id]);photoUrls.current={...photoUrls.current,[id]:URL.createObjectURL(file)};setPhotos(photoUrls.current);};
 const [message,setMessage]=useState(''),[now,setNow]=useState(Date.now());
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),250);return()=>clearInterval(timer);},[]);
 const apply=(command,throwError=false)=>{try{const next=applyRidgeCommand(current.current,command).state;current.current=next;setState(next);setMessage('Saved in this demo only.');return next;}catch(e){setMessage(e.message);if(throwError)throw e;return null;}};
 const demoActions={correct:command=>apply(command,true),setPhoto,photos,refresh:()=>setMessage('Local demo records refreshed. No server request.'),
  addRider:name=>!!apply({type:'create_rider',name}),
  createSession:(date,mode)=>{const next=apply({type:'create_session',date});if(!next)return null;const id=next.sessions.at(-1).id;if(mode==='live')apply({type:'session_mode',sessionId:id,mode,reason:'Synthetic demo mode'});return id;},
  finishSession:sessionId=>apply({type:'finish_session',sessionId,reason:'Synthetic demo close'}),
 };
 return <VolunteerTimerPanel sessions={state.sessions} riders={state.riders} previewActions={{send:apply}} demoActions={demoActions} now={now} message={message}/>;
}
