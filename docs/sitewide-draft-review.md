# Sitewide draft persistence — local review, not applied

The deployed Home-only commit remains fc19dd308b6003bdc6a04228a0d38aa347b5c847. This work is isolated in rtg-editor-next and is not pushed/deployed.

## Persistence contract

- Reuse /api/admin/page-layouts and its existing requireAdmin plus RTG_LAYOUT_EDITOR_ADMIN_IDS checks. No new owner, bootstrap, environment, RLS, or client-table access policy.
- Reserve site/home, site/community, site/lab and site/community/<UUID>. Existing Ridge keys/schema/model and RPC remain unchanged.
- Store the native draft inside a schema-1 one-section envelope, compatible with the existing draft-table check. Shared pure validation whitelists text/image keys and section styles per page. No arbitrary CSS or record updates.
- Local proposal docs/proposals/site-visual-drafts.sql adds only rtg_write_site_draft: SECURITY INVOKER, existing tables, same per-page advisory lock, expected revision, atomic draft/audit write. Identical immediate retry by the same actor returns the same revision. Different payload/actor or intervening revision conflicts. No automatic browser retries.
- The new RPC is revoked from PUBLIC/anon/authenticated and executable only by existing service_role. This preserves the existing server-only access model. Deployment/application still needs explicit approval.
- Public reads and publish actions for site/* are rejected. No public renderer consumes these shared drafts.
- UI checks shared revision before save, shows the incoming shared revision without replacing local edits, and requires explicit replace/keep choice. A save captures a snapshot; later edits remain. Unknown mutation outcome disables saves until a fresh successful read. Local storage retains its original Home key and separate page keys.

## Real community detail selection

The picker queries only id,name from published community_network_groups through the existing client. No static fallback. Selected UUID opens the actual CommunityDetail component, with its existing published group and exact-organiser activity read. Four section wrappers expose style edits only: identity, about, joining info, activities. Underlying group/contact/activity records stay read-only. If configuration/read/publication is unavailable, show that error/empty state instead of a fabricated page.

## External activation pending

Before any application: inspect actual TEST table/function definitions against this proposal, review the SQL and server patch, and approve application to the TEST database only. No migration has been applied; no external flags, grants, drafts or authentication have been changed. Existing IAB lacks the owner session, so authenticated real-data acceptance remains pending; Safari remains off limits.
