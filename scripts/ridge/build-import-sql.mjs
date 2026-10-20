// Offline generator. Does not open a connection or apply SQL.
// After the test Supabase connection is authorized, refresh Google exports,
// rerun parity checks, and apply this generated transaction to TEST only.
import { readFileSync,writeFileSync } from 'node:fs';
import { buildPublicFeed } from '../../src/lib/ridge/engine.js';
const state=JSON.parse(readFileSync(new URL('./import/workspace.json',import.meta.url),'utf8'));
const literal=value=>"'"+JSON.stringify(value).replaceAll("'","''")+"'::jsonb";
const sql=`-- TEST ONLY: cxwfjrntfqlyaqppxggh. Never apply to gccdpjdjietbkzmqweki.
-- Restore the authoritative Google history only into an unused native workspace.
begin;
lock table public.ridge_workspace in exclusive mode;
do $$begin
 if not exists(select 1 from public.ridge_workspace where singleton and version=0 and state->'riders'='[]'::jsonb and state->'sessions'='[]'::jsonb) then
  raise exception 'Import refused: native workspace already contains data';
 end if;
end$$;
update public.ridge_workspace set state=${literal(state)},updated_at=now() where singleton;
update public.ridge_publication set feed=${literal(buildPublicFeed(state))},updated_at=now() where singleton;
commit;
`;
const target=process.argv[2];
if(!target)throw new Error('Pass a local output SQL path. No database is contacted.');
writeFileSync(target,sql);
console.log(`Prepared ${state.riders.length} riders, ${state.sessions.length} published sessions. No database was modified.`);
