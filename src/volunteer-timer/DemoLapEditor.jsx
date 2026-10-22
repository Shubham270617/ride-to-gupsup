import {useEffect,useRef,useState} from 'react';
import {formatDuration,lapDuration} from '../lib/ridge/engine';
const ist=value=>value==null?'':new Date(value+19800000).toISOString().slice(0,-1);
export default function DemoLapEditor({entry,lapIndex,name,sessionId,onSave,onClose,demoOnly=true}){
 const lap=entry.laps[lapIndex]||{},dialog=useRef(null);
 const [mode,setMode]=useState('timestamps'),[start,setStart]=useState(ist(lap.start)),[end,setEnd]=useState(ist(lap.end)),[duration,setDuration]=useState(formatDuration(lapDuration(lap))),[reason,setReason]=useState(''),[error,setError]=useState('');
 useEffect(()=>{const el=dialog.current;el.showModal();return()=>el.close();},[]);
 const save=async e=>{e.preventDefault();try{const result=await onSave({type:'correct_lap',sessionId,riderId:entry.riderId,lap:lapIndex+1,mode,start:start?start+'+05:30':'',end:end?end+'+05:30':'',duration,reason});if(result)onClose();else setError('Correction not saved. Check the error above and the date, times, duration and reason.');}catch(error){setError(error.message);}};
 return <dialog ref={dialog} className="vt-dialog" onCancel={onClose} aria-labelledby="demo-lap-title"><form onSubmit={save}>
 <h2 id="demo-lap-title">{name} · L{lapIndex+1}</h2><p>Times are IST. Recover a missing lap with verified start and finish times. A duration-only correction keeps the recorded timestamps.</p>{demoOnly && <p>DEMO only — no real results are updated.</p>}
 <label>Correction type<select value={mode} onChange={e=>setMode(e.target.value)}><option value="timestamps">Start and finish timestamps</option><option value="duration">Accepted lap duration only</option></select></label>
 {mode==='timestamps'?<><label>Start · IST<input type="datetime-local" step="0.001" required value={start} onChange={e=>setStart(e.target.value)}/></label><label>Finish · IST<input type="datetime-local" step="0.001" required value={end} onChange={e=>setEnd(e.target.value)}/></label></>:<label>Accepted lap duration<input required placeholder="21:09.250" value={duration} onChange={e=>setDuration(e.target.value)}/></label>}
 <label>Reason<input required maxLength={500} value={reason} onChange={e=>setReason(e.target.value)}/></label>{error&&<p role="alert">{error}</p>}<button type="button" onClick={onClose}>Cancel</button><button type="submit">Save and update results</button>
 </form></dialog>;
}
