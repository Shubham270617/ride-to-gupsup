# Ridge historical import and publication handover

## Current TEST state

On 21 October 2026, approved history was staged and separately published into TEST project `cxwfjrntfqlyaqppxggh` using the existing audited commit boundary. Verified version 2 contains 19 riders, 31 results, four sessions, 108 loops, 18 award assignments and total score 138.54. There are 66 known lap durations; missing times remain blank. Photos are excluded. Original Sheets and live data were not changed.

Real snapshots, identity mappings, operation payloads and backups are deliberately not in GitHub. Counts in this document are a point-in-time receipt, not seed data or authorization to repeat the import.

## Current workflow

- `scripts/ridge/staged-import.mjs`: validates a reviewed native snapshot, preserves official values/nulls and forces sessions to testing/finished. Generates SQL without contacting a database.
- `scripts/ridge/build-import-sql.mjs`: staging-only CLI. Requires explicit SOURCE OUTPUT ACTOR_UUID REQUEST_UUID SNAPSHOT_ID; refuses to overwrite output. **The previous direct workspace/publication update procedure is obsolete. Do not restore or run it from older commits.**
- `scripts/ridge/reviewed-publication.mjs`: separately prepares publication only with explicit approval. Requires the exact reviewed staged state and expected version. Outputs a minimal display feed without private provenance or photos.
- `src/lib/ridge/engine.js`: every subsequent native edit regenerates the same public projection without exposing private provenance. Private evidence stays in workspace/audit.
- `supabase/migrations/20261020211425_native_ridge_workspace.sql`: existing schema, RLS and `ridge_commit(bigint,uuid,uuid,jsonb,jsonb,jsonb)` definition. Do not rerun installation on an installed database.

Both generators use the existing atomic `ridge_commit`; they introduce no new RPC, grants, RLS policy or browser privilege. Staging requires an empty version-zero workspace/publication and now intentionally refuses on the populated TEST database. Exact operation retries reuse their original request UUID and actor; changed payloads with reused IDs fail. Publication compares the exact staged JSON and version before committing. No automatic execution exists.

Before any future source revision, review current immutable exports, confirmed identity mappings, every score and award, source hashes and missing values. A new revision needs a separately designed update workflow: this first-import generator is not a general overwrite tool. Generated SQL is a reviewed administrative artifact, not an authenticated public API. Do not weaken the normal admin session-mode guard to promote recorded sessions.

## Backup, verification and recovery

Before execution, securely retain the workspace state/version, publication feed/version and audit metadata outside the repository; verify target project and existing actor membership. Keep operation IDs and source hashes with that private backup.

After a write, read back exact state/feed equality, version, one audit entry per operation, session modes, counts, official totals and absence of private display fields. Check the rendered member views using a valid owner/member session; never bypass login or membership gates.

For uncertain outcomes, inspect the recorded request UUID before retrying. For rollback, review the preserved pre-change state/feed, acquire the same workspace lock, verify the current expected version, and call `ridge_commit` with a fresh request UUID and an explicit rollback audit command. Restore both state and feed atomically at a new version; never delete audit history or rewind version numbers. Stop on intervening edits and reconcile instead of overwriting them.

## Validation and acceptance limits

Synthetic PGlite tests cover atomic audit-failure rollback, exact retries, changed request rejection, nonempty/stale target refusal, unchanged staging feed and separate publication. Privacy tests cover native regeneration, manual edits, import and publication. No real data is embedded in tests.

The full local suite at the provenance fix had 796 passing tests, two environment failures because real Python was unavailable, one expected failure and one todo. Build/lint passed with existing warnings. Authenticated browser acceptance remains pending: permitted IAB reached the existing login gate. Site-editor shared-save authentication acceptance also remains pending. No all-site completion is implied. Strava is excluded.
