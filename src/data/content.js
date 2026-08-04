/**
 * Central content store — all copy for the RTG site lives here.
 * Update text, numbers, events, products, etc. in this one place.
 */

export const brand = {
  name: "Ride Tea GupShup",
  shortName: "RTG",
  tagline: "Ride Together. Run Together. Grow Together.",
  sub: "India's endurance sports community for cycling, running, swimming, challenges, races, and unforgettable adventures.",
  email: "hello@ridetegupshup.in",
  phone: "+91 98765 43210",
  cities: ["Delhi", "Chandigarh", "Dehradun", "Jaipur", "Shimla", "Punjab", "Pune", "Mumbai"],
  members: "500+",
  social: {
    instagram: { handle: "RideTeaGupShup", url: "https://instagram.com/RideTeaGupShup" },
    facebook: { handle: "RideTeaGupShup", url: "https://facebook.com/RideTeaGupShup" },
    youtube: { handle: "RideTeaGupShup", url: "https://youtube.com/@RideTeaGupShup" },
    strava: { handle: "RideTeaGupShup", url: "https://strava.com/clubs/RideTeaGupShup" },
  },
};

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
  { label: "Community Members", value: 500, suffix: "+" },
  { label: "Cities Across India", value: 8, suffix: "+" },
  { label: "Weekly Sessions", value: 3, suffix: "" },
  { label: "KM Covered Together", value: 120000, suffix: "+" },
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

export const weeklyActivities = [
  { day: "Friday", name: "Friday Bricks", detail: "30km Cycling + 5km Run · Nehru Park, Delhi · 5:00–5:30 AM" },
  { day: "Sunday", name: "Long Ride", detail: "60–100km road ride for all levels" },
  { day: "Wednesday", name: "Evening Run Club", detail: "5–10km tempo & easy run" },
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
    prize: "Prize Pool Worth ₹5 Lakhs",
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
  { date: "2027-01-15", title: "Resolution Challenge Kickoff", cat: "running" },
  { date: "2027-02-08", title: "Chandigarh Community Ride", cat: "community" },
  { date: "2027-03-22", title: "Dehradun Hill Climb (MTB)", cat: "mtb" },
  { date: "2027-04-12", title: "Jaipur Sprint Triathlon", cat: "triathlon" },
  { date: "2027-05-05", title: "Shimla Adventure Tour", cat: "adventure" },
  { date: "2027-06-06", title: "Endurance League Vol. 2 Opens", cat: "cycling" },
  { date: "2027-07-19", title: "Pune Monsoon Ride", cat: "cycling" },
  { date: "2027-09-14", title: "Mumbai Coastal Run", cat: "running" },
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
