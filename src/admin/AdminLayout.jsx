import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ShieldCheck, LogOut, ExternalLink, Menu, X, Search, ChevronDown } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { images } from "../data/images";
import { brand } from "../data/content";
import useAdminSession from "./useAdminSession";
import { ConfirmProvider } from "./components/ConfirmDialog";
import { groups, activeLink } from "./adminNav";

const initialsOf = (text) =>
  String(text || "A")
    .trim()
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");

export default function AdminLayout() {
  const { adminName, user } = useAdminSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [query, setQuery] = useState("");
  const current = activeLink(location.pathname);
  const [openGroups, setOpenGroups] = useState(() => new Set(["Overview", "Inbox & people", current?.group].filter(Boolean)));

  // Picking a page from the drawer closes it; arriving on a page opens its group.
  useEffect(() => {
    setMobileOpen(false);
    if (current?.group) setOpenGroups((prev) => (prev.has(current.group) ? prev : new Set([...prev, current.group])));
  }, [location.pathname, current?.group]);

  // Count badge on Messages — re-checked on every navigation so reading a
  // message clears it without a reload.
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

  const q = query.trim().toLowerCase();
  const visibleGroups = useMemo(
    () =>
      groups
        .map((g) => ({ ...g, links: q ? g.links.filter((l) => `${l.label} ${g.title}`.toLowerCase().includes(q)) : g.links }))
        .filter((g) => g.links.length),
    [q]
  );

  const toggleGroup = (title) =>
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });

  const displayName = adminName || user?.email || "Admin";
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

  const sidebarContent = (
    <div className="theme-night flex h-full flex-col bg-[linear-gradient(180deg,#1b1130_0%,#201338_55%,#241642_100%)] text-white">
      <div className="flex items-center justify-between px-5 pb-4 pt-5">
        <span className="inline-flex rounded-2xl bg-white px-3 py-2 shadow-lg">
          <img src={images.logoNav} alt={brand.name} className="h-10 w-auto" />
        </span>
        <button onClick={() => setMobileOpen(false)} className="text-white/60 transition-colors hover:text-white md:hidden" aria-label="Close menu">
          <X size={22} />
        </button>
      </div>

      <div className="px-4 pb-3">
        <label className="relative block">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a screen…"
            className="w-full rounded-xl border border-white/10 bg-white/[0.06] py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-white/40 focus:border-rtg-orange-400/60 focus:outline-none"
          />
        </label>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-3 [scrollbar-color:rgba(255,255,255,0.15)_transparent] [scrollbar-width:thin]">
        {visibleGroups.map((g) => {
          const isOpen = q || openGroups.has(g.title);
          const hasActive = g.links.some((l) => l.to === current?.to);
          return (
            <div key={g.title}>
              <button
                type="button"
                onClick={() => toggleGroup(g.title)}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] transition-colors ${
                  hasActive ? "text-rtg-orange-300" : "text-white/45 hover:text-white/80"
                }`}
              >
                <g.icon size={14} />
                <span className="flex-1 text-left">{g.title}</span>
                {g.links.some((l) => l.badge === "messages") && unreadMessages > 0 && !isOpen && (
                  <span className="h-2 w-2 rounded-full bg-rtg-orange-400" />
                )}
                <ChevronDown size={14} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-0.5 pb-2 pl-2">
                      {g.links.map((l) => (
                        <NavLink
                          key={l.to}
                          to={l.to}
                          end={l.end}
                          className={({ isActive }) =>
                            `group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                              isActive
                                ? "bg-[linear-gradient(90deg,rgba(244,91,24,0.95),rgba(255,138,61,0.85))] text-white shadow-[0_10px_24px_-12px_rgba(247,107,28,0.9)]"
                                : "text-white/70 hover:bg-white/[0.07] hover:text-white"
                            }`
                          }
                        >
                          <l.icon size={16} className="shrink-0" />
                          <span className="truncate">{l.label}</span>
                          {l.badge === "messages" && unreadMessages > 0 && (
                            <span className="ml-auto inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-rtg-orange-600">
                              {unreadMessages > 99 ? "99+" : unreadMessages}
                            </span>
                          )}
                        </NavLink>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
        {!visibleGroups.length && <p className="px-3 py-4 text-sm text-white/50">No screen matches "{query}".</p>}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="mb-2 flex items-center gap-3 rounded-2xl bg-white/[0.06] p-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#f45b18,#ff8a3d)] text-sm font-bold">
            {initialsOf(displayName)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{displayName}</span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-rtg-orange-300">
              <ShieldCheck size={11} /> Admin
            </span>
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white/[0.06] px-3 py-2 text-xs font-semibold text-white/80 transition-colors hover:bg-white/[0.12] hover:text-white"
          >
            <ExternalLink size={14} /> View site
          </a>
          <button
            onClick={handleLogout}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white/[0.06] px-3 py-2 text-xs font-semibold text-white/80 transition-colors hover:bg-rtg-orange-500 hover:text-white"
          >
            <LogOut size={14} /> Log out
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <ConfirmProvider>
      <div className="admin-ui h-svh overflow-hidden bg-[radial-gradient(circle_at_85%_-10%,rgba(255,138,61,0.10),transparent_40%),radial-gradient(circle_at_0%_100%,rgba(94,67,161,0.10),transparent_45%)] bg-rtg-ink md:flex">
        {/* Mobile top bar */}
        <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-rtg-border bg-white/90 px-4 backdrop-blur md:hidden">
          <button onClick={() => setMobileOpen(true)} className="-ml-1 p-1 text-rtg-white" aria-label="Open menu">
            <Menu size={22} />
          </button>
          <span className="truncate px-3 text-sm font-semibold text-rtg-white">{current?.label || "Admin"}</span>
          <span className="grid h-8 w-8 place-items-center rounded-full bg-[linear-gradient(135deg,#f45b18,#ff8a3d)] text-[11px] font-bold text-white">
            {initialsOf(displayName)}
          </span>
        </div>

        {/* Mobile drawer */}
        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.div
                className="fixed inset-0 z-40 bg-black/60 md:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileOpen(false)}
              />
              <motion.aside
                className="fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] md:hidden"
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

        {/* Desktop sidebar */}
        <aside className="hidden w-72 shrink-0 md:block">{sidebarContent}</aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="hidden h-16 shrink-0 items-center justify-between border-b border-rtg-border bg-white/70 px-8 backdrop-blur md:flex">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-rtg-mist">{current?.group || "Admin"}</p>
              <p className="truncate font-display text-xl leading-none text-rtg-white">{current?.label || "Admin"}</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="hidden text-xs text-rtg-mist lg:inline">{today}</span>
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-rtg-border bg-white px-3.5 py-1.5 text-xs font-semibold text-rtg-white transition-colors hover:border-rtg-orange-400 hover:text-rtg-orange-600"
              >
                <ExternalLink size={13} /> View site
              </a>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[linear-gradient(135deg,#f45b18,#ff8a3d)] text-xs font-bold text-white" title={displayName}>
                {initialsOf(displayName)}
              </span>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 md:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </ConfirmProvider>
  );
}
