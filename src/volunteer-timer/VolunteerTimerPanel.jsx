import { useState } from 'react';
import { formatDuration, lapDuration, istDate } from '../lib/ridge/engine';
import './volunteer-timer.css';
import DemoLapEditor from './DemoLapEditor';
import DemoRiderPhotos from './DemoRiderPhotos';

const tabs = ['Riders', 'Timer', 'Rider Photos', 'Data'];
const clock = value => {
  if(value==null)return '—';
  const iso=new Date(value+19800000).toISOString();
  return iso.slice(8,10)+'-'+iso.slice(5,7)+'-'+iso.slice(0,4)+' '+iso.slice(11,23);
};

// Presentation only. Deliberately no Supabase, admin transport, credentials,
// storage or write callbacks until a session-scoped server boundary is reviewed.
export default function VolunteerTimerPanel({ sessions = [], riders = [], previewActions = null, connected = false, busy = false, pending = false, message = '', canManage = false, onRefresh = null, demoActions = null, ownerActions = null, now = Date.now(), timingPaused = false, queuedCommands = [], managementPending = false }) {
  const controls=demoActions || ownerActions;
  const [editing,setEditing]=useState(null);
  const [newDate,setNewDate]=useState(''),[newMode,setNewMode]=useState('testing'),[newName,setNewName]=useState('');
  const [tab, setTab] = useState('Riders');
  const [sessionId, setSessionId] = useState('');
  const [selection, setSelection] = useState(null);
  const session = sessions.find(s => s.id === sessionId) || [...sessions].sort((a,b)=>b.date.localeCompare(a.date))[0];
  const attending = session?.entries || [];
  const name = id => riders.find(r => r.id === id)?.name || 'Unknown rider';
  const selected = selection || attending.map(e => e.riderId);
  const blocked = !previewActions || busy || pending || !session || session.finished || session.mode === 'archived';
  const wrongDate = connected && session && session.mode !== 'testing' && session.date !== istDate(now);
  const timingBlocked = blocked || wrongDate || timingPaused;
  const send = command => previewActions?.send({sessionId: session.id, ...command});
  return <main className="vt-panel">
    <h1>RTG RIDGE REPEATS</h1>
    <p className="vt-notice" role="status">{connected ? ownerActions ? 'Owner · native Ridge records' : 'Assigned-session attendance and timing only.' : previewActions ? 'DEMO · synthetic data only · changes reset on reload · no server writes.' : 'Interface review only · volunteer access and saving are not enabled.'} {message}</p>
    {pending && previewActions && <button disabled={busy} onClick={previewActions.retry}>Retry same action</button>}
    <nav aria-label="Timer steps">{tabs.map((item, i) => <button key={item}
      aria-pressed={tab === item} onClick={() => setTab(item)}>{i + 1} · {item}</button>)}</nav>
    {tab === 'Riders' && <p className="vt-instructions">Choose who is present this session, then save. Riders with recorded laps stay selected.</p>}
    {tab !== 'Rider Photos' && <label className="vt-session"><span className="vt-sr-only">Session</span><select disabled={busy || pending || !sessions.length} value={session?.id || ''} onChange={e => {setSessionId(e.target.value);setSelection(null);}}>
      {!sessions.length && <option value="">{ownerActions ? "No sessions yet" : "No assigned sessions"}</option>}
      {sessions.map(s => <option key={s.id} value={s.id}>RR {s.date}</option>)}
    </select></label>}
    {session && tab !== 'Rider Photos' && <p>SESSION MODE: {session.mode === 'live' ? demoActions ? 'LIVE · DEMO ONLY — nothing is published' : 'LIVE · PUBLIC — saved timing updates the leaderboard' : session.mode === 'testing' ? 'TESTING · PRIVATE' : 'ARCHIVED'}{session.finished ? ' · FINISHED' : ''}</p>}
    {tab === 'Riders' && <section aria-label="Attendance">
      <div className="vt-create-row" title="Session creation is owner-only"><input aria-label="New session date" type="date" disabled={!controls || busy || pending || managementPending} value={newDate} onChange={e=>setNewDate(e.target.value)}/><select aria-label="New session mode" disabled={!controls || busy || pending} value={newMode} onChange={e=>setNewMode(e.target.value)}><option value="testing">Testing · private</option>{demoActions && <option value="live">Live · public (demo only)</option>}</select><button disabled={!controls || busy || pending || !newDate} onClick={async()=>{const id=await controls.createSession(newDate,newMode);if(id){setSessionId(id);setSelection(null);}}}>Create session</button></div>
      <div className="vt-add-row" title="Rider management is owner-only"><input aria-label="New rider name" placeholder="New rider name" disabled={!controls || busy || pending} value={newName} onChange={e=>setNewName(e.target.value)}/><button disabled={!controls || busy || pending || !newName.trim()} onClick={async()=>{if(await controls.addRider(newName))setNewName('');}}>Add rider</button></div>
      {!session && <p className="vt-empty">{ownerActions ? "No session yet. Pick a date above and press Create session, then choose it in the list at the top. Add riders with Add rider." : "No roster is loaded. Ask the owner to assign an open session to your account, then refresh. No timing can be recorded until a session is assigned."}</p>}
      <div className="vt-roster-grid">{riders.map(rider => <label className="vt-roster" key={rider.id}><input type="checkbox" disabled={blocked || attending.some(e => e.riderId === rider.id && (e.officialScore || e.laps.some(lap => lap.start != null || lapDuration(lap))))} checked={selected.includes(rider.id)} onChange={e => setSelection(e.target.checked ? [...selected, rider.id] : selected.filter(id => id !== rider.id))}/><span className="vt-avatar" aria-hidden="true">{rider.name.trim().split(/\s+/).slice(0,2).map(p=>p[0]).join('')}</span><strong>{rider.name}</strong></label>)}</div>
      <button disabled={blocked || managementPending} onClick={() => send({type:'attendance',riderIds:selected})}>Save attendance</button><button onClick={() => setTab('Timer')}>Go to timer</button>
    </section>}
    {tab === 'Timer' && <section aria-label="Lap timing">
      {wrongDate && <p role="alert">Timing is unavailable: this session is dated {session.date}, but today in India is {istDate(now)}. Select today's session to time now, or use this session on its date. Attendance remains saved.</p>}
      {message && <p role="status">{message}</p>}
      <button disabled={timingBlocked || !attending.length || attending.some(e => e.laps.length || e.officialScore)} onClick={() => send({type:'group_start',at:Date.now()})}>Start all · Lap 1</button>
      <div className="vt-cards">{attending.map(entry => {
        // Historical official results are never offered as resumable timers.
        const locked = session.finished || session.mode === 'archived' || !!entry.officialScore;
        const index = entry.laps.findIndex(lap => !lapDuration(lap));
        const next = index < 0 ? entry.laps.length : index;
        const running = entry.laps[next]?.start != null && !lapDuration(entry.laps[next]);
        return <article key={entry.riderId}>{demoActions?.photos[entry.riderId] && <img className="vt-timer-photo" src={demoActions.photos[entry.riderId]} alt=""/>}<h2>{name(entry.riderId)}</h2>{queuedCommands.some(c=>c.type==='group_start'||c.riderId===entry.riderId)&&<p role="status">Pending save</p>}
          <p>{locked ? 'Locked timing record' : next >= 5 ? '5 loops complete' : `${running ? 'Running' : 'Ready'} L${next + 1}`}</p>
          {running && !locked && <p>{formatDuration(now - entry.laps[next].start) || '0:00.000'}</p>}
          {!locked && next < 5 && <><button disabled={timingBlocked} onClick={() => send({type:running ? 'end' : 'start',riderId:entry.riderId,lap:next+1,at:Date.now()})}>{running ? 'FINISH' : 'START'} · L{next + 1}</button>{running && next < 4 && <button disabled={timingBlocked} onClick={() => send({type:'pass',riderId:entry.riderId,lap:next+1,at:Date.now()})}>Pass → L{next + 2}</button>}</>}
        </article>;
      })}</div>
      {!attending.length && <p>No riders recorded for this session.</p>}
      <button className="vt-finish" disabled={!controls || busy || pending || !session || session.finished} onClick={()=>controls.finishSession(session.id)}>■ FINISH SESSION</button>
      <p>{demoActions ? 'Demo closing affects this page only.' : 'Session closing is owner-only. Volunteers can record attendance and laps.'}</p>
    </section>}
    {tab === 'Rider Photos' && (demoActions ? <DemoRiderPhotos riders={riders} photos={demoActions.photos} onPhoto={demoActions.setPhoto}/> : <section><h2>Rider Photos</h2>
      <p>Profile photo management requires separate permission. Spotlight and Achievement photos remain separate.</p>
      <p>Photo uploads are owner-only; volunteer timing does not change rider photos.</p></section>)}
    {tab === 'Data' && <section><h2>Lap timing records · Admin</h2>
      <p>Start and finish are recorded clock times in IST. Recorded duration comes from those timestamps; accepted duration includes any admin correction. Historical records without timestamps show —.</p>{controls && <button disabled={busy || pending} onClick={controls.refresh}>Refresh</button>}<button disabled title={demoActions?"Demo has no server results update":"Native results update atomically with saved timing"}>Retry results update</button>
      <div className="vt-table"><table><caption>Session timing records</caption><thead><tr>{['Rider','Lap','Start · IST','Finish · IST','Recorded duration','Accepted duration','Status','Edit'].map(h => <th key={h} scope="col">{h}</th>)}</tr></thead>
        <tbody>{attending.flatMap(entry => Array.from({length:5},(_,i)=>entry.laps[i]||{}).map((lap, i) => <tr key={`${entry.riderId}-${i}`}>
          <th scope="row">{name(entry.riderId)}</th><td>{i + 1}</td><td>{clock(lap.start)}</td><td>{clock(lap.end)}</td>
          <td>{lap.start != null && lap.end != null ? formatDuration(lap.end - lap.start) : '—'}</td><td>{formatDuration(lapDuration(lap)) || '—'}</td><td>{lap.durationMs!=null?'Duration corrected':lap.end!=null?'Recorded':lap.start!=null?'Running':'Not started'}</td><td><button disabled={!controls || busy || pending || !!entry.officialScore} aria-label={`Edit ${name(entry.riderId)} L${i+1}`} onClick={()=>setEditing({entry,lapIndex:i})}>Edit</button></td>
        </tr>))}</tbody></table></div></section>}
    {editing && controls && <DemoLapEditor demoOnly={!!demoActions} key={`${session.id}-${editing.entry.riderId}-${editing.lapIndex}`} {...editing} name={name(editing.entry.riderId)} sessionId={session.id} onSave={controls.correct} onClose={()=>setEditing(null)}/>}
    <aside className="vt-session-status"><strong>{session ? 'Session selected' : 'Select an assigned session to see its status.'}</strong>
      {onRefresh && <button onClick={onRefresh}>Refresh assigned sessions</button>}
      <details><summary>Advanced session settings</summary><p>Session creation, rider management, corrections, photos and closing are owner-only.</p>
      {canManage && <p><a href="/admin/ridge">Owner session controls</a> · <a href="/admin/ridge-volunteers">Volunteer assignments</a></p>}</details>
    </aside>
    <footer>Admin access and timing/correction actions are logged for accountability.</footer>
  </main>;
}
