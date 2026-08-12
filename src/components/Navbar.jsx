import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, LogIn, LogOut } from "lucide-react";
import { images } from "../data/images";
import { brand } from "../data/content";
import Button from "./ui/Button";
import LiveClock from "./ui/LiveClock";
import useSession from "../lib/useSession";
import { useAuthGate } from "../lib/AuthGateContext";
import { supabase } from "../lib/supabaseClient";

const links = [
  { to: "/about", label: "About" },
  { to: "/community", label: "Community" },
  { to: "/weekly-rides", label: "Weekly Rides" },
  { to: "/events", label: "Events" },
  { to: "/challenges", label: "Challenges" },
  { to: "/race-calendar", label: "Calendar" },
  { to: "/merchandise", label: "Store" },
  { to: "/blog", label: "Blog" },
  { to: "/gallery", label: "Gallery" },
  { to: "/sponsors", label: "Sponsors" },
  { to: "/faq", label: "FAQ" },
  { to: "/contact", label: "Contact" },
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

  const name = user.user_metadata?.full_name || user.email?.split("@")[0] || "Athlete";

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      Hi, {name}
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

// Deliberately unlabeled and near-invisible — RTG staff know it's here,
// nobody else has a reason to notice it. Opens the separate /admin/login
// page (not the member Login/Sign Up panel).
function HiddenAdminLink({ className = "" }) {
  return (
    <Link
      to="/admin/login"
      aria-hidden="true"
      tabIndex={-1}
      className={`w-2 h-2 rounded-full bg-white/10 hover:bg-white/30 transition-colors ${className}`}
    />
  );
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { requestLogin } = useAuthGate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled ? "glass shadow-lg shadow-black/20" : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 md:px-8 flex items-center justify-between text-[11px] md:text-xs text-rtg-mist py-1.5 border-b border-white/5">
        <div className="flex items-center gap-4">
          <LiveClock />
          <AccountIndicator className="hidden sm:inline-flex" />
        </div>
        <span className="hidden sm:inline">{brand.cities.slice(0, 3).join(" · ")} · Expanding Across India</span>
      </div>

      <div className="max-w-7xl mx-auto px-5 md:px-8 h-18 flex items-center justify-between py-3">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img src={images.logo} alt={brand.name} className="h-9 md:h-10 w-auto" />
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `px-3.5 py-2 rounded-full text-sm font-medium transition-colors ${
                  isActive ? "text-rtg-orange-400" : "text-rtg-white/85 hover:text-rtg-orange-300"
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-4">
          <button
            onClick={() => requestLogin("login")}
            className="text-sm font-semibold text-rtg-white/90 hover:text-rtg-orange-400 transition-colors"
          >
            Login
          </button>
          <Button onClick={() => requestLogin("signup")} size="md">
            Sign Up
          </Button>
          <HiddenAdminLink />
        </div>

        <button
          className="lg:hidden text-rtg-white p-2"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {open ? <X size={26} /> : <Menu size={26} />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="lg:hidden glass overflow-hidden"
          >
            <nav className="flex flex-col px-6 py-4 gap-1">
              {links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  className={({ isActive }) =>
                    `py-3 border-b border-white/5 text-base font-medium ${
                      isActive ? "text-rtg-orange-400" : "text-rtg-white/85"
                    }`
                  }
                >
                  {l.label}
                </NavLink>
              ))}
              <div className="py-3 border-b border-white/5 text-sm text-rtg-white/85 flex items-center justify-between">
                <AccountIndicator />
                <HiddenAdminLink />
              </div>
              <div className="mt-4 mb-2 flex gap-2">
                <button
                  onClick={() => requestLogin("login")}
                  className="flex-1 rounded-full glass py-3 text-sm font-semibold text-rtg-white"
                >
                  Login
                </button>
                <Button onClick={() => requestLogin("signup")} size="md" className="flex-1">
                  Sign Up
                </Button>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
