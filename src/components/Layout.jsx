import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import ScrollToTop from "./ScrollToTop";
import AiWidget from "./ai/AiWidget";
import CartDrawer from "./CartDrawer";

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-rtg-ink bg-grain">
      <ScrollToTop />
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <AiWidget />
      <CartDrawer />
    </div>
  );
}
