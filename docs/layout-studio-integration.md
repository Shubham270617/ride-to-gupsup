# Layout Studio integration status

## Implemented, local only

- `src/lib/layout/model.js`: schema-1 import compatibility with supplied RTG Layout Studio, validated desktop foundation/mobile overrides and per-page local draft keys.
- `src/components/layout/LayoutRenderer.jsx`: native React rendering (no iframe/HTML injection), host-provided real results and actions, desktop/mobile style application.
- `src/admin/pages/LayoutStudioAdmin.jsx`: section management, shared copy, device controls, JSON import/export, undo and clearly labelled browser-local drafts.
- `tests/src/layout/`: schema safety, device inheritance/reset, local isolation, UI edits/save/undo and rendering tests.

The referenced prototype's `assets/ridge.jpg` is not silently linked to an unrelated deployed asset. Import clears that bundled relative photo; uploaded image data in the JSON remains supported. The UI accepts HTTPS image URLs; a proper asset uploader still needs integration. It does not invent rider records, statistics or action destinations.

## Route integration (lead-owned files)

Lazy import `LayoutStudioAdmin` from `./admin/pages/LayoutStudioAdmin`. Add a `layout-studio` child route inside the existing protected admin route and a sidebar entry labelled `Layout Studio`. Pass an explicit pageKey (for example `ridge`, `community/<stable-id>` or `volunteer`) and the page's draft document. Do not switch pageKey while unsaved edits exist without a Save/Discard/Cancel choice. Do not place this component on a public route.

No public page is automatically replaced. `LayoutRenderer` should be mounted only where a validated, approved published document has been loaded, with `sectionData` derived from that page's actual data. Its actions take safe same-origin paths from the host, not arbitrary imported link URLs.

## Shared backend design — NOT installed or claimed working

Do not store publishable documents in the existing generic settings table until its policies have been reviewed. Use separate draft and published representations:

- `page_layout_drafts`: page key, validated schema-1 JSON, integer revision, updated-by UUID and server timestamp; admin-only reads/writes.
- `page_layout_revisions`: immutable audit history, actor, timestamp and prior/current revision; admin-only.
- `page_layout_published`: page key, validated document, revision and published-at; public read of only explicitly published records, no anonymous writes.
- Private source images plus explicitly published assets; validate MIME and size, use unique immutable asset paths. Avoid user-supplied SVG.

Server-side draft-save and publish operations must verify the current authenticated user against the existing `is_admin()`/admin-seat policy, not trust the React route. The current bootstrap/admin-grant policy must be audited before enabling publishing. Validate the JSON server-side using the same allowlisted schema. Use expected-revision compare-and-swap to reject stale edits. Publish must transactionally copy a validated draft revision and append audit history; failed saves/publishes must leave prior public content intact. Revoke public access to unpublished assets as appropriate, with deliberate migration/permission approval.

Required tests before enabling: unauthorized/anonymous writes denied; unpublished drafts unreadable publicly; authenticated non-admin rejected; stale revision conflicts; publish failure rollback; correct real page data; mobile/desktop visual QA; refresh/back navigation without silent draft loss; repeated save/publish clicks; recovery from lost connection. None of those backend tests have run because the copied test Supabase project is currently inaccessible.

This change does not run SQL, create credentials, alter permissions, contact a service or publish a page. `Save local draft` is intentionally not described as a shared save. There is no Publish button until backend semantics are verified.

## Prepared shared persistence implementation

`api-lib/pageLayouts.js` is now prepared (not routed/deployed) with a fail-closed `RTG_LAYOUT_EDITOR_ENABLED` gate, verified `requireAdmin` session and an additional explicit `RTG_LAYOUT_EDITOR_ADMIN_IDS` allowlist. This extra restriction is deliberate: the existing first-three-admin bootstrap policy has not yet been safely resolved. Public GET requests read only `page_layout_published`; no caller-selected table or draft projection is accepted. Responses are non-cacheable. The draft/publish write uses a single atomic RPC, expected revision and verified actor. `src/lib/layout/store.js` is the browser adapter; inject a token reader from the existing signed-in session. Never put a service-role key in this adapter.

The isolated SQL proposal is `docs/proposals/page-layouts.sql`, deliberately outside migrations and NOT executed. It uses service-role-only table/function access, no anonymous/authenticated direct table grants, advisory serialization for initial creation and updates, immutable history and atomic publishing. Runtime RLS/transaction behavior still needs a test database and security review; mock tests do not prove database policy enforcement.

`LayoutStudioAdmin` accepts an optional `store`. Without it the page remains explicitly local. With it, separate Load shared draft, Save shared draft and Publish saved revision actions become available. Publish is disabled until a saved server revision exists and there are no unsaved edits. Errors retain edits and never show success. Request-time busy state prevents repeated operations. Do not pass a store until the endpoint and security prerequisites are approved and verified.

The new React rendering is a foundation rather than pixel-perfect prototype parity. It implements hero split/overlay/centered and data grid/list/carousel; placeholder CTA layout styling is simplified. Full device visual QA, image-upload storage and connecting actual per-page data remain work before production readiness.
