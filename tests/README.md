# RTG tests

Automated tests for the Ride Tea GupShup site, run with [Vitest](https://vitest.dev).
Front-end tests use jsdom and [Testing Library](https://testing-library.com).

## Running them

```bash
npm install          # once (this also runs `vite build`, via postinstall)
npm test             # run everything once (vitest run)
npm run test:watch   # re-run on save while working

npx vitest run tests/api-lib/passwordReset.test.js   # one file
npx vitest run --project server                      # only api/ + api-lib/
npx vitest run --project web                         # only src/
```

Nothing in this suite talks to a real service. Supabase is replaced by a fake
query builder (`helpers/fakeSupabase.js`). `fetch` is stubbed before every
test (`setup/noNetwork.js`), and any call a test didn't plan for fails the
test. So Brevo, Strava, Anthropic and our own `/api` routes are never reached,
and no `.env` file is needed. Vite also reads env files from `tests/` only
(`envDir` in `vitest.config.js`), which keeps a developer's `.env.local` out of
the tests.

The config lives in `vitest.config.js`, kept separate from `vite.config.js` so
the production build doesn't change. It defines two projects:

| Project  | Environment | Files                                                        |
| -------- | ----------- | ------------------------------------------------------------ |
| `server` | Node        | `tests/api/**`, `tests/api-lib/**`, `tests/repo/**`          |
| `web`    | jsdom       | `tests/src/**` (plus `setup/web.js`: jest-dom, cleanup, instant Framer Motion) |

## Marked tests

- **`it.fails`**: the test describes the *correct* behaviour, and it fails
  today because of a known bug that hasn't been fixed. Vitest reports these as
  "expected fail". When someone fixes the bug, the test starts passing and
  Vitest flags it. At that point, change `it.fails` back to `it`.
- **`it.todo`**: behaviour that needs a decision before it can be written.

## What each file covers

### Helpers

| File | Purpose |
| --- | --- |
| `helpers/fakeSupabase.js` | Chainable fake of the supabase-js client. It records every query (table, action, payload, filters, order, range, single/maybeSingle) and answers it from responders registered with `db.on(table, result, { action, match, times })`. It also fakes `auth.getUser`, `auth.admin.*` and `storage`. |
| `helpers/http.js` | `mockReq` / `mockRes` doubles for calling serverless handlers directly, plus `jsonResponse` for stubbed `fetch`. |
| `setup/noNetwork.js` | Blocks the network: `fetch` throws unless a test stubs it. |
| `setup/web.js` | jest-dom matchers, DOM cleanup, cleared storage, Framer Motion animations skipped. |

### Server: `tests/api-lib`, `tests/api`

| File | Covers |
| --- | --- |
| `api-lib/passwordReset.test.js` | Forgot-password API, every action. **Guards:** 405, `server_misconfigured` (no Supabase, OTP_SECRET, BREVO_API_KEY or MAIL_FROM_EMAIL), unknown action, DB errors become a generic 500. **request:** email validation; codes and links stored only as HMACs; 30-minute expiry; older codes retired first; x-forwarded-for IP; 45 s cooldown with `retryAfter`; 5 per email and 15 per IP per hour (with boundary cases); unknown address answers `ok`, writes a row and sends nothing; known and unknown addresses get identical responses; synthetic `@members.` address is never looked up or emailed; Brevo failure retires the row and returns 502; codes are zero-padded. **verify:** right and wrong code, attempt counting conditioned on the value read (optimistic concurrency), losing the attempt race returns `invalid_code`, the 8-check cap, malformed codes, link token path (no attempt counting, `invalid_link`). **complete:** weak, long and non-string passwords; the row is consumed *before* `updateUserById`; a raced consume changes nothing; `password_rejected`; `generateLink` failure returns `token_hash: null`. **Round trip:** the code and link in the sent email verify against the stored hashes. `resetEmail()` content. |
| `api-lib/welcomeEmail.test.js` | 405 and 401 (missing token, invalid session), misconfiguration, lowercase `bearer`, synthetic or missing email, the 7-day age limit, `already_sent` through the conditional claim, claim error, success (recipient, first-name fallbacks), Brevo failure releases the claim and returns 502, Host fallback for links. `welcomeContent()` HTML-escapes the name in the body and preheader and leaves the subject and text plain. |
| `api-lib/mailer.test.js` | Brevo request shape (URL, headers, sender, `to`, html/text), `MAIL_FROM_NAME` default, success on any 2xx, error on non-2xx (status plus truncated body, including when the body can't be read), network errors. |
| `api-lib/emailLayout.test.js` | `escapeHtml` (all five characters, `&` first, null/number), `siteUrl` (trailing slashes, Host fallback, a note on host-header risk), `button`, `emailLayout` (doc structure, escaped preheader, images and socials, optional footer note). |
| `api-lib/phoneLogin.test.js` | 405, missing fields, misconfiguration, unknown phone and wrong password both give the same 401, exact phone lookup then password sign-in with the profile's email, duplicate phone numbers. |
| `api-lib/cookies.test.js` | `parseCookies` (decoding, `=` inside values, junk fragments) and `serializeCookie` (flags, encoding, Max-Age, Secure in production, `maxAge: 0` deletes, round trip). |
| `api-lib/providers.test.js` | When Strava and XFitConnect count as configured, Strava scope, `parseProfile` for both providers. `GET /api/auth/providers`. `/api/auth/[provider]/start`: 404, `not_configured` redirect, authorize URL, state cookie, intent cookie. |
| `api-lib/requireAdmin.test.js` | Every refusal (401, 500, 403 `not_authorised`, 403 `not_admin`). Requires both the allowlist entry and the admin row. Email is lowercased. |
| `api-lib/stravaSync.test.js` | Leaderboard recompute (sums, paging past 1000 rows, errors are thrown rather than writing short totals). Single-activity sync (upsert `onConflict`, token missing, fetch failure, upsert error). Owner-scoped delete. Backfill (watermark resume, `before` cursor stepping, short page or empty page means done, 429, `maxPages`, deadline, bad `start_date`). Connect-time backfill never throws. Reset. |
| `api-lib/stravaAuth.test.js` | Token reuse versus refresh inside the 5-minute window, a conditional write of the rotated refresh token, refresh failure. `destroyStorageAsset` path parsing and errors. |
| `api/auth/account.test.js` | Routes `op=` to phone-login, password-reset and welcome. 404 for missing, unknown or array ops, and for inherited names such as `constructor`, `toString`, `__proto__` (regression test). |
| `api/auth/claim-bootstrap-admin.test.js` | 405, 401 and 500 guards. Existing admin. 403 for an address not on the allowlist (nothing inserted). Allowlist query failure. Successful grant. Seat-cap trigger maps to 409 `seats_full`, any other insert error to 500 `grant_failed`. |
| `api/auth/delete-account.test.js` | Guards. Deletes only the caller's own account (a body `userId` is ignored). Delete failure. |
| `api/admin/strava-resync.test.js` | Method check, requireAdmin refusal passed through, every reset happens before any advance, per-member errors, list failure. |
| `api/cron/cron.test.js` | Both cron jobs **refuse to run without `CRON_SECRET`** and return 401 for every wrong or missing header. purge-media: 2-day cutoff, per-row failures. strava-backfill: member selection, order and limit, per-member failures, `?userId=`. |
| `api/webhooks/strava.test.js` | Handshake: right token, wrong token, wrong mode, and an unset verify token (regression test). Events: non-activity, unknown athlete, create/update sync, delete, a sync failure returns 500 so Strava redelivers, misconfiguration. Also an `it.todo` for forged delete events. |
| `repo/consistency.test.js` | Function count within Vercel Hobby's 12, every relative import under `api/` resolves, no client code still calls the old `/api/auth/phone-login`, migration 021 and 022 columns match the code, `schema.sql` includes both. `it.fails` for `server.js` importing a missing module. |

### Front end: `tests/src`

| File | Covers |
| --- | --- |
| `src/lib/authStorage.test.js` | "Remember me": defaults to on, opt-out, which store each setting writes to and clears, read fallback across stores, `removeItem` clears both, migration of `sb-*` keys in both directions (other keys left alone), storage that throws on access or on write. |
| `src/lib/utils.test.js` | `format.js`, `profileFields.ageFromDob` (birthday boundaries, future and invalid dates), `responsiveImage.js`, `upi.js` (deep link and QR), `ics.js` (all-day and timed events, escaping, filename, cleanup), `isSupabaseStorageUrl`. |
| `src/lib/labData.test.js` | Text helpers. IST "today". Week, month, quarter, half-year and year periods plus the like-for-like previous range. Board ranking (ties, % change, gender and age filters, speed eligibility). Ridge Repeats: clock parsing, lap and progress scoring, merging riders across sessions, overall record, `rankRows`, standings modes, awards. Membership quotes and active-club check. |
| `src/lib/apiClients.test.js` | `passwordReset.js` client (endpoint, body, error-code to message mapping, `retryAfter`, generic fallbacks, sign-in with `verifyOtp` after complete), `phoneAuth.js`, `adminBootstrap.js`, `aiChat.js`. |
| `src/lib/hooks.test.jsx` | `useWelcomeEmail` (once per device, skips old accounts, retries after errors) and the `appearance.js` helpers and hook. |
| `src/components/CodeInput.test.jsx` | Six boxes and their attributes, typing advances focus, non-digits ignored, paste (full, longer than six, mid-code, no digits), autofill, Backspace (empty box, filled box, first box), overtyping with the cursor before or after the digit, selected replace, click jumps to the first empty box, arrow keys, disabled, clearing without Backspace. |
| `src/components/NewPasswordForm.test.jsx` | Field attributes, length and mismatch validation, calls `onSubmit`, busy state, shows the returned error, clears the error, show/hide toggle. |
| `src/components/Navbar.test.jsx` | Login and Signup open the auth gate. The hidden `/admin/login` link exists only when signed out and is `aria-hidden` and `tabindex=-1`. |
| `src/pages/ForgotPassword.test.jsx` | Full flow: email, code (auto-verifies on the 6th digit or on paste), password, done, then redirect to `/dashboard`. Wrong code, Verify disabled until 6 digits, synthetic address, Supabase not configured, request error, resend countdown, "use a different email", password error, close button. |
| `src/pages/ResetPassword.test.jsx` | No token or no Supabase shows the invalid screen without a server call. Checking state, then the form. Expired token. Valid token with email: complete, done, redirect. Missing email. Complete error. |

## Adding tests

Put new files next to the matching source path, for example
`tests/api-lib/foo.test.js` for `api-lib/foo.js`. Mock
`api-lib/supabaseAdmin.js` and register responders on `createFakeSupabase()`.
For browser code, mock `src/lib/supabaseClient.js`.
