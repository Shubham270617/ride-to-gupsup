import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, LogIn, LogOut, User, ShoppingBag } from "lucide-react";
import { useSiteImages } from "../lib/publicData";
import { brand } from "../data/content";
import Button from "./ui/Button";
import LiveClock from "./ui/LiveClock";
import useSession from "../lib/useSession";
import { useAuthGate } from "../lib/AuthGateContext";
import { useCart } from "../lib/CartContext";
import { supabase } from "../lib/supabaseClient";

// Matches the live site's own nav exactly: Community, Calendar, Events,
// Leaderboard, Store — nothing more, nothing less (About/Gallery dropped,
// Leaderboard added, Merchandise relabeled "Store").
const links = [
  { to: "/community", label: "Community" },
  { to: "/race-calendar", label: "Calendar" },
  { to: "/events", label: "Events" },
  { to: "/leaderboard", label: "Leaderboard" },
  { to: "/merchandise", label: "Store" },
];

function AccountIndicator({ className = "" }) {
  const { user } = useSession();
  const { requestLogin } = useAuthGate();

  if (!user) {
    return (
      <button
        onClick={() => requestLogin("login")}
        className={`inline-flex items-center gap-1.5 hover:text-rtg-orange-400 transition-colors ${className}`}
      >
        <LogIn size={13} /> Log In
      </button>
    );
  }

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Link to="/dashboard" className="inline-flex items-center gap-1.5 hover:text-rtg-orange-400 transition-colors">
        <User size={13} /> My Profile
      </Link>
      <button
        onClick={() => supabase?.auth.signOut()}
        className="hover:text-rtg-orange-400 transition-colors"
        aria-label="Log out"
      >
        <LogOut size={13} />
      </button>
    </span>
  );
}

// Circular profile icon shown in the main nav bar once someone is logged
// in, replacing the Login/Sign Up buttons.
function ProfileIcon({ className = "" }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Link
        to="/dashboard"
        aria-label="My Profile"
        className="w-10 h-10 rounded-full glass flex items-center justify-center hover:text-rtg-orange-400 hover:border-rtg-orange-400/60 transition-colors"
      >
        <User size={18} />
      </Link>
      <button
        onClick={() => supabase?.auth.signOut()}
        aria-label="Log out"
        className="w-10 h-10 rounded-full glass flex items-center justify-center hover:text-rtg-orange-400 hover:border-rtg-orange-400/60 transition-colors"
      >
        <LogOut size={16} />
      </button>
    </div>
  );
}

function CartButton({ className = "" }) {
  const { count, setOpen } = useCart();
  return (
    <button
      onClick={() => setOpen(true)}
      aria-label="Open cart"
      className={`relative w-10 h-10 rounded-full glass flex items-center justify-center hover:text-rtg-orange-400 hover:border-rtg-orange-400/60 transition-colors ${className}`}
    >
      <ShoppingBag size={17} />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rtg-orange-500 text-rtg-ink text-[10px] font-bold flex items-center justify-center">
          {count}
        </span>
      )}
    </button>
  );
}

// Genuinely invisible, not just subtle — no resting color, no hover state,
// nothing that renders differently on mouseover or focus. This is
// discretion only, never the actual security boundary: whether or not
// anyone ever finds this link, /admin/login is reachable by typing the URL
// directly regardless, and every admin-only read/write is separately
// enforced server-side (Postgres RLS via is_admin(), or an explicit check
// in the relevant api/ function) — discovering either path grants nothing
// without a real, authorized admin session.
function HiddenAdminLink({ className = "" }) {
  return (
    <Link
      to="/admin/login"
      aria-hidden="true"
      tabIndex={-1}
      className={`inline-flex items-center justify-center w-9 h-9 -m-2.5 shrink-0 ${className}`}
    >
      <span className="w-2 h-2 rounded-full bg-transparent" />
    </Link>
  );
}

export default function Navbar() {
  const images = useSiteImages();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { requestLogin } = useAuthGate();
  const { user } = useSession();
  // The hidden admin-panel link is only ever shown to a logged-out visitor
  // (RTG staff use it to reach /admin/login). Once anyone is logged in —
  // admin or not — it disappears; admins go there directly by URL instead.
  const showAdminLink = !user;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 bg-white/92 backdrop-blur-xl backdrop-saturate-150 border-b border-rtg-border transition-shadow duration-300 ${
        scrolled ? "shadow-lg shadow-rtg-purple-950/10" : ""
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 md:px-8 flex items-center gap-4 text-[11px] md:text-xs text-rtg-mist py-1.5 border-b border-rtg-border">
        <LiveClock />
        <AccountIndicator className="hidden sm:inline-flex" />
      </div>

      <div className="max-w-7xl mx-auto px-5 md:px-8 h-18 flex items-center justify-between py-3">
        <Link to="/" className="flex items-center gap-2 shrink-0 bg-rtg-purple-950 rounded-2xl px-3.5 py-2">
          <img src={images.logoNav} alt={brand.name} className="h-8 md:h-9 w-auto" />
        </Link>

        <nav className="hidden lg:flex items-center gap-0.5">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `px-2.5 py-2 rounded-full text-[13px] font-bold tracking-wide whitespace-nowrap transition-colors ${
                  isActive ? "text-rtg-orange-500" : "text-rtg-mist hover:text-rtg-purple-600"
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          <CartButton />
          {user ? (
            <ProfileIcon />
          ) : (
            <>
              <button
                onClick={() => requestLogin("login")}
                className="text-sm font-semibold text-rtg-purple-600 hover:text-rtg-orange-500 transition-colors"
              >
                Login
              </button>
              <Button onClick={() => requestLogin("signup")} size="md">
                Sign Up
              </Button>
            </>
          )}
          {showAdminLink && <HiddenAdminLink />}
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <CartButton />
          <button
            className="text-rtg-purple-600 p-2"
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {open ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="lg:hidden bg-white/97 backdrop-blur-xl overflow-hidden"
          >
            <nav className="flex flex-col px-6 py-4 gap-1">
              {links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  className={({ isActive }) =>
                    `py-3 border-b border-rtg-border text-base font-semibold ${
                      isActive ? "text-rtg-orange-500" : "text-rtg-purple-600"
                    }`
                  }
                >
                  {l.label}
                </NavLink>
              ))}
              <div className="py-3 border-b border-rtg-border text-sm text-rtg-mist flex items-center justify-between">
                <AccountIndicator />
                {showAdminLink && <HiddenAdminLink />}
              </div>
              {!user && (
                <div className="mt-4 mb-2 flex gap-2">
                  <button
                    onClick={() => requestLogin("login")}
                    className="flex-1 rounded-full border border-rtg-border bg-white py-3 text-sm font-semibold text-rtg-purple-600"
                  >
                    Login
                  </button>
                  <Button onClick={() => requestLogin("signup")} size="md" className="flex-1">
                    Sign Up
                  </Button>
                </div>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
