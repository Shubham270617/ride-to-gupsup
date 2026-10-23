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
  Medal,
  Radio,
  Eye,
  Inbox,
  UserPlus,
  Mail,
  CreditCard,
  CheckCircle2,
  ArrowRight,
  Plus,
  TrendingUp,
  MessagesSquare,
  ExternalLink,
} from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import useAdminSession from "../useAdminSession";
import { sumGroups, visitsOn } from "../visitorStats";
import { Legend, Sparkline, StackedBars } from "../components/VisitorCharts";
import { CHAT_READY } from "../../lib/features";

// The admin home: a live snapshot (members, who's online, this week's
// visits, what's waiting for an admin), recent activity, and every content
// area one click away.

const CONTENT = [
  { table: "events", label: "Events", icon: CalendarDays, to: "/admin/events" },
  { table: "calendar_activities", label: "Calendar activities", icon: CalendarRange, to: "/admin/calendar" },
  { table: "weekly_sessions", label: "Weekly sessions", icon: CalendarClock, to: "/admin/weekly-sessions" },
  { table: "gallery_items", label: "Gallery items", icon: Images, to: "/admin/gallery" },
  { table: "products", label: "Products", icon: ShoppingBag, to: "/admin/products" },
  { table: "orders", label: "Orders", icon: Package, to: "/admin/orders" },
  { table: "blog_posts", label: "Blog posts", icon: Newspaper, to: "/admin/blog" },
  { table: "sponsors", label: "Sponsors", icon: Handshake, to: "/admin/sponsors" },
  { table: "testimonials", label: "Testimonials", icon: Quote, to: "/admin/testimonials" },
  { table: "challenges", label: "Challenges", icon: Flame, to: "/admin/challenges" },
  { table: "race_results", label: "Race results", icon: Trophy, to: "/admin/race-results" },
  { table: "ridge_results", label: "Ridge results", icon: Medal, to: "/admin/ridge-results" },
  { table: "membership_purchases", label: "Membership purchases", icon: CreditCard, to: "/admin/membership-purchases" },
  { table: "community_network_groups", label: "Network groups", icon: Users, to: "/admin/community-network" },
];

const DAY_MS = 24 * 60 * 60 * 1000;

function greeting() {
  const hour = Number(new Date().toLocaleString("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }));
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const ago = (iso) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)}h ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

const rupees = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

function Kpi({ icon: Icon, label, value, note, accent, side }) {
  return (
    <div className="glass admin-card-hover relative overflow-hidden rounded-3xl p-5">
      <span aria-hidden="true" className="absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-[0.08]" style={{ background: accent }} />
      <div className="mb-4 flex items-center justify-between">
        <span className="grid h-11 w-11 place-items-center rounded-2xl text-white shadow-[0_10px_24px_-12px_rgba(27,17,48,0.6)]" style={{ background: accent }}>
          <Icon size={19} />
        </span>
        {side}
      </div>
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-rtg-mist">{label}</p>
      <p className="mt-1 font-display text-4xl leading-none tabular-nums text-rtg-white">{value ?? "…"}</p>
      <p className="mt-2 text-xs text-rtg-mist">{note}</p>
    </div>
  );
}

function Card({ title, action, children, className = "" }) {
  return (
    <section className={`glass rounded-3xl p-5 md:p-6 ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl leading-none">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const SeeAll = ({ to, children = "See all" }) => (
  <Link to={to} className="inline-flex items-center gap-1 text-xs font-semibold text-rtg-orange-600 hover:underline">
    {children} <ArrowRight size={13} />
  </Link>
);

export default function AdminDashboard() {
  const { adminName } = useAdminSession();
  const [counts, setCounts] = useState({});
  const [stats, setStats] = useState({});
  const [traffic, setTraffic] = useState(null);
  const [recentMembers, setRecentMembers] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);

  useEffect(() => {
    if (!supabase) return undefined;
    let cancelled = false;
    const count = (query) => query.then(({ count: n, error }) => (error ? null : n ?? 0));
    const weekAgo = new Date(Date.now() - 7 * DAY_MS).toISOString();
    const dayAgo = new Date(Date.now() - DAY_MS).toISOString();

    CONTENT.forEach(({ table }) => {
      count(supabase.from(table).select("*", { count: "exact", head: true })).then((n) => {
        if (!cancelled) setCounts((prev) => ({ ...prev, [table]: n }));
      });
    });

    Promise.all([
      count(supabase.from("profiles").select("id", { count: "exact", head: true })),
      count(supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", weekAgo)),
      count(supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending_verification")),
      count(supabase.from("membership_purchases").select("id", { count: "exact", head: true }).eq("status", "pending_verification")),
      count(supabase.from("contact_messages").select("id", { count: "exact", head: true }).eq("read", false)),
      count(supabase.from("chat_messages").select("id", { count: "exact", head: true }).gte("created_at", dayAgo)),
    ]).then(([members, newMembers, pendingOrders, pendingMemberships, unread, chat24h]) => {
      if (!cancelled) setStats({ members, newMembers, pendingOrders, pendingMemberships, unread, chat24h });
    });

    supabase
      .from("profiles")
      .select("id, full_name, email, avatar_url, city, created_at")
      .order("created_at", { ascending: false })
      .limit(6)
      .then(({ data }) => !cancelled && setRecentMembers(data || []));

    supabase
      .from("orders")
      .select("id, customer_name, total, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => !cancelled && setRecentOrders(data || []));

    const loadTraffic = () =>
      supabase.rpc("site_traffic", { p_days: 7 }).then(({ data, error }) => {
        if (!cancelled && !error) setTraffic(data);
      });
    loadTraffic();
    const timer = setInterval(loadTraffic, 30000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const week = traffic ? sumGroups(traffic.days || []) : null;
  const waiting = [
    { key: "orders", label: "Orders waiting for payment check", value: stats.pendingOrders, to: "/admin/orders", icon: Package },
    { key: "memberships", label: "Membership payments to verify", value: stats.pendingMemberships, to: "/admin/membership-purchases", icon: CreditCard },
    { key: "messages", label: "Unread contact messages", value: stats.unread, to: "/admin/messages", icon: Mail },
  ];
  const waitingTotal = waiting.reduce((s, w) => s + (w.value || 0), 0);
  const firstName = (adminName || "").split(" ")[0];

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#1b1130_0%,#35246f_58%,#5e43a1_100%)] p-6 text-white shadow-[0_30px_70px_-36px_rgba(27,17,48,0.85)] md:p-8">
        <span aria-hidden="true" className="absolute -right-16 -top-24 h-72 w-72 rounded-full border border-white/10 shadow-[0_0_0_60px_rgba(255,255,255,0.03),0_0_0_130px_rgba(255,255,255,0.02)]" />
        <span aria-hidden="true" className="absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-rtg-orange-500/30 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-rtg-orange-300">RTG Control Room</p>
            <h1 className="mt-2 font-display text-4xl leading-[0.95] md:text-6xl">
              {greeting()}
              {firstName ? `, ${firstName}` : ""}
            </h1>
            <p className="mt-3 max-w-lg text-sm text-white/70">
              {waitingTotal > 0
                ? `${waitingTotal} thing${waitingTotal === 1 ? "" : "s"} waiting for you below. Everything else is running smoothly.`
                : "Nothing waiting for you right now — the inbox, orders and payments are all clear."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/admin/events"
              className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#f45b18,#ff8a3d)] px-5 py-2.5 text-sm font-semibold shadow-[0_12px_28px_-12px_rgba(247,107,28,0.9)] transition-transform hover:-translate-y-0.5"
            >
              <Plus size={16} /> New event
            </Link>
            <Link to="/admin/visitors" className="inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold backdrop-blur transition-colors hover:bg-white/20">
              <TrendingUp size={16} /> Visitors
            </Link>
            {CHAT_READY && (
              <a href="/chat" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold backdrop-blur transition-colors hover:bg-white/20">
                <MessagesSquare size={16} /> Open chat
              </a>
            )}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          icon={Users}
          label="Members"
          value={stats.members}
          accent="linear-gradient(135deg,#35246f,#5e43a1)"
          note={stats.newMembers != null ? `+${stats.newMembers} joined in the last 7 days` : "…"}
          side={<UserPlus size={18} className="text-rtg-mist" />}
        />
        <Kpi
          icon={Radio}
          label="Online now"
          value={traffic?.online}
          accent="linear-gradient(135deg,#0f9d6b,#1baf7a)"
          note={traffic ? `${traffic.online_members} logged-in member${traffic.online_members === 1 ? "" : "s"} · ${Math.max(0, traffic.online - traffic.online_members)} guest${traffic.online - traffic.online_members === 1 ? "" : "s"} · last 2 min` : "…"}
          side={
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
            </span>
          }
        />
        <Kpi
          icon={Eye}
          label="Visits this week"
          value={week?.visits}
          accent="linear-gradient(135deg,#1d5fb0,#2a78d6)"
          note={traffic ? `${traffic.people} different people · ${week.members} member visits` : "…"}
          side={traffic && <Sparkline values={(traffic.days || []).map(visitsOn)} width={96} height={34} />}
        />
        <Kpi
          icon={Inbox}
          label="Waiting for you"
          value={stats.pendingOrders == null ? undefined : waitingTotal}
          accent="linear-gradient(135deg,#d94f0e,#ff8a3d)"
          note={CHAT_READY && stats.chat24h != null ? `${stats.chat24h} chat message${stats.chat24h === 1 ? "" : "s"} in the last 24h` : "orders, payments and messages"}
        />
      </div>

      {/* Attention + traffic */}
      <div className="grid gap-6 xl:grid-cols-[1fr_1.35fr]">
        <Card title="Needs your attention">
          {waitingTotal === 0 && stats.pendingOrders != null ? (
            <div className="grid place-items-center rounded-2xl bg-emerald-500/[0.07] px-6 py-10 text-center">
              <CheckCircle2 size={30} className="text-emerald-600" />
              <p className="mt-3 font-display text-2xl">All clear</p>
              <p className="mt-1 text-sm text-rtg-mist">No unpaid orders, payments or unread messages.</p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {waiting.map((w) => (
                <li key={w.key}>
                  <Link
                    to={w.to}
                    className={`flex items-center gap-4 rounded-2xl border p-4 transition-colors ${
                      w.value ? "border-rtg-orange-400/40 bg-rtg-orange-500/[0.06] hover:bg-rtg-orange-500/10" : "border-rtg-border hover:bg-rtg-purple-950/[0.03]"
                    }`}
                  >
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${w.value ? "bg-[linear-gradient(135deg,#f45b18,#ff8a3d)] text-white" : "bg-rtg-purple-950/[0.05] text-rtg-mist"}`}>
                      <w.icon size={18} />
                    </span>
                    <span className="flex-1 text-sm font-medium text-rtg-white">{w.label}</span>
                    <span className="font-display text-3xl leading-none tabular-nums text-rtg-white">{w.value ?? "…"}</span>
                    <ArrowRight size={16} className="text-rtg-mist" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Visits — last 7 days" action={<SeeAll to="/admin/visitors">Full report</SeeAll>}>
          {traffic && week.visits > 0 ? (
            <>
              <div className="mb-4">
                <Legend sums={week} />
              </div>
              <StackedBars days={traffic.days} height={170} />
            </>
          ) : (
            <p className="py-14 text-center text-sm text-rtg-mist">{traffic ? "No visits recorded this week yet." : "Loading…"}</p>
          )}
        </Card>
      </div>

      {/* Recent activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Newest members" action={<SeeAll to="/admin/admins" />}>
          {recentMembers.length === 0 ? (
            <p className="py-8 text-center text-sm text-rtg-mist">No members yet.</p>
          ) : (
            <ul className="divide-y divide-rtg-border">
              {recentMembers.map((m) => (
                <li key={m.id} className="flex items-center gap-3 py-3">
                  {m.avatar_url ? (
                    <img src={m.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover ring-2 ring-white" />
                  ) : (
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-[linear-gradient(135deg,#35246f,#5e43a1)] text-xs font-bold text-white">
                      {(m.full_name || m.email || "R").trim()[0].toUpperCase()}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-rtg-white">{m.full_name || "New member"}</span>
                    <span className="block truncate text-xs text-rtg-mist">{[m.city, m.email].filter(Boolean).join(" · ")}</span>
                  </span>
                  <span className="shrink-0 text-xs text-rtg-mist">{ago(m.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Latest orders" action={<SeeAll to="/admin/orders" />}>
          {recentOrders.length === 0 ? (
            <p className="py-8 text-center text-sm text-rtg-mist">No orders yet.</p>
          ) : (
            <ul className="divide-y divide-rtg-border">
              {recentOrders.map((o) => (
                <li key={o.id} className="flex items-center gap-3 py-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-rtg-purple-950/[0.05] text-rtg-mist">
                    <Package size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-rtg-white">{o.customer_name}</span>
                    <span className="block text-xs text-rtg-mist">{ago(o.created_at)}</span>
                  </span>
                  <span className="text-right">
                    <span className="block text-sm font-bold tabular-nums text-rtg-white">{rupees(o.total)}</span>
                    <span
                      className={`mt-0.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        o.status === "pending_verification" ? "bg-rtg-orange-500/10 text-rtg-orange-600" : "bg-rtg-purple-950/[0.05] text-rtg-mist"
                      }`}
                    >
                      {String(o.status).replace(/_/g, " ")}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Content library */}
      <Card title="Content library" action={<span className="text-xs text-rtg-mist">What's on the site right now</span>}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          {CONTENT.map((c) => (
            <Link key={c.table} to={c.to} className="admin-card-hover group rounded-2xl border border-rtg-border bg-white p-4">
              <c.icon size={18} className="text-rtg-orange-500" />
              <p className="mt-3 font-display text-3xl leading-none tabular-nums text-rtg-white">{counts[c.table] ?? "…"}</p>
              <p className="mt-1 truncate text-xs text-rtg-mist group-hover:text-rtg-white">{c.label}</p>
            </Link>
          ))}
        </div>
        <a href="/" target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-rtg-mist hover:text-rtg-orange-600">
          <ExternalLink size={13} /> See it all on the live site
        </a>
      </Card>

    </div>
  );
}
