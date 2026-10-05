import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import JoinCTA from "./sections/JoinCTA";
import ScrollToTop from "./ScrollToTop";
import AiWidget from "./ai/AiWidget";
import CartDrawer from "./CartDrawer";
import { useAuthGate } from "../lib/AuthGateContext";

// JoinCTA now contains the footer too (merged by request — one continuous
// photo section for both, no separate Footer.jsx). It used to be called
// individually at the bottom of 8 different pages (Home, Events, Community,
// About, EventDetail, FAQ, Safety, Challenges); now that it's also *the*
// sitewide footer, it's rendered exactly once here instead — after
// <Outlet/>, same position Footer used to occupy, on every page. Those 8
// pages had their own <JoinCTA /> call removed so it doesn't render twice.
//
// Community.jsx was the one page that customized the CTA copy/behavior
// (sign-up modal trigger instead of a plain link) — preserved below via a
// route check, since Layout doesn't otherwise know which page it's on.
export default function Layout() {
  const location = useLocation();
  const { requestLogin } = useAuthGate();
  const isCommunity = location.pathname === "/community";

  return (
    <div className="min-h-screen flex flex-col bg-rtg-ink bg-grain">
      <ScrollToTop />
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      {isCommunity ? (
        <JoinCTA
          primaryLabel="Join the Community"
          onPrimaryClick={() => requestLogin("signup")}
          secondaryLabel="Explore Upcoming Events"
          secondaryTo="/race-calendar"
        />
      ) : (
        <JoinCTA />
      )}
      <AiWidget />
      <CartDrawer />
    </div>
  );
}
