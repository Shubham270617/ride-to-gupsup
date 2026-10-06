import { useMemo } from "react";
import { Link } from "react-router-dom";
import { MapPin, Mail, Phone } from "lucide-react";
import Reveal from "../ui/Reveal";
import { useSiteImages, useSiteSettings, buildJoinCopy, buildFooterCopy, useFooterColumns } from "../../lib/publicData";
import useIsMobile from "../../hooks/useIsMobile";
import { InstagramIcon, FacebookIcon, YoutubeIcon, StravaIcon } from "../ui/SocialIcons";

// Which icon goes with which social link field (see FOOTER_FIELDS in
// lib/publicData.js). A platform whose link is left empty isn't shown.
const SOCIALS = [
  { field: "instagramUrl", name: "Instagram", icon: InstagramIcon },
  { field: "facebookUrl", name: "Facebook", icon: FacebookIcon },
  { field: "youtubeUrl", name: "YouTube", icon: YoutubeIcon },
  { field: "stravaUrl", name: "Strava", icon: StravaIcon },
];

const CTA_BUTTON =
  "inline-flex items-center justify-center min-h-[52px] px-[27px] rounded-full text-[10.5px] font-bold tracking-[0.08em] uppercase text-white transition-all duration-300 hover:-translate-y-0.5";
const FOOTER_LINK = "text-[11.5px] leading-[1.38] text-white/75 transition-colors hover:text-white";

// A link typed in the admin: a path on this site ("/events") stays in the
// app; anything else (https://…, mailto:…) opens as a normal link.
function SmartLink({ to, className, children }) {
  if (!to) return <span className={className}>{children}</span>;
  if (to.startsWith("/")) {
    return (
      <Link to={to} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <a href={to} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}

// "Join the Movement" + the site footer, as one continuous photo-backed
// band at the bottom of every page (rendered once, in Layout). The photo is
// pinned to the viewport on desktop (`background-attachment: fixed`) while
// the content scrolls over it; phones fall back to a normal background,
// where fixed ones misbehave.
//
// `onPrimaryClick`, when given, replaces the first button's link with an
// action (the Community page uses it to open the sign-up panel).
export default function JoinCTA({ onPrimaryClick }) {
  const images = useSiteImages();
  const settings = useSiteSettings();
  const isMobile = useIsMobile();
  const join = useMemo(() => buildJoinCopy(settings), [settings]);
  const footer = useMemo(() => buildFooterCopy(settings), [settings]);
  const columns = useFooterColumns();
  const socials = SOCIALS.filter((s) => footer[s.field]);

  return (
    <section id="join-rtg" className="theme-night relative isolate overflow-hidden bg-[#21143c]">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-20"
        style={{
          backgroundImage: `url(${images.homeCTA})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: isMobile ? "scroll" : "fixed",
        }}
      />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(rgba(22,13,40,0.67)_0%,rgba(20,11,38,0.69)_50%,rgba(18,10,34,0.71)_100%)]" />

      <div className="flex items-center justify-center min-h-[485px] px-6 pt-[82px] pb-16">
        <Reveal className="flex flex-col items-center max-w-[980px] text-center">
          <span className="mb-[15px] text-[10px] font-semibold leading-none tracking-[0.25em] uppercase text-[#ff7b2c]">{join.eyebrow}</span>
          <h2 className="font-display text-[clamp(3.75rem,6.65vw,7.875rem)] leading-[0.88] text-white">
            {join.title} <span className="text-gradient">{join.titleAccent}</span>
          </h2>
          <p className="mt-5 max-w-[760px] text-sm leading-[1.55] text-white/80">{join.subtitle}</p>
          <div className="flex flex-wrap items-center justify-center gap-3.5 mt-[30px]">
            {onPrimaryClick ? (
              <button
                type="button"
                onClick={onPrimaryClick}
                className={`${CTA_BUTTON} btn-shine bg-gradient-to-r from-[#f45b18] to-[#ff7a1a] shadow-[0_14px_28px_rgba(247,107,28,0.22)]`}
              >
                {join.primaryLabel}
              </button>
            ) : (
              <SmartLink
                to={join.primaryLink}
                className={`${CTA_BUTTON} btn-shine bg-gradient-to-r from-[#f45b18] to-[#ff7a1a] shadow-[0_14px_28px_rgba(247,107,28,0.22)]`}
              >
                {join.primaryLabel}
              </SmartLink>
            )}
            <SmartLink to={join.secondaryLink} className={`${CTA_BUTTON} border border-white/35 hover:bg-white/10`}>
              {join.secondaryLabel}
            </SmartLink>
          </div>
        </Reveal>
      </div>

      <footer className="relative px-6 md:px-10 xl:px-[76px] pt-7 pb-[18px]">
        <div
          className="grid gap-x-12 gap-y-10 grid-cols-2 md:grid-cols-3 lg:[grid-template-columns:var(--footer-columns)]"
          style={{ "--footer-columns": `minmax(260px, 1.52fr) repeat(${columns.length}, minmax(0, 1fr))` }}
        >
          <div className="col-span-2 md:col-span-3 lg:col-span-1 grid sm:grid-cols-[112px_minmax(0,1fr)] gap-x-3.5 gap-y-4 max-w-[430px]">
            <img src={images.logo} alt={footer.logoAlt} className="w-[108px] h-auto opacity-95" />
            <div>
              <p className="text-[11.5px] leading-[1.52] text-white/75">{footer.description}</p>

              <div className="grid gap-1.5 mt-8">
                <h4 className="mb-1 text-[10px] font-bold tracking-[0.11em] uppercase text-[#ff7b2c]">{footer.contactHeading}</h4>
                {footer.email && (
                  <a href={`mailto:${footer.email}`} className="flex items-center gap-[7px] text-[10.5px] leading-[1.3] text-white/75 hover:text-white">
                    <Mail size={12} className="shrink-0" />
                    {footer.email}
                  </a>
                )}
                {footer.phone && (
                  <a
                    href={`tel:${footer.phone.replace(/\s+/g, "")}`}
                    className="flex items-center gap-[7px] text-[10.5px] leading-[1.3] text-white/75 hover:text-white"
                  >
                    <Phone size={12} className="shrink-0" />
                    {footer.phone}
                  </a>
                )}
                {footer.location && (
                  <span className="flex items-center gap-[7px] text-[10.5px] leading-[1.3] text-white/75">
                    <MapPin size={12} className="shrink-0" />
                    {footer.location}
                  </span>
                )}
              </div>

              {socials.length > 0 && (
                <div className="flex flex-wrap items-center gap-[7px] mt-3">
                  {socials.map(({ field, name, icon: Icon }) => (
                    <a
                      key={field}
                      href={footer[field]}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={name}
                      className="w-[30px] h-[30px] rounded-full grid place-items-center border border-white/12 bg-white/7 text-white transition-colors hover:text-rtg-orange-400 hover:border-rtg-orange-400/60"
                    >
                      <Icon size={13} />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          {columns.map((column) => (
            <div key={column.title} className="flex flex-col items-start">
              <h4 className="mb-3 text-[10.5px] font-bold leading-[1.2] tracking-[0.1em] uppercase text-[#ff7b2c]">{column.title}</h4>
              {column.links.map((link) => (
                <SmartLink key={`${link.label}-${link.to}`} to={link.to} className={`${FOOTER_LINK} mb-2`}>
                  {link.label}
                </SmartLink>
              ))}
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row justify-between gap-x-6 gap-y-1 mt-[18px] pt-[11px] border-t border-white/10 text-[9.5px] text-white/55">
          <span>
            © {new Date().getFullYear()} {footer.copyright}
          </span>
          <span>{footer.tagline}</span>
        </div>
      </footer>
    </section>
  );
}
