# Ride Tea GupShup (RTG) — Website

India's endurance sports community website. Built with React, Tailwind CSS v4, Framer Motion, React Router, and Three.js (via React Three Fiber).

## Getting started

```bash
npm install
npm run dev      # start local dev server
npm run build    # production build → dist/
```

## Changing images (for the site owner)

Every image on the entire website is controlled from **one file**:
[`src/data/images.js`](src/data/images.js). You never need to touch component
code to change a photo.

There are two ways to swap an image:

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

## Changing text/content

All copy — mission, values, event listings, products, FAQs, blog posts,
testimonials, city list, contact details, social handles — lives in
[`src/data/content.js`](src/data/content.js), also organized and commented
by section.

## Project structure

```
src/
  data/
    images.js      # every image on the site — edit here to swap photos
    content.js      # every piece of copy/text/data on the site
  components/
    ui/             # reusable building blocks (Button, Section, Cards, etc.)
    sections/        # shared page sections (Newsletter, Instagram feed, CTA)
    Preloader.jsx    # video + 3D intro shown before the site loads
    Navbar.jsx, Footer.jsx, Layout.jsx
  three/            # Three.js / React Three Fiber scenes (intro + hero accents)
  pages/            # one file per route (Home, About, Events, ...)
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

## Notes

- Buy Now / Join Community / newsletter / contact forms are currently front-end
  only (no backend wired up) — connect them to your CRM, payment provider, or
  form service (e.g. Formspree, Razorpay, Mailchimp) when ready to go live.
- The Google Map on the Contact page points to Nehru Park, Delhi by default —
  update the query in `src/pages/Contact.jsx` if the primary meeting point changes.
