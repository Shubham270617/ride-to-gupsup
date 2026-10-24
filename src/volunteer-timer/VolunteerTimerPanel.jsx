import { useState } from 'react';
import { formatDuration, lapDuration, istDate, rideTotals, keyOf } from '../lib/ridge/engine';
import './volunteer-timer.css';
import DemoLapEditor from './DemoLapEditor';
import DemoRiderPhotos from './DemoRiderPhotos';

// The Ridge Repeats timer: volunteer code, volunteer account,
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
  return new Date(value+19800000).toISOString().slice(11,23);
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

export default function VolunteerTimerPanel({ sessions = [], riders = [], previewActions = null, connected = false, busy = false, pending = false, message = '', canManage = false, onRefresh = null, demoActions = null, ownerActions = null, now = Date.now(), timingPaused = false, queuedCommands = [], managementPending = false, children = null, canFinishRiders = true, canAddRiders = false, volunteerName = '' }) {
  const controls=demoActions || ownerActions;
  const [editing,setEditing]=useState(null);
  const [newDate,setNewDate]=useState(()=>istDate(now)),[newMode,setNewMode]=useState('testing'),[newName,setNewName]=useState(''),[newSessionName,setNewSessionName]=useState('');
  const [confirmFor,setConfirmFor]=useState(null); // rider waiting for "mark finished?" confirmation
  const [tab, setTab] = useState('Riders');
  const [sessionId, setSessionId] = useState('');
  const [selection, setSelection] = useState(null);
  const session = sessions.find(s => s.id === sessionId) || [...sessions].sort((a,b)=>b.date.localeCompare(a.date) || (b.createdAt||0)-(a.createdAt||0))[0];
  const attending = session?.entries || [];
  const name = id => riders.find(r => r.id === id)?.name || 'Unknown rider';
  const selected = (selection || attending.map(e => e.riderId)).filter(id => riders.some(r => r.id === id));
  const blocked = !previewActions || busy || pending || !session || session.finished || session.mode === 'archived';
  const wrongDate = connected && session && session.mode !== 'testing' && session.date !== istDate(now);
  const timingBlocked = blocked || wrongDate || timingPaused;
  const send = command => previewActions?.send({sessionId: session.id, ...command});
  // Owner/demo add through their own controls; a volunteer code queues
  // create_rider with its own id. The new rider is not ticked — the
  // volunteer ticks who is here.
  const addingBlocked = controls ? busy || pending : blocked || timingPaused;
  const addRider = async () => {
    const typed = newName.trim();
    if (!typed || addingBlocked) return;
    if (controls) { if (await controls.addRider(newName)) setNewName(''); return; }
    send({type:'create_rider', name:typed, riderId:crypto.randomUUID()});
    if (!riders.some(r => keyOf(r.name) === keyOf(typed))) setNewName('');
  };
  const role = !connected
    ? previewActions ? 'Demo — practice freely, nothing is saved' : 'Preview — saving is switched off'
    : ownerActions ? 'Owner — you can set up and time sessions' : `Volunteer${volunteerName ? ` — ${volunteerName}` : ''} · mark who is here and time their laps`;
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
            {sessions.map(s => <option key={s.id} value={s.id}>{niceDate(s.date)}{s.name ? ` · ${s.name}` : ''} · {(MODE[s.mode] || MODE.testing).label}{s.finished ? ' · finished' : ''}</option>)}
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
          <input aria-label="New session name" placeholder="Name (optional) — e.g. Morning" maxLength={60} disabled={busy || pending || managementPending} value={newSessionName} onChange={e=>setNewSessionName(e.target.value)}/>
          {demoActions && <select aria-label="New session mode" disabled={busy || pending} value={newMode} onChange={e=>setNewMode(e.target.value)}><option value="testing">Testing · private</option><option value="live">Live · public (demo only)</option></select>}
          <button className="vt-btn vt-btn-primary" disabled={busy || pending || !newDate} onClick={async()=>{const id=await controls.createSession(newDate,newMode,newSessionName.trim());if(id){setSessionId(id);setSelection(null);setNewSessionName('');}}}>Create session</button>
        </div>
        <small>You can make several sessions on the same day — give each a name (Morning, Evening…) or leave it blank for "Session 1, 2…". New sessions start as <b>Testing</b> (private); publish them from Admin → Ridge — Session control.</small>
      </details>}
    </section>}

    <div className="vt-stage" key={tab}>
    {tab === 'Riders' && <section aria-label="Attendance" className="vt-card">
      <h2>Who is riding today?</h2>
      <p className="vt-help">Tap each rider who is here, then press <b>Save attendance</b>. Riders who already have lap times stay ticked.</p>
      {(controls || canAddRiders) && <div className="vt-inline vt-add">
        <input aria-label="New rider name" placeholder={controls ? 'Add a new rider — type their name' : 'Rider missing? Type their name'} maxLength={100} disabled={addingBlocked} value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')addRider();}}/>
        <button className="vt-btn" disabled={addingBlocked || !newName.trim()} onClick={addRider}>Add rider</button>
      </div>}
      {!riders.length && <p className="vt-empty">No riders yet.{controls || canAddRiders ? ' Type a name above and press Add rider.' : ''}</p>}
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
      <p className="vt-help">Press <b>Start all</b> when the group sets off. Rider goes straight into the next lap → <b>Pass</b>. Rider stops for a break → <b>Finish</b>, then <b>Start</b> when they ride again (the break is timed separately). Done for the day → <b>Rider done</b>.</p>
      {wrongDate && <p className="vt-alert" role="alert">Timing is unavailable: this session is dated {session.date}, but today in India is {istDate(now)}. Pick today's session to time now. Attendance stays saved.</p>}
      <button className="vt-btn vt-btn-primary vt-btn-big" disabled={timingBlocked || !attending.length || attending.some(e => e.laps.length || e.officialScore)} onClick={() => send({type:'group_start',at:Date.now()})}><span aria-hidden="true">▶</span> Start all · Lap 1</button>
      <div className="vt-cards">{attending.map((entry, i) => {
        // Historical official results are never offered as resumable timers.
        const locked = session.finished || session.mode === 'archived' || !!entry.officialScore;
        const index = entry.laps.findIndex(lap => !lapDuration(lap));
        const next = index < 0 ? entry.laps.length : index;
        const running = entry.laps[next]?.start != null && !lapDuration(entry.laps[next]);
        const lastEnd = !running && next > 0 ? entry.laps[next - 1]?.end : null;
        const onBreak = !locked && !entry.done && !running && next > 0 && next < LAPS && lastEnd != null;
        const canFinish = canFinishRiders && !locked && !entry.done && !running && next > 0;
        const photo = demoActions?.photos[entry.riderId] || riders.find(r => r.id === entry.riderId)?.photo;
        const completed = entry.laps.filter(lap => lapDuration(lap)).length;
        return <article key={entry.riderId} className={`vt-timer${running ? ' is-running' : ''}${locked ? ' is-locked' : ''}${entry.done ? ' is-finished' : ''}`} style={{ '--i': i }}>
          <div className="vt-timer-head">
            {photo ? <img className="vt-timer-photo" src={photo} alt=""/> : <span className="vt-avatar" aria-hidden="true">{initials(name(entry.riderId))}</span>}
            <div className="vt-timer-who">
              <h3>{name(entry.riderId)}</h3>
              {queuedCommands.some(c=>c.type==='group_start'||c.riderId===entry.riderId)&&<span className="vt-badge" role="status">Pending save</span>}
            </div>
            <span className="vt-lap-count" aria-hidden="true">{completed}/{LAPS}</span>
          </div>
          <div className="vt-progress" aria-hidden="true"><span style={{width:`${completed / LAPS * 100}%`}}/></div>
          <ol className="vt-laps" aria-label="Laps">{Array.from({length:LAPS},(_,l)=>{const lap=entry.laps[l];const done=lap&&lapDuration(lap);return <li key={l} data-lap={`L${l+1}`} className={done?'is-done':l===next&&running?'is-now':''}>{done?formatDuration(lapDuration(lap)):`L${l+1}`}</li>;})}</ol>
          <p className="vt-timer-state">{locked ? 'Locked timing record' : entry.done ? `Finished · ${next} lap${next === 1 ? '' : 's'}` : next >= LAPS ? `${LAPS} loops complete` : `${running ? 'Running' : 'Ready'} L${next + 1}`}</p>
          {onBreak && <p className="vt-break">On a break · {formatDuration(now - lastEnd) || '0:00.000'}</p>}
          {running && !locked && <p className="vt-clock">{formatDuration(now - entry.laps[next].start) || '0:00.000'}</p>}
          {!locked && !entry.done && next < LAPS && <div className="vt-timer-btns">
            {running && next < LAPS - 1 && <button className="vt-btn vt-btn-go" disabled={timingBlocked} onClick={() => send({type:'pass',riderId:entry.riderId,lap:next+1,at:Date.now()})}>Pass → L{next + 2}</button>}
            <button className={`vt-btn ${running ? 'vt-btn-stop' : 'vt-btn-go'}`} disabled={timingBlocked} onClick={() => send({type:running ? 'end' : 'start',riderId:entry.riderId,lap:next+1,at:Date.now()})}>{running ? 'FINISH' : 'START'} · L{next + 1}</button>
          </div>}
          {canFinish && (confirmFor === entry.riderId
            ? <div className="vt-confirm" role="alert"><p>Mark <b>{name(entry.riderId)}</b> as finished for this session? Their {next} lap{next === 1 ? '' : 's'} stay saved; you can resume later.</p>
                <div className="vt-timer-btns"><button className="vt-btn vt-btn-danger" disabled={timingBlocked} onClick={() => { setConfirmFor(null); send({type:'rider_finish',riderId:entry.riderId}); }}>Yes, finished</button><button className="vt-btn" onClick={() => setConfirmFor(null)}>Cancel</button></div></div>
            : <button className="vt-btn vt-btn-small vt-btn-ghost vt-done-btn" disabled={timingBlocked} onClick={() => setConfirmFor(entry.riderId)}>✓ Rider done</button>)}
          {entry.done && !locked && canFinishRiders && <button className="vt-btn vt-btn-small" disabled={blocked || wrongDate} onClick={() => send({type:'rider_resume',riderId:entry.riderId})}>Resume rider</button>}
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
      <p className="vt-help">Every timed lap{session ? ` on ${niceDate(session.date)}` : ''}, in India time. {controls ? <>If a time is wrong, press <b>Edit</b> on that lap.</> : 'If a time looks wrong, tell the admin — they can correct it.'}</p>
      <div className="vt-sheets">{attending.map((entry, r) => {
        const rider = name(entry.riderId), t = rideTotals(entry);
        const laps = Array.from({length:Math.max(1,Math.min(LAPS,entry.laps.length))},(_,i)=>entry.laps[i]||{});
        const timed = entry.laps.filter(lap => lapDuration(lap)).length;
        return <section key={entry.riderId} className={`vt-sheet${entry.done ? ' is-finished' : ''}`} style={{ '--i': r }} aria-label={`${rider} lap times`}>
          <header className="vt-sheet-head">
            <span className="vt-avatar" aria-hidden="true">{initials(rider)}</span>
            <div className="vt-sheet-who"><h3>{rider}</h3><p>{timed} of {LAPS} laps{entry.done ? ' · Finished' : ''}</p></div>
            {t.totalMs > 0 && <dl className="vt-totals">
              <div><dt>Riding</dt><dd>{formatDuration(t.totalMs)}</dd></div>
              <div><dt>Breaks</dt><dd>{formatDuration(t.breakMs) || '0:00.000'}</dd></div>
              <div><dt>Elapsed</dt><dd>{formatDuration(t.elapsedMs)}</dd></div>
            </dl>}
          </header>
          <div className="vt-table"><table><caption className="vt-sr-only">{rider} — laps</caption>
            <thead><tr>{['Lap','Start','Finish','Lap time','Break before','Status',...(controls ? ['Edit'] : [])].map(h => <th key={h} scope="col">{h}</th>)}</tr></thead>
            <tbody>{laps.map((lap, i) => {
              const accepted = lapDuration(lap), recorded = lap.start != null && lap.end != null ? lap.end - lap.start : null;
              const gap = i > 0 && entry.laps[i - 1]?.end != null && lap.start != null && lap.start > entry.laps[i - 1].end ? lap.start - entry.laps[i - 1].end : null;
              return <tr key={i} style={{ '--i': i }}>
                <th scope="row"><span className="vt-lap-no">L{i + 1}</span></th><td>{clock(lap.start)}</td><td>{clock(lap.end)}</td>
                <td className="vt-lap-time">{formatDuration(accepted) || '—'}{lap.durationMs != null && recorded != null && <small> (timed {formatDuration(recorded)})</small>}</td>
                <td>{gap ? formatDuration(gap) : '—'}</td>
                <td><span className={`vt-pill vt-pill-${lap.durationMs!=null?'fix':lap.end!=null?'ok':lap.start!=null?'run':'none'}`}>{lap.durationMs!=null?'Duration corrected':lap.end!=null?'Recorded':lap.start!=null?'Running':'Not started'}</span></td>
                {controls && <td><button className="vt-btn vt-btn-small" disabled={busy || pending || !!entry.officialScore} aria-label={`Edit ${rider} L${i+1}`} onClick={()=>setEditing({entry,lapIndex:i})}>Edit</button></td>}
              </tr>;
            })}</tbody></table></div>
          {/* Only laps that were recorded are listed; a lap that was missed can be added here. */}
          {controls && !entry.officialScore && entry.laps.length >= 1 && entry.laps.length < LAPS && <button className="vt-btn vt-btn-small vt-btn-ghost vt-add-lap" disabled={busy || pending} onClick={()=>setEditing({entry,lapIndex:entry.laps.length})}>+ Add lap {entry.laps.length + 1} time for {rider}</button>}
        </section>;
      })}</div>
      {!attending.length && <p className="vt-empty">No lap times yet for this session.</p>}
    </section>}
    </div>

    {editing && controls && <DemoLapEditor demoOnly={!!demoActions} key={`${session.id}-${editing.entry.riderId}-${editing.lapIndex}`} {...editing} name={name(editing.entry.riderId)} sessionId={session.id} onSave={controls.correct} onClose={()=>setEditing(null)}/>}
    {canManage && <p className="vt-links"><a href="/admin/ridge">Admin session controls</a> · <a href="/admin/ridge-codes">Access codes</a></p>}
    {children && <div className="vt-session-bar">{children}</div>}
    <footer className="vt-foot">Every timing and correction is logged with who did it.</footer>
  </main>;
}
