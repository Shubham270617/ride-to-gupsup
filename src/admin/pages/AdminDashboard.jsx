import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Images, ShoppingBag, Newspaper, Handshake, Quote, Flame } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import useAdminSession from "../useAdminSession";

const cards = [
  { table: "events", label: "Events", icon: CalendarDays, to: "/admin/events" },
  { table: "gallery_items", label: "Gallery Items", icon: Images, to: "/admin/gallery" },
  { table: "products", label: "Products", icon: ShoppingBag, to: "/admin/products" },
  { table: "blog_posts", label: "Blog Posts", icon: Newspaper, to: "/admin/blog" },
  { table: "sponsors", label: "Sponsors", icon: Handshake, to: "/admin/sponsors" },
  { table: "testimonials", label: "Testimonials", icon: Quote, to: "/admin/testimonials" },
  { table: "challenges", label: "Challenges", icon: Flame, to: "/admin/challenges" },
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
