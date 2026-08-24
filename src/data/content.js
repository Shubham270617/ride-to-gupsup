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

// Home hero — 4-slide auto-advancing carousel (Cycling/Running/Swimming/Community)
export const heroSlides = [
  {
    tag: "Cycling",
    title: "Ride Together.",
    accent: "Go Further.",
    subtitle: "Weekend rides, mountain adventures, and welcoming wheels for every pace — because the best rides are shared.",
    imageKey: "heroCycling",
  },
  {
    tag: "Running",
    title: "Run Together.",
    accent: "Find Your Pace.",
    subtitle: "From sunrise 5Ks to marathon training blocks — every pace has a place in our run club.",
    imageKey: "heroRunning",
  },
  {
    tag: "Swimming",
    title: "Swim Together.",
    accent: "Move Stronger.",
    subtitle: "Pool sessions and open-water swims, coached and community-powered from your very first lap.",
    imageKey: "heroSwimming",
  },
  {
    tag: "Community",
    title: "Grow Together.",
    accent: "Belong Here.",
    subtitle: "India's endurance sports community for cycling, running, swimming, challenges, races, and unforgettable adventures.",
    imageKey: "heroCommunity",
  },
];

export const mission =
  "Build India's most loved endurance sports community where athletes learn together, grow together, and inspire one another.";

export const vision =
  "Create a nationwide sports community that promotes respect, knowledge sharing, healthy competition, adventure, and lifelong friendships.";

export const coreValues = [
  { title: "Community First", desc: "We show up for each other, on and off the road." },
  { title: "Learn Together", desc: "Every ride and run is a chance to get better, together." },
  { title: "Fun Without Pressure", desc: "No egos. No pace-shaming. Just good vibes and hard work." },
  { title: "Respect Every Athlete", desc: "Beginner or elite — everyone gets the same respect." },
  { title: "Adventure", desc: "We chase sunrises, summits, and the open road." },
  { title: "Consistency", desc: "Small, repeated efforts build big results." },
  { title: "Growth Through Sports", desc: "Endurance sport as a vehicle for personal growth." },
];

export const stats = [
  { key: "activeMembers", label: "Active Members", value: 500, suffix: "+" },
  { key: "cities", label: "Cities Across India", value: 8, suffix: "+" },
  { key: "cyclingKm", label: "Total Cycling KM", value: 850000, suffix: "+" },
  { key: "runningKm", label: "Total Running KM", value: 210000, suffix: "+" },
  { key: "elevation", label: "Elevation Climbed (m)", value: 320000, suffix: "+" },
  { key: "marathons", label: "Marathons Completed", value: 65, suffix: "+" },
  { key: "ironman", label: "Ironman Finishers", value: 9, suffix: "" },
  { key: "brm", label: "BRM Finishers", value: 22, suffix: "" },
];

export const whyJoin = [
  {
    title: "Structured Weekly Training",
    desc: "Friday Bricks, long rides, and recovery runs designed for real progress.",
  },
  {
    title: "Beginner Friendly",
    desc: "No pace is too slow. We ride, run, and swim at every level, together.",
  },
  {
    title: "Real Community",
    desc: "Chai after every ride. Friendships that outlast the finish line.",
  },
  {
    title: "Events & Challenges",
    desc: "From local meetups to the Endurance League — always something to train for.",
  },
  {
    title: "Expert Guidance",
    desc: "Learn technique, nutrition, and recovery from experienced athletes.",
  },
  {
    title: "Premium Merch & Gear",
    desc: "Kit that looks as good as your Strava segment times.",
  },
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

export const communityGroups = [
  { key: "communityCyclists", title: "Cyclists", desc: "Road, TT, gravel — riders chasing distance and speed together." },
  { key: "communityRunners", title: "Runners", desc: "From 5K first-timers to marathon veterans." },
  { key: "communitySwimmers", title: "Swimmers", desc: "Pool sessions and open-water swim training." },
  { key: "communityTriathletes", title: "Triathletes", desc: "Multi-sport athletes training for the full distance." },
  { key: "communityBeginners", title: "Beginners", desc: "New to endurance sport? You'll find your pace here." },
  { key: "communityExperienced", title: "Experienced Athletes", desc: "Podium finishers who love mentoring the next generation." },
  { key: "communityVolunteers", title: "Volunteers", desc: "The people who make every event and ride run smoothly." },
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

export const events = [
  {
    id: "endurance-league-2",
    title: "Endurance League Vol. 2",
    date: "June 2027",
    type: "Pan India Virtual Endurance Challenge",
    categories: ["Cycling", "Running"],
    prize: 500000,
    featured: true,
    imgKey: "eventFeatured",
    desc: "India's biggest virtual endurance challenge returns. Log your distance, climb the leaderboard, win big.",
  },
  { id: "mtb-championship", title: "MTB Championship", date: "TBA 2027", type: "Off-road Racing", categories: ["MTB"], imgKey: "eventMTB", desc: "Technical trails, timed climbs, and serious bragging rights." },
  { id: "resolution-challenge", title: "Resolution Challenge", date: "January 2027", type: "Virtual Challenge", categories: ["Cycling", "Running"], imgKey: "eventResolution", desc: "Start the year strong with a community-wide distance goal." },
  { id: "adventure-rides", title: "Adventure Rides", date: "Ongoing", type: "Outdoor Touring", categories: ["Cycling", "Adventure"], imgKey: "eventAdventure", desc: "Multi-day rides through the hills — Shimla, Dehradun and beyond." },
  { id: "community-meetups", title: "Community Meetups", date: "Monthly", type: "Social", categories: ["Community"], imgKey: "eventMeetup", desc: "Chai, stories, and planning the next big ride." },
  { id: "monthly-challenges", title: "Monthly Challenges", date: "Every Month", type: "Virtual Challenge", categories: ["Cycling", "Running"], imgKey: "eventMonthly", desc: "Fresh distance & elevation goals, every single month." },
  { id: "sports-workshops", title: "Sports Workshops", date: "Quarterly", type: "Education", categories: ["Workshop"], imgKey: "eventWorkshop", desc: "Bike maintenance, nutrition, and injury-prevention sessions." },
];

export const products = [
  { id: "jersey", name: "RTG Jersey", price: 3000, imgKey: "productJersey", tag: "Bestseller" },
  { id: "tshirt", name: "Cotton T-Shirt", price: 2000, imgKey: "productTshirt" },
  { id: "hoodie", name: "Hoodie", price: 2000, imgKey: "productHoodie" },
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

export const calendarCategories = [
  { key: "cycling", label: "Cycling Events", color: "#f76b1c" },
  { key: "running", label: "Running Events", color: "#8354d1" },
  { key: "mtb", label: "MTB Events", color: "#ffb073" },
  { key: "triathlon", label: "Triathlons", color: "#ac8ce5" },
  { key: "community", label: "Community Rides", color: "#5b2ba8" },
  { key: "adventure", label: "Adventure Tours", color: "#d94f0e" },
];

export const calendarEvents = [
  { date: "2027-01-15", title: "Resolution Challenge Kickoff", cat: "running", city: "Delhi", difficulty: "Beginner" },
  { date: "2027-02-08", title: "Chandigarh Community Ride", cat: "community", city: "Chandigarh", difficulty: "Beginner" },
  { date: "2027-03-22", title: "Dehradun Hill Climb (MTB)", cat: "mtb", city: "Dehradun", difficulty: "Advanced" },
  { date: "2027-04-12", title: "Jaipur Sprint Triathlon", cat: "triathlon", city: "Jaipur", difficulty: "Intermediate" },
  { date: "2027-05-05", title: "Shimla Adventure Tour", cat: "adventure", city: "Shimla", difficulty: "Advanced" },
  { date: "2027-06-06", title: "Endurance League Vol. 2 Opens", cat: "cycling", city: "Delhi", difficulty: "Intermediate" },
  { date: "2027-07-19", title: "Pune Monsoon Ride", cat: "cycling", city: "Pune", difficulty: "Beginner" },
  { date: "2027-09-14", title: "Mumbai Coastal Run", cat: "running", city: "Mumbai", difficulty: "Intermediate" },
];

export const calendarCities = ["Delhi", "Chandigarh", "Dehradun", "Jaipur", "Shimla", "Pune", "Mumbai"];
export const calendarDifficulties = ["Beginner", "Intermediate", "Advanced"];

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

export const communityTimeline = [
  { label: "RTG Started", desc: "A handful of friends met for a Friday sunrise ride at Nehru Park." },
  { label: "100 Members", desc: "Word spread — the WhatsApp group crossed 100 riders." },
  { label: "First Event", desc: "RTG's first organized community ride outside Delhi." },
  { label: "Running Added", desc: "Friday Bricks became cycling + running, and the community followed." },
  { label: "Endurance League Launched", desc: "RTG's first pan-India virtual endurance challenge." },
  { label: "500+ Members", desc: "Across 8+ cities, and still growing every week." },
];

// ---- About: Leadership (fallback shown until real team members are added
// via the admin Team screen — see src/lib/publicData.js useTeamMembers) ----

export const teamMembers = [
  { name: "Founder & Head Coach", role: "Founder & Head Coach", city: "Delhi", sport: "Cycling & Triathlon", avatarKey: "avatar1", instagramUrl: "https://instagram.com/RideTeaGupShup" },
  { name: "Running Lead", role: "Running Lead", city: "Delhi", sport: "Ultra & Trail Running", avatarKey: "avatar2", instagramUrl: "https://instagram.com/RideTeaGupShup" },
  { name: "Swim Coach", role: "Swim Coach", city: "Pune", sport: "Open Water & Pool", avatarKey: "avatar3", instagramUrl: "https://instagram.com/RideTeaGupShup" },
];

export const fiveYearGoal =
  "By 2032, we want RTG in 25+ Indian cities with 5,000+ active athletes, running a full calendar of RTG-organized races, and having produced 100+ first-time marathon, century-ride, and triathlon finishers who never thought they could.";

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
