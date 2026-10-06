/**
 * ============================================================================
 *  RTG IMAGE LIBRARY — the ONE file to edit to change any picture on the site
 * ============================================================================
 *
 *  HOW TO SWAP AN IMAGE (two options):
 *
 *  OPTION A — use your own hosted photo URL
 *    Just paste the new image URL as the string value below. That's it.
 *
 *  OPTION B — use a local photo file (recommended for final brand photos)
 *    1. Drop your file into  /public/images/  (e.g. public/images/hero-home.jpg)
 *    2. Set the value below to "/images/hero-home.jpg"
 *    3. Restart/rebuild the site — done.
 *
 *  Every image on the entire website is pulled from this one object, so
 *  there is no need to hunt through component files.
 *
 *  No stock/third-party photography is used anywhere in this file by
 *  design — only real RTG photos (currently the 5 pulled from the approved
 *  brand reference site, under /public/images/rtg-reference/) or the
 *  `placeholder` mark below, which reserves the space with a neutral
 *  on-brand placeholder until a real photo is dropped in. Swap any
 *  `placeholder` value for a real photo the moment one exists — nothing
 *  else needs to change, every component already reads from here.
 * ============================================================================
 */

// Neutral on-brand "photo coming soon" mark — a soft canvas tile with a
// dashed border and a simple image glyph, in the site's own purple/orange,
// instead of a broken-image icon or borrowed stock photography. Used for
// every slot that doesn't have a real RTG photo yet.
const placeholderSvg =
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'>" +
  "<rect width='400' height='300' fill='#f3f0f8'/>" +
  "<rect x='1' y='1' width='398' height='298' fill='none' stroke='#35246f' stroke-opacity='0.16' stroke-width='1.5' stroke-dasharray='8 7'/>" +
  "<g transform='translate(200,150)' opacity='0.45'>" +
  "<circle r='26' fill='none' stroke='#f76b1c' stroke-width='2.5'/>" +
  "<path d='M-11 7 L-3 -5 L6 5 L14 -9' fill='none' stroke='#35246f' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'/>" +
  "<circle cx='-15' cy='-11' r='3.5' fill='#f76b1c'/>" +
  "</g>" +
  "</svg>";
const placeholder = `data:image/svg+xml,${encodeURIComponent(placeholderSvg)}`;

// The 5 real RTG event photos currently available (extracted from the
// approved brand reference site) — reused across any slot that calls for a
// generic "cycling" / "running" / "community" / "adventure" moment, instead
// of inventing new ones per section.
const rtg = {
  cycling: "/images/rtg-reference/rtg-cycling.jpg",
  running: "/images/rtg-reference/rtg-running.jpg",
  adventure: "/images/rtg-reference/rtg-adventure.jpg",
  adventure2: "/images/rtg-reference/rtg-adventure2.jpg",
  community: "/images/rtg-reference/rtg-community.jpg",
};

export const images = {
  // ---- Brand ----
  logo: "/images/rtg-logo-horizontal.png", // navbar/footer lockup (icon + wordmark, one line)
  logoIcon: "/images/rtg-logo-square.png", // stacked icon+wordmark — used where a compact/square mark fits better
  // `logo` above is a white-only export, invisible on a light bar — a
  // same-size replacement was attempted from the reference site but the
  // extracted file turned out corrupted on decode, so `logoNav` just
  // points back to the known-good asset for now (paired with a small dark
  // badge wherever it sits on light chrome, same fix as everywhere else
  // this logo is used on a light background).
  // Real color lockup pulled from the reference site (earlier attempt was
  // corrupted — its base64 payload had HTML entities like &#43; embedded
  // in it that weren't unescaped before decoding, silently truncating the
  // file). Reads fine directly on a light background, no badge/pill needed.
  logoNav: "/images/rtg-logo-nav.png",

  // Final fallback for any admin-added item (product, event, blog post,
  // testimonial) that has no photo uploaded yet — e.g.
  // `item.image || images[item.imgKey] || images.placeholder`. Keeps the
  // reserved-space look consistent even for content that doesn't come
  // from this file at all.
  placeholder,

  // ---- INTRO / PRELOADER ----
  // introPoster shows instantly while /videos/rtg-intro.mp4 loads (also the
  // fallback frame if a browser blocks video autoplay). To change the intro
  // video itself, replace public/videos/rtg-intro.mp4 with a new file of the
  // same name (keep it short — under ~10s loop — and under ~8MB for fast load).
  introPoster: "/images/intro-poster.jpg",

  // ---- HOME ----
  // Mapped the same way the brand reference itself maps them: community ->
  // hero, cycling -> weekly-rhythm band, adventure2 -> final CTA.
  homeHero: rtg.community,
  // Home hero carousel slides (Cycling/Running/Swimming/Community)
  heroCycling: rtg.cycling,
  heroRunning: rtg.running,
  // No real RTG swim photo exists yet — reserved, not substituted with stock.
  heroSwimming: placeholder,
  heroCommunity: rtg.community,
  homeAbout: rtg.community,
  homeWhyJoin: rtg.adventure,
  homeWeekly: rtg.cycling,
  homeMerchPreview: rtg.community, // washed-out photo behind Home's Merchandise Highlights
  homeCTA: rtg.adventure2,

  // ---- ABOUT ----
  aboutHero: rtg.cycling,
  aboutStory1: placeholder,
  aboutStory2: placeholder,
  aboutMission: rtg.adventure,

  // ---- COMMUNITY ----
  communityHero: rtg.community,
  communityCyclists: rtg.cycling,
  communityRunners: rtg.running,
  communitySwimmers: placeholder,
  communityTriathletes: rtg.adventure,
  communityBeginners: placeholder,
  communityExperienced: rtg.community,
  communityVolunteers: placeholder,
  communityChai: placeholder,
  communityCelebration: rtg.adventure2,

  // ---- WEEKLY RIDES ----
  ridesHero: rtg.cycling,
  ridesBricks: rtg.running,
  ridesSafety: placeholder,
  ridesGear: placeholder,

  // ---- EVENTS ----
  eventsHero: rtg.adventure2,
  eventFeatured: rtg.community,
  eventMTB: rtg.adventure,
  eventResolution: rtg.running,
  eventAdventure: rtg.adventure,
  eventMeetup: rtg.community,
  eventMonthly: placeholder,
  eventWorkshop: placeholder,

  // ---- CHALLENGES ----
  challengesHero: rtg.adventure,

  // ---- RACE CALENDAR ----
  calendarHero: rtg.cycling,

  // ---- BLOG ----
  blogHero: placeholder,
  blogCycling: rtg.cycling,
  blogRunning: rtg.running,
  blogSwimming: placeholder,
  blogNutrition: placeholder,
  blogRecovery: placeholder,
  blogMaintenance: placeholder,
  blogRacePrep: placeholder,
  blogStories: rtg.community,

  // ---- SPONSORS ----
  sponsorsHero: placeholder,

  // ---- GALLERY (masonry) ----
  // Real admin-uploaded gallery photos (via Site Photos / Gallery admin,
  // stored in Supabase) take priority over this list wherever that's wired
  // up — this is just the static fallback, so it stays all-placeholder
  // rather than repeating the same 5 reference photos a dozen times.
  gallery: [
    placeholder,
    placeholder,
    placeholder,
    placeholder,
    placeholder,
    placeholder,
    placeholder,
    placeholder,
    placeholder,
    placeholder,
    placeholder,
    placeholder,
  ],

  // ---- CONTACT ----
  contactHero: placeholder,

  // ---- MERCHANDISE ----
  merchHero: rtg.community,

  // ---- FAQ ----
  faqHero: placeholder,

  // ---- RACE RESULTS ----
  raceResultsHero: rtg.cycling,
  leaderboardHero: rtg.running,

  // ---- SAFETY ----
  safetyHero: placeholder,

  // ---- MERCHANDISE (product photos) ----
  productJersey: placeholder,
  productTshirt: placeholder,
  productHoodie: placeholder,
  productCap: placeholder,
  productSocks: placeholder,
  productBottle: placeholder,
  productWheelBag: placeholder,

  // ---- AI ASSISTANT ("Tapri") ----
  aiAssistant: "/images/ai.jpeg",

  // ---- TESTIMONIAL AVATARS ----
  avatar1: placeholder,
  avatar2: placeholder,
  avatar3: placeholder,
  avatar4: placeholder,
  avatar5: placeholder,
  avatar6: placeholder,
  avatar7: placeholder,
  avatar8: placeholder,
};

export default images;
