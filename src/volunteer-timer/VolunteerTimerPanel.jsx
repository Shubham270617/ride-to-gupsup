import { useState } from 'react';
import { formatDuration, lapDuration, istDate } from '../lib/ridge/engine';
import './volunteer-timer.css';
import DemoLapEditor from './DemoLapEditor';
import DemoRiderPhotos from './DemoRiderPhotos';

// The Ridge Repeats timer: owner code, volunteer code, volunteer account,
// admin and demo all render this one page. Laid out as four plain-language
// steps so someone who has never seen it can run a session:
//   1 Riders    pick the session, tick who is riding, save
//   2 Timer     start, pass and finish each lap
//   3 Photos    rider photos
//   4 Lap times every recorded time, with corrections
const STEPS = [
  { key: 'Riders', label: 'Riders', hint: "Who's riding" },
  { key: 'Timer', label: 'Timer', hint: 'Time the laps' },
  { key: 'Rider Photos', label: 'Photos', hint: 'Rider photos' },
  { key: 'Data', label: 'Lap times', hint: 'Check & fix' },
];
const LAPS = 5;
const clock = value => {
  if(value==null)return '—';
  const iso=new Date(value+19800000).toISOString();
  return iso.slice(8,10)+'-'+iso.slice(5,7)+'-'+iso.slice(0,4)+' '+iso.slice(11,23);
};
const initials = name => name.trim().split(/\s+/).slice(0,2).map(p=>p[0]).join('').toUpperCase();
const niceDate = date => {
  const d = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? date : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
};
const MODE = {
  testing: { label: 'Testing', note: 'Private — not shown on the website' },
  live: { label: 'Live', note: 'Public — saved times update the website' },
  archived: { label: 'Archived', note: 'Kept for the record — no more timing' },
};

export default function VolunteerTimerPanel({ sessions = [], riders = [], previewActions = null, connected = false, busy = false, pending = false, message = '', canManage = false, onRefresh = null, demoActions = null, ownerActions = null, now = Date.now(), timingPaused = false, queuedCommands = [], managementPending = false, children = null }) {
  const controls=demoActions || ownerActions;
  const [editing,setEditing]=useState(null);
  const [newDate,setNewDate]=useState(()=>istDate(now)),[newMode,setNewMode]=useState('testing'),[newName,setNewName]=useState('');
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
  const role = !connected
    ? previewActions ? 'Demo — practice freely, nothing is saved' : 'Preview — saving is switched off'
    : ownerActions ? 'Owner — you can set up and time sessions' : 'Volunteer — mark who is here and time their laps';
  const mode = session ? MODE[session.mode] || MODE.testing : null;
  const lockedEntry = entry => entry.officialScore || entry.laps.some(lap => lap.start != null || lapDuration(lap));

  return <main className="vt-panel">
    <header className="vt-hero">
      <p className="vt-eyebrow">RTG · Ridge Repeats</p>
      <h1>Ridge Repeats Timer</h1>
      <p className="vt-status" role="status"><span className="vt-role">{role}</span>{message && <span className="vt-message" key={message}>{message}</span>}</p>
      {pending && previewActions && <button className="vt-btn vt-btn-warn" disabled={busy} onClick={previewActions.retry}>Retry same action</button>}
    </header>

    <nav className="vt-steps" aria-label="Timer steps">{STEPS.map((step, i) => {
      const active = tab === step.key;
      return <button key={step.key} aria-label={`${i + 1} · ${step.label}`} aria-pressed={active} onClick={() => setTab(step.key)} className={active ? 'is-active' : ''}>
        <span className="vt-step-num" aria-hidden="true">{i + 1}</span>
        <span className="vt-step-text"><b>{step.label}</b><small>{step.hint}</small></span>
      </button>;
    })}</nav>

    {tab !== 'Rider Photos' && <section className="vt-card vt-session-card">
      <div className="vt-row-between">
        <label className="vt-field vt-grow"><span>Session</span>
          <select disabled={busy || pending || !sessions.length} value={session?.id || ''} onChange={e => {setSessionId(e.target.value);setSelection(null);}}>
            {!sessions.length && <option value="">{ownerActions ? 'No sessions yet — create one below' : 'No session assigned yet'}</option>}
            {sessions.map(s => <option key={s.id} value={s.id}>{niceDate(s.date)} · {(MODE[s.mode] || MODE.testing).label}{s.finished ? ' · finished' : ''}</option>)}
          </select>
        </label>
        {onRefresh && <button className="vt-btn vt-btn-ghost" onClick={onRefresh}><span aria-hidden="true">↻</span> Refresh sessions</button>}
      </div>
      {session && <p className={`vt-mode vt-mode-${session.mode}`}><span className="vt-dot" aria-hidden="true" />{mode.label}{session.finished ? ' · Finished' : ''} <small>{demoActions && session.mode === 'live' ? 'Demo only — nothing is published' : mode.note}</small></p>}
      {!session && !controls && <p className="vt-empty">No session yet. Ask the owner to give you a code or session for today, then press Refresh.</p>}
      {tab === 'Riders' && controls && <details className="vt-new" open={!sessions.length}>
        <summary><span aria-hidden="true">＋</span> Start a new session</summary>
        <div className="vt-inline">
          <input aria-label="New session date" type="date" disabled={busy || pending || managementPending} value={newDate} onChange={e=>setNewDate(e.target.value)}/>
          {demoActions && <select aria-label="New session mode" disabled={busy || pending} value={newMode} onChange={e=>setNewMode(e.target.value)}><option value="testing">Testing · private</option><option value="live">Live · public (demo only)</option></select>}
          <button className="vt-btn vt-btn-primary" disabled={busy || pending || !newDate} onClick={async()=>{const id=await controls.createSession(newDate,newMode);if(id){setSessionId(id);setSelection(null);}}}>Create session</button>
        </div>
        <small>New sessions start as <b>Testing</b> (private). Publish them from Admin → Ridge — Session control when results are ready.</small>
      </details>}
    </section>}

    <div className="vt-stage" key={tab}>
    {tab === 'Riders' && <section aria-label="Attendance" className="vt-card">
      <h2>Who is riding today?</h2>
      <p className="vt-help">Tap each rider who is here, then press <b>Save attendance</b>. Riders who already have lap times stay ticked.</p>
      {controls && <div className="vt-inline vt-add">
        <input aria-label="New rider name" placeholder="Add a new rider — type their name" disabled={busy || pending} value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={async e=>{if(e.key==='Enter'&&newName.trim()&&!busy&&!pending){if(await controls.addRider(newName))setNewName('');}}}/>
        <button className="vt-btn" disabled={busy || pending || !newName.trim()} onClick={async()=>{if(await controls.addRider(newName))setNewName('');}}>Add rider</button>
      </div>}
      {!riders.length && <p className="vt-empty">No riders yet.{controls ? ' Type a name above and press Add rider.' : ''}</p>}
      <div className="vt-riders">{riders.map((rider, i) => {
        const checked = selected.includes(rider.id);
        return <label className={`vt-rider${checked ? ' is-on' : ''}`} key={rider.id} style={{ '--i': i }}>
          <input type="checkbox" disabled={blocked || attending.some(e => e.riderId === rider.id && lockedEntry(e))} checked={checked} onChange={e => setSelection(e.target.checked ? [...selected, rider.id] : selected.filter(id => id !== rider.id))}/>
          <span className="vt-avatar" aria-hidden="true">{initials(rider.name)}</span>
          <strong>{rider.name}</strong>
          <span className="vt-tick" aria-hidden="true">✓</span>
        </label>;
      })}</div>
      <div className="vt-actions">
        <button className="vt-btn vt-btn-primary" disabled={blocked || managementPending} onClick={() => send({type:'attendance',riderIds:selected})}>Save attendance</button>
        <button className="vt-btn" onClick={() => setTab('Timer')}>Go to timer <span aria-hidden="true">→</span></button>
      </div>
      {!previewActions && session && <p className="vt-help">This code can set up riders and sessions. Attendance and lap timing need a code that allows timing.</p>}
    </section>}

    {tab === 'Timer' && <section aria-label="Lap timing" className="vt-card">
      <h2>Time the laps</h2>
      <p className="vt-help">Press <b>Start all</b> when the group sets off. On each lap press <b>Pass</b>; on the last lap press <b>Finish</b>. Every tap is saved with the exact time.</p>
      {wrongDate && <p className="vt-alert" role="alert">Timing is unavailable: this session is dated {session.date}, but today in India is {istDate(now)}. Pick today's session to time now. Attendance stays saved.</p>}
      <button className="vt-btn vt-btn-primary vt-btn-big" disabled={timingBlocked || !attending.length || attending.some(e => e.laps.length || e.officialScore)} onClick={() => send({type:'group_start',at:Date.now()})}><span aria-hidden="true">▶</span> Start all · Lap 1</button>
      <div className="vt-cards">{attending.map((entry, i) => {
        // Historical official results are never offered as resumable timers.
        const locked = session.finished || session.mode === 'archived' || !!entry.officialScore;
        const index = entry.laps.findIndex(lap => !lapDuration(lap));
        const next = index < 0 ? entry.laps.length : index;
        const running = entry.laps[next]?.start != null && !lapDuration(entry.laps[next]);
        const photo = demoActions?.photos[entry.riderId] || riders.find(r => r.id === entry.riderId)?.photo;
        return <article key={entry.riderId} className={`vt-timer${running ? ' is-running' : ''}${locked ? ' is-locked' : ''}`} style={{ '--i': i }}>
          <div className="vt-timer-head">
            {photo ? <img className="vt-timer-photo" src={photo} alt=""/> : <span className="vt-avatar" aria-hidden="true">{initials(name(entry.riderId))}</span>}
            <h3>{name(entry.riderId)}</h3>
            {queuedCommands.some(c=>c.type==='group_start'||c.riderId===entry.riderId)&&<span className="vt-badge" role="status">Pending save</span>}
          </div>
          <ol className="vt-laps" aria-label="Laps">{Array.from({length:LAPS},(_,l)=>{const lap=entry.laps[l];const done=lap&&lapDuration(lap);return <li key={l} className={done?'is-done':l===next&&running?'is-now':''}>{done?formatDuration(lapDuration(lap)):`L${l+1}`}</li>;})}</ol>
          <p className="vt-timer-state">{locked ? 'Locked timing record' : next >= LAPS ? `${LAPS} loops complete` : `${running ? 'Running' : 'Ready'} L${next + 1}`}</p>
          {running && !locked && <p className="vt-clock">{formatDuration(now - entry.laps[next].start) || '0:00.000'}</p>}
          {!locked && next < LAPS && <div className="vt-timer-btns">
            {running && next < LAPS - 1 && <button className="vt-btn vt-btn-go" disabled={timingBlocked} onClick={() => send({type:'pass',riderId:entry.riderId,lap:next+1,at:Date.now()})}>Pass → L{next + 2}</button>}
            <button className={`vt-btn ${running ? 'vt-btn-stop' : 'vt-btn-go'}`} disabled={timingBlocked} onClick={() => send({type:running ? 'end' : 'start',riderId:entry.riderId,lap:next+1,at:Date.now()})}>{running ? 'FINISH' : 'START'} · L{next + 1}</button>
          </div>}
        </article>;
      })}</div>
      {!attending.length && <p className="vt-empty">No riders in this session yet. Go to <b>1 · Riders</b>, tick who is here and save.</p>}
      {controls && <div className="vt-finish-box">
        <button className="vt-btn vt-btn-danger" disabled={busy || pending || !session || session.finished} onClick={()=>controls.finishSession(session.id)}>Finish session</button>
        <small>{demoActions ? 'Demo only — this resets on reload.' : 'Locks every time in this session. You can reopen it from Admin → Ridge — Session control.'}</small>
      </div>}
    </section>}

    {tab === 'Rider Photos' && (demoActions ? <DemoRiderPhotos riders={riders} photos={demoActions.photos} onPhoto={demoActions.setPhoto}/> : <section className="vt-card">
      <h2>Rider photos</h2>
      <p className="vt-help">Rider photos are added by the owner in Admin → Ridge — Session control → Riders. Timing never changes them.</p></section>)}

    {tab === 'Data' && <section className="vt-card">
      <div className="vt-row-between"><h2>Lap times</h2>{controls && <button className="vt-btn vt-btn-ghost" disabled={busy || pending} onClick={controls.refresh}><span aria-hidden="true">↻</span> Refresh</button>}</div>
      <p className="vt-help">Every lap that was timed, in India time. If a time is wrong, press <b>Edit</b> on that lap{controls ? '' : ' (owner only)'}. “Accepted” is the time that counts.</p>
      <div className="vt-table"><table><caption className="vt-sr-only">Session timing records</caption><thead><tr>{['Rider','Lap','Start · IST','Finish · IST','Recorded duration','Accepted duration','Status','Edit'].map(h => <th key={h} scope="col">{h}</th>)}</tr></thead>
        <tbody>{attending.flatMap(entry => [...Array.from({length:Math.max(1,Math.min(LAPS,entry.laps.length))},(_,i)=>entry.laps[i]||{}).map((lap, i) => <tr key={`${entry.riderId}-${i}`}>
          <th scope="row">{name(entry.riderId)}</th><td>{i + 1}</td><td>{clock(lap.start)}</td><td>{clock(lap.end)}</td>
          <td>{lap.start != null && lap.end != null ? formatDuration(lap.end - lap.start) : '—'}</td><td>{formatDuration(lapDuration(lap)) || '—'}</td><td><span className={`vt-pill vt-pill-${lap.durationMs!=null?'fix':lap.end!=null?'ok':lap.start!=null?'run':'none'}`}>{lap.durationMs!=null?'Duration corrected':lap.end!=null?'Recorded':lap.start!=null?'Running':'Not started'}</span></td><td><button className="vt-btn vt-btn-small" disabled={!controls || busy || pending || !!entry.officialScore} aria-label={`Edit ${name(entry.riderId)} L${i+1}`} onClick={()=>setEditing({entry,lapIndex:i})}>Edit</button></td>
        </tr>),
        // Only laps that were recorded are listed; a lap that was missed can be added here.
        controls && !entry.officialScore && entry.laps.length >= 1 && entry.laps.length < LAPS && <tr key={`${entry.riderId}-add`} className="vt-add-lap"><td colSpan={8}><button className="vt-btn vt-btn-small vt-btn-ghost" disabled={busy || pending} onClick={()=>setEditing({entry,lapIndex:entry.laps.length})}>+ Add lap {entry.laps.length + 1} time for {name(entry.riderId)}</button></td></tr>,
      ].filter(Boolean))}</tbody></table></div>
      {!attending.length && <p className="vt-empty">No lap times yet for this session.</p>}
    </section>}
    </div>

    {editing && controls && <DemoLapEditor demoOnly={!!demoActions} key={`${session.id}-${editing.entry.riderId}-${editing.lapIndex}`} {...editing} name={name(editing.entry.riderId)} sessionId={session.id} onSave={controls.correct} onClose={()=>setEditing(null)}/>}
    {canManage && <p className="vt-links"><a href="/admin/ridge">Admin session controls</a> · <a href="/admin/ridge-codes">Access codes</a></p>}
    {children && <div className="vt-session-bar">{children}</div>}
    <footer className="vt-foot">Every timing and correction is logged with who did it.</footer>
  </main>;
}
