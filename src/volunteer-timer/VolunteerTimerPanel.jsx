import { useState } from 'react';
import { formatDuration, lapDuration } from '../lib/ridge/engine';
import './volunteer-timer.css';

const tabs = ['Riders', 'Timer', 'Rider Photos', 'Data'];
const clock = value => value == null ? '—' : new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit',
}).format(new Date(value));

// Presentation only. Deliberately no Supabase, admin transport, credentials,
// storage or write callbacks until a session-scoped server boundary is reviewed.
export default function VolunteerTimerPanel({ sessions = [], riders = [], previewActions = null, connected = false, busy = false, pending = false, message = '', now = Date.now() }) {
  const [tab, setTab] = useState('Riders');
  const [sessionId, setSessionId] = useState('');
  const [selection, setSelection] = useState(null);
  const session = sessions.find(s => s.id === sessionId) || sessions[0];
  const attending = session?.entries || [];
  const name = id => riders.find(r => r.id === id)?.name || 'Unknown rider';
  const selected = selection || attending.map(e => e.riderId);
  const blocked = !previewActions || busy || pending || !session || session.finished || session.mode === 'archived';
  const send = command => previewActions?.send({sessionId: session.id, ...command});
  return <main className="vt-panel">
    <h1>RTG RIDGE REPEATS</h1>
    <p role="status">{connected ? 'Assigned-session attendance and timing only.' : previewActions ? 'Synthetic local preview · no server writes.' : 'Interface review only · volunteer access and saving are not enabled.'} {message}</p>
    {pending && previewActions && <button disabled={busy} onClick={previewActions.retry}>Retry same action</button>}
    <nav aria-label="Timer steps">{tabs.map((item, i) => <button key={item}
      aria-pressed={tab === item} onClick={() => setTab(item)}>{i + 1} · {item}</button>)}</nav>
    <label>Session<select disabled={busy || pending} value={session?.id || ''} onChange={e => {setSessionId(e.target.value);setSelection(null);}}>
      {!sessions.length && <option value="">No assigned sessions</option>}
      {sessions.map(s => <option key={s.id} value={s.id}>RR {s.date}</option>)}
    </select></label>
    {session && <p>SESSION MODE: {session.mode === 'live' ? 'LIVE · PUBLIC — saved timing updates the leaderboard' : session.mode === 'testing' ? 'TESTING · PRIVATE' : 'ARCHIVED'}{session.finished ? ' · FINISHED' : ''}</p>}
    {tab === 'Riders' && <section aria-label="Attendance">
      <p>Choose who is present this session, then save. Riders with recorded laps stay selected.</p>
      {riders.map(rider => <label className="vt-roster" key={rider.id}><input type="checkbox" disabled={blocked || attending.some(e => e.riderId === rider.id && (e.officialScore || e.laps.some(lap => lap.start != null || lapDuration(lap))))} checked={selected.includes(rider.id)} onChange={e => setSelection(e.target.checked ? [...selected, rider.id] : selected.filter(id => id !== rider.id))}/>{rider.name}</label>)}
      <button disabled={blocked} onClick={() => send({type:'attendance',riderIds:selected})}>Save attendance</button><button onClick={() => setTab('Timer')}>Go to timer</button>
    </section>}
    {tab === 'Timer' && <section aria-label="Lap timing">
      <button disabled={blocked || !attending.length || attending.some(e => e.laps.length || e.officialScore)} onClick={() => send({type:'group_start',at:Date.now()})}>Start all · Lap 1</button>
      <div className="vt-cards">{attending.map(entry => {
        // Historical official results are never offered as resumable timers.
        const locked = session.finished || session.mode === 'archived' || !!entry.officialScore;
        const index = entry.laps.findIndex(lap => !lapDuration(lap));
        const next = index < 0 ? entry.laps.length : index;
        const running = entry.laps[next]?.start != null && !lapDuration(entry.laps[next]);
        return <article key={entry.riderId}><h2>{name(entry.riderId)}</h2>
          <p>{locked ? 'Locked timing record' : next >= 5 ? '5 loops complete' : `${running ? 'Running' : 'Ready'} L${next + 1}`}</p>
          {running && !locked && <p>{formatDuration(now - entry.laps[next].start) || '0:00.000'}</p>}
          {!locked && next < 5 && <><button disabled={blocked} onClick={() => send({type:running ? 'end' : 'start',riderId:entry.riderId,lap:next+1,at:Date.now()})}>{running ? 'FINISH' : 'START'} · L{next + 1}</button>{running && next < 4 && <button disabled={blocked} onClick={() => send({type:'pass',riderId:entry.riderId,lap:next+1,at:Date.now()})}>Pass → L{next + 2}</button>}</>}
        </article>;
      })}</div>
      {!attending.length && <p>No riders recorded for this session.</p>}
      <button className="vt-finish" disabled>■ FINISH SESSION</button>
      <p>Session closing requires separately approved permission.</p>
    </section>}
    {tab === 'Rider Photos' && <section><h2>Rider Photos</h2>
      <p>Profile photo management requires separate permission. Spotlight and Achievement photos remain separate.</p>
      <p>No photo upload is connected in this review.</p></section>}
    {tab === 'Data' && <section><h2>Lap timing records · Admin</h2>
      <p>Start and finish are clock times in IST. Missing historical timestamps remain —.</p>
      <div className="vt-table"><table><caption>Session timing records</caption><thead><tr>{['Rider','Lap','Start · IST','Finish · IST','Recorded duration','Accepted duration'].map(h => <th key={h} scope="col">{h}</th>)}</tr></thead>
        <tbody>{attending.flatMap(entry => entry.laps.map((lap, i) => <tr key={`${entry.riderId}-${i}`}>
          <th scope="row">{name(entry.riderId)}</th><td>{i + 1}</td><td>{clock(lap.start)}</td><td>{clock(lap.end)}</td>
          <td>{lap.start != null && lap.end != null ? formatDuration(lap.end - lap.start) : '—'}</td><td>{formatDuration(lapDuration(lap)) || '—'}</td>
        </tr>))}</tbody></table></div></section>}
    <details><summary>Advanced session settings</summary><p>Owner-only session creation, publication, reopening and archiving are not connected here.</p></details>
  </main>;
}
