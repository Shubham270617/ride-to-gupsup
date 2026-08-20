import { Link } from "react-router-dom";
import { MapPin, Mail, Phone } from "lucide-react";
import { useSiteImages, useSiteSettings, pickText } from "../lib/publicData";
import { brand } from "../data/content";
import { InstagramIcon, FacebookIcon, YoutubeIcon, StravaIcon } from "./ui/SocialIcons";

const socials = [
  { platform: "instagram", icon: InstagramIcon, ...brand.social.instagram },
  { platform: "facebook", icon: FacebookIcon, ...brand.social.facebook },
  { platform: "youtube", icon: YoutubeIcon, ...brand.social.youtube },
  { platform: "strava", icon: StravaIcon, ...brand.social.strava },
];

const legalLinks = [
  { to: "/community-guidelines", label: "Community Guidelines" },
  { to: "/privacy", label: "Privacy Policy" },
  { to: "/terms", label: "Terms" },
];

export default function Footer() {
  const images = useSiteImages();
  const settings = useSiteSettings();
  const t = (key, fallback) => pickText(settings, key, fallback);
  return (
    <footer className="relative bg-rtg-purple-950 border-t border-white/10 pt-10 pb-6 px-6 md:px-10 overflow-hidden">
      <div className="max-w-7xl mx-auto relative">
        <div className="grid sm:grid-cols-3 gap-8 mb-8">
          <div className="sm:col-span-1">
            <img src={images.logo} alt={brand.name} className="h-9 w-auto mb-3" />
            <p className="text-rtg-mist text-sm leading-relaxed max-w-xs mb-4">
              {t(
                "text.footer.description",
                "India's endurance sports community for cycling, running, swimming, challenges, races, and unforgettable adventures."
              )}
            </p>
            <div className="flex gap-2.5">
              {socials.map((s) => (
                <a
                  key={s.platform}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full glass flex items-center justify-center text-rtg-white hover:text-rtg-orange-400 hover:border-rtg-orange-400/60 transition-colors"
                  aria-label={s.handle}
                >
                  <s.icon size={16} />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-display text-base tracking-wide mb-3 text-rtg-orange-400">Contact</h4>
            <ul className="space-y-2 text-sm text-rtg-mist">
              <li className="flex items-start gap-2"><Mail size={15} className="mt-0.5 shrink-0" /> {brand.email}</li>
              <li className="flex items-start gap-2"><Phone size={15} className="mt-0.5 shrink-0" /> {brand.phone}</li>
              <li className="flex items-start gap-2"><MapPin size={15} className="mt-0.5 shrink-0" /> {brand.cities.join(", ")}</li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-base tracking-wide mb-3 text-rtg-orange-400">Legal</h4>
            <ul className="space-y-2">
              {legalLinks.map((l) => (
                <li key={l.label}>
                  <Link to={l.to} className="text-sm text-rtg-mist hover:text-rtg-white transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-4 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-rtg-mist">
          <p>
            © {new Date().getFullYear()} {t("text.footer.copyright", "Ride Tea GupShup. All rights reserved.")}
          </p>
          <p>{t("text.footer.tagline", "Built for athletes, by athletes.")}</p>
        </div>
      </div>

      {/* Large faded logo watermark — purely decorative, sits behind/below the bottom bar */}
      <img
        src={images.logo}
        alt=""
        aria-hidden="true"
        className="pointer-events-none select-none absolute left-1/2 -bottom-6 -translate-x-1/2 w-[140%] max-w-none opacity-[0.04] md:opacity-[0.05]"
      />
    </footer>
  );
}
