import { lazy, Suspense, useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import Layout from "./components/Layout";
import Preloader from "./components/Preloader";
import AuthGate from "./components/AuthGate";
import AuthCallback from "./pages/AuthCallback";
import Onboarding from "./pages/Onboarding";
import { AuthGateProvider } from "./lib/AuthGateContext";
import { CartProvider } from "./lib/CartContext";
import Home from "./pages/Home";
import About from "./pages/About";
import Community from "./pages/Community";
import WeeklyRides from "./pages/WeeklyRides";
import WeeklySessionDetail from "./pages/WeeklySessionDetail";
import Events from "./pages/Events";
import EventDetail from "./pages/EventDetail";
import Merchandise from "./pages/Merchandise";
import ProductDetail from "./pages/ProductDetail";
import Checkout from "./pages/Checkout";
import OrderConfirmation from "./pages/OrderConfirmation";
import Challenges from "./pages/Challenges";
import RaceCalendar from "./pages/RaceCalendar";
import RaceResults from "./pages/RaceResults";
import Safety from "./pages/Safety";
import Dashboard from "./pages/Dashboard";
import Blog from "./pages/Blog";
import Sponsors from "./pages/Sponsors";
import Gallery from "./pages/Gallery";
import Contact from "./pages/Contact";
import FAQ from "./pages/FAQ";
import NotFound from "./pages/NotFound";
import LegalPage from "./pages/legal/LegalPage";
import { privacyPolicy, termsOfService, communityGuidelines } from "./data/legalContent";
import { resources } from "./admin/resourceConfig";

// The whole /admin area is only ever used by RTG staff — keep it out of the
// bundle every public visitor downloads.
const ProtectedRoute = lazy(() => import("./admin/ProtectedRoute"));
const AdminLayout = lazy(() => import("./admin/AdminLayout"));
const AdminLogin = lazy(() => import("./admin/pages/AdminLogin"));
const AdminDashboard = lazy(() => import("./admin/pages/AdminDashboard"));
const ResourceAdminPage = lazy(() => import("./admin/pages/ResourceAdminPage"));
const OrdersAdmin = lazy(() => import("./admin/pages/OrdersAdmin"));
const GalleryAdmin = lazy(() => import("./admin/pages/GalleryAdmin"));
const SiteImagesAdmin = lazy(() => import("./admin/pages/SiteImagesAdmin"));
const SiteContentAdmin = lazy(() => import("./admin/pages/SiteContentAdmin"));
const MessagesAdmin = lazy(() => import("./admin/pages/MessagesAdmin"));
const AdminsAdmin = lazy(() => import("./admin/pages/AdminsAdmin"));
const AiAdmin = lazy(() => import("./admin/pages/AiAdmin"));

function AdminFallback() {
  return (
    <div className="min-h-svh flex items-center justify-center bg-rtg-ink">
      <Loader2 className="animate-spin text-rtg-orange-400" size={28} />
    </div>
  );
}

// Routes that manage their own full-screen UI and should never be covered by
// the video intro / login prompt (an in-progress OAuth callback, and later
// the /admin dashboard).
const INTRO_EXEMPT_PREFIXES = ["/auth/callback", "/onboarding", "/admin"];

export default function App() {
  const location = useLocation();
  const [introDone, setIntroDone] = useState(false);

  const exempt = INTRO_EXEMPT_PREFIXES.some((p) => location.pathname.startsWith(p));

  return (
    <CartProvider>
      <AuthGateProvider>
        {!exempt && !introDone && <Preloader onFinish={() => setIntroDone(true)} />}
        {!exempt && introDone && <AuthGate />}
        <Routes>
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/onboarding" element={<Onboarding />} />

        <Route
          path="/admin/login"
          element={
            <Suspense fallback={<AdminFallback />}>
              <AdminLogin />
            </Suspense>
          }
        />
        <Route
          path="/admin"
          element={
            <Suspense fallback={<AdminFallback />}>
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            </Suspense>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="events" element={<ResourceAdminPage resource={resources.events} />} />
          <Route path="products" element={<ResourceAdminPage resource={resources.products} />} />
          <Route path="blog" element={<ResourceAdminPage resource={resources.blog} />} />
          <Route path="sponsors" element={<ResourceAdminPage resource={resources.sponsors} />} />
          <Route path="testimonials" element={<ResourceAdminPage resource={resources.testimonials} />} />
          <Route path="challenges" element={<ResourceAdminPage resource={resources.challenges} />} />
          <Route path="team" element={<ResourceAdminPage resource={resources.team} />} />
          <Route path="race-results" element={<ResourceAdminPage resource={resources.raceResults} />} />
          <Route path="calendar" element={<ResourceAdminPage resource={resources.calendarEvents} />} />
          <Route path="weekly-sessions" element={<ResourceAdminPage resource={resources.weeklySessions} />} />
          <Route path="gallery" element={<GalleryAdmin />} />
          <Route path="site-images" element={<SiteImagesAdmin />} />
          <Route path="site-content" element={<SiteContentAdmin />} />
          <Route path="messages" element={<MessagesAdmin />} />
          <Route path="orders" element={<OrdersAdmin />} />
          <Route path="ai" element={<AiAdmin />} />
          <Route path="admins" element={<AdminsAdmin />} />
        </Route>

        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/community" element={<Community />} />
          <Route path="/weekly-rides" element={<WeeklyRides />} />
          <Route path="/weekly-rides/:slug" element={<WeeklySessionDetail />} />
          <Route path="/events" element={<Events />} />
          <Route path="/events/:slug" element={<EventDetail />} />
          <Route path="/merchandise" element={<Merchandise />} />
          <Route path="/merchandise/:id" element={<ProductDetail />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order-confirmation/:orderId" element={<OrderConfirmation />} />
          <Route path="/challenges" element={<Challenges />} />
          <Route path="/race-calendar" element={<RaceCalendar />} />
          <Route path="/race-results" element={<RaceResults />} />
          <Route path="/safety" element={<Safety />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/sponsors" element={<Sponsors />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/privacy" element={<LegalPage {...privacyPolicy} />} />
          <Route path="/terms" element={<LegalPage {...termsOfService} />} />
          <Route path="/community-guidelines" element={<LegalPage {...communityGuidelines} />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        </Routes>
      </AuthGateProvider>
    </CartProvider>
  );
}
