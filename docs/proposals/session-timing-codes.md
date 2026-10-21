# Session bearer codes — inactive activation candidate

The owner selects an existing open session and expiry, then confirms creating a code. Recipients need no email, website account, or assignment. The owner shares the link/code themselves. Possession authorizes attendance and start/pass/end/group-start for that session only, until expiry/revocation. Owner Advanced Settings remains separate. Main admin owner authentication and allowlist remain unchanged.

## Exact proposed TEST activation

Apply `supabase/proposals/session-timing-codes.sql` to TEST `cxwfjrntfqlyaqppxggh` only, then set server-only `RTG_SESSION_TIMING_CODES_ENABLED=true` on the existing TEST Vercel project. No new secret is required. Until approved/applied, the API rejects this scope and UI displays activation pending.

DDL: add `roster_rider_ids text[]` to `ridge_timing_codes`; replace its scope/binding checks to add `session_timing` with null user ID, a required session and nonempty roster snapshot. Existing `timing` codes still require their original account/assignment. Replace the bodies of `ridge_code_access(text,jsonb)` and `ridge_code_commit(text,uuid,bigint,uuid,jsonb,jsonb,jsonb,jsonb)`. Add `ridge_session_code_commit(text,uuid,bigint,uuid,jsonb,jsonb,jsonb)` with EXECUTE only for service_role. No table RLS changes, no anon/authenticated grants, no new auth users, assignments or issued codes, no installation-time workspace/publication writes.

The new writer validates the exact allowed state diff under the workspace lock, current code/issuer validity, credential ID, session/roster, actual tap time, LIVE date, optimistic version and original request ID. TEST sessions keep arbitrary selected dates. Existing native account writer is unchanged. New audit records identify the code ID and session and state `operatorIdentity: unverified code holder`; actor_id denotes the issuing owner, not an authenticated operator.

High-entropy codes, HMAC-only credential/session storage, expiry <=24h, short secure cookie sessions, rate limits, immediate revocation and owner-seat checks remain. Queued subsecond taps use the existing code-ID-bound durable transport. No public-history import or publication permissions are added.

## Rollback and acceptance

First disable `RTG_SESSION_TIMING_CODES_ENABLED` to refuse issue/redeem/read/write for the new scope. Existing account and owner codes continue. Keep code/audit rows; do not drop data or shrink constraints over retained session codes. A full schema rollback requires an explicit archival decision; operational rollback needs only the flag and compatible previous runtime. Existing audit rows and history must remain.

Before activation, review PGlite/API and UI tests; afterward verify effective ACLs and unchanged workspace/version. Real issuance/redeem requires owner-directed UI confirmation; the agent must not issue credentials. Do not claim authenticated acceptance from synthetic tests.

The redundant `/admin/ridge-volunteers` navigation entry is removed and route redirects to `/admin/ridge-codes`. General volunteer recruitment and existing assignment records/APIs remain untouched. Legacy pending assignment approvals remain recoverable, but new code setup never creates them.
