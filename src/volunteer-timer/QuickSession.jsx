import { useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { createRidgeRequest } from '../lib/ridge/request';
import { istDate } from '../lib/ridge/engine';

// Step 1 of Admin -> Ridge — Access codes: create a session (name and
// date). A day can have any number of sessions. Sessions made here
// are always Live (results show on the website) — volunteer codes are for
// real events. Uses the admin Ridge API (/api/admin/ridge), like Session
// control does.
const REASON = 'Created from Admin -> Ridge — Access codes for volunteer timing';

export default function QuickSession({ riderCount = 0, onReady, request: injected }) {
  const request = useMemo(() => injected || createRidgeRequest({ getSession: () => supabase.auth.getSession() }), [injected]);
  const [date, setDate] = useState(() => istDate(Date.now()));
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const write = async (command) => {
    const current = await request();
    await request({ version: current.version, requestId: crypto.randomUUID(), command });
    return request();
  };

  const create = async (e) => {
    e?.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const { state } = await write({
        type: 'create_session', date,
        ...(name.trim() ? { name: name.trim() } : {}),
      });
      const session = state.sessions.at(-1); // new sessions are always added last
      await write({ type: 'session_mode', sessionId: session.id, mode: 'live', reason: REASON });
      setMessage(`Session “${session.name}” created — it's selected in step 2.`);
      setName('');
      await onReady(session.id);
    } catch (err) {
      setMessage(err.message || 'Could not create the session.');
    } finally {
      setBusy(false);
    }
  };

  const today = istDate(Date.now());
  return (
    <form className="tc-quick" onSubmit={create}>
      <div className="tc-grid">
        <label>Session name<input value={name} maxLength={60} placeholder="e.g. Race day · Morning" disabled={busy} onChange={(e) => setName(e.target.value)} /></label>
        <label>Date<input type="date" value={date} required disabled={busy} onChange={(e) => setDate(e.target.value)} /></label>
      </div>
      <button type="submit" className="tc-primary" disabled={busy || !date}>{busy ? 'Creating…' : 'Create session'}</button>
      {date !== today && <p className="tc-help">A Live session can only be timed on its own date ({date}). For today, keep {today}.</p>}
      {riderCount === 0 && <p className="tc-help">There are no riders yet. Add them in Admin → Ridge — Session control → Riders, or the volunteer can add a missing rider on the timer.</p>}
      {message && <p className="tc-help" role="status">{message}</p>}
      <p className="tc-help">Name is optional (blank becomes “Session 1, 2…”). You can create as many sessions as you need on the same day. Results show on the website once riders are timed.</p>
    </form>
  );
}
