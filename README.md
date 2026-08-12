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
2. **Get your API keys**: Project Settings → API.
   - `Project URL` and `anon public` key → go in `.env.local` (frontend, safe
     to expose — see `.env.example`)
   - `service_role` key → **never** put this in `.env.local` or any `VITE_*`
     var. It goes in `api/.env.local` for local dev, and in your deploy
     host's environment variable settings for production. This key bypasses
     all security rules — treat it like a master password.
3. **Create your first admin**: fully automatic, no SQL needed — the very
   first person to ever sign up (either from `/admin/login`'s Sign Up tab, or
   the public site) is auto-promoted to admin by a database trigger. Every
   admin after that one is added from inside the dashboard's Admins screen.
   ⚠️ Whoever signs up first on your *production* database becomes the
   founding admin — sign up yourself before sharing the live link. If
   someone else beats you to it, `supabase/schema.sql` has the one-line SQL
   fix at the bottom of the file.

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

**Admin login is deliberately not linked anywhere visible.** The public
navbar shows "Login" and "Sign Up" for members — no "Admin" button, no
mention of `/admin` anywhere in the visible UI. The way in is a small,
unlabeled dot immediately after the "Sign Up" button (both desktop and the
mobile menu) — near-invisible against the dark navbar, brightens slightly on
hover so someone who already knows it's there can find it, but there's no
tooltip or label giving it away. Clicking it opens `/admin/login`, a
dedicated Log In / Sign Up form separate from the member panel — signing up
here creates a normal account, exactly like signing up on the public site
does; it's not automatically an admin (see "Create your first admin" and
"Adding more admins" below for how an account actually gets admin access).
Anyone who isn't an admin who somehow lands on `/admin` itself gets
redirected straight back to `/admin/login`.

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
- **Adding more admins doesn't need SQL.** The first admin is automatic
  (see "Create your first admin" above). After that, any admin can open the
  **Admins** screen in the dashboard, search for a member by the email they
  signed up with, and grant (or later revoke) admin access with one click.
- **One account, two roles.** There's no such thing as a separate "admin
  account" — a person is a normal member (in the `profiles` table) who
  *additionally* has a row in `admin_profiles`. They keep using the exact
  same login.

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
  preloader, `HeroScene.jsx` powers the subtle wireframe accent on the Home
  hero. Both are lazy-loaded (`React.lazy`) so Three.js doesn't block the
  initial page shell, and both reduce particle count / skip extra shapes on
  screens under 768px for mobile performance.

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
