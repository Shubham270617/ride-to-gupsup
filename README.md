# Ride Tea GupShup (RTG) — Website

India's endurance sports community website. Built with React, Tailwind CSS v4, Framer Motion, React Router, and Three.js (via React Three Fiber) on the frontend, with Supabase (Postgres + Auth + Storage) and a thin Node.js serverless backend for login/signup and OAuth.

## Getting started

```bash
npm install
npm run dev      # frontend only (Vite) — login works, Strava/XFitConnect buttons won't (need `vercel dev`, see below)
npm run build    # production build → dist/
```

To run the login system end-to-end locally (including the Strava/XFitConnect
buttons, which are serverless functions under `/api`), use the Vercel CLI
instead of plain `vite`:

```bash
npm install -g vercel   # one-time
vercel dev               # runs the frontend AND /api functions together
```

## Login, database & deployment setup

This is a one-time setup, not something you'll repeat. Two accounts are
required and only you can create them (I can write all the code, but not sign
up on your behalf):

### 1. Supabase (database, login, file storage)

You mentioned you've already created a Supabase account/project — good. From
your project dashboard:

1. **Run the schema**: Project → SQL Editor → New query → paste the entire
   contents of [`supabase/schema.sql`](supabase/schema.sql) → Run. This
   creates every table (member `profiles`, `events`, `gallery_items`,
   `products`, etc.), security rules, and the `rtg-media` storage bucket.
   Safe to re-run if needed.
   - **Already have a database from before?** Run the files in
     [`supabase/migrations/`](supabase/migrations) you haven't run yet, in
     number order, the same way. `002_home_sections.sql` adds the two Home
     page card tables (`home_why_reasons`, `home_ways`) with starter rows;
     `003_home_training_and_event_cards.sql` adds `home_training_formats`
     and the optional homepage-slide columns on `events`;
     `004_remove_unused.sql` drops columns and saved wording the rebuilt
     Home page no longer uses (it deletes data — read its header first);
     `005_products_home_card.sql` adds the optional `eyebrow` line on
     products for the homepage cards; `006_remove_old_home_wording.sql`
     deletes the old Home gallery/testimonials heading text;
     `007_remove_home_sponsors_wording.sql` deletes the wording of the
     Sponsors band removed from Home; `008_footer_links.sql` adds the
     `footer_links` table (the footer's link columns) with starter rows; Until they're
     `009_events_board.sql` turns the event status into the Events page
     category, adds the optional `tone` colour, and seeds seven starter
     events only if the events table is empty.
     run, those sections simply show their built-in defaults and the
     matching admin screens can't save.
2. **Get your API keys**: Project Settings → API.
   - `Project URL` and `anon public` key → go in `.env.local` (frontend, safe
     to expose — see `.env.example`)
   - `service_role` key → **never** put this in `.env.local` or any `VITE_*`
     var. It goes in `api/.env.local` for local dev, and in your deploy
     host's environment variable settings for production. This key bypasses
     all security rules — treat it like a master password.
3. **Create your admins**: the first 3 people to sign in at
   `/admin/login` (Log In or Sign Up, email/password or Google) become the
   admins — no SQL needed. A 4th is refused until an existing admin is
   revoked in **Admin → Members**, which frees that seat. While a seat is
   free, *anyone* who signs in there takes it, so fill all 3 yourselves.

### 1b. Email sending (REQUIRED for password reset and login codes)

**Forgot password** no longer uses Supabase's mailer at all. The site sends
that email itself through Brevo's API (`api-lib/passwordReset.js`, served at `/api/auth/account?op=password-reset`): one
email with a 6-digit code *and* a reset link. The member either types the
code on `/forgot-password` or clicks the link to `/reset-password`, sets a
new password, and is signed straight in. Code and link expire in 30 minutes
and work once; only the newest email's code/link is valid. To turn it on:

1. Run migration `021_password_reset_codes.sql`
2. Brevo → verify your sending domain (SPF + DKIM records in DNS)
3. Brevo → **SMTP & API** → **API Keys** → create a key
4. In Vercel → Settings → Environment Variables set `BREVO_API_KEY`,
   `MAIL_FROM_EMAIL` (an address on the verified domain), `MAIL_FROM_NAME`
   and `OTP_SECRET` (any long random string — `openssl rand -hex 32`).
   See `api/.env.example`. Redeploy.

**Welcome email**: the first time a new member is signed in (email or
Google signup), `api-lib/welcomeEmail.js` sends one branded welcome email
through the same Brevo setup, and stamps `profiles.welcome_email_sent_at`
so it never goes twice. Accounts with no real mailbox (Strava logins) and
accounts more than a week old are skipped. Run migration
`022_welcome_email.sql` to turn it on — it also marks existing members as
already welcomed, so nobody old gets one. Both emails pull their logo and
photo from `public/images/email/` on the live site.

The rest of this section is about the **"Email Code" login tab**, which
still goes through Supabase's mailer:

Supabase's built-in email service is capped at **2 emails per hour for the
whole project**. It is a test facility, not something to launch on — the
third person to use it in an hour simply never gets the mail, with no error
shown. The "Email Code" login depends on this being fixed.

The fix is a free custom SMTP provider, configured in the Supabase dashboard
under **Authentication → Settings → SMTP**. No code changes.

| Provider | Free tier | Notes |
| --- | --- | --- |
| **Brevo** (recommended) | **300/day, free forever** | Highest free daily limit, no card needed |
| Resend | 3,000/month but only 100/day | The daily cap is the binding constraint here |
| Gmail / Workspace | ~500/day | Works, but app-password based and sends from a gmail.com address |

**Brevo is the one to use.** 300 emails a day is far beyond what this club
will send, and unlike most "free trials" it does not expire.

1. Sign up at <https://www.brevo.com> → **SMTP & API** → **SMTP**
2. Copy the server (`smtp-relay.brevo.com`), port `587`, login and the
   generated SMTP key
3. Paste them into Supabase → Authentication → Settings → SMTP, with a
   sender address on your own domain
4. Add Brevo's **SPF and DKIM** records to the `rideteagupshup.com` DNS, or
   reset emails will land in spam — which looks exactly like the feature
   being broken
5. Raise **Authentication → Rate Limits → Emails** from the default (it
   lifts to 30/hour automatically once custom SMTP is on; 100/hour is a
   sensible setting for a club this size)

For the **"Email Code" login tab** specifically, also edit the **Magic Link**
template under Authentication → Email Templates so it includes `{{ .Token }}`
— that is the 6-digit code. Without it the email only contains a link, which
doesn't work when someone reads the code on a different device.

### 2. Strava (for the "Continue with Strava" button)

Strava has a real, free public OAuth API. Register your own app:

1. Go to <https://developers.strava.com> → "Create & Manage Your App" (or
   Strava → Settings → My API Application)
2. Fill in: **Application Name** (e.g. "Ride Tea GupShup"), **Category**
   (Community), **Website** (your site URL), **Authorization Callback
   Domain** — just the bare domain, no `https://` or path (use `localhost`
   for local dev, your real domain like `ridetegupshup.in` once deployed)
3. You'll get a **Client ID** and **Client Secret** — put both in
   `api/.env.local` (local) / your host's env vars (production) as
   `STRAVA_CLIENT_ID` / `STRAVA_CLIENT_SECRET`
4. Register the activity webhook once, so new rides arrive automatically:
   set `STRAVA_WEBHOOK_VERIFY_TOKEN` to any random string, then run
   `node scripts/register-strava-webhook.mjs`

#### How an athlete's distance gets in

Two separate mechanisms, and both are needed:

- **The webhook** (`api/webhooks/strava.js`) delivers each ride as it is
  recorded — but only from the moment someone connects. It knows nothing
  about their past.
- **The backfill** (`api/cron/strava-backfill.js`) pulls their history. It
  walks backwards through every activity they have ever recorded, 200 at a
  time, saving its position after each page so a run that is cut short
  resumes instead of starting over. It runs once a day (03:00 IST — the Vercel Hobby plan
  only allows daily cron jobs) and marks each member
  done once it has passed their very first activity.

This is why **`CRON_SECRET` is required** — set it to anything random
(`openssl rand -hex 32`) in your host's env vars. Both scheduled jobs
refuse to run without it rather than running unauthenticated, so an
unset value means histories silently never fill in.

If totals ever look wrong, **Admin → Members → "Resync Strava"** (or
`POST /api/admin/strava-resync`) clears the watermark and walks the history
again from scratch. It is safe to run any time: activities are keyed on
their Strava id, so a second pass corrects and fills rather than
duplicating.

### 3. XFitConnect

They don't currently expose a public OAuth API. The "Continue with
XFitConnect" button is fully built and wired — it just shows a "Soon" badge
until real credentials exist. Once XFitConnect shares their OAuth details,
drop them into `XFITCONNECT_CLIENT_ID` / `XFITCONNECT_CLIENT_SECRET` /
`XFITCONNECT_AUTHORIZE_URL` / `XFITCONNECT_TOKEN_URL` in `api/.env.local` (or
your host's env vars) — no code changes needed, the button activates itself.

### 4. Cloudinary (every photo/video an admin uploads)

1. Create a free account at <https://cloudinary.com>
2. Your **Cloud Name**, **API Key**, and **API Secret** are all shown on your
   Dashboard home page right after signup
3. Put all three in `api/.env.local` (local) / your host's env vars
   (production): `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`,
   `CLOUDINARY_API_SECRET` — the API Secret is sensitive, never put it in the
   frontend `.env.local`

How it works: when an admin uploads a file anywhere in the dashboard (Site
Photos, Gallery, or any cover-photo field), the browser first asks
`/api/cloudinary/sign` for a one-time upload signature — that function
checks the caller is actually a logged-in admin before handing one out —
then uploads the file straight to Cloudinary itself (not through our
server, so large videos don't have to pass through Vercel). Cloudinary
auto-compresses images and transcodes video on the way in. Free tier is
~25GB/month shared across storage, bandwidth, and any transformations.

### Environment files

| File (never commit real secrets) | Used by | Contains |
|---|---|---|
| `.env.local` | Vite frontend | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — safe to expose in the browser |
| `api/.env.local` | Serverless functions (local `vercel dev`) | `SUPABASE_SERVICE_ROLE_KEY`, `STRAVA_CLIENT_ID/SECRET`, `XFITCONNECT_*`, `CLOUDINARY_*`, `FRONTEND_URL` — server-only, never expose |

Copy `.env.example` → `.env.local` and `api/.env.example` → `api/.env.local`,
fill in real values. Both are gitignored.

### Deploying

**Recommended host: [Vercel](https://vercel.com)** — it deploys the Vite
frontend *and* the `/api` serverless functions from this one repo in a single
`vercel` project, so there's nothing else to host or coordinate:

1. Push this repo to GitHub
2. Vercel → New Project → import the repo (it auto-detects Vite)
3. In the project's Settings → Environment Variables, add all the vars from
   both `.env.example` and `api/.env.example` with real values
4. Deploy. Update your Strava app's "Authorization Callback Domain" to match
   the live domain once you have it.

How it works end to end: a visitor clicks "Continue with Strava" → browser
goes to `/api/auth/strava/start` (a Node function) → redirects to Strava's
real login/approve screen → Strava sends them back to
`/api/auth/strava/callback` → that function exchanges the code for their
Strava profile (server-side only, using the client secret), creates/updates
their row in the `profiles` table via Supabase, and logs them into the site.
Email/password login/signup talks to Supabase directly from the browser — no
backend involved for that path.

**Email confirmation status:** currently ON (Supabase default) — new
signups must click a confirmation link before they can log in. Supabase's
free tier only sends a handful of emails per hour, which is fine for real
usage at RTG's current size but will bottleneck fast during heavy testing.
When ready, connect a custom SMTP provider (Resend and Postmark both have
free tiers) under Supabase Dashboard → Authentication → Providers → Email →
SMTP Settings — no code changes needed here, it's a dashboard-only change.

## Changing images (for the site owner)

**Easiest: the admin dashboard's Site Photos page** (`/admin/site-images`) —
every banner/background image on the site, with a thumbnail and a "Replace"
button. Upload a new photo from your phone or computer, it goes live
immediately. No code, no developer needed. This is the recommended way for
the site owner day-to-day.

For developers, every image also has a default defined in **one file**:
[`src/data/images.js`](src/data/images.js) — these are the fallback values
shown until (and unless) an admin replaces them via Site Photos above.

There are two ways to change a default in code:

1. **Use your own hosted photo URL** — open `src/data/images.js` and paste
   the new image URL as the value for that key (e.g. `homeHero`, `aboutHero`,
   `productJersey`, `gallery[]`, etc.). Save the file — done.

2. **Use a local photo file (recommended for final brand photography)**
   - Drop the image file into the [`public/images/`](public/images) folder
     (e.g. `public/images/hero-home.jpg`)
   - In `src/data/images.js`, set the matching key to `"/images/hero-home.jpg"`
   - Restart the dev server / rebuild — done.

The file is organized by page (Home, About, Community, Weekly Rides, Events,
Merchandise, Blog, Gallery, etc.) with comments, so it's easy to find which
key controls which photo. All current images are placeholder stock photos —
swap them for real RTG event photography whenever it's ready.

The RTG logo itself lives at `public/images/rtg-logo.svg` and is referenced
by the `logo` key — replace that file (or point the key elsewhere) once the
final logo asset is available.

## Admin dashboard — day-to-day content management

**Admin login is not linked from anywhere.** The public navbar shows
"Login" and "Sign Up" for members and nothing else — admins go to
`/admin/login` directly. There used to be a near-invisible dot after the
"Sign Up" button; it was removed, both because it was discoverable in the
mobile menu and because hiding a link was never what kept anyone out.

What keeps people out is the 3-seat limit. `/admin/login` is a Log In /
Sign Up form separate from the member panel; signing in there gives the
account an admin seat if one of the 3 is free, and is refused with "all
admin seats are taken" otherwise. The seat is checked by the database on
every query (`is_admin()`), so opening `/admin` directly, or calling the
API with `curl`, is refused the same way.

Once in, the dashboard manages, with no code: **Events, Gallery,
Merchandise, Blog, Sponsors, Testimonials, Challenges**, every sitewide
banner image (**Site Photos**), and **Admins** itself. Changes save straight
to the database and appear on the live site immediately — no redeploy
needed.

Three things worth knowing:

- **Static content.js/images.js are fallback defaults, not the live
  content.** Every public page starts by showing the current values from
  `content.js`/`images.js` (so the site never looks blank), then swaps in
  real data from the database the moment any row exists in that table. In
  practice: the placeholder events/products/etc. you see today will
  disappear from the public site as soon as you add your first real one in
  the admin dashboard — that's expected, not a bug. Static text-only content
  that has no admin screen yet (mission/vision/values, FAQs, weekly ride
  details, sponsorship opportunity descriptions) still lives in
  `src/data/content.js` and needs a code change to update.
- **Adding or removing admins doesn't need SQL.** Revoke an admin on the
  **Members** screen to free their seat; the next person to sign in at
  `/admin/login` takes it. Three seats, total.
- **One account, two roles.** There's no such thing as a separate "admin
  account" — an admin is a normal member (in the `profiles` table) who
  *additionally* holds one of the 3 rows in `admin_profiles`. They keep
  using the same login.

### Appearance — text size, font and colour

**Admin → Appearance** changes how text looks across the whole public site:
size, body typeface and text colour. Every option is a fixed preset rather
than a free number or colour picker, on purpose — an arbitrary pixel size or
hex value is precisely how this kind of control breaks a layout or makes
text unreadable.

- **Size** scales the root font size, so Tailwind's rem-based type *and*
  spacing grow together and the layout keeps its proportions. Hard-coded px
  values in the stylesheets deliberately don't scale, which is why the range
  is kept narrow.
- **Typeface** only offers fonts the site already loads, so switching costs
  no extra page weight.
- **Colour** options are all contrast-checked against the light background.

Changes preview live in the dashboard and go live on save. The settings are
three rows in `site_settings` (`text.theme.*`), applied as CSS variables —
see [`src/lib/appearance.js`](src/lib/appearance.js).

## Changing text/content

Copy that doesn't yet have an admin screen — mission, values, FAQs, weekly
ride details, contact details, social handles — lives in
[`src/data/content.js`](src/data/content.js), organized and commented by
section. Events/Products/Blog/Sponsors/Testimonials/Challenges are better
managed through the admin dashboard above; the arrays in this file for those
are just the starting/fallback content.

## Project structure

```
src/
  data/
    images.js       # every image on the site — edit here to swap photos
    content.js      # every piece of copy/text/data on the site
  lib/
    supabaseClient.js   # browser Supabase client (reads VITE_ env vars)
    useSession.js        # hook for the logged-in member's session
    AuthGateContext.jsx  # lets any component (e.g. the navbar) reopen the login panel
  components/
    ui/             # reusable building blocks (Button, Section, Cards, etc.)
    sections/        # shared page sections (Newsletter, Instagram feed, CTA)
    Preloader.jsx    # video + 3D intro shown before the site loads
    AuthGate.jsx     # login/signup panel shown once per session after the intro
    Navbar.jsx, Footer.jsx, Layout.jsx
  three/            # Three.js / React Three Fiber scenes (intro + hero accents)
  pages/            # one file per route (Home, About, Events, ..., AuthCallback)

api/                 # Node.js serverless functions (the "backend") — deployed
  auth/[provider]/    # /api/auth/strava/start, /api/auth/strava/callback, etc.
  lib/                # provider config, server-only Supabase client, cookie helpers

supabase/
  schema.sql          # full database schema — run once in the Supabase SQL Editor
```

## Intro video (Preloader)

The site opens with a full-screen intro: a short video plays behind an
animated 3D scene (particles + wireframe spheres, built with
[React Three Fiber](https://github.com/pmndrs/react-three-fiber)) and the RTG
tagline, then fades into the site. It shows once per browser tab session
(tracked via `sessionStorage`) — reloading the same tab skips straight to the
site; a new tab/session shows it again. Visitors can also tap **Skip Intro**.

- Video file: `public/videos/rtg-intro.mp4` — a velodrome cyclist clip
  ("Outdoor cycling track with some cyclists") from
  [Mixkit](https://mixkit.co/free-stock-video/outdoor-cycling-track-with-some-cyclists-40868/),
  free for commercial use with no attribution required under the
  [Mixkit License](https://mixkit.co/license/). To replace it with real RTG
  footage, swap in a new file at the same path (keep it short — 5–10s loop —
  and under ~8MB so the intro stays fast, especially on mobile networks).
- Poster/fallback frame: `public/images/intro-poster.jpg` (referenced by the
  `introPoster` key in `src/data/images.js`) — shown instantly while the video
  loads and if a browser blocks autoplay.
- The 3D scene code lives in `src/three/` — `IntroScene.jsx` powers the
  preloader. It's lazy-loaded (`React.lazy`) so Three.js doesn't block the
  initial page shell, and it reduces particle count / skips extra shapes on
  screens under 768px for mobile performance. (The Home hero's right-hand
  scene is plain SVG/CSS — see `HeroCinematicScene` in `src/pages/Home.jsx`.)

## Live clock

The navbar shows a live IST clock (top utility bar, both desktop and mobile)
via `src/components/ui/LiveClock.jsx` — updates every second, no backend
needed.

## Login / signup panel

Right after the intro finishes, a dismissible panel offers email/password
signup or login, plus "Continue with Strava" / "Continue with XFitConnect".
It shows once per browser session — dismissing it ("Continue browsing
without an account") doesn't block the site, and it can be reopened anytime
via the **Log In** link in the navbar's top utility bar. Logged-in members see
"Hi, {name}" there instead, with a logout button. All of this needs the
Supabase setup above to actually work — without it, the panel still renders
but shows a friendly error instead of logging anyone in (see the console
warning it prints).

## Notes

- Buy Now / newsletter / contact forms are currently front-end only (no
  backend wired up) — connect them to your CRM, payment provider, or form
  service (e.g. Formspree, Razorpay, Mailchimp) when ready to go live. Member
  login/signup, by contrast, is fully wired to the real database once you've
  done the Supabase setup above.
- An admin content-management dashboard (so the owner can edit
  events/gallery/products/etc. without code) is planned but not yet built —
  the database schema for it already exists in `supabase/schema.sql`.
- The Google Map on the Contact page points to Nehru Park, Delhi by default —
  update the query in `src/pages/Contact.jsx` if the primary meeting point changes.
