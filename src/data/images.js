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
 *  there is no need to hunt through component files. All current values are
 *  placeholder stock photography — swap them for real RTG event photos
 *  whenever they're ready.
 * ============================================================================
 */

const unsplash = (id, w = 1600) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

export const images = {
  // ---- Brand ----
  logo: "/images/rtg-logo-horizontal.png", // navbar/footer lockup (icon + wordmark, one line)
  logoIcon: "/images/rtg-logo-square.png", // stacked icon+wordmark — used where a compact/square mark fits better

  // ---- INTRO / PRELOADER ----
  // introPoster shows instantly while /videos/rtg-intro.mp4 loads (also the
  // fallback frame if a browser blocks video autoplay). To change the intro
  // video itself, replace public/videos/rtg-intro.mp4 with a new file of the
  // same name (keep it short — under ~10s loop — and under ~8MB for fast load).
  introPoster: "/images/intro-poster.jpg",

  // ---- HOME ----
  homeHero: unsplash("1517649763962-0c623066013b", 2000), // sunrise cyclist
  // Home hero carousel slides (Cycling/Running/Swimming/Community)
  heroCycling: unsplash("1517649763962-0c623066013b", 2000),
  heroRunning: unsplash("1461896836934-ffe607ba8211", 2000),
  heroSwimming: unsplash("1519315901367-f34ff9154487", 2000),
  heroCommunity: unsplash("1541625602330-2277a4c46182", 2000),
  homeAbout: unsplash("1541625602330-2277a4c46182", 1400), // group of cyclists
  homeWhyJoin: unsplash("1476480862126-209bfaa8edc8", 1400), // runner
  homeWeekly: unsplash("1461896836934-ffe607ba8211", 1600), // group runners
  homeMerchPreview: unsplash("1554068865-24cecd4e34b8", 1200),
  homeCTA: unsplash("1506905925346-21bda4d32df4", 2000), // mountain adventure

  // ---- ABOUT ----
  aboutHero: unsplash("1571068316344-75bc76f77890", 2000), // road cycling
  aboutStory1: unsplash("1519315901367-f34ff9154487", 1200), // swimmer
  aboutStory2: unsplash("1552674605-db6ffd4facb5", 1200), // running shoes
  aboutMission: unsplash("1530549387789-4c1017266635", 1400), // open water swim

  // ---- COMMUNITY ----
  communityHero: unsplash("1502904550040-7534597429ae", 2000),
  communityCyclists: unsplash("1517649763962-0c623066013b", 1000),
  communityRunners: unsplash("1461896836934-ffe607ba8211", 1000),
  communitySwimmers: unsplash("1519315901367-f34ff9154487", 1000),
  communityTriathletes: unsplash("1571068316344-75bc76f77890", 1000),
  communityBeginners: unsplash("1476480862126-209bfaa8edc8", 1000),
  communityExperienced: unsplash("1541625602330-2277a4c46182", 1000),
  communityVolunteers: unsplash("1552674605-db6ffd4facb5", 1000),

  // ---- WEEKLY RIDES ----
  ridesHero: unsplash("1517836357463-d25dfeac3438", 2000),
  ridesBricks: unsplash("1571019613454-1cb2f99b2d8b", 1600),
  ridesSafety: unsplash("1517931524326-bdd55a541177", 1200),
  ridesGear: unsplash("1600965962102-9d260a71890d", 1200),

  // ---- EVENTS ----
  eventsHero: unsplash("1571902943202-507ec2618e8f", 2000),
  eventFeatured: unsplash("1524594152303-9fd13543fe6e", 1600), // Endurance League
  eventMTB: unsplash("1506905925346-21bda4d32df4", 1000),
  eventResolution: unsplash("1461896836934-ffe607ba8211", 1000),
  eventAdventure: unsplash("1508898578281-774ac4893c0c", 1000),
  eventMeetup: unsplash("1541625602330-2277a4c46182", 1000),
  eventMonthly: unsplash("1476480862126-209bfaa8edc8", 1000),
  eventWorkshop: unsplash("1601058268499-e52658b8bb88", 1000),

  // ---- CHALLENGES ----
  challengesHero: unsplash("1546519638-68e109498ffc", 2000),

  // ---- RACE CALENDAR ----
  calendarHero: unsplash("1523875194681-bedd468c58bf", 2000),

  // ---- BLOG ----
  blogHero: unsplash("1546483875-ad9014c88eba", 2000),
  blogCycling: unsplash("1517649763962-0c623066013b", 1000),
  blogRunning: unsplash("1552674605-db6ffd4facb5", 1000),
  blogSwimming: unsplash("1519315901367-f34ff9154487", 1000),
  blogNutrition: unsplash("1584735175315-9d5df23860e6", 1000),
  blogRecovery: unsplash("1517022812141-23620dba5c23", 1000),
  blogMaintenance: unsplash("1571068316344-75bc76f77890", 1000),
  blogRacePrep: unsplash("1461896836934-ffe607ba8211", 1000),
  blogStories: unsplash("1544367567-0f2fcb009e0b", 1000),

  // ---- SPONSORS ----
  sponsorsHero: unsplash("1502224562085-639556652f33", 2000),

  // ---- GALLERY (masonry) ----
  gallery: [
    unsplash("1517649763962-0c623066013b", 1200),
    unsplash("1461896836934-ffe607ba8211", 1200),
    unsplash("1519315901367-f34ff9154487", 1200),
    unsplash("1541625602330-2277a4c46182", 1200),
    unsplash("1506905925346-21bda4d32df4", 1200),
    unsplash("1476480862126-209bfaa8edc8", 1200),
    unsplash("1571068316344-75bc76f77890", 1200),
    unsplash("1530549387789-4c1017266635", 1200),
    unsplash("1552674605-db6ffd4facb5", 1200),
    unsplash("1571019613454-1cb2f99b2d8b", 1200),
    unsplash("1517931524326-bdd55a541177", 1200),
    unsplash("1600965962102-9d260a71890d", 1200),
  ],

  // ---- CONTACT ----
  contactHero: unsplash("1571902943202-507ec2618e8f", 2000),

  // ---- MERCHANDISE ----
  merchHero: unsplash("1600965962102-9d260a71890d", 2000),

  // ---- FAQ ----
  faqHero: unsplash("1517931524326-bdd55a541177", 2000),

  // ---- RACE RESULTS ----
  raceResultsHero: unsplash("1546519638-68e109498ffc", 2000),

  // ---- SAFETY ----
  safetyHero: unsplash("1517931524326-bdd55a541177", 2000),

  // ---- MERCHANDISE (product photos) ----
  productJersey: unsplash("1517649763962-0c623066013b", 1000),
  productTshirt: unsplash("1476480862126-209bfaa8edc8", 1000),
  productHoodie: unsplash("1554068865-24cecd4e34b8", 1000),
  productCap: unsplash("1601058268499-e52658b8bb88", 1000),
  productSocks: unsplash("1552674605-db6ffd4facb5", 1000),
  productBottle: unsplash("1530549387789-4c1017266635", 1000),
  productWheelBag: unsplash("1517836357463-d25dfeac3438", 1000),

  // ---- TESTIMONIAL AVATARS ----
  avatar1: unsplash("1502224562085-639556652f33", 300),
  avatar2: unsplash("1546519638-68e109498ffc", 300),
  avatar3: unsplash("1523875194681-bedd468c58bf", 300),
  avatar4: unsplash("1508898578281-774ac4893c0c", 300),
};

export default images;
