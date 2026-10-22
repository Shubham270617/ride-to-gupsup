# Inactive code-only timer implementation — activation review

Implemented routes: `/volunteer/ridge/code` (volunteer code or distinct owner Advanced Settings code), `/admin/ridge-codes` (issuance/revocation under existing website owner login), and the existing dispatcher endpoint `/api/admin/ridge-timing-codes`. All new server operations are disabled unless `RTG_TIMING_CODES_ENABLED=true`. No new environment values, real codes, assignments, migrations or grants have been activated.

## Implemented security boundaries

- 192-bit random codes; only domain-separated HMAC hashes stored. 256-bit opaque cookie tokens; HttpOnly, Secure, SameSite=Strict, __Host prefix. Codes are displayed once after explicit owner review and never persisted in browser storage or logged.
- Main-admin issuance requires current `requireAdmin` plus existing `RTG_LAYOUT_EDITOR_ADMIN_IDS`; database repeats admin-seat and active-assignment checks. Timing codes bind a named existing account/session assignment and its revision. No account or assignment is automatically created.
- Maximum code lifetime 24 hours, capped further by assignment expiry. Cookie lifetime 20 minutes, capped by code expiry. Every request rechecks code, cookie, owner seat and assignment; assignment revision changes and revocation invalidate cookies.
- Atomic per-code (5/minute) and global (100/minute) exchange limits. No caller-supplied IP header is trusted. Counters include malformed attempts and expire after one day.
- All POST operations require exact configured Origin. The durable transaction keeps credential and assignment locks through native timing commit. Timing uses the existing strict scoped writer. Advanced allows session/rider setup, corrections and closing/reopening only; cannot grant access, import history, publish or change a session to Live.
- Original request IDs, CAS and native audit remain mandatory. Token-free pending commands survive reload in sessionStorage, bound to the server-verified credential ID, with explicit retry and 30-minute expiry. A different code cannot replay them. Issuance uncertainty instructs owner to inspect/revoke the new entry instead of blindly generating another.
- Photo uploads are not added to code sessions. Existing operational photo/admin controls remain unchanged.

## Exact proposed database change

File: `supabase/proposals/timing-code-access.sql` (review candidate, not applied migration).

Creates four new RLS-protected tables: `ridge_timing_codes`, `ridge_timing_code_sessions`, `ridge_timing_code_rates`, `ridge_timing_code_audit`. No anon/authenticated table privileges or RLS policies. Only service_role gets necessary access; audit is append-only for service_role.

Creates two new SECURITY INVOKER functions with empty search_path: `ridge_code_access(text,jsonb)` and `ridge_code_commit(text,uuid,bigint,uuid,jsonb,jsonb,jsonb,jsonb)`. Execute is service_role only. Existing tables, functions, grants, RLS, owner guards, Ridge history and publication remain unchanged. Installation inserts no codes or records.

## Approval and activation steps

1. Approve installing the exact reviewed SQL on TEST `cxwfjrntfqlyaqppxggh` only; register an actual migration filename/history receipt with the supported migration tool.
2. Provision a new server-only `RTG_TIMING_CODE_PEPPER` (at least 32 random bytes) without displaying it in chat/logs; set `RTG_TIMING_CODE_ORIGIN=https://rtg-website-three.vercel.app` and enable `RTG_TIMING_CODES_ENABLED=true` only on the existing TEST project. Never use VITE/public prefixes.
3. Deploy the exact reviewed commit; verify new tables/functions/permissions and anonymous refusal before real issuance. A named existing volunteer assignment is required before issuing a timing code; distinct owner code requires explicit owner issuance. No bulk or automatic codes.
4. Authenticated acceptance: owner issues a reviewed code, confirms limited assigned roster and expiry, revokes it and verifies denial. Use explicitly authorized synthetic TEST records for write acceptance; never historical rider timing. Until then do not claim authenticated operational acceptance.

Risk: possession of a valid code permits its scoped actions until expiry/revocation; the owner must share it privately. This replaces account login for the external code route only, not main administration. Exact original Apps Script advanced behavior remains unverified.

Rollback: disable `RTG_TIMING_CODES_ENABLED` and redeploy; code endpoints deny before database access. Revoke code rows through owner controls before re-enabling. Keep audit for reconciliation; do not delete storage or alter native history to roll back. Existing account timer continues working.

## Validation

Local PGlite tests execute the candidate SQL with synthetic identities and state: browser-role denial, issuance constraints, hash-free list projection, cookie bounds, atomic idempotent timing, revocation, assignment revision invalidation, rate limits, and advanced command denial. API and transport tests cover disabled feature, owner/Origin/cookie guards, removed owner, reload recovery, code switch and expiry. No real code is generated during tests. Full suite retains two known Python-environment failures; see final execution receipt for exact totals.

## Pre-activation review corrections

Writes carry the expected credential ID and the database checks it under the credential lock before mutation or receipt replay. Receipts bind the original credential. Authorization denial after a lost response preserves pending reconciliation data; it is not proof the earlier mutation failed. Code issuer IDs are immutable audit identifiers without a foreign key to admin_profiles; current admin-seat existence is still checked on use, so deleting a seat revokes use without deleting audit history.

Separate existing issue: ridge_timing_assignments.assigned_by references admin_profiles without ON DELETE handling and can block deleting an assigning admin. This pre-existing assignment schema is unchanged; a separate reviewed lifecycle migration is required before claiming that all admin revocation paths are unblocked. No access-policy expansion has been applied.

## Volunteer TEST date correction (separate pending database replacement)

`supabase/proposals/volunteer-testing-dates.sql` replaces only the body of existing `ridge_timing_commit(bigint,uuid,uuid,jsonb,jsonb,jsonb)`. It exempts TESTING mode from the session-date comparison while retaining actual timestamp/10-minute clock validation and LIVE same-day restriction. Signature, SECURITY INVOKER, empty search_path, assignments, roster validation, CAS, audit and ACLs remain unchanged. No rows, grants or policies change. Installation requires approval for this exact TEST function replacement; rollback is the function body in migration `20261021152152_ridge_volunteer_timing_access.sql`. Existing owner JavaScript date fix is deployed separately. Actual account and code API handlers are tested against PGlite executing both functions for start/pass/end, with LIVE/stale-clock refusal. This SQL has not been applied externally.

The client captures an immutable credential identity before awaiting its preflight read, and uses that same identity for request binding, queue keys and cleanup, including concurrent refresh tests.

## TEST activation receipt

Approved installation applied to TEST cxwfjrntfqlyaqppxggh as migration 20261021170333_ridge_scoped_code_access_and_testing_dates. It includes the narrow volunteer TEST-date replacement above. Effective ACL checks confirmed RLS on all four tables, no anon/authenticated reads or function execution, and no service-role audit UPDATE/DELETE. Server-only secret/origin/flag configured only for the existing TEST project production alias; no real codes or assignments issued. Earlier inactive-candidate descriptions document the review sequence, not current activation state. Runtime deployment receipt and credential acceptance remain separately verified.
