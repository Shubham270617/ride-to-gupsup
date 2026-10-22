# Native RTG Crew module

Reference: user-supplied `RTG_Volunteer_Install.txt`, Library `libfile_1733cf649f5081918c813991d5bc1f8a`.

## Local implementation

- `src/pages/Volunteer.jsx`: native role explorer, URL-preserved filters/details, responsive cards, closed-applications notice. No iframe or Apps Script call.
- `src/lib/volunteerRoles.js`: all 11 reference roles. Proposed compensation, named leads and example shifts are not included in this public model. Task wording uses role-based leads rather than unapproved names.
- `src/components/volunteer/VolunteerRoleEditor.jsx`: draft-content editor. `onSave` is a required integration callback for saving. Without it, saving is disabled and the limitation is visible. Parent should mount with `key={role.id}` when switching records.
- `tests/src/volunteer/Volunteer.test.jsx`: role/filter/history/detail, closed-state, validation and save-failure/retry coverage. No network or real database calls.

Public route integration in `App.jsx`:

```jsx
import Volunteer from "./pages/Volunteer";
// Within the existing public layout:
<Route path="volunteer" element={<Volunteer />} />
```

Add a link to `/volunteer` in the existing Community or navigation experience; do not create a new deployment.

## Backend/admin integration still required

`src/lib/volunteerRepository.js` is implemented and unit-tested for public snapshot reads, admin draft reads/create/update and optimistic version conflicts. It strips unknown fields, including pay/lead/application toggles. All authorization still depends on the database RLS, not the browser. `docs/volunteer-role-schema-plan.sql` is a review-only, unexecuted plan for separate admin draft and approved public tables with explicit grants, RLS and version triggers. It creates no application table and opens no recruitment. No numbered migration or canonical schema file was changed.

`src/admin/pages/VolunteerAdmin.jsx` can be mounted at `/admin/volunteer` under the existing protected admin layout. It defaults to reference preview with saving disabled. Set `persistenceEnabled` only after test schema/RLS validation; never use that UI flag as security. In enabled mode it loads draft rows, surfaces access/setup errors with retry, and passes actual persisted saves to the editor. Switching roles prompts to keep or discard unsaved edits; role switching is disabled while a save is pending.

Security activation blocker: audit of repository code found a bootstrap-admin-seat path that may allow self-granted admin membership. The proposed policies rely on `public.is_admin()`, so they must not be described as safely authorized or activated until admin-seat creation is contained and existing admin identities are reviewed. This is a source-code finding, not a claim of a verified live exploit. No change to bootstrap/admin security is included in this module.

This page currently uses the reviewed source catalogue. Editing via the reusable editor is not connected to public data yet. No production or test database migration was executed.

Use the existing protected admin routing and server-side admin verification, not a client-only flag. Store a single canonical role catalogue rather than duplicating the Apps Script front/back catalogues. Suggested fields: stable `id`, `title`, `team`, `location`, `plans`, `intro`, `tasks`, `fit`, `deliverable`, `ridge`, `sort_order`, `published`, revision/version fields. Validate lengths, team/commitment allowlists and arrays server-side. Only published approved fields should reach public readers. Keep proposed pay/contact/lead details in a separate private administrative record until explicitly approved for publication.

The editor's `onSave` must await the authorized backend write and return the stored record with the matching ID. Return rejection on errors or concurrent-version conflicts, not optimistic success. Pass the refreshed canonical catalogue to the public page only after save/review/publish completion. `VolunteerRoleEditor` edits role title, team, description, location, responsibilities, fit, handover and commitments. Review and publication remain separate actions.

Do not enable applications solely by changing a frontend boolean. Before collection opens, implement and verify a protected application API, validation, duplicate/rate controls, retention/deletion/contact process and private admin review. Application data must not be publicly readable. Never expose service credentials in the client. Reuse the reference's adults-only eligibility and consent intentions only after the actual programme/privacy terms are approved. Payments, shifts and internships require explicit approval; the current page makes no offer and accepts no personal details.

## Remaining verification

- Browser/mobile visual QA after the route is integrated.
- Actual test-project schema, admin permissions and backend storage (current test Supabase access unavailable).
- Public role content and programme approval before recruitment; draft leads, rates and sample schedules remain deliberately excluded.
- Full aggregate suite/build after all parallel changes are integrated.
