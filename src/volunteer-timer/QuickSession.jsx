import { useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { createRidgeRequest } from '../lib/ridge/request';
import { istDate } from '../lib/ridge/engine';

// Admin -> Ridge — Access codes -> Volunteer timing code: create the session
// right here, so the flow is "make session -> make code -> copy -> share".
// Uses the admin Ridge API (/api/admin/ridge), the same one Session control
// uses. A day can have any number of sessions; each gets a name ("Morning",
// or "Session 2" if left blank). A Live session shows on the website once
// timed; Testing stays private.
const REASON = 'Created from Admin -> Ridge — Access codes for volunteer timing';

export default function QuickSession({ riderCount = 0, onReady, request: injected }) {
  const request = useMemo(() => injected || createRidgeRequest({ getSession: () => supabase.auth.getSession() }), [injected]);
  const [date, setDate] = useState(() => istDate(Date.now()));
  const [name, setName] = useState('');
  const [mode, setMode] = useState('live');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const write = async (command) => {
    const current = await request();
    await request({ version: current.version, requestId: crypto.randomUUID(), command });
    return request();
  };

  const create = async () => {
    setBusy(true);
    setMessage('');
    try {
      let { state } = await write({ type: 'create_session', date, ...(name.trim() ? { name: name.trim() } : {}) });
      const session = state.sessions.at(-1); // new sessions are always added last
      if (mode === 'live') ({ state } = await write({ type: 'session_mode', sessionId: session.id, mode: 'live', reason: REASON }));
      setMessage(`Created “${session.name}”.`);
      setName('');
      await onReady(session.id);
    } catch (e) {
      setMessage(e.message || 'Could not create the session.');
    } finally {
      setBusy(false);
    }
  };

  const today = istDate(Date.now());
  return (
    <div className="tc-quick">
      <p className="tc-quick-title">＋ Create a session for this code</p>
      <div className="tc-quick-row">
        <label>Date<input type="date" value={date} disabled={busy} onChange={(e) => setDate(e.target.value)} /></label>
        <label>Name (optional)<input value={name} maxLength={60} placeholder="e.g. Morning" disabled={busy} onChange={(e) => setName(e.target.value)} /></label>
        <label>Type<select value={mode} disabled={busy} onChange={(e) => setMode(e.target.value)}>
          <option value="live">Live — results show on the website</option>
          <option value="testing">Testing — private practice</option>
        </select></label>
        <button type="button" className="tc-primary" disabled={busy || !date} onClick={create}>{busy ? 'Creating…' : 'Create session'}</button>
      </div>
      {mode === 'live' && date !== today && <p className="tc-help">A Live session can only be timed on its own date ({date}). For today, keep {today}.</p>}
      {riderCount === 0 && <p className="tc-help">There are no riders yet. Add them first in the timer with your owner code — a volunteer code can only time riders that exist when it is made.</p>}
      {message && <p className="tc-help" role="status">{message}</p>}
    </div>
  );
}
