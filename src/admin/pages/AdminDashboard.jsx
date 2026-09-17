import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  CalendarRange,
  CalendarClock,
  Images,
  ShoppingBag,
  Package,
  Newspaper,
  Handshake,
  Quote,
  Flame,
  Users,
  Trophy,
} from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import useAdminSession from "../useAdminSession";

// Every table that's worth a quick "how many do I have" glance at the top
// of the admin — the smaller list-shaped content (FAQ, safety checklists,
// sponsor tiers, etc.) is reachable from the sidebar but left off this
// overview grid since a count of those isn't something you'd check daily.
const cards = [
  { table: "events", label: "Events", icon: CalendarDays, to: "/admin/events" },
  { table: "calendar_events", label: "Calendar Entries", icon: CalendarRange, to: "/admin/calendar" },
  { table: "weekly_sessions", label: "Weekly Sessions", icon: CalendarClock, to: "/admin/weekly-sessions" },
  { table: "gallery_items", label: "Gallery Items", icon: Images, to: "/admin/gallery" },
  { table: "products", label: "Products", icon: ShoppingBag, to: "/admin/products" },
  { table: "orders", label: "Orders", icon: Package, to: "/admin/orders" },
  { table: "blog_posts", label: "Blog Posts", icon: Newspaper, to: "/admin/blog" },
  { table: "sponsors", label: "Sponsors", icon: Handshake, to: "/admin/sponsors" },
  { table: "testimonials", label: "Testimonials", icon: Quote, to: "/admin/testimonials" },
  { table: "challenges", label: "Challenges", icon: Flame, to: "/admin/challenges" },
  { table: "team_members", label: "Team Members", icon: Users, to: "/admin/team" },
  { table: "race_results", label: "Race Results", icon: Trophy, to: "/admin/race-results" },
];

export default function AdminDashboard() {
  const { adminName } = useAdminSession();
  const [counts, setCounts] = useState({});

  useEffect(() => {
    if (!supabase) return;
    cards.forEach(({ table }) => {
      supabase
        .from(table)
        .select("*", { count: "exact", head: true })
        .then(({ count }) => setCounts((prev) => ({ ...prev, [table]: count ?? 0 })));
    });
  }, []);

  return (
    <div>
      <h1 className="font-display text-3xl mb-1">Welcome{adminName ? `, ${adminName}` : ""}</h1>
      <p className="text-rtg-mist text-sm mb-8">Here's what's live on the RTG site right now.</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Link
            key={c.table}
            to={c.to}
            className="glass rounded-2xl p-6 hover:border-rtg-orange-400/50 transition-colors group"
          >
            <c.icon className="text-rtg-orange-400 mb-4" size={24} />
            <p className="font-display text-3xl mb-1">{counts[c.table] ?? "…"}</p>
            <p className="text-sm text-rtg-mist group-hover:text-rtg-white transition-colors">{c.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
