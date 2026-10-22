# Native Ridge implementation — TEST deployment only

Target: `https://rtg-website-three.vercel.app`
Vercel project: `prj_mbrInjM6Ton7fB1qynFP1KdivPk8`
Test Supabase project: `cxwfjrntfqlyaqppxggh`

Do not change `rideteagupshup.com`, the original developer repository, Google Apps Script/Sheets, or live Supabase project `gccdpjdjietbkzmqweki`. Strava is outside this change.

## Current deployment gate

The connected Supabase account only lists the live database and explicitly denies the test project. No native schema or imported data has been installed remotely. Reauthorize the connector for the test project before continuing. Do not obtain alternative credentials or use privileged application code to bypass that denial. No merge to `main` is required: deploy the reviewed feature commit directly to the existing verified test Vercel project after the database is ready.

## Data model and workflow

`ridge_workspace` holds the native operational state: stable rider IDs, photos, sessions, attendance, raw start/finish timestamps, duration and points overrides, adjustments, and original Google logs. The server validates every mutation. `ridge_commit` commits this state, the member-visible `ridge_publication` snapshot, and an append-only `ridge_audit` entry in one transaction. A version lock rejects concurrent stale edits. Request IDs make retries idempotent. Only the server service role can write; every endpoint verifies the caller's actual admin seat.

The admin panel provides Riders, Timer, Data, Results, Spotlight, Sessions and Audit tabs. Testing and archived sessions stay out of the public feed. Finish locks timing; reasoned corrections remain available. Pass records a finish and the next start at the same client-captured instant. Group start is allowed once. No timing action is reported as saved before the server confirms it. The app requires connectivity; it does not queue offline timing.

The member page is native React, with its existing membership gate, four ranking modes, rider details, charts, heatmap, photos, individual cards and new full-session story export. No Google iframe or runtime Google data requests remain. Public data refreshes every 30 seconds or manually.

## Historical import

`import/workspace.json` is a local, git-ignored migration export prepared from read-only Google exports captured on 20 October 2026. It contains 19 riders, four published sessions, 31 rider-session results, 108 completed laps, four compressed JPEG photos and the original timing/correction logs. Historical published points remain explicit overrides. Changing a lap clears only the affected comparisons. The special first-session Spotlight rules are preserved.

`import/source-corrections.json` retains organiser corrections, and `import/legacy-audit.json` retains the source logs. These exports are deliberately excluded from GitHub. They must never be committed, copied into `public/`, or imported by frontend code. The repository uses synthetic test data. Rebuild the private exports from the original connected Google sources if local files are unavailable. The API exposes operational state to admins only; only the derived member feed reaches registered Ridge members. Photos remain the original compressed images, embedded in the database snapshot once per rider in the published feed.

1. Verify the connection now authorizes the exact TEST project. Inspect its current `admin_profiles`, `is_admin()` and `lab_registrations` definitions before applying the migration.
2. Apply `supabase/migrations/20261020211425_native_ridge_workspace.sql` to TEST only. It creates new tables and leaves existing sample and unrelated tables untouched.
3. If Google records have changed, refresh the exports and rerun `python scripts/ridge/prepare-google-import.py /path/to/exports`. Run `node scripts/ridge/verify-google-import.mjs` to compare every published score and Spotlight decision against the source exports before import.
4. Generate the guarded, offline import transaction: `node scripts/ridge/build-import-sql.mjs /tmp/rtg-native-import.sql`. It refuses to replace a workspace that already contains data. Apply it only through the authorized test connection.
5. Verify all counts, points and Spotlight winners on the actual test database. Verify anonymous, unregistered member, registered member and admin access.
6. Deploy this feature commit to the existing TEST Vercel project and its existing alias. Verify actual admin timing, correction, publishing, public refresh and image download in a testing session; archive that verification session afterwards.

## Local verification

`npm test -- tests/api-lib/ridge-engine.test.js tests/api-lib/ridge-database.test.js tests/api/ridge.test.js tests/src/admin/RidgeAdmin.test.jsx tests/src/pages/LabRidge.test.jsx tests/src/lib/labData.test.js tests/src/components/RidgeSessionStory.test.jsx`

Database tests execute the actual migration in local PGlite PostgreSQL, including role privileges, RLS, idempotency, version conflicts and transaction rollback. They do not contact Supabase. These tests do not replace verification against the authorized deployed database.

Run `npm run build` and the targeted linter before deployment. Keep the old test deployment `dpl_BTaWEvsNjrDWN5u9jYA34hYPcHG4` available for rollback; never roll the live project.

Automatic approval review rejected committing private rider records to GitHub. The safer code-only change excludes the original data, photos, audit exports and real-data test fixtures; no approval to export those records to GitHub is assumed.


### Source-parity hardening (local, not imported)

Historical entries now carry a versioned `officialScore` snapshot. Its five
nullable lap-point slots, nullable improvement, completed count, highlight and
total are preserved independently of missing historical durations. Ordinary
native timing still uses the existing calculation/override engine. Existing
`pointsOverride: null` means reset to calculated; it must not stand for an
unknown authoritative point. Feed records explicitly carry source and rider ID.

The offline preparation script now requires a **confirmed private**
`native-Rider-Identity-Map.json` alongside source exports:
`{"identities":[{"id":"existing-stable-id","name":"Confirmed name","aliases":[]}]}`.
Do not generate this mapping from fuzzy names or per-session timer UUIDs. Retain
existing assigned IDs across re-exports and renames. Unresolved/ambiguous names
and duplicate rider/date records fail closed. Date, decimal/null and alias-chain
validation is strict. Snapshot digests cover source files and mapping. All six
historical award records are stored using the existing ID-based award overrides.

No historical snapshot may be silently replaced by an ordinary timing, lap,
points or award command. Such edits currently require an explicitly accepted
source revision; that workflow is not implemented by this patch. New sessions
continue using native timing and correction commands. Verify mode evidence for
every published-source session before importing: preparation still assumes the
Session Scores export contains approved LIVE history, as the existing four-date
snapshot did. Do not use a broad/testing export as published history.

`verify-google-import.mjs` now additionally checks stored total, fixed lap-point
slots, source marker, snapshot identity, stable rider IDs and duplicate keys.
It is not run against private records as part of synthetic automated tests.
