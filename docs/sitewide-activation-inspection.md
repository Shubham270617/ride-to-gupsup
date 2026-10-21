# TEST sitewide draft activation review — 21 October 2026

Read-only inspection target: Supabase cxwfjrntfqlyaqppxggh. No SQL changes were applied.

## Verified existing database

- page_layout_drafts, page_layout_published, page_layout_revisions exist with the expected text/jsonb/bigint/UUID/timestamp columns and constraints.
- Draft document constraint requires schema=1 and sections array; the proposed native-page envelope satisfies it. Page keys allow site/home, site/community, site/lab and site/community/<UUID>.
- RLS enabled on all three tables, no policies. Effective anon/authenticated SELECT, INSERT/UPDATE and existing RPC EXECUTE all false. service_role has them. Sequence usage is already available to service_role.
- rtg_write_page_layout(text,bigint,jsonb,uuid,boolean) is SECURITY INVOKER, empty search_path, per-page advisory lock then revision check, atomic draft/publish/audit operations. ACL only postgres and service_role.
- rtg_write_site_draft(text,bigint,jsonb,uuid) does not exist. Zero site/* drafts. No draft document contents or rider data were read.

## Exact proposed database action

Apply docs/proposals/site-visual-drafts.sql to this TEST project only. It uses CREATE FUNCTION (not CREATE OR REPLACE) for public.rtg_write_site_draft(p_page_key text,p_expected_revision bigint,p_document jsonb,p_actor uuid), returning jsonb. All statements are in one transaction; if the function unexpectedly exists, creation fails rather than replacing it.

Permission delta: revoke default execution on this NEW function from PUBLIC, anon and authenticated; grant EXECUTE only to existing service_role. postgres retains ownership. No changes to any existing function grant, table/sequence grant, RLS policy, admin seat or environment allowlist. No new browser/database access.

Applying the function alone changes no data. Subsequent explicitly requested owner saves insert/update only site/* draft rows and append save audit rows. They never modify published snapshots, Ridge rows, site settings/images, community records, rider data or source tables.

## Server and retry review

The server retains requireAdmin (getUser plus current admin_profiles membership) and the existing RTG_LAYOUT_EDITOR_ADMIN_IDS allowlist. No user_metadata authorization. New site/* save requests validate a strict shared field/style allowlist, size limit, safe links, envelope, and exact page-to-key binding. Community-detail payloads are styles only. Public reads/publish requests for site/* are rejected. Errors do not expose underlying database details.

RPC lock+expected revision rejects stale writes. Identical immediate retry from same verified actor with same document returns its existing revision and does not duplicate audit. Another actor, different payload or intervening revision conflicts. This is latest-write idempotence, not an unlimited historical operation-ID registry. Client does not automatically retry; network/timeouts/malformed successful receipts are unknown outcomes and require a fresh read. Explicit local replace/keep choice protects unsaved work.

## Rollback

Redeploy previous TEST Home-only commit fc19dd308b6003bdc6a04228a0d38aa347b5c847 to remove new UI/server routes to the RPC. Then DROP FUNCTION public.rtg_write_site_draft(text,bigint,jsonb,uuid) if approved. Existing site/* drafts/audit rows should remain for recovery; no deletion is required. Existing Ridge RPC, grants and rows are unaffected. The original SQL transaction rolls back fully if initial activation fails.

## Approval scope to request

One approval for TEST-only RPC creation plus checked application deployment, followed by an owner-authenticated shared draft save/reload acceptance test preserving existing content. No flags, credentials, access policies, live database, public publishing or Safari operation are included. An authorized owner session in the permitted browser remains necessary; current IAB has none. Shared persistence is locally tested, not deployed or accepted end-to-end.
