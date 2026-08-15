import { NavLink, Outlet, useNavigate } from "react-router-dom";
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
  ShieldCheck,
  Users,
  Trophy,
  LogOut,
  ExternalLink,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { images } from "../data/images";
import { brand } from "../data/content";
import useAdminSession from "./useAdminSession";
import { ConfirmProvider } from "./components/ConfirmDialog";

const links = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/events", label: "Events", icon: CalendarDays },
  { to: "/admin/calendar", label: "Race Calendar", icon: CalendarRange },
  { to: "/admin/weekly-sessions", label: "Weekly Sessions", icon: CalendarClock },
  { to: "/admin/gallery", label: "Gallery", icon: Images },
  { to: "/admin/products", label: "Merchandise", icon: ShoppingBag },
  { to: "/admin/blog", label: "Blog", icon: Newspaper },
  { to: "/admin/sponsors", label: "Sponsors", icon: Handshake },
  { to: "/admin/testimonials", label: "Testimonials", icon: Quote },
  { to: "/admin/challenges", label: "Challenges", icon: Flame },
  { to: "/admin/team", label: "Team", icon: Users },
  { to: "/admin/race-results", label: "Race Results", icon: Trophy },
  { to: "/admin/site-images", label: "Site Photos", icon: ImageIcon },
  { to: "/admin/admins", label: "Admins", icon: ShieldCheck },
];

export default function AdminLayout() {
  const { adminName, user } = useAdminSession();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase?.auth.signOut();
    navigate("/admin/login", { replace: true });
  };

  return (
    <ConfirmProvider>
    <div className="min-h-svh bg-rtg-ink flex">
      <aside className="w-60 shrink-0 border-r border-white/10 flex flex-col">
        <div className="p-5 border-b border-white/10">
          <img src={images.logo} alt={brand.name} className="h-8 w-auto" />
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive ? "bg-rtg-orange-500/15 text-rtg-orange-300" : "text-rtg-mist hover:text-rtg-white hover:bg-white/5"
                }`
              }
            >
              <l.icon size={17} />
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-white/10 space-y-1">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-rtg-mist hover:text-rtg-white hover:bg-white/5 transition-colors"
          >
            <ExternalLink size={17} /> View Site
          </a>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-rtg-mist hover:text-rtg-orange-400 hover:bg-white/5 transition-colors"
          >
            <LogOut size={17} /> Log Out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 shrink-0 border-b border-white/10 flex items-center justify-end px-6">
          <span className="text-sm text-rtg-mist">{adminName || user?.email}</span>
        </header>
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
    </ConfirmProvider>
  );
}
