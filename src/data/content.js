/**
 * Central content store — all copy for the RTG site lives here.
 * Update text, numbers, events, products, etc. in this one place.
 */

export const brand = {
  name: "Ride Tea GupShup",
  shortName: "RTG",
  tagline: "Ride Together. Run Together. Grow Together.",
  sub: "India's endurance sports community for cycling, running, swimming, challenges, races, and unforgettable adventures.",
  email: "info@rideteagupshup.com",
  phone: "+91 99901 71239",
  cities: ["Delhi", "Chandigarh", "Dehradun", "Jaipur", "Shimla", "Punjab", "Pune", "Mumbai"],
  states: ["Delhi", "Haryana", "Uttar Pradesh", "Uttarakhand", "Punjab", "Chandigarh", "Rajasthan", "West Bengal", "Maharashtra", "Gujarat", "Karnataka", "Telangana", "Assam"],
  members: "500+",
  social: {
    instagram: { handle: "RideTeaGupShup", url: "https://www.instagram.com/rideteagupshup?igsh=MXQwaHZuZHBsdzVzag%3D%3D&utm_source=qr" },
    facebook: { handle: "RideTeaGupShup", url: "https://www.facebook.com/share/1DV6yBmEF7/?mibextid=wwXIfr" },
    youtube: { handle: "RideTeaGupShup", url: "https://youtube.com/@RideTeaGupShup" },
    strava: { handle: "RideTeaGupShup", url: "https://strava.app.link/kPmiHdMRC5b" },
  },
};

// Home hero — 4-slide auto-advancing carousel (Cycling/Running/Swimming/Community).
// These are the fallback defaults only: every text field below (eyebrow,
// headline, paragraph, and the floating metric card) is editable per slide
// in Admin -> Site Content -> Home, stored under
// "text.home.hero.<key>.<field>" (see buildHeroSlides in lib/publicData.js).
// Photos are swapped in Admin -> Site Photos via `imageKey`.
// `key` is the stable id those settings hang off — don't rename it.
// `scene` picks the decorative line-art drawn beside the card
// ("route" / "track" / "wave" / "network" — see SCENE_ART in Home.jsx).
export const heroSlides = [
  {
    key: "cycling",
    tag: "Cycling",
    eyebrow: "Cycling · Endurance · Community",
    title: "Ride Together.",
    accent: "Go Further.",
    subtitle: "Weekend rides, challenging climbs and unforgettable routes — because the best rides are shared.",
    imageKey: "heroCycling",
    // Which part of the photo to keep in frame on a narrow (portrait
    // mobile) crop — the same wide photo that looks right center-cropped
    // on desktop can cut off the subject entirely on a phone. If this
    // photo gets replaced via Site Photos with a differently-composed one,
    // this may need to be re-picked ("top" / "center" / "bottom").
    mobileFocus: "top",
    scene: "route",
    card: {
      kicker: "Saturday · Train · Repeat",
      heading: "Ridge Repeats",
      metrics: [
        { value: "5×", label: "Loops" },
        { value: "45", label: "KM" },
        { value: "You", label: "vs You" },
      ],
    },
  },
  {
    key: "running",
    tag: "Running",
    eyebrow: "Running · Endurance · Community",
    title: "Run Together.",
    accent: "Find Your Pace.",
    subtitle: "From sunrise 5Ks to marathon training blocks — every pace has a place in our run club.",
    imageKey: "heroRunning",
    mobileFocus: "center",
    scene: "track",
    card: {
      kicker: "Run · Build · Recover",
      heading: "Brick & Burn",
      metrics: [
        { value: "Ride", label: "60 Min" },
        { value: "Run", label: "40 Min" },
        { value: "Move", label: "Better" },
      ],
    },
  },
  {
    key: "swimming",
    tag: "Swimming",
    eyebrow: "Swimming · Technique · Community",
    title: "Swim Together.",
    accent: "Move Stronger.",
    subtitle: "Pool sessions and open-water swims, coached and community-powered from your very first lap.",
    imageKey: "heroSwimming",
    mobileFocus: "bottom",
    scene: "wave",
    card: {
      kicker: "Pool · Technique · Confidence",
      heading: "Stroke by Stroke",
      metrics: [
        { value: "1-3", label: "KM" },
        { value: "Coached", label: "Sessions" },
        { value: "All", label: "Levels" },
      ],
    },
  },
  {
    key: "community",
    tag: "Community",
    eyebrow: "Ride · Run · Explore · Connect",
    title: "Grow Together.",
    accent: "Belong Here.",
    subtitle: "India's endurance sports community for cycling, running, swimming, challenges, races, and unforgettable adventures.",
    imageKey: "heroCommunity",
    mobileFocus: "center",
    scene: "network",
    card: {
      kicker: "Ride · Run · Connect",
      heading: "This Is RTG",
      metrics: [
        { value: "500+", label: "Members" },
        { value: "70+", label: "Cities" },
        { value: "1", label: "Community" },
      ],
    },
  },
];

// Hero copy shared by every slide — fallback defaults, editable in
// Admin -> Site Content -> Home -> "Hero — buttons & labels" under
// "text.home.hero.<field>".
export const heroCopy = {
  ctaLabel: "Join Community",
  ctaLink: "/community",
  scrollLabel: "Scroll to explore",
  presenceLabel: "Present Across India",
  expandingLabel: "+ Expanding",
};

export const mission =
  "Build an inclusive endurance community where people connect through sport, learn from one another, challenge themselves and create experiences that go beyond the finish line.";

export const vision =
  "Build one of India's most trusted endurance communities — connecting cycling, running, triathlon and outdoor adventure through community, events, training and technology.";

export const coreValues = [
  { title: "Community First", desc: "People and belonging come before performance." },
  { title: "Safety Always", desc: "Every activity puts participant safety first." },
  { title: "Everyone Belongs", desc: "Beginner or experienced — everyone deserves the same respect." },
  { title: "Grow Together", desc: "Share knowledge. Encourage progress." },
  { title: "Consistency", desc: "Small efforts, repeated consistently, create meaningful change." },
  { title: "Adventure", desc: "Explore new roads, trails, challenges and possibilities." },
];

// About page's origin story, split from the "Why RTG Exists" 3-pillar
// section below — the two used to be conflated under one heading.
export const howItStarted = [
  "RTG wasn't created to build another competitive sports club. It came from a simple belief that cycling and running become more meaningful when people have a community around them — people to ride with, learn from, have chai with and share the journey with.",
  "What started as a handful of Friday morning rides has grown into a movement of 500+ athletes across India's cities — cyclists, runners, and endurance enthusiasts united by one belief: sport is better shared.",
];

export const whyRtgExists = [
  { title: "Move Together", desc: "Cycling, running and endurance sport become better when they're shared." },
  { title: "Grow Together", desc: "From first-timers to experienced athletes, everyone should have opportunities to learn and improve." },
  { title: "Belong Together", desc: "No ego. No pace-shaming. No unnecessary pressure. Just respect, encouragement and community." },
];

// "How We Bring the Community Together" — icon is a key into the ICON map
// defined in About.jsx (kept as short strings here so this stays plain data).
export const communityPillars = [
  { icon: "bike", title: "Community Rides", desc: "Social and endurance cycling experiences." },
  { icon: "footprints", title: "Runs & Training", desc: "Running, brick sessions and structured community training." },
  { icon: "trophy", title: "Challenges", desc: "Virtual and physical challenges designed around participation and consistency." },
  { icon: "flag", title: "Races & Events", desc: "From community events to competitive endurance experiences." },
  { icon: "mountain", title: "Adventure", desc: "Trails, tours and experiences beyond everyday training." },
  { icon: "coffee", title: "Tea & GupShup", desc: "Because sometimes the best part starts after the workout." },
];

// The RTG Journey — horizontal timeline on desktop, vertical on mobile (see
// About.jsx). `date` is optional; steps without one are milestones rather
// than dated events.
export const rtgJourney = [
  { date: "Jan 2026", label: "RTG Begins", desc: "" },
  { date: "", label: "Community Rides & Runs", desc: "Regular experiences bring people together." },
  { date: "June 2026", label: "RTG Expands", desc: "Beyond regular rides." },
  { date: "", label: "RTG Endurance League", desc: "Pan-India virtual endurance challenge." },
  { date: "", label: "New Chapters & Communities", desc: "Delhi NCR · Dehradun · Chandigarh · Jaipur" },
  { date: "", label: "What's Next", desc: "Races · Training · Adventures · Digital Community" },
];

// "RTG in Motion" stats — plain admin-editable text (via Site Content),
// not the AnimatedCounter treatment used elsewhere, since not all of these
// are numbers ("Multiple Cities" isn't a count to animate).
export const rtgInMotion = [
  { key: "participants", value: "400+", label: "Endurance League Participants" },
  { key: "duration", value: "4 Weeks", label: "One National Challenge" },
  { key: "reach", value: "Multiple Cities", label: "Growing Community Presence" },
  { key: "sports", value: "Cycling · Running · Triathlon", label: "" },
];

export const stats = [
  { key: "activeMembers", label: "Active Members", value: 500, suffix: "+" },
  { key: "states", label: "States", value: 13, suffix: "+" },
  { key: "cities", label: "Cities", value: 70, suffix: "+" },
  { key: "cyclingKm", label: "Total Cycling KM", value: 250000, suffix: "+" },
  { key: "runningKm", label: "Total Running KM", value: 75000, suffix: "+" },
  { key: "rewards", label: "Rewards", value: 200, suffix: "+" },
];

// Home -> "Why RTG" section. Fallback defaults only — the live cards come
// from the `home_why_reasons` table (Admin -> Why RTG Cards) and the
// heading/paragraph/button from Admin -> Site Content -> Home, under
// "text.home.why.<field>". `icon` is a key into WHY_ICONS
// (components/sections/WhyRtg.jsx).
export const homeWhyCopy = {
  eyebrow: "Why RTG",
  titleLine1: "More Than Miles.",
  titleLine2: "More Than Sport.",
  subtitle: "Six reasons endurance athletes across India call RTG home — training, people, progression and experiences worth remembering.",
  ctaLabel: "Explore the RTG Experience",
  ctaLink: "/community",
};

export const whyJoin = [
  { icon: "training", pill: "Weekly Training", title: "Train Together", desc: "Structured weekly sessions designed for real progress." },
  { icon: "community", pill: "Community", title: "Find Your People", desc: "No pace is too slow. Every level belongs here." },
  { icon: "running", pill: "Running", title: "Run Stronger", desc: "From easy runs to trail mornings and event-day confidence." },
  { icon: "cycling", pill: "Cycling Skills", title: "Climb Better", desc: "Build pacing, strength and confidence for longer rides." },
  { icon: "consistency", pill: "Consistency", title: "Stay Consistent", desc: "Weekly rhythm that keeps motivation alive and habits strong." },
  { icon: "recognition", pill: "Recognition", title: "Earn Your Progress", desc: "Challenges, milestones and rewards that make effort visible." },
  { icon: "adventure", pill: "Adventure", title: "Adventure More", desc: "Trails, long rides and new routes that keep things exciting." },
  { icon: "memories", pill: "Memories", title: "Create Stories", desc: "Rides, runs and shared moments that stay with you for life." },
];

// Home -> "More Ways to Move Together" section. Fallback defaults only —
// the live cards come from the `home_ways` table (Admin -> Ways to Move
// Cards) and the heading/paragraphs from Admin -> Site Content -> Home,
// under "text.home.ways.<field>". `imageKey` is only used by these
// fallbacks; real cards carry their own uploaded photo.
export const homeWaysCopy = {
  eyebrow: "Find Your Way",
  title: "More Ways to Move",
  titleAccent: "Together.",
  description: "Run, ride or head off-road — choose the way you want to move, connect and explore with RTG.",
  descriptionExtra: "From community runs and endurance-building rides to MTB trails and new adventures, each path is designed to keep you active, challenged and connected — in your own way, at your own pace.",
};

// Home -> "Training Formats" showcase (the dark, photo-backed band with
// tabs). Fallback defaults only — the live formats come from the
// `home_training_formats` table (Admin -> Home — Training Formats).
// Text conventions shared with that admin form (parsed in lib/publicData.js):
//   *word*            -> drawn in the orange accent colour
//   "A | B | C"       -> tagline: big, small, big
//   "a, b, c"         -> a row of pills
//   "Label | Value"   -> one per line: steps / details / panel rows
// A format with a `cardImage` shows it (a route map) in the left card;
// one without shows its `cardSteps` as a numbered flow instead.
export const homeTrainingFormats = [
  {
    tabLabel: "Ridge Repeats",
    kicker: "RTG Ridge Repeats • In collaboration with *@iRide2Reach* • Led by *Manish Jayal*",
    titleLine1: "RTG Ridge",
    titleLine2: "Repeats.",
    tagline: "You | vs | You",
    description: "A signature RTG road-cycling format built around repeat loops, steady effort, pacing, climbs, descents and self-improvement — simple, competitive and addictive.",
    pills: "Delhi NCR, Saturday Mornings, Endurance Focus, Point System",
    note: "Exclusively under the RTG Membership Program",
    buttonLabel: "Explore Now",
    link: "/weekly-rides",
    imageKey: "heroCycling",
    cardLabel: "Ridge Loop",
    cardTitle: "Talkatora Circuit",
    cardImage: "/images/ridge-loop-map.jpg",
    cardStats: "5 Loops, 9.15 KM Each, ~45 KM Total",
    cardSteps: "",
    cardMeta: "Start | Talkatora Stadium\nWhen | Saturday • 5:00 AM\nFocus | Pacing • Climbing • Endurance\nStyle | You vs You",
    panelRows: "Format | 5 × 9.15 KM Loops\nPoint System | Improvement % • KOM / QOM • PR Points\nRewards & Awards | Monthly, Quarterly, Half-Yearly & Yearly Recognition\nLed By | In collaboration with *@iRide2Reach* — led by *Manish Jayal*",
  },
  {
    tabLabel: "Brick N Burn",
    kicker: "RTG Friday Hybrid Training • Ride → Run → Reset",
    titleLine1: "Brick N",
    titleLine2: "Burn.",
    tagline: "Ride | → | Run",
    description: "A weekly hybrid session that combines cycling and running in one continuous training format — building endurance, transition confidence and stronger legs.",
    pills: "Friday 5:00 AM, Ride + Run, Mobility Finish, Community Training",
    note: "Built for consistent weekly progress",
    buttonLabel: "Explore Now",
    link: "/weekly-rides",
    imageKey: "heroRunning",
    cardLabel: "Friday Session",
    cardTitle: "Brick Flow",
    cardImage: "",
    cardStats: "",
    cardSteps: "Ride | 60 Min\nTransition | Bike → Run\nRun | 30 Min\nFinish | Mobility",
    cardMeta: "When | Friday • 5:00 AM\nFormat | Ride + Run\nFocus | Endurance • Adaptation\nFinish | Mobility • Recovery",
    panelRows: "Format | 60 Min Ride + 30 Min Run\nTransition | Bike → Run • Keep Moving\nFocus | Endurance • Pacing • Adaptation\nWhy Brick? | Train the body to run strong after the bike",
  },
];

// Home -> "Upcoming Events" section. The slides themselves are real events
// (Admin -> Events, "Featured on homepage"); this is only the heading and
// button wording around them, editable in Admin -> Site Content -> Home
// under "text.home.events.<field>".
export const homeEventsCopy = {
  eyebrow: "Next on the RTG Calendar",
  title: "Upcoming",
  titleAccent: "Events.",
  subtitle: "Flagship experiences, signature challenges and the next reasons to move together.",
  primaryLabel: "Explore Event",
  secondaryLabel: "Register Interest",
  secondaryLink: "/contact",
  allLabel: "Explore All Events",
  allLink: "/events",
  emptyText: "New events are on the way — check the Events page for what's coming up.",
};

// Home -> "Merchandise Highlights" section. The cards are the store's
// products (Admin -> Merchandise); this is only the heading and button
// wording, editable in Admin -> Site Content -> Home under
// "text.home.merch.<field>".
export const homeMerchCopy = {
  eyebrow: "RTG Store",
  title: "Merchandise",
  titleAccent: "Highlights.",
  subtitle: "A quick look at the RTG collection — designed around the colours, energy and identity of the community.",
  addLabel: "Add to Cart",
  chooseLabel: "Buy Now",
  soldOutLabel: "Sold Out",
  storeLabel: "Explore Entire RTG Store",
  storeLink: "/merchandise",
};

// Home -> "Community Gallery" section. The tiles are the gallery items
// uploaded in Admin -> Gallery; this is only the wording around them,
// editable in Admin -> Site Content -> Home under "text.home.gallery.<field>".
// (Field names are deliberately different from the old section's
// eyebrow/title/subtitle trio, which migration 006 deletes.)
export const homeGalleryCopy = {
  kicker: "Moments That Become Stories",
  heading: "Community",
  headingAccent: "Gallery.",
  body: "From early starts to finish-line smiles — a visual diary of rides, runs, trails, events and the people who make RTG.",
  buttonLabel: "Explore Full Gallery",
  buttonLink: "/gallery",
  emptyText: "Photos are on their way — check back soon.",
};

// Home -> "What People Say" section. The slides are the testimonials from
// Admin -> Testimonials; this is only the heading, editable in
// Admin -> Site Content -> Home under "text.home.voices.<field>".
export const homeVoicesCopy = {
  eyebrow: "Community Voices",
  title: "What People",
  titleAccent: "Say.",
  prevLabel: "Previous community voice",
  nextLabel: "Next community voice",
};

// Events page (/events) wording. The events themselves are the rows of the
// `events` table (Admin -> Events); this is every heading, label and
// paragraph around them, editable in Admin -> Site Content -> Events under
// "text.events.<field>".
export const eventsPageCopy = {
  indexLabel: "Events",
  indexYear: "2026—27",
  eyebrow: "Show Up for Something Bigger",
  titleLine1: "Don't Just",
  titleLine2: "Mark the Date.",
  titleLine3: "Feel the Event.",
  intro: "Races, virtual challenges, trails and community formats — built for movement, energy and the moments people remember after the finish.",
  signals: "Flagship Races, Pan-India Challenges, Community Experiences",
  pulseLabel: "Event Pulse",
  prevLabel: "Previous event",
  nextLabel: "Next event",
  sectionNumber: "01",
  sectionLabel: "Discover",
  kicker: "What's Next",
  heading: "Find Your",
  headingAccent: "Next Start Line.",
  body: "Choose the kind of energy you want next. Flagship race, virtual challenge or a regular community format — every card below can become a full event experience when registration goes live.",
  allLabel: "All",
  viewLabel: "View Event",
  boardHeading: "Browse the Board",
  boardHint: "Click a card to bring it into the spotlight.",
  emptyText: "No events yet — new ones are on the way.",
};

// Calendar page (/calendar) wording. What's on the calendar is the rows of
// `calendar_activities` and `calendar_categories` (Admin -> Calendar —
// Activities / Activity Types); this is every heading, label and paragraph
// around them, editable in Admin -> Site Content -> Calendar under
// "text.calendar.<field>".
export const calendarPageCopy = {
  heroKicker: "Shared Calendar",
  heroTitle: "One Calendar.",
  heroTitleAccent: "Every Community.",
  heroText: "A single place to track rides, runs, training sessions and community events — from RTG and the wider groups we move with.",
  heroTags: "Rides, Runs, Training, Group Events",
  boardLabel: "Next 4 Weeks",
  boardBadge: "Live Schedule",
  cardOneLabel: "Connected Groups",
  cardOneText: "RTG + Community Network",
  cardTwoLabel: "This Week",
  cardTwoText: "Plan • Join • Move",
  scrollLabel: "Explore Full Calendar",
  rhythmKicker: "Weekly Rhythm",
  rhythmTitle: "Regular Sessions",
  rhythmText: "A quick view of the recurring training rhythm. As more groups join the shared calendar, their regular sessions can live here too.",
  rhythmViewLabel: "View",
  rhythmEmptyText: "Regular sessions will appear here soon.",
  introKicker: "Month at a Glance",
  introTitle: "What's Happening.",
  introTitleAccent: "When.",
  introText: "Explore rides, runs, training sessions and community events in one shared view. Click any activity inside the calendar to open its details without leaving the page.",
  introPoints: "Explore the Month, Filter by Activity, Click for Details",
  allLabel: "All",
  todayLabel: "Today",
  prevLabel: "Previous month",
  nextLabel: "Next month",
  emptyText: "Nothing on the calendar this month yet — check back soon.",
  dayEmptyText: "Nothing scheduled on this day.",
  modalKicker: "Calendar Detail",
  formatLabel: "Format",
  locationLabel: "Location",
  timeLabel: "Time",
  organiserLabel: "Hosted By",
  statusLabel: "Status",
  noteLabel: "Good to Know",
  linkLabel: "View Details",
  addLabel: "Add to Calendar",
  closeLabel: "Close details",
};

// Leaderboard page (/leaderboard) wording. The numbers are the rows of the
// leaderboard_* and ridge_* tables (Admin -> Leaderboard — … / Ridge
// Repeats — …); this is every heading, label and paragraph around them,
// editable in Admin -> Site Content -> Leaderboard under
// "text.leaderboard.<field>".
export const leaderboardPageCopy = {
  kicker: "Performance Matrix",
  title: "Leaderboard",
  titleAccent: "Lab.",
  text: "One data space for challenge rankings, category comparisons, participation patterns and performance progress.",
  liveLabel: "Data Mode",
  liveText: "Demo • API Ready",
  challengeLabel: "Event / Challenge",
  allChallengesLabel: "All Challenges",
  rankLabel: "Rank By",
  searchLabel: "Search Athlete",
  searchPlaceholder: "Type a name",
  ridgeJumpKicker: "Separate Format",
  ridgeJumpTitle: "Ridge Repeats Lab",
  genderLabel: "Gender",
  ageLabel: "Age",
  sportLabel: "Sport / Format",
  allLabel: "All",
  allGendersLabel: "All Genders",
  allAgesLabel: "All Ages",
  allSportsLabel: "All Sports",
  resetLabel: "Reset Filters",
  pointsLabel: "Points",
  pointsUnit: "PTS",
  distanceLabel: "Distance",
  distanceUnit: "km",
  sessionsLabel: "Sessions",
  consistencyLabel: "Consistency",
  kpiAthletesLabel: "Athletes",
  kpiAthletesText: "matching current filters",
  kpiPointsLabel: "Total Points",
  kpiPointsText: "combined leaderboard score",
  kpiDistanceText: "combined challenge distance",
  kpiConsistencyText: "average completion index",
  podiumKicker: "Top of the Board",
  podiumTitle: "Front Runners.",
  chartKicker: "Performance Pulse",
  chartTitle: "Momentum.",
  chartChip: "Last {count} Checkpoints",
  checkpointPrefix: "C",
  sportMixKicker: "Sport Mix",
  sportMixTitle: "Participation Split",
  ageKicker: "Age Distribution",
  ageTitle: "Who Is Showing Up",
  insightKicker: "Leaderboard Signals",
  insightTitle: "Auto Analysis",
  insightBadge: "AI",
  insightText: "{leader} currently leads this view by {metric}. {sport} has the strongest participation signal and the filtered group averages {consistency}% consistency.",
  insightEmptyText: "No current data matches these filters. Try widening the category or event selection.",
  insightTags: "Participation, Performance, Consistency",
  boardKicker: "Master Board",
  boardTitle: "The Ranking Matrix.",
  boardBadge: "Demo Data",
  athleteLabel: "Athlete",
  rankColumn: "Rank",
  eventColumn: "Event",
  sportColumn: "Sport",
  trendColumn: "Trend",
  emptyText: "No athletes match the current filters.",
  ridgeKicker: "Separate Performance Format",
  ridgeTitle: "Ridge Repeats",
  ridgeTitleAccent: "Lab.",
  ridgeText: "YOU vs YOU. This board is intentionally isolated from the main challenge filters because Ridge Repeats scores progression from loop to loop rather than standard challenge totals.",
  ridgeSessionLabel: "Session",
  ridgeBestLabel: "Best Improvement",
  ridgeAvgLabel: "Avg Loop",
  ridgeCompletionLabel: "Completion",
  ridgeTopScoreLabel: "Top Score",
  ridgeChartKicker: "Loop Progression",
  loopPrefix: "L",
  ridgeBoardKicker: "Session Board",
  ridgeBoardTitle: "Progress + Points",
  ridgeRiderLine: "{avg} avg • {completion}% completion",
  ridgeEmptyText: "No results for this session yet.",
  ridgeNote: "Demo ridge data • Live version can use the existing Ridge Repeats app timestamps, loop scores and rider profiles.",
};

// "Join the Movement" band above the footer, on every page. Fallback
// defaults — editable in Admin -> Site Content -> Footer under
// "text.join.<field>".
export const joinCopy = {
  eyebrow: "Your Next Chapter Starts Here",
  title: "Join the",
  titleAccent: "Movement",
  subtitle: "Ride, run, explore and grow with a community that turns every mile into something memorable.",
  primaryLabel: "Join Community",
  primaryLink: "/community",
  secondaryLabel: "Explore Events",
  secondaryLink: "/events",
};

// Site footer — brand blurb, contact details, social links and the bottom
// line. Fallback defaults — editable in Admin -> Site Content -> Footer
// under "text.footer.<field>". Leave a social link empty to hide its icon.
export const footerCopy = {
  logoAlt: brand.name,
  description: brand.sub,
  contactHeading: "Contact",
  email: brand.email,
  phone: brand.phone,
  location: "Delhi",
  instagramUrl: brand.social.instagram.url,
  facebookUrl: brand.social.facebook.url,
  youtubeUrl: brand.social.youtube.url,
  stravaUrl: brand.social.strava.url,
  copyright: "Ride Tea GupShup. All rights reserved.",
  tagline: "Built for athletes, by athletes.",
};

// Footer link columns. Fallback defaults only — the live links come from
// the `footer_links` table (Admin -> Footer Links). Links sharing a
// `column` title form one column; `columnOrder` places it left to right.
export const footerLinks = [
  { column: "Community", columnOrder: 1, label: "About RTG", to: "/about" },
  { column: "Community", columnOrder: 1, label: "Our Community", to: "/community" },
  { column: "Community", columnOrder: 1, label: "Weekly Rides", to: "/weekly-rides" },
  { column: "Community", columnOrder: 1, label: "Gallery", to: "/gallery" },
  { column: "Community", columnOrder: 1, label: "Volunteer", to: "/community" },
  { column: "Get Involved", columnOrder: 2, label: "Events", to: "/events" },
  { column: "Get Involved", columnOrder: 2, label: "Challenges", to: "/challenges" },
  { column: "Get Involved", columnOrder: 2, label: "Calendar", to: "/calendar" },
  { column: "Get Involved", columnOrder: 2, label: "Race Results", to: "/race-results" },
  { column: "Get Involved", columnOrder: 2, label: "Leaderboard", to: "/leaderboard" },
  { column: "Get Involved", columnOrder: 2, label: "Sponsor With RTG", to: "/sponsors" },
  { column: "Get Involved", columnOrder: 2, label: "Become Chapter Captain", to: "/contact" },
  { column: "More", columnOrder: 3, label: "Store", to: "/merchandise" },
  { column: "More", columnOrder: 3, label: "Kit", to: "/merchandise" },
  { column: "More", columnOrder: 3, label: "Resources", to: "/blog" },
  { column: "More", columnOrder: 3, label: "Safety", to: "/safety" },
  { column: "More", columnOrder: 3, label: "FAQ", to: "/faq" },
  { column: "More", columnOrder: 3, label: "Contact", to: "/contact" },
  { column: "More", columnOrder: 3, label: "Media", to: "/contact" },
  { column: "Legal", columnOrder: 4, label: "Community Guidelines", to: "/community-guidelines" },
  { column: "Legal", columnOrder: 4, label: "Privacy Policy", to: "/privacy" },
  { column: "Legal", columnOrder: 4, label: "Terms", to: "/terms" },
];

export const homeWays = [
  { kicker: "Run with RTG", title: "Running", desc: "Community runs, training, challenges.", imageKey: "heroRunning", link: "/weekly-rides" },
  { kicker: "Ride with RTG", title: "Cycling", desc: "Group rides, new routes, bigger miles.", imageKey: "heroCycling", link: "/weekly-rides" },
  { kicker: "Explore with RTG", title: "Adventure", desc: "MTB trails, off-road escapes and mountain days.", imageKey: "homeWhyJoin", link: "/events" },
];

// Full weekly schedule shown on /weekly-rides and Home's Weekly Activities
// preview — DB-backed via the admin's
// "Weekly Sessions" screen, this is just the fallback shown before any real
// rows exist.
export const weeklySessions = [
  {
    day: "Friday",
    name: "Friday Bricks",
    slug: "friday-bricks",
    time: "5:00 – 5:30 AM",
    location: "Nehru Park, Delhi",
    format: "30km Cycling + 5km Run",
    difficulty: "All Levels",
    paceGroup: "A (fast) / B (moderate) / C (social)",
    cost: "Free",
    description: "RTG's flagship session — cycling straight into a run, back to back, no rest.",
  },
  {
    day: "Sunday",
    name: "Sunday Long Ride",
    slug: "sunday-long-ride",
    time: "6:00 AM",
    location: "Varies (announced weekly)",
    format: "60–120km · Intermediate to Advanced",
    difficulty: "Intermediate",
    paceGroup: "A (fast) / B (moderate)",
    cost: "Free",
    description: "A different route every week — hills, highways, and long flat stretches for building base miles.",
  },
  {
    day: "Wednesday",
    name: "Wednesday Run Club",
    slug: "wednesday-run-club",
    time: "6:30 AM",
    location: "Lodhi Garden, Delhi",
    format: "5–10km · All Levels",
    difficulty: "Beginner",
    paceGroup: "All paces welcome — we regroup often",
    cost: "Free",
    description: "An easy-to-tempo run through the city's greenest park, followed by chai.",
  },
  {
    day: "Saturday",
    name: "Saturday Swim Clinic",
    slug: "saturday-swim-clinic",
    time: "7:00 AM",
    location: "DLF Fort Pool, Delhi",
    format: "1–3km · Beginner to Intermediate",
    difficulty: "Beginner",
    paceGroup: "Coached — grouped by comfort in water",
    cost: "Free",
    description: "Pool-based technique work for stroke, breathing, and open-water confidence.",
  },
];

// The Community page's "What RTG Feels Like" four-moment collage.
export const rtgMoments = [
  { key: "communityCyclists", title: "Riding", desc: "Weekend rides, mountain climbs, and city loops — wheels down, together." },
  { key: "communityRunners", title: "Running", desc: "Sunrise 5Ks to marathon training blocks, every pace welcome." },
  { key: "communityChai", title: "Chai & Conversation", desc: "Every ride ends the same way — chai, stories, and no rush to leave." },
  { key: "communityCelebration", title: "Celebration & Volunteering", desc: "Finish lines, medal ceremonies, and the volunteers who make it all happen." },
];

export const rideSafety = [
  "Wear a helmet at all times — non-negotiable.",
  "Use front & rear lights before sunrise.",
  "Ride/run in formation, follow the ride captain's calls.",
  "Carry ID and emergency contact information.",
  "Follow traffic signals and stay in designated lanes.",
  "Stay hydrated and know your limits — it's not a race.",
];

export const whatToBring = [
  "Road bike or hybrid in good working condition",
  "Helmet (mandatory)",
  "Running shoes for the brick run",
  "Water bottle / hydration pack",
  "Front & rear bike lights",
  "Basic puncture repair kit",
];

export const rideFaqs = [
  { q: "I'm a complete beginner, can I still join?", a: "Absolutely. Friday Bricks is designed to welcome every fitness level — we regroup often and no one gets left behind." },
  { q: "Do I need a race bike?", a: "No. Any road or hybrid bike in safe working condition is fine." },
  { q: "Is there a fee to join the ride?", a: "No, weekly rides are completely free for all community members." },
  { q: "What if I can only do the cycling or only the run?", a: "That's fine — join for whichever part works for you." },
];

export const products = [
  { id: "jersey", name: "RTG Jersey", price: 3000, imgKey: "productJersey", tag: "Bestseller", eyebrow: "Performance", description: "Race-inspired fit with the RTG purple-orange visual language." },
  { id: "tshirt", name: "Cotton T-Shirt", price: 2000, imgKey: "productTshirt", eyebrow: "Everyday", description: "Clean everyday wear for meetups, events, chai stops and travel." },
  { id: "hoodie", name: "Hoodie", price: 2000, imgKey: "productHoodie", eyebrow: "Layer Up", description: "A comfortable RTG layer for winters, travel and post-session mornings." },
  { id: "cap", name: "Cap", price: 500, imgKey: "productCap" },
  { id: "socks", name: "Socks", price: 500, imgKey: "productSocks" },
  { id: "bottle", name: "Bottle", price: 500, imgKey: "productBottle" },
  { id: "wheelbag", name: "Wheel Bag", price: 5000, imgKey: "productWheelBag" },
];

export const challenges = [
  { title: "Resolution Challenge", period: "Jan – Mar 2027", desc: "Kick off the year with a 500km community distance goal." },
  { title: "Monthly Distance Challenge", period: "Every Month", desc: "Log your km, climb the leaderboard, earn the badge." },
  { title: "Elevation Challenge", period: "Quarterly", desc: "Chase the vert — most climbing wins bragging rights." },
  { title: "Ride Streaks", period: "Ongoing", desc: "Consecutive days ridden — how long can you keep it alive?" },
  { title: "Run Streaks", period: "Ongoing", desc: "One run a day, every day — build the habit." },
  { title: "Virtual Competitions", period: "Seasonal", desc: "Compete against RTG members across India, wherever you are." },
];

export const blogPosts = [
  { id: "cycling-tips-beginners", title: "5 Cycling Tips Every Beginner Should Know", category: "Cycling Tips", imgKey: "blogCycling", excerpt: "From bike fit to pacing — start your cycling journey the right way." },
  { id: "running-form-basics", title: "Fixing Your Running Form in 10 Minutes a Day", category: "Running Tips", imgKey: "blogRunning", excerpt: "Small drills, big improvements in efficiency and injury prevention." },
  { id: "open-water-swimming-basics", title: "Open Water Swimming: The Basics", category: "Swimming Basics", imgKey: "blogSwimming", excerpt: "Sighting, breathing, and confidence in open water." },
  { id: "fueling-for-endurance", title: "Fueling for Endurance: A Beginner's Nutrition Guide", category: "Nutrition", imgKey: "blogNutrition", excerpt: "What to eat before, during, and after long efforts." },
  { id: "recovery-101", title: "Recovery 101: Rest as Part of Training", category: "Recovery", imgKey: "blogRecovery", excerpt: "Why your rest days matter as much as your hard days." },
  { id: "bike-maintenance-checklist", title: "The Pre-Ride Bike Maintenance Checklist", category: "Bike Maintenance", imgKey: "blogMaintenance", excerpt: "Five checks to do before every ride." },
  { id: "race-week-prep", title: "Race Week: How to Prepare Like a Pro", category: "Race Preparation", imgKey: "blogRacePrep", excerpt: "Tapering, logistics, and race-morning routines." },
  { id: "athlete-story-first-century", title: "From Couch to Century: An RTG Athlete Story", category: "Athlete Stories", imgKey: "blogStories", excerpt: "How one member went from zero to a 100km ride in 6 months." },
];

export const testimonials = [
  { name: "Ananya Sharma", role: "Runner, Delhi", avatarKey: "avatar1", quote: "RTG gave me the confidence and community I needed to run my first half marathon. The Friday Bricks crew is family now." },
  { name: "Rohit Malhotra", role: "Cyclist, Chandigarh", avatarKey: "avatar2", quote: "I've never felt judged for my pace here. Everyone waits, everyone cheers. That's rare in cycling groups." },
  { name: "Simran Kaur", role: "Triathlete, Jaipur", avatarKey: "avatar3", quote: "From my first open-water swim to finishing a sprint triathlon — RTG's guidance made it possible." },
  { name: "Karan Vij", role: "Beginner, Pune", avatarKey: "avatar4", quote: "Joined knowing nothing about cycling. Six months later I did my first 100km ride with the club." },
  { name: "Priya Nair", role: "Swimmer, Mumbai", avatarKey: "avatar5", quote: "I was terrified of open water. The RTG swim crew got me through my first sea swim, one Saturday at a time." },
  { name: "Arjun Mehta", role: "Marathoner, Dehradun", avatarKey: "avatar6", quote: "Trained for my first full marathon entirely through RTG's Sunday long runs. Crossed the line in under 4 hours." },
  { name: "Neha Kapoor", role: "Cyclist, Shimla", avatarKey: "avatar7", quote: "The hill climbs here are no joke, but so is the support. Someone always drops back to ride with you." },
  { name: "Vikram Rathore", role: "Triathlete, Jaipur", avatarKey: "avatar8", quote: "Finished my first Ironman 70.3 this year. RTG's brick sessions were the single biggest reason I was ready." },
];

export const faqs = [
  { q: "Can beginners join?", a: "Yes! RTG welcomes athletes of every level — from complete beginners to seasoned racers. Our sessions are designed to include everyone." },
  { q: "Is there a membership fee?", a: "Joining the RTG community and attending weekly rides/runs is free. Some special events or premium merch may have a cost." },
  { q: "How do I register?", a: "Hit the 'Join Community' button, fill in your details, and you'll be added to our WhatsApp and Strava groups." },
  { q: "What should I bring?", a: "A helmet, water, and a positive attitude. See the Weekly Rides page for the full kit checklist." },
  { q: "Can I volunteer?", a: "Yes — RTG runs on volunteers for events, ride marshalling, and logistics. Reach out via the Contact page." },
  { q: "Can brands collaborate?", a: "We'd love that. Visit the Sponsors page and request our sponsor deck to explore partnership options." },
  { q: "Is RTG only for cyclists?", a: "Not at all — RTG is a multi-sport community covering cycling, running, swimming, and triathlon." },
];

export const sponsorOpportunities = [
  { title: "Events", desc: "Title and category sponsorship across RTG races and rides." },
  { title: "Merchandise", desc: "Co-branded kit and product collaborations." },
  { title: "Digital Campaigns", desc: "Reach 500+ engaged endurance athletes online." },
  { title: "Athlete Collaborations", desc: "Partner directly with RTG's featured athletes." },
  { title: "Community Activations", desc: "On-ground brand activations at rides and events." },
];

export const instagramPlaceholderCount = 8;

// ---- Community: "How to Join" flow + founding timeline ----

export const joinSteps = [
  { step: 1, title: "Choose City", desc: "Pick the RTG chapter nearest you — 8+ cities and growing." },
  { step: 2, title: "Choose Sport", desc: "Cycling, running, swimming, or triathlon — or all of them." },
  { step: 3, title: "Join WhatsApp", desc: "Get added to your city's group for ride announcements and updates." },
  { step: 4, title: "Fill Form", desc: "A two-minute sign-up so we know your pace, goals, and experience." },
  { step: 5, title: "Show Up on Friday", desc: "Come to Friday Bricks at Nehru Park — no registration needed." },
  { step: 6, title: "Find Your People", desc: "Ride, run, and share chai with athletes at your pace." },
  { step: 7, title: "Grow Together", desc: "Train consistently, chase new distances, and mentor the next beginner." },
];

// ---- About: Leadership (fallback shown until real team members are added
// via the admin Team screen — see src/lib/publicData.js useTeamMembers) ----

export const teamMembers = [
  { name: "Randeep", role: "Founder", city: "Delhi", sport: "Cycling & Triathlon", avatarKey: "avatar1", instagramUrl: "https://instagram.com/RideTeaGupShup" },
  { name: "Simran", role: "Founder", city: "Delhi", sport: "Running", avatarKey: "avatar2", instagramUrl: "https://instagram.com/RideTeaGupShup" },
  { name: "Manish Jayal", role: "Head Coach", city: "Delhi", sport: "Cycling & Running", avatarKey: "avatar8", instagramUrl: "https://instagram.com/RideTeaGupShup" },
  { name: "Hitesh", role: "Core Team", city: "Delhi", sport: "Cycling", avatarKey: "avatar3", instagramUrl: "https://instagram.com/RideTeaGupShup" },
  { name: "Jasskerat", role: "Core Team", city: "Delhi", sport: "Running", avatarKey: "avatar4", instagramUrl: "https://instagram.com/RideTeaGupShup" },
  { name: "Harshad", role: "Core Team", city: "Delhi", sport: "Cycling", avatarKey: "avatar5", instagramUrl: "https://instagram.com/RideTeaGupShup" },
  { name: "Yash", role: "Core Team", city: "Delhi", sport: "Running", avatarKey: "avatar6", instagramUrl: "https://instagram.com/RideTeaGupShup" },
  { name: "Hojo", role: "Core Team", city: "Delhi", sport: "Cycling", avatarKey: "avatar7", instagramUrl: "https://instagram.com/RideTeaGupShup" },
];

// Community page's "Ways to Participate" quick-entry cards.
export const waysToParticipate = [
  { title: "Join a Ride", desc: "Weekend rides, mountain climbs, and city loops.", to: "/weekly-rides", icon: "bike" },
  { title: "Join a Run", desc: "Sunrise 5Ks to marathon training blocks.", to: "/weekly-rides", icon: "footprints" },
  { title: "Take a Challenge", desc: "Pan-India virtual distance and elevation goals.", to: "/challenges", icon: "flame" },
  { title: "Attend a Meetup", desc: "Chai, stories, and planning the next big ride.", to: "/events", icon: "users" },
  { title: "Volunteer with RTG", desc: "Marshalling, logistics, photography, and more.", to: "#volunteer", icon: "heart-handshake" },
];

// ---- Race Results (fallback shown until real results are added via the
// admin Race Results screen) ----

export const raceResults = [
  { eventName: "Endurance League Vol. 1", athleteName: "Rohit Malhotra", category: "Cycling — Open", finishTime: "4:12:08", position: "1st", year: "2026" },
  { eventName: "Endurance League Vol. 1", athleteName: "Ananya Sharma", category: "Running — Women", finishTime: "1:52:44", position: "1st", year: "2026" },
  { eventName: "Delhi Cycling Festival", athleteName: "Karan Vij", category: "Cycling — 100km", finishTime: "3:08:21", position: "3rd", year: "2026" },
  { eventName: "Himalayan Adventure Ride", athleteName: "Simran Kaur", category: "Cycling — Open", finishTime: "—", position: "Finisher", year: "2025" },
];

// ---- Sponsors: pricing tiers ----

export const sponsorTiers = [
  {
    name: "Title Sponsor",
    price: "₹5,00,000/year",
    perks: ["Logo on all jerseys", "Event naming rights", "Social media features", "Email newsletter placement", "Booth at all events"],
  },
  {
    name: "Gold Sponsor",
    price: "₹2,00,000/year",
    perks: ["Logo on event jerseys", "Social media features", "Email newsletter placement", "Booth at major events"],
  },
  {
    name: "Community Sponsor",
    price: "₹50,000/year",
    perks: ["Logo on website", "Social media shoutout", "Community newsletter feature"],
  },
];

// ---- Merchandise: size guide, reviews, policies ----

export const sizeGuide = [
  { size: "S", chest: "36–38 in", length: "27 in" },
  { size: "M", chest: "39–41 in", length: "28 in" },
  { size: "L", chest: "42–44 in", length: "29 in" },
  { size: "XL", chest: "45–47 in", length: "30 in" },
];

export const merchReviews = [
  { name: "Ananya S.", product: "RTG Jersey", rating: 5, quote: "Fits true to size, breathes well even in Delhi summer rides. Worth every rupee." },
  { name: "Rohit M.", product: "Hoodie", rating: 5, quote: "Warm enough for winter Friday Bricks and doesn't look like typical sportswear — wear it everywhere." },
  { name: "Karan V.", product: "Cap", rating: 4, quote: "Solid quality, adjustable strap fits well. Would love more colour options." },
];

export const shippingInfo = {
  shipping: "Free shipping on orders above ₹2,000. Delivery in 5–7 business days across India.",
  returns: "Not happy with the fit? Returns accepted within 7 days of delivery, unworn and with tags attached.",
  memberDiscount: "RTG members get 10% off all merchandise — log in before checkout to apply your discount automatically.",
};

// ---- Safety page (general guidelines — see rideSafety above for the
// Friday Bricks–specific checklist) ----

export const generalSafety = [
  { title: "Helmets, always", desc: "Non-negotiable on every ride, every distance, every pace." },
  { title: "Ride/run in groups", desc: "Never head out alone on unfamiliar routes — buddy up." },
  { title: "Share your location", desc: "Let someone know your route and expected return time." },
  { title: "Follow traffic rules", desc: "Signal turns, stop at signals, ride single-file on main roads." },
  { title: "Carry ID", desc: "Always carry ID and an emergency contact, digital or physical." },
  { title: "Know your limits", desc: "It's community sport, not a race — regroup often and pace to the slowest rider." },
  { title: "First aid basics", desc: "Every ride captain carries a basic first-aid kit and knows the nearest hospital en route." },
  { title: "Report incidents", desc: "Flag any safety concern to a ride captain or via the Contact page immediately." },
];
