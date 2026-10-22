# Combined sitewide draft candidate — local only

Base deployment: fc19dd308b6003bdc6a04228a0d38aa347b5c847. Frozen reviewed bundle 4186220d6cc8d5227eec02acb57016f205d4236b702b65738e7aac560ac940c8 remains unchanged.

## Connected native coverage

- Home: 8 editable native sections, read-only shared chrome. Hero imagery and text motion supported.
- Community index: 6 native sections; existing copy and selected images, resource records read-only.
- Community detail: published UUID selector; 4 section style editors using actual detail component; group/contact/activity data read-only.
- Lab: 3 sections; existing editable copy and style, fixed launch wording and computed/resource data read-only.
- About: 9 sections; hero/story images, headings, origin/mission/vision/road-ahead copy, styles. Statistical values and static resource lists not editable.
- Volunteer: 3 sections; introductory text, headings and button labels, styles. Existing role records, recruitment status and payment/placement notices not editable.

All use the same page-bound shared-draft design in this candidate. This is NOT a statement of deployed shared-save functionality. Real authenticated acceptance is pending.

## Database proposal delta

Still creates only public.rtg_write_site_draft(text,bigint,jsonb,uuid), with identical existing service-role-only execute grant and no changed existing grants. The combined version adds about and volunteer to its allowed page-key alternatives. No additional RPC, table, policy or public publish capability. Do not apply the frozen older allowlist for this combined candidate; review this candidate SQL before any application.

## Server enforcement and preservation

Both server and client use the pure page-specific manifest validator. API tests directly inject forbidden volunteer application/pay/role fields, shared chrome sections, About counts, rider results and community contacts and verify rejection before RPC. Public publish/read actions for site/* are rejected. Actor comes from the existing verified admin plus owner allowlist. Existing Ridge API/model/RPC are retained. Schema home-visual-v1 and original Home local-storage key remain unchanged; pages retain separate local keys and mounted unsaved state.

Revision conflicts disable further saves until read; lost or malformed save receipts are uncertain. Shared reads require an explicit replace/keep choice. A completed in-flight save never replaces later edits. Identical immediate retry is idempotent; changed actor/payload or intervening revision conflicts.

## Remaining route registry coverage (25 of 31 patterns)

- /weekly-rides — Weekly rides
- /weekly-rides/:slug — Weekly session
- /events — Events
- /events/:slug — Event detail
- /merchandise — Merchandise
- /merchandise/:id — Product detail
- /checkout — Checkout
- /order-confirmation/:orderId — Order confirmation
- /challenges — Challenges
- /calendar — Calendar
- /race-results — Race results
- /lab/ridge — Ridge
- /membership — Membership
- /membership/checkout — Membership checkout
- /safety — Safety
- /dashboard — Dashboard
- /blog — Blog
- /sponsors — Sponsors
- /gallery — Gallery
- /contact — Contact
- /chat — Chat
- /faq — FAQ
- /privacy — Privacy
- /terms — Terms
- /community-guidelines — Community guidelines

These routes remain explicitly not connected. No approximate templates, public publishing, application opening, rider writes or Safari operations were added.
