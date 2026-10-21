// The admin menu: every screen, its group and icon. Used by the sidebar
// (AdminLayout.jsx) and by each page header (AdminPageHeader.jsx).
import {
  LayoutDashboard,
  CalendarDays,
  CalendarRange,
  CalendarClock,
  Images,
  ShoppingBag,
  Newspaper,
  Handshake,
  Quote,
  Flame,
  Image as ImageIcon,
  FileText,
  Palette,
  Mail,
  ShieldCheck,
  Users,
  Trophy,
  Package,
  Sparkles,
  HelpCircle,
  ShieldAlert,
  Backpack,
  Gift,
  Tags,
  Medal,
  Repeat,
  TrendingUp,
  Inbox,
  Mountain,
  Store,
  Globe,
  Bot,
  Home,
} from "lucide-react";

// Every admin screen, grouped the way people look for them. A group opens
// on its own when one of its screens is active; the search box filters all
// of them at once.
export const groups = [
  {
    title: "Overview",
    icon: LayoutDashboard,
    links: [
      { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
      { to: "/admin/visitors", label: "Visitors", icon: TrendingUp },
    ],
  },
  {
    title: "Inbox & people",
    icon: Inbox,
    links: [
      { to: "/admin/messages", label: "Messages", icon: Mail, badge: "messages" },
      { to: "/admin/admins", label: "Members", icon: ShieldCheck },
      { to: "/admin/orders", label: "Orders", icon: Package },
      { to: "/admin/membership-purchases", label: "Membership Purchases", icon: Package },
    ],
  },
  {
    title: "Rides & events",
    icon: CalendarDays,
    links: [
      { to: "/admin/events", label: "Events", icon: CalendarDays },
      { to: "/admin/calendar", label: "Calendar — Activities", icon: CalendarRange },
      { to: "/admin/calendar-types", label: "Calendar — Activity Types", icon: Tags },
      { to: "/admin/weekly-sessions", label: "Weekly Sessions", icon: CalendarClock },
      { to: "/admin/ride-safety", label: "Ride Safety Checklist", icon: ShieldAlert },
      { to: "/admin/what-to-bring", label: "What to Bring", icon: Backpack },
      { to: "/admin/ride-faqs", label: "Ride FAQs", icon: HelpCircle },
      { to: "/admin/challenges", label: "Challenges", icon: Flame },
      { to: "/admin/race-results", label: "Race Results", icon: Trophy },
    ],
  },
  {
    title: "RTG Lab & Ridge",
    icon: Mountain,
    links: [
      { to: "/admin/ridge-import", label: "Ridge Import (dry run)", icon: Repeat },
      { to: "/admin/ridge", label: "Ridge — Session control", icon: Repeat },
      { to: "/admin/ridge-codes", label: "Ridge — Access codes (owner)", icon: Repeat },
      { to: "/admin/ridge-volunteers", label: "Ridge — Volunteer access (owner)", icon: Repeat },
      { to: "/admin/lab-labs", label: "Lab — Labs", icon: Medal },
      { to: "/admin/lab-periods", label: "Lab — Reward Periods", icon: CalendarClock },
      { to: "/admin/lab-hero-tiles", label: "Lab — Hero Tiles", icon: Sparkles },
      { to: "/admin/lab-principles", label: "Lab — Principles", icon: Sparkles },
      { to: "/admin/lab-access-steps", label: "Lab — Access Steps", icon: HelpCircle },
      { to: "/admin/lab-sports", label: "Lab — Sports", icon: Tags },
      { to: "/admin/lab-age-categories", label: "Lab — Age Categories", icon: Tags },
      { to: "/admin/lab-activities", label: "Lab — Manual Activities", icon: Flame },
    ],
  },
  {
    title: "Membership",
    icon: Gift,
    links: [
      { to: "/admin/membership-plans", label: "Plans", icon: Gift },
      { to: "/admin/membership-perks", label: "Club Perks", icon: Sparkles },
      { to: "/admin/membership-guides", label: "Which One", icon: HelpCircle },
      { to: "/admin/membership-steps", label: "Steps", icon: CalendarClock },
      { to: "/admin/membership-faqs", label: "Questions", icon: HelpCircle },
    ],
  },
  {
    title: "Store",
    icon: Store,
    links: [
      { to: "/admin/products", label: "Merchandise", icon: ShoppingBag },
      { to: "/admin/store-categories", label: "Store Categories", icon: Tags },
    ],
  },
  {
    title: "Community",
    icon: Users,
    links: [
      { to: "/admin/volunteer", label: "Volunteer roles", icon: Users },
      { to: "/admin/community-paths", label: "Find Your Place", icon: Images },
      { to: "/admin/community-way", label: "The RTG Way", icon: Sparkles },
      { to: "/admin/community-motion", label: "RTG in Motion", icon: CalendarClock },
      { to: "/admin/community-network", label: "Network Groups", icon: Users },
      { to: "/admin/community-network-pins", label: "Network Map Pins", icon: Tags },
      { to: "/admin/community-cities", label: "Cities", icon: Tags },
      { to: "/admin/community-city-photos", label: "City Photos", icon: Images },
      { to: "/admin/gallery", label: "Gallery", icon: Images },
      { to: "/admin/testimonials", label: "Testimonials", icon: Quote },
      { to: "/admin/team", label: "Team", icon: Users },
    ],
  },
  {
    title: "Home & site",
    icon: Home,
    links: [
      { to: "/admin/home-why", label: "Home — Why RTG Cards", icon: Sparkles },
      { to: "/admin/home-ways", label: "Home — Ways to Move", icon: Images },
      { to: "/admin/home-training", label: "Home — Training Formats", icon: CalendarClock },
      { to: "/admin/site-images", label: "Site Photos", icon: ImageIcon },
      { to: "/admin/site-content", label: "Site Content", icon: FileText },
      { to: "/admin/appearance", label: "Appearance", icon: Palette },
      { to: "/admin/layout-studio", label: "Layout Studio (draft)", icon: Palette },
      { to: "/admin/site-editor", label: "Site visual editor (local draft)", icon: Palette },
      { to: "/admin/footer-links", label: "Footer Links", icon: FileText },
      { to: "/admin/faqs", label: "FAQ", icon: HelpCircle },
      { to: "/admin/general-safety", label: "General Safety", icon: ShieldAlert },
      { to: "/admin/blog", label: "Blog", icon: Newspaper },
    ],
  },
  {
    title: "Sponsors",
    icon: Handshake,
    links: [
      { to: "/admin/sponsors", label: "Sponsors", icon: Handshake },
      { to: "/admin/sponsor-tiers", label: "Sponsor Tiers", icon: Gift },
      { to: "/admin/sponsor-opportunities", label: "Opportunities", icon: Globe },
    ],
  },
  {
    title: "Tools",
    icon: Bot,
    links: [{ to: "/admin/ai", label: "AI Assistant", icon: Bot }],
  },
];

export const allLinks = groups.flatMap((g) => g.links.map((l) => ({ ...l, group: g.title })));

export function activeLink(pathname) {
  // Longest matching path wins, so /admin/visitors beats /admin.
  return [...allLinks]
    .filter((l) => (l.end ? pathname === l.to : pathname === l.to || pathname.startsWith(`${l.to}/`)))
    .sort((a, b) => b.to.length - a.to.length)[0];
}




