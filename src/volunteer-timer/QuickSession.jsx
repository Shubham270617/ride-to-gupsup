import { useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { createRidgeRequest } from '../lib/ridge/request';
import { istDate } from '../lib/ridge/engine';

// Admin -> Ridge — Access codes -> Volunteer timing code: create the session
// right here, so the flow is "make session -> make code -> copy -> share".
// Uses the admin Ridge API (/api/admin/ridge), the same one Session control
// uses. A Live session shows on the website once timed; Testing stays private.
//
// If the chosen date already has a session: an open one is simply selected;
// a finished one (or one in the other mode that already has test times)
// can be archived — its records are kept — and a fresh session created.
const REASON = 'Created from Admin -> Ridge — Access codes for volunteer timing';

export default function QuickSession({ riderCount = 0, onReady, request: injected }) {
  const request = useMemo(() => injected || createRidgeRequest({ getSession: () => supabase.auth.getSession() }), [injected]);
  const [date, setDate] = useState(() => istDate(Date.now()));
  const [mode, setMode] = useState('live');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [replace, setReplace] = useState(null); // an existing session that must be archived first

  const write = async (command) => {
    const current = await request();
    await request({ version: current.version, requestId: crypto.randomUUID(), command });
    return request();
  };
  const sameDate = (state) => state.sessions.find((s) => s.date === date && s.mode !== 'archived');

  const create = async (archiveFirst = false) => {
    setBusy(true);
    setMessage('');
    try {
      let state = (await request()).state;
      let existing = sameDate(state);
      const hasTimes = (s) => s.entries.some((e) => e.officialScore || e.laps.some((l) => l.start != null || l.end != null || l.durationMs != null));
      if (existing && !archiveFirst) {
        if (!existing.finished && (existing.mode === mode || (mode === 'live' && !hasTimes(existing)))) {
          if (existing.mode !== mode) state = (await write({ type: 'session_mode', sessionId: existing.id, mode, reason: REASON })).state;
          setMessage('Session ready.');
          await onReady(existing.id);
          return;
        }
        setReplace(existing);
        return;
      }
      if (existing && archiveFirst) {
        state = (await write({ type: 'session_mode', sessionId: existing.id, mode: 'archived', reason: REASON })).state;
        setReplace(null);
      }
      state = (await write({ type: 'create_session', date })).state;
      existing = sameDate(state);
      if (mode === 'live') state = (await write({ type: 'session_mode', sessionId: existing.id, mode: 'live', reason: REASON })).state;
      setMessage('Session created.');
      await onReady(existing.id);
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
        <label>Date<input type="date" value={date} disabled={busy} onChange={(e) => { setDate(e.target.value); setReplace(null); }} /></label>
        <label>Type<select value={mode} disabled={busy} onChange={(e) => { setMode(e.target.value); setReplace(null); }}>
          <option value="live">Live — results show on the website</option>
          <option value="testing">Testing — private practice</option>
        </select></label>
        <button type="button" className="tc-primary" disabled={busy || !date} onClick={() => create(false)}>{busy ? 'Creating…' : 'Create session'}</button>
      </div>
      {mode === 'live' && date !== today && <p className="tc-help">A Live session can only be timed on its own date ({date}). For today, keep {today}.</p>}
      {riderCount === 0 && <p className="tc-help">There are no riders yet. Add them first in the timer with your owner code — a volunteer code can only time riders that exist when it is made.</p>}
      {replace && <div className="tc-notice" role="alert">
        <p>{date} already has a {replace.mode === 'live' ? 'Live' : 'Testing'} session{replace.finished ? ' that is finished' : ' with test times'}. Archive it (its records are kept) and create a fresh {mode === 'live' ? 'Live' : 'Testing'} session?</p>
        <button type="button" className="tc-primary" disabled={busy} onClick={() => create(true)}>Archive old &amp; create new</button> <button type="button" disabled={busy} onClick={() => setReplace(null)}>Cancel</button>
      </div>}
      {message && <p className="tc-help" role="status">{message}</p>}
    </div>
  );
}
