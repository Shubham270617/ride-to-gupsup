import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import JoinCTA from "./sections/JoinCTA";
import ScrollToTop from "./ScrollToTop";
import AiWidget from "./ai/AiWidget";
import CartDrawer from "./CartDrawer";
import SiteBackground from "./ui/SiteBackground";
import { useAuthGate } from "../lib/AuthGateContext";

// Pages that end with the photo-backed "Join the Movement" band, which
// carries the footer inside it. Every other page ends with the plain dark
// <Footer /> on its own.
const JOIN_BAND_PAGES = ["/", "/community"];

export default function Layout() {
  const location = useLocation();
  const { requestLogin } = useAuthGate();
  const isCommunity = location.pathname === "/community";
  const hasJoinBand = JOIN_BAND_PAGES.includes(location.pathname);

  return (
    <div className="min-h-screen flex flex-col bg-rtg-ink bg-grain">
      {/* Fixed behind everything. <main> is `relative` so all page content
          — positioned or not — paints above it. */}
      <SiteBackground />
      <ScrollToTop />
      <Navbar />
      <main className="relative flex-1">
        <Outlet />
      </main>
      {hasJoinBand ? (
        // On Community the first button opens the sign-up panel instead of
        // following its link.
        <JoinCTA onPrimaryClick={isCommunity ? () => requestLogin("signup") : undefined} />
      ) : (
        <Footer />
      )}
      <AiWidget />
      <CartDrawer />
    </div>
  );
}
