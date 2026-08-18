import { Link } from "react-router-dom";
import { MapPin, Mail, Phone } from "lucide-react";
import { useSiteImages } from "../lib/publicData";
import { brand } from "../data/content";
import { InstagramIcon, FacebookIcon, YoutubeIcon, StravaIcon } from "./ui/SocialIcons";

const socials = [
  { platform: "instagram", icon: InstagramIcon, ...brand.social.instagram },
  { platform: "facebook", icon: FacebookIcon, ...brand.social.facebook },
  { platform: "youtube", icon: YoutubeIcon, ...brand.social.youtube },
  { platform: "strava", icon: StravaIcon, ...brand.social.strava },
];

const cols = [
  {
    title: "Community",
    links: [
      { to: "/about", label: "About RTG" },
      { to: "/community", label: "Our Community" },
      { to: "/weekly-rides", label: "Weekly Rides" },
      { to: "/gallery", label: "Gallery" },
      { to: "/community", label: "Volunteer" },
    ],
  },
  {
    title: "Get Involved",
    links: [
      { to: "/events", label: "Events" },
      { to: "/challenges", label: "Challenges" },
      { to: "/race-calendar", label: "Race Calendar" },
      { to: "/race-results", label: "Race Results" },
      { to: "/sponsors", label: "Sponsor With RTG" },
      { to: "/contact", label: "Become Chapter Captain" },
    ],
  },
  {
    title: "More",
    links: [
      { to: "/merchandise", label: "Store" },
      { to: "/merchandise", label: "Kit" },
      { to: "/blog", label: "Resources" },
      { to: "/safety", label: "Safety" },
      { to: "/faq", label: "FAQ" },
      { to: "/contact", label: "Contact" },
      { to: "/contact", label: "Media" },
    ],
  },
  {
    title: "Legal",
    links: [
      { to: "/community-guidelines", label: "Community Guidelines" },
      { to: "/privacy", label: "Privacy Policy" },
      { to: "/terms", label: "Terms" },
    ],
  },
];

export default function Footer() {
  const images = useSiteImages();
  return (
    <footer className="bg-rtg-purple-950 border-t border-white/10 pt-16 pb-8 px-6 md:px-10">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-10 mb-14">
          <div className="col-span-2">
            <img src={images.logo} alt={brand.name} className="h-10 w-auto mb-4" />
            <p className="text-rtg-mist text-sm leading-relaxed max-w-xs mb-5">
              India's endurance sports community for cycling, running, swimming, challenges, races, and unforgettable adventures.
            </p>
            <div className="flex gap-3">
              {socials.map((s) => (
                <a
                  key={s.platform}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full glass flex items-center justify-center text-rtg-white hover:text-rtg-orange-400 hover:border-rtg-orange-400/60 transition-colors"
                  aria-label={s.handle}
                >
                  <s.icon size={18} />
                </a>
              ))}
            </div>
          </div>

          {cols.map((c) => (
            <div key={c.title}>
              <h4 className="font-display text-lg tracking-wide mb-4 text-rtg-orange-400">{c.title}</h4>
              <ul className="space-y-2.5">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <Link to={l.to} className="text-sm text-rtg-mist hover:text-rtg-white transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h4 className="font-display text-lg tracking-wide mb-4 text-rtg-orange-400">Contact</h4>
            <ul className="space-y-2.5 text-sm text-rtg-mist">
              <li className="flex items-start gap-2"><Mail size={16} className="mt-0.5 shrink-0" /> {brand.email}</li>
              <li className="flex items-start gap-2"><Phone size={16} className="mt-0.5 shrink-0" /> {brand.phone}</li>
              <li className="flex items-start gap-2"><MapPin size={16} className="mt-0.5 shrink-0" /> {brand.cities.join(", ")}</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-rtg-mist">
          <p>© {new Date().getFullYear()} Ride Tea GupShup. All rights reserved.</p>
          <p>Built for athletes, by athletes.</p>
        </div>
      </div>
    </footer>
  );
}
