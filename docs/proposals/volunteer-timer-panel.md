# Standalone volunteer timing — local activation candidate

## TEST activation receipt

Owner approved activation. Installed on TEST project cxwfjrntfqlyaqppxggh as migration 20261021152152_ridge_volunteer_timing_access; the matching file in supabase/migrations is authoritative. Supabase CLI was unavailable locally, so this filename mirrors the returned remote migration history version. The proposals SQL below is the archived review candidate, not a second migration to run.

Verified after installation: zero assignments and zero access-audit rows; both tables RLS enabled and inaccessible to anon/authenticated; both new functions service-role-only SECURITY INVOKER. Existing ridge_commit/is_admin definitions and ACLs unchanged. Native Ridge workspace/publication remain version 2 with unchanged state/feed hashes and two original timing audit rows. No actual grants, account creation or timing operations performed.

RTG_VOLUNTEER_TIMING_ACCESS_ENABLED=true was added only to the main deployment environment of existing TEST Vercel project prj_mbrInjM6Ton7fB1qynFP1KdivPk8. Existing owner allowlist unchanged. Deployment and authenticated acceptance are tracked in the task receipt; the pre-activation review below records the original proposal and local test limits.

Owner approved individual logins with attendance/timing on assigned sessions. Corrections, photos, closing, publishing and full-admin access remain owner-only. No identities were supplied. No assignments, migration, deployment or real timing writes have occurred. Existing main admin guard/RPC/engine are unchanged.

## Reference and local coverage

Apps Script opened read-only. Observed four tabs (Riders, Timer, Rider Photos, Data), attendance, Testing/Live modes, individual START L4/L5, Finish Session password notice, photo capture/gallery description, recorded/accepted timing columns. Advanced settings required a password; cancelled without credentials. No reference session was modified. Running transitions, late arrival, correction dialogs and social export were not exercised; exact parity is unproven.

Local /volunteer/ridge renders outside AdminLayout and uses the existing login UI/identity. Four-step responsive layout, attendance, group start, individual start, pass and finish reuse the native engine. Official history remains locked. Photos/advanced/session-close controls state their role limits and cannot mutate. Live sessions warn that saving timing updates their existing published results.

volunteer-timer-local.html is a synthetic harness, not a build entry, with no network writes. Browser verified attendance, group start, pass to lap two and finish to Ready L3; 390px mobile layout inspected. Tests also cover late arrival and recorded-rider removal prevention.

## Server boundary

api-lib/volunteerRidge.js authenticates with getUser, rejects anonymous identities, checks current assignments and permits only attendance/group_start/start/pass/end. No client-supplied state, feed, actor or extra command fields accepted. Response allowlist includes assigned names and lap fields, no contacts/photos/provenance/audits.

Existing dispatcher serves /api/admin/volunteer-ridge to remain within twelve Vercel functions. URL naming is packaging, not main-admin authorization: the handler has independent identity/assignment checks and never substitutes an owner identity.

## Exact activation proposal — unapplied

supabase/proposals/volunteer-timer.sql is review SQL, not a CLI-generated or installed migration. Convert after review.

- New public.ridge_timing_assignments: user_id references auth.users; session_id; explicit roster_rider_ids; expires_at; revoked_at; assigned_by references admin_profiles; created_at. Composite user/session primary key.
- RLS enabled. No anon/authenticated policies or table privileges. SELECT/INSERT/UPDATE/DELETE on this new table only to service_role.
- New public.ridge_timing_commit(bigint,uuid,uuid,jsonb,jsonb,jsonb), SECURITY INVOKER, empty search_path, EXECUTE only service_role.
- New public.ridge_timing_access_audit: request ID, actual owner actor, target user/session, revision, exact command and previous assignment. RLS enabled; no anon/authenticated privileges or policies; SELECT/INSERT only for service_role.
- New public.ridge_manage_timing_assignment(uuid,uuid,uuid,text,text[],timestamptz,boolean,bigint): service_role-only SECURITY INVOKER, empty search_path. Checks existing admin seat, locks workspace and assignment, applies assignment revision CAS, idempotent request receipts, validates open session/explicit roster/maximum seven-day expiry, and atomically audits grant/revoke. Does not change timing state/publication. Assignment table has a revision column.
- No existing functions, grants, RLS, membership or owner guard replaced. Installation inserts no rows.

Writer locks workspace then assignment; rechecks active grant before receipts/retries, enforces command allowlist, CAS and request actor/command. It constructs expected attendance/lap changes and compares entire resulting state. Rider metadata, other sessions and official history cannot change. Trusted server native engine generates feed; service_role remains trusted for feed calculation. Workspace/feed/audit commit atomically under actual volunteer actor. No public readership expansion or session publication-mode control.

## Recovery and acceptance limits

20-second write timeout. Uncertain outcomes block new actions; explicit retry preserves request ID/version/tap instant. No automatic replay or offline queue. Definitive non-commit errors can clear pending state. Token-free tab memory preserves an uncertain controller over SPA navigation for the same user/login timestamp; retry expires after 30 minutes and requires owner reconciliation. Full reload/closing clears memory; beforeunload warns, but audit reconciliation remains necessary if user proceeds.

Synthetic PGlite/API tests and isolated browser preview are local only. Fresh-login/assigned-account end-to-end acceptance remains pending installation and explicitly named operator grants. No accounts/invitations created.

## Owner management and reconciliation

/admin/ridge-volunteers now has assignment preparation, exact existing verified-email account resolution, explicit session/roster/expiry review, grant and revoke confirmation, and read-only reconciliation. It is linked from the admin sidebar; server authorization additionally requires the existing RTG_LAYOUT_EDITOR_ADMIN_IDS allowlist, so an ordinary admin seat alone cannot operate it. No values in that existing allowlist were modified.

/api/admin/ridge-timing-owner is dispatched within the same twelve-function deployment. New RTG_VOLUNTEER_TIMING_ACCESS_ENABLED defaults disabled; both UI grant/revoke and server mutation refuse until activation is explicitly reviewed. This flag has NOT been set anywhere. Its eventual activation is a separate consequential change, followed by individually reviewed named grants. Exact email is resolved through existing profile ID and confirmed against auth.getUserById; it never creates an account or uses editable metadata for authority.

Owner reconciliation accepts original timing request ID, or exact operator UUID plus session for the latest twenty committed receipts. It allowlists action/time/lap/version/actor identifiers and never replays or corrects timing. Missing receipt is explicitly inconclusive while a request might still be in flight. The owner must inspect matching operator/session/captured time before resuming. This avoids a full reload turning an uncertain write into a new mutation; it does not pretend an absent receipt proves a failed write.

volunteer-owner-local.html is a synthetic owner preview with activationReady=false. Browser verified exact account/session/roster/expiry review with Confirm grant disabled, and missing-receipt warning. No actual grant or authentication was performed.

Before activation: review SQL/permission footprint, generate migration, validate TEST-only privileges, deploy checked code, then grant only named approved operators and run synthetic authenticated acceptance. Rollback access by revoking assignments first, then remove route/handler. Retain audit/state/publication and assignment evidence. Never restore an old whole-workspace snapshot over later timings.
