// Offline only: validates a reviewed native snapshot and prepares TEST staging SQL.
import { scoreEntry } from '../../src/lib/ridge/engine.js';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const literal = value => "'" + JSON.stringify(value).replaceAll("'", "''") + "'::jsonb";
export function prepareStagedImport(input, { actorId, requestId, snapshotId }) {
  if (![actorId, requestId].every(v => uuid.test(v)) || typeof snapshotId !== 'string' || !snapshotId.trim()) throw new Error('Actor, request and source snapshot identifiers required');
  const state = structuredClone(input);
  if (state.schemaVersion !== 1 || !state.riders?.length || !state.sessions?.length) throw new Error('Nonempty native snapshot required');
  const ids = new Set(), names = new Set(), sessions = new Set(), dates = new Set();
  for (const rider of state.riders) {
    const name = String(rider.name || '').trim().toLowerCase();
    if (!rider.id || !name || ids.has(rider.id) || names.has(name)) throw new Error('Ambiguous rider identity');
    ids.add(rider.id); names.add(name);
  }
  for (const session of state.sessions) {
    if (!session.id || sessions.has(session.id) || dates.has(session.date) || !/^\d{4}-\d{2}-\d{2}$/.test(session.date) || new Date(session.date).toISOString().slice(0,10) !== session.date || !session.entries?.length) throw new Error('Invalid or duplicate session');
    sessions.add(session.id); dates.add(session.date);
    const seen = new Set();
    for (const entry of session.entries) {
      if (!ids.has(entry.riderId) || seen.has(entry.riderId)) throw new Error('Unresolved or duplicate rider/session');
      seen.add(entry.riderId);
      if (entry.officialScore?.provenance?.snapshotId !== snapshotId) throw new Error('Official source snapshot mismatch');
      scoreEntry(entry); // Strict official validation; null points remain null.
    }
    session.mode = 'testing'; session.finished = true;
  }
  const command = { type: 'stage_official_import', snapshotId, state };
  const audit = { type: command.type, command };
  // Retrying the identical operation is handled by ridge_commit; changed payloads
  // with the same request ID fail there. No automatic invocation exists.
  const sql = `-- REVIEW ONLY: TEST cxwfjrntfqlyaqppxggh. Staging, never publication.
begin;
lock table public.ridge_workspace in exclusive mode;
lock table public.ridge_publication in exclusive mode;
do $stage$ begin
 if not exists(select 1 from public.ridge_audit where request_id='${requestId}'::uuid) and not exists(
  select 1 from public.ridge_workspace w join public.ridge_publication p using(singleton)
  where w.singleton and w.version=0 and p.version=0
  and w.state->'riders'='[]'::jsonb and w.state->'sessions'='[]'::jsonb
  and p.feed='{"sessions":[],"results":[],"awards":[],"spotlights":[]}'::jsonb
 ) then raise exception 'Staging refused: workspace/publication is no longer empty'; end if;
end $stage$;
select public.ridge_commit(0,'${requestId}'::uuid,'${actorId}'::uuid,${literal(state)},
 (select feed from public.ridge_publication where singleton),${literal(audit)});
commit;
`;
  return { state, sql, publicationEnabled: false };
}
