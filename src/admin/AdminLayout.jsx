import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
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
  Mail,
  ShieldCheck,
  Users,
  Trophy,
  LogOut,
  ExternalLink,
  Menu,
  X,
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
  { to: "/admin/site-content", label: "Site Content", icon: FileText },
  { to: "/admin/messages", label: "Messages", icon: Mail },
  { to: "/admin/admins", label: "Members", icon: ShieldCheck },
];

export default function AdminLayout() {
  const { adminName, user } = useAdminSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);

  // Picking a page from the drawer should close it, not leave it open over
  // the new screen.
  useEffect(() => setMobileOpen(false), [location.pathname]);

  // Small red count badge on the Messages nav icon — the one place across
  // the admin panel that genuinely needs "something's waiting for you"
  // surfaced without having to open the page first. Re-checks on every
  // navigation so replying to a message clears the badge without a reload.
  useEffect(() => {
    if (!supabase) return;
    supabase
      .from("contact_messages")
      .select("id", { count: "exact", head: true })
      .eq("read", false)
      .then(({ count }) => setUnreadMessages(count || 0));
  }, [location.pathname]);

  const handleLogout = async () => {
    await supabase?.auth.signOut();
    navigate("/admin/login", { replace: true });
  };

  const sidebarContent = (
    <>
      <div className="p-5 border-b border-white/10 flex items-center justify-between">
        <img src={images.logo} alt={brand.name} className="h-8 w-auto" />
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden text-rtg-mist hover:text-rtg-white transition-colors"
          aria-label="Close menu"
        >
          <X size={22} />
        </button>
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
            {l.to === "/admin/messages" && unreadMessages > 0 && (
              <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-rtg-orange-500 text-rtg-ink text-[10px] font-bold">
                {unreadMessages > 99 ? "99+" : unreadMessages}
              </span>
            )}
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
    </>
  );

  return (
    <ConfirmProvider>
    <div className="h-svh bg-rtg-ink md:flex overflow-hidden">
      {/* Mobile top bar — replaces the always-visible sidebar below md */}
      <div className="md:hidden sticky top-0 z-30 h-14 flex items-center justify-between px-4 border-b border-white/10 bg-rtg-ink/95 backdrop-blur">
        <button
          onClick={() => setMobileOpen(true)}
          className="text-rtg-white p-1 -ml-1"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>
        <img src={images.logo} alt={brand.name} className="h-6 w-auto" />
        <span className="w-8" aria-hidden="true" />
      </div>

      {/* Mobile drawer + backdrop */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="md:hidden fixed inset-0 z-40 bg-black/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              className="md:hidden fixed inset-y-0 left-0 z-50 w-72 max-w-[80vw] bg-rtg-ink border-r border-white/10 flex flex-col"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar — always visible at md and up */}
      <aside className="hidden md:flex w-60 shrink-0 border-r border-white/10 flex-col">
        {sidebarContent}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="hidden md:flex h-16 shrink-0 border-b border-white/10 items-center justify-end px-6">
          <span className="text-sm text-rtg-mist">{adminName || user?.email}</span>
        </header>
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
    </ConfirmProvider>
  );
}
