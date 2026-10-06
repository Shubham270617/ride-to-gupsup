import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Menu,
  X,
  LogIn,
  LogOut,
  User,
  ShoppingBag,
} from "lucide-react";

import { useSiteImages } from "../lib/publicData";
import { brand } from "../data/content";
import Button from "./ui/Button";
import LiveClock from "./ui/LiveClock";
import useSession from "../lib/useSession";
import { useAuthGate } from "../lib/AuthGateContext";
import { useCart } from "../lib/CartContext";
import { supabase } from "../lib/supabaseClient";

/* =========================================================
   NAVIGATION LINKS
   ========================================================= */

const links = [
  {
    to: "/community",
    label: "Community",
  },
  {
    to: "/race-calendar",
    label: "Calendar",
  },
  {
    to: "/events",
    label: "Events",
  },
  {
    to: "/leaderboard",
    label: "Leaderboard",
  },
  {
    to: "/merchandise",
    label: "Store",
  },
];

/* =========================================================
   ACCOUNT INDICATOR
   Used inside mobile menu
   ========================================================= */

function AccountIndicator({ className = "" }) {
  const { user } = useSession();
  const { requestLogin } = useAuthGate();

  if (!user) {
    return (
      <button
        onClick={() => requestLogin("login")}
        className={`
          inline-flex
          items-center
          gap-1.5
          hover:text-rtg-orange-400
          transition-colors
          ${className}
        `}
      >
        <LogIn size={13} />
        Log In
      </button>
    );
  }

  return (
    <span
      className={`
        inline-flex
        items-center
        gap-2
        ${className}
      `}
    >
      <Link
        to="/dashboard"
        className="
          inline-flex
          items-center
          gap-1.5
          hover:text-rtg-orange-400
          transition-colors
        "
      >
        <User size={13} />
        My Profile
      </Link>

      <button
        onClick={() => supabase?.auth.signOut()}
        className="
          hover:text-rtg-orange-400
          transition-colors
        "
        aria-label="Log out"
      >
        <LogOut size={13} />
      </button>
    </span>
  );
}

/* =========================================================
   PROFILE ICON
   Shown when user is logged in
   ========================================================= */

function ProfileIcon({ className = "" }) {
  return (
    <div
      className={`
        flex
        items-center
        gap-2
        ${className}
      `}
    >
      <Link
        to="/dashboard"
        aria-label="My Profile"
        className="
          w-10
          h-10
          rounded-full
          glass
          flex
          items-center
          justify-center
          hover:text-rtg-orange-400
          hover:border-rtg-orange-400/60
          transition-colors
        "
      >
        <User size={18} />
      </Link>

      <button
        onClick={() => supabase?.auth.signOut()}
        aria-label="Log out"
        className="
          w-10
          h-10
          rounded-full
          glass
          flex
          items-center
          justify-center
          hover:text-rtg-orange-400
          hover:border-rtg-orange-400/60
          transition-colors
        "
      >
        <LogOut size={16} />
      </button>
    </div>
  );
}

/* =========================================================
   CART BUTTON
   ========================================================= */

function CartButton({ className = "" }) {
  const { count, setOpen } = useCart();

  return (
    <button
      onClick={() => setOpen(true)}
      aria-label="Open cart"
      className={`
        relative
        w-9
        h-9
        rounded-full
        glass
        flex
        items-center
        justify-center
        hover:text-rtg-orange-400
        hover:border-rtg-orange-400/60
        transition-colors
        ${className}
      `}
    >
      <ShoppingBag size={16} />

      {/* Keep badge visible even when count is 0 */}
      <span
        className="
          absolute
          -top-1
          -right-1
          min-w-[17px]
          h-[17px]
          px-1
          rounded-full
          bg-rtg-orange-500
          text-white
          text-[9px]
          font-bold
          flex
          items-center
          justify-center
        "
      >
        {count}
      </span>
    </button>
  );
}

/* =========================================================
   HIDDEN ADMIN LINK
   Keep exactly hidden.
   Functionality/route remains available.
   ========================================================= */

function HiddenAdminLink({ className = "" }) {
  return (
    <Link
      to="/admin/login"
      aria-hidden="true"
      tabIndex={-1}
      className={`
        inline-flex
        items-center
        justify-center
        w-9
        h-9
        -m-2.5
        shrink-0
        ${className}
      `}
    >
      <span className="w-2 h-2 rounded-full bg-transparent" />
    </Link>
  );
}

/* =========================================================
   NAVBAR
   ========================================================= */

export default function Navbar() {
  const images = useSiteImages();

  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  const location = useLocation();

  const { requestLogin } = useAuthGate();
  const { user } = useSession();

  /*
   * Keep admin functionality exactly as before.
   * The link remains invisible.
   */
  const showAdminLink = !user;

  /* =======================================================
     SCROLL SHADOW
     ======================================================= */

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 4);
    };

    onScroll();

    window.addEventListener("scroll", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  /* =======================================================
     CLOSE MOBILE MENU WHEN ROUTE CHANGES
     ======================================================= */

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <header
      className={`
        fixed
        top-0
        left-0
        right-0
        z-50
        bg-gradient-to-b
        from-white
        to-white/90
        backdrop-blur-xl
        backdrop-saturate-150
        border-b
        border-rtg-border
        transition-shadow
        duration-300
        ${
          scrolled
            ? "shadow-lg shadow-rtg-purple-950/10"
            : "shadow-sm"
        }
      `}
    >
      {/* ===================================================
          MAIN NAVBAR
          =================================================== */}

      <div
        className="
          w-full
          px-5
          md:px-8
          h-[60px]
          flex
          items-center
          justify-between
          gap-4
        "
      >
        {/* =================================================
            LOGO
            ================================================= */}

        <Link
          to="/"
          className="
            flex
            items-center
            shrink-0
          "
        >
          <img
            src={images.logoNav}
            alt={brand.name}
            className="
              h-8
              md:h-9
              w-auto
              object-contain
            "
          />
        </Link>

        {/* =================================================
            DESKTOP NAVIGATION

            ml-auto pushes navigation toward right.
            mr-1 keeps it close to the action buttons.
            ================================================= */}

        <nav
          className="
            hidden
            lg:flex
            items-center
            gap-1
            xl:gap-2
            ml-auto
            mr-6
          "
        >
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `
                  px-3
                  py-2
                  rounded-full
                  text-[10.5px]
                  font-bold
                  uppercase
                  tracking-[0.2em]
                  whitespace-nowrap
                  transition-colors
                  ${
                    isActive
                      ? "text-rtg-orange-500"
                      : "text-rtg-white/75 hover:text-rtg-purple-600"
                  }
                `
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* =================================================
            RIGHT ACTIONS

            Kept very close to right edge.
            ================================================= */}

        <div
          className="
            hidden
            lg:flex
            items-center
            gap-2
            shrink-0
            ml-1
          "
        >
          {/* Cart */}

          <CartButton />

          {/* =================================================
              LOGGED IN USER
              ================================================= */}

          {user ? (
            <ProfileIcon />
          ) : (
            <>
              {/* Login */}

              <button
                onClick={() => requestLogin("login")}
                className="
                  h-[34px]
                  px-4
                  rounded-full
                  border
                  border-rtg-purple-600/15
                  bg-white
                  text-[10px]
                  font-extrabold
                  uppercase
                  tracking-[0.1em]
                  text-rtg-white
                  hover:border-rtg-orange-400
                  hover:text-rtg-orange-500
                  transition-colors
                  whitespace-nowrap
                "
              >
                Login
              </button>

              {/* Signup */}

              <Button
                onClick={() => requestLogin("signup")}
                size="md"
                className="
                  uppercase
                  whitespace-nowrap
                  !h-[34px]
                  !px-4
                  !py-0
                  !text-[10px]
                  !font-extrabold
                  !tracking-[0.1em]
                "
              >
                Signup
              </Button>

              {/* =================================================
                  ADMIN LOGIN

                  STILL HIDDEN — DO NOT REMOVE
                  ================================================= */}

              {showAdminLink && <HiddenAdminLink />}
            </>
          )}
        </div>

        {/* =================================================
            MOBILE ACTIONS
            ================================================= */}

        <div
          className="
            flex
            items-center
            gap-2
            lg:hidden
          "
        >
          <CartButton />

          <button
            className="
              text-rtg-purple-600
              p-2
              rounded-full
              hover:bg-rtg-purple-50
              transition-colors
            "
            onClick={() => setOpen((current) => !current)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            {open ? (
              <X size={25} />
            ) : (
              <Menu size={25} />
            )}
          </button>
        </div>
      </div>

      {/* =====================================================
          MOBILE MENU
          ===================================================== */}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{
              height: 0,
              opacity: 0,
            }}
            animate={{
              height: "auto",
              opacity: 1,
            }}
            exit={{
              height: 0,
              opacity: 0,
            }}
            transition={{
              duration: 0.3,
              ease: "easeInOut",
            }}
            className="
              lg:hidden
              bg-white/97
              backdrop-blur-xl
              overflow-hidden
              border-t
              border-rtg-border
            "
          >
            <nav
              className="
                flex
                flex-col
                px-6
                py-4
                gap-1
              "
            >
              {/* Navigation links */}

              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `
                      py-3
                      border-b
                      border-rtg-border
                      text-base
                      font-semibold
                      uppercase
                      tracking-wide
                      ${
                        isActive
                          ? "text-rtg-orange-500"
                          : "text-rtg-purple-600"
                      }
                    `
                  }
                >
                  {link.label}
                </NavLink>
              ))}

              {/* Account */}

              <div
                className="
                  py-3
                  border-b
                  border-rtg-border
                  text-sm
                  text-rtg-mist
                  flex
                  items-center
                  justify-between
                "
              >
                <AccountIndicator />

                {/* Admin stays hidden */}
                {showAdminLink && <HiddenAdminLink />}
              </div>

              {/* Login + Signup */}

              {!user && (
                <div
                  className="
                    mt-4
                    mb-2
                    flex
                    gap-2
                  "
                >
                  <button
                    onClick={() => requestLogin("login")}
                    className="
                      flex-1
                      rounded-full
                      border
                      border-rtg-border
                      bg-white
                      py-3
                      text-sm
                      font-bold
                      uppercase
                      tracking-wide
                      text-rtg-purple-600
                    "
                  >
                    Login
                  </button>

                  <Button
                    onClick={() => requestLogin("signup")}
                    size="md"
                    className="
                      flex-1
                      uppercase
                    "
                  >
                    Signup
                  </Button>
                </div>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =====================================================
          LIVE CLOCK

          Existing component is preserved but hidden from
          the visual navbar so it doesn't create another row.
          ===================================================== */}

      <div
        className="
          sr-only
          absolute
          pointer-events-none
        "
        aria-hidden="true"
      >
        <LiveClock />
      </div>
    </header>
  );
}