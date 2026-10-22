import { lazy, Suspense, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import Layout from "./components/Layout";
import Preloader from "./components/Preloader";
import AuthGate from "./components/AuthGate";
import AuthCallback from "./pages/AuthCallback";
import Onboarding from "./pages/Onboarding";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import { AuthGateProvider } from "./lib/AuthGateContext";
import { ChatProvider } from "./lib/ChatContext";
import { CartProvider } from "./lib/CartContext";
import { useAppearance } from "./lib/appearance";
import useWelcomeEmail from "./lib/useWelcomeEmail";
import Home from "./pages/Home";
import About from "./pages/About";
import Community from "./pages/Community";
import Volunteer from "./pages/ConnectedVolunteer";
import CommunityDetail from "./pages/CommunityDetail";
import WeeklyRides from "./pages/WeeklyRides";
import WeeklySessionDetail from "./pages/WeeklySessionDetail";
import Events from "./pages/Events";
import EventDetail from "./pages/EventDetail";
import Merchandise from "./pages/Store";
import ProductDetail from "./pages/ProductDetail";
import Checkout from "./pages/Checkout";
import OrderConfirmation from "./pages/OrderConfirmation";
import Challenges from "./pages/Challenges";
import Calendar from "./pages/Calendar";
import RaceResults from "./pages/RaceResults";
import Lab from "./pages/Lab";
import LabStrava from "./pages/LabStrava";
import LabRidge from "./pages/LabRidge";
import Membership from "./pages/Membership";
import MembershipCheckout from "./pages/MembershipCheckout";
import Safety from "./pages/Safety";
import Dashboard from "./pages/Dashboard";
import Blog from "./pages/Blog";
import Sponsors from "./pages/Sponsors";
import Gallery from "./pages/Gallery";
import Contact from "./pages/Contact";
import Chat from "./pages/Chat";
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
const RidgeImportPreview = lazy(() => import("./admin/pages/RidgeImportPreview"));
const RidgeAdmin = lazy(() => import("./admin/pages/RidgeAdmin"));
const VolunteerAdmin = lazy(() => import("./admin/pages/VolunteerAdmin"));
const LayoutStudioAdmin = lazy(() => import("./admin/pages/ConnectedLayoutStudioAdmin"));
const AppearanceAdmin = lazy(() => import("./admin/pages/AppearanceAdmin"));
const MessagesAdmin = lazy(() => import("./admin/pages/MessagesAdmin"));
const AdminsAdmin = lazy(() => import("./admin/pages/AdminsAdmin"));
const VisitorsAdmin = lazy(() => import("./admin/pages/VisitorsAdmin"));
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
const CodeTimerRoute = lazy(() => import('./volunteer-timer/CodeTimerRoute'));
const TimingCodesAdmin = lazy(() => import('./volunteer-timer/TimingCodesAdmin'));
const VolunteerTimerDemo = lazy(() => import('./volunteer-timer/VolunteerTimerDemo'));
const VolunteerTimerRoute = lazy(() => import('./volunteer-timer/VolunteerTimerRoute'));
const INTRO_EXEMPT_PREFIXES = ["/volunteer/ridge", "/auth/callback", "/onboarding", "/admin", "/forgot-password", "/reset-password"];


export default function App() {
  const location = useLocation();
  const [introDone, setIntroDone] = useState(false);

  // Applies the sitewide text size / typeface / colour an admin chose.
  useAppearance();

  // Sends a brand-new member their welcome email, once (api-lib/welcomeEmail.js).
  useWelcomeEmail();

  const exempt = INTRO_EXEMPT_PREFIXES.some((p) => location.pathname.startsWith(p));

  return (
    <CartProvider>
      <AuthGateProvider>
        <ChatProvider>
        {!exempt && !introDone && <Preloader onFinish={() => setIntroDone(true)} />}
        {!exempt && introDone && <AuthGate />}
        <Routes>
        <Route path="/volunteer/ridge/code" element={<Suspense fallback={<AdminFallback/>}><CodeTimerRoute/></Suspense>}/>
        <Route path="/volunteer/ridge/demo" element={<Suspense fallback={<AdminFallback/>}><VolunteerTimerDemo/></Suspense>}/>
        <Route path="/volunteer/ridge" element={<Suspense fallback={<AdminFallback/>}><VolunteerTimerRoute/></Suspense>}/>
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/onboarding" element={<Onboarding />} />
        {/* Password recovery — outside <Layout>, like the other auth
            screens: they draw their own frame and must not be covered by
            the intro video or the login prompt. */}
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

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
          <Route path="store-categories" element={<ResourceAdminPage resource={resources.storeCategories} />} />
          <Route path="blog" element={<ResourceAdminPage resource={resources.blog} />} />
          <Route path="sponsors" element={<ResourceAdminPage resource={resources.sponsors} />} />
          <Route path="testimonials" element={<ResourceAdminPage resource={resources.testimonials} />} />
          <Route path="challenges" element={<ResourceAdminPage resource={resources.challenges} />} />
          <Route path="team" element={<ResourceAdminPage resource={resources.team} />} />
          <Route path="race-results" element={<ResourceAdminPage resource={resources.raceResults} />} />
          <Route path="calendar" element={<ResourceAdminPage resource={resources.calendarActivities} />} />
          <Route path="calendar-types" element={<ResourceAdminPage resource={resources.calendarCategories} />} />
          <Route path="lab-labs" element={<ResourceAdminPage resource={resources.labProgrammes} />} />
          <Route path="lab-periods" element={<ResourceAdminPage resource={resources.labPeriods} />} />
          <Route path="lab-hero-tiles" element={<ResourceAdminPage resource={resources.labHighlights} />} />
          <Route path="lab-principles" element={<ResourceAdminPage resource={resources.labPrinciples} />} />
          <Route path="lab-access-steps" element={<ResourceAdminPage resource={resources.labAccessSteps} />} />
          <Route path="lab-sports" element={<ResourceAdminPage resource={resources.labSports} />} />
          <Route path="lab-age-categories" element={<ResourceAdminPage resource={resources.labAgeGroups} />} />
          <Route path="lab-activities" element={<ResourceAdminPage resource={resources.labActivities} />} />
          <Route path="ridge" element={<RidgeAdmin />} />
          <Route path="ridge-codes" element={<Suspense fallback={<AdminFallback/>}><TimingCodesAdmin/></Suspense>}/>
          <Route path="ridge-volunteers" element={<Navigate to="/admin/ridge-codes" replace/>} />
          <Route path="ridge-sessions" element={<RidgeAdmin />} />
          <Route path="ridge-import" element={<RidgeImportPreview />} />
          <Route path="ridge-results" element={<RidgeAdmin />} />
          <Route path="ridge-awards" element={<RidgeAdmin />} />
          <Route path="ridge-spotlight" element={<RidgeAdmin />} />
          <Route path="membership-plans" element={<ResourceAdminPage resource={resources.membershipPlans} />} />
          <Route path="membership-perks" element={<ResourceAdminPage resource={resources.membershipPerks} />} />
          <Route path="membership-guides" element={<ResourceAdminPage resource={resources.membershipGuides} />} />
          <Route path="membership-steps" element={<ResourceAdminPage resource={resources.membershipSteps} />} />
          <Route path="membership-faqs" element={<ResourceAdminPage resource={resources.membershipFaqs} />} />
          <Route path="membership-purchases" element={<ResourceAdminPage resource={resources.membershipPurchases} />} />
          <Route path="community-paths" element={<ResourceAdminPage resource={resources.communityPaths} />} />
          <Route path="community-way" element={<ResourceAdminPage resource={resources.communityPrinciples} />} />
          <Route path="community-motion" element={<ResourceAdminPage resource={resources.communityMilestones} />} />
          <Route path="community-network" element={<ResourceAdminPage resource={resources.communityNetworkGroups} />} />
          <Route path="community-network-pins" element={<ResourceAdminPage resource={resources.communityNetworkCities} />} />
          <Route path="community-cities" element={<ResourceAdminPage resource={resources.communityCities} />} />
          <Route path="community-city-photos" element={<ResourceAdminPage resource={resources.communityCityMoments} />} />
          <Route path="weekly-sessions" element={<ResourceAdminPage resource={resources.weeklySessions} />} />
          <Route path="faqs" element={<ResourceAdminPage resource={resources.faqs} />} />
          <Route path="ride-faqs" element={<ResourceAdminPage resource={resources.rideFaqs} />} />
          <Route path="ride-safety" element={<ResourceAdminPage resource={resources.rideSafety} />} />
          <Route path="what-to-bring" element={<ResourceAdminPage resource={resources.whatToBring} />} />
          <Route path="footer-links" element={<ResourceAdminPage resource={resources.footerLinks} />} />
          <Route path="home-why" element={<ResourceAdminPage resource={resources.homeWhyReasons} />} />
          <Route path="home-training" element={<ResourceAdminPage resource={resources.homeTrainingFormats} />} />
          <Route path="home-ways" element={<ResourceAdminPage resource={resources.homeWays} />} />
          <Route path="general-safety" element={<ResourceAdminPage resource={resources.generalSafety} />} />
          <Route path="sponsor-tiers" element={<ResourceAdminPage resource={resources.sponsorTiers} />} />
          <Route path="sponsor-opportunities" element={<ResourceAdminPage resource={resources.sponsorOpportunities} />} />
          <Route path="gallery" element={<GalleryAdmin />} />
          <Route path="site-images" element={<SiteImagesAdmin />} />
          <Route path="site-content" element={<SiteContentAdmin />} />
          <Route path="appearance" element={<AppearanceAdmin />} />
          <Route path="layout-studio" element={<LayoutStudioAdmin />} />
          <Route path="volunteer" element={<VolunteerAdmin persistenceEnabled />} />
          <Route path="messages" element={<MessagesAdmin />} />
          <Route path="orders" element={<OrdersAdmin />} />
          <Route path="ai" element={<AiAdmin />} />
          <Route path="admins" element={<AdminsAdmin />} />
          <Route path="visitors" element={<VisitorsAdmin />} />
        </Route>

        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/community" element={<Community />} />
          <Route path="/volunteer" element={<Volunteer />} />
          <Route path="/community/:communityId" element={<CommunityDetail />} />
          <Route path="/weekly-rides" element={<WeeklyRides />} />
          <Route path="/weekly-rides/:slug" element={<WeeklySessionDetail />} />
          <Route path="/events" element={<Events />} />
          <Route path="/events/:slug" element={<EventDetail />} />
          <Route path="/merchandise" element={<Merchandise />} />
          <Route path="/merchandise/:id" element={<ProductDetail />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order-confirmation/:orderId" element={<OrderConfirmation />} />
          <Route path="/challenges" element={<Challenges />} />
          <Route path="/calendar" element={<Calendar />} />
          {/* The page's old address — kept so existing links still land. */}
          <Route path="/race-calendar" element={<Navigate to="/calendar" replace />} />
          <Route path="/race-results" element={<RaceResults />} />
          <Route path="/lab" element={<Lab />} />
          <Route path="/lab/strava" element={<LabStrava />} />
          <Route path="/lab/ridge" element={<LabRidge />} />
          <Route path="/membership" element={<Membership />} />
          <Route path="/membership/checkout" element={<MembershipCheckout />} />
          {/* The Lab replaced the Leaderboard page — old links still land. */}
          <Route path="/leaderboard" element={<Navigate to="/lab" replace />} />
          <Route path="/safety" element={<Safety />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/sponsors" element={<Sponsors />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/privacy" element={<LegalPage {...privacyPolicy} />} />
          <Route path="/terms" element={<LegalPage {...termsOfService} />} />
          <Route path="/community-guidelines" element={<LegalPage {...communityGuidelines} />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        </Routes>
        </ChatProvider>
      </AuthGateProvider>
    </CartProvider>
  );
}


