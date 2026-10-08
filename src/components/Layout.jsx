import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import JoinCTA from "./sections/JoinCTA";
import ScrollToTop from "./ScrollToTop";
import AiWidget from "./ai/AiWidget";
import CartDrawer from "./CartDrawer";
import SiteBackground from "./ui/SiteBackground";
import { JoinCommunityProvider, useJoinCommunity } from "../lib/JoinCommunityContext";

// Pages that end with the photo-backed "Join the Movement" band, which
// carries the footer inside it. Every other page ends with the plain dark
// <Footer /> on its own.
const JOIN_BAND_PAGES = ["/", "/community"];

function Page() {
  const location = useLocation();
  const joinCommunity = useJoinCommunity();
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
        // On Community the band has its own wording, and its first button
        // starts the Join Community flow instead of following a link.
        <JoinCTA community={isCommunity} play={!isCommunity} onPrimaryClick={isCommunity ? joinCommunity : undefined} />
      ) : (
        <Footer />
      )}
      <AiWidget />
      <CartDrawer />
    </div>
  );
}

// Every public page sits inside the Join Community flow, so any page's
// button can start it (see lib/JoinCommunityContext.jsx).
export default function Layout() {
  return (
    <JoinCommunityProvider>
      <Page />
    </JoinCommunityProvider>
  );
}
