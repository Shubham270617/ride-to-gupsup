import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Preloader from "./components/Preloader";
import Home from "./pages/Home";
import About from "./pages/About";
import Community from "./pages/Community";
import WeeklyRides from "./pages/WeeklyRides";
import Events from "./pages/Events";
import Merchandise from "./pages/Merchandise";
import Challenges from "./pages/Challenges";
import RaceCalendar from "./pages/RaceCalendar";
import Blog from "./pages/Blog";
import Sponsors from "./pages/Sponsors";
import Gallery from "./pages/Gallery";
import Contact from "./pages/Contact";
import FAQ from "./pages/FAQ";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <>
      <Preloader />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/community" element={<Community />} />
          <Route path="/weekly-rides" element={<WeeklyRides />} />
          <Route path="/events" element={<Events />} />
          <Route path="/merchandise" element={<Merchandise />} />
          <Route path="/challenges" element={<Challenges />} />
          <Route path="/race-calendar" element={<RaceCalendar />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/sponsors" element={<Sponsors />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  );
}
