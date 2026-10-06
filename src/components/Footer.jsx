import { useMemo } from "react";
import { MapPin, Mail, Phone } from "lucide-react";
import { useSiteImages, useSiteSettings, buildFooterCopy, useFooterColumns } from "../lib/publicData";
import { InstagramIcon, FacebookIcon, YoutubeIcon, StravaIcon } from "./ui/SocialIcons";
import SmartLink from "./ui/SmartLink";

// Which icon goes with which social link field (see FOOTER_FIELDS in
// lib/publicData.js). A platform whose link is left empty isn't shown.
const SOCIALS = [
  { field: "instagramUrl", name: "Instagram", icon: InstagramIcon },
  { field: "facebookUrl", name: "Facebook", icon: FacebookIcon },
  { field: "youtubeUrl", name: "YouTube", icon: YoutubeIcon },
  { field: "stravaUrl", name: "Strava", icon: StravaIcon },
];

// The two looks of the same footer. Same content either way — wording from
// Site Content -> Footer, link columns from Admin -> Footer Links.
//   solid   — its own dark purple band. Used on every page except the two
//             below.
//   overlay — no background of its own; sits on the photo of the
//             "Join the Movement" band (Home and Community, see JoinCTA).
const LOOK = {
  solid: {
    footer: "relative text-white px-6 md:px-10 xl:px-[74px] pt-[54px] pb-[22px] bg-[radial-gradient(circle_at_16%_10%,rgba(91,56,155,0.2),transparent_28%),linear-gradient(#160c27_0%,#0d0718_100%)]",
    inner: "max-w-[1320px] mx-auto",
    grid: "gap-x-[34px] gap-y-10",
    brandColumn: "minmax(260px, 1.55fr)",
    brand: "max-w-[430px]",
    logo: "w-[120px] h-auto mb-[15px]",
    description: "my-3 text-xs leading-[1.65] text-white/60",
    contactRow: "flex flex-wrap lg:flex-nowrap items-end justify-between gap-x-3 gap-y-4 mt-[22px]",
    heading: "mb-3 font-display font-normal text-[17px] leading-tight tracking-[0.02em] text-rtg-orange-400",
    contactItem: "flex items-center gap-2 mb-2 text-[10px] text-white/60 hover:text-white",
    social: "w-[34px] h-[34px] border-white/10 bg-white/5",
    link: "mb-2.5 text-[10.5px] leading-[1.35] text-white/60",
    bottom: "mt-6 pt-3.5 border-white/8 text-[9px] text-white/45",
  },
  overlay: {
    footer: "relative px-6 md:px-10 xl:px-[76px] pt-7 pb-[18px]",
    inner: "",
    grid: "gap-x-12 gap-y-10",
    brandColumn: "minmax(260px, 1.52fr)",
    brand: "grid sm:grid-cols-[112px_minmax(0,1fr)] gap-x-3.5 gap-y-4 max-w-[430px]",
    logo: "w-[108px] h-auto opacity-95",
    description: "text-[11.5px] leading-[1.52] text-white/75",
    contactRow: "mt-8",
    heading: "mb-3 text-[10.5px] font-bold leading-[1.2] tracking-[0.1em] uppercase text-[#ff7b2c]",
    contactItem: "flex items-center gap-[7px] mb-1.5 text-[10.5px] leading-[1.3] text-white/75 hover:text-white",
    social: "w-[30px] h-[30px] border-white/12 bg-white/7",
    link: "mb-2 text-[11.5px] leading-[1.38] text-white/75",
    bottom: "mt-[18px] pt-[11px] border-white/10 text-[9.5px] text-white/55",
  },
};

export default function Footer({ variant = "solid" }) {
  const images = useSiteImages();
  const settings = useSiteSettings();
  const footer = useMemo(() => buildFooterCopy(settings), [settings]);
  const columns = useFooterColumns();
  const socials = SOCIALS.filter((s) => footer[s.field]);
  const look = LOOK[variant] || LOOK.solid;
  const overlay = variant === "overlay";

  const contact = (
    <div>
      <h4 className={look.heading}>{footer.contactHeading}</h4>
      {footer.email && (
        <a href={`mailto:${footer.email}`} className={look.contactItem}>
          <Mail size={12} className="shrink-0" />
          {footer.email}
        </a>
      )}
      {footer.phone && (
        <a href={`tel:${footer.phone.replace(/\s+/g, "")}`} className={look.contactItem}>
          <Phone size={12} className="shrink-0" />
          {footer.phone}
        </a>
      )}
      {footer.location && (
        <span className={look.contactItem.replace(" hover:text-white", "")}>
          <MapPin size={12} className="shrink-0" />
          {footer.location}
        </span>
      )}
    </div>
  );

  const socialIcons = socials.length > 0 && (
    <div className={`flex flex-wrap items-center gap-[7px] ${overlay ? "mt-3" : ""}`}>
      {socials.map(({ field, name, icon: Icon }) => (
        <a
          key={field}
          href={footer[field]}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={name}
          className={`${look.social} rounded-full grid place-items-center border text-white transition-colors hover:text-rtg-orange-400 hover:border-rtg-orange-400/60`}
        >
          <Icon size={13} />
        </a>
      ))}
    </div>
  );

  return (
    <footer className={look.footer}>
      <div className={look.inner}>
        <div
          className={`grid grid-cols-2 md:grid-cols-3 lg:[grid-template-columns:var(--footer-columns)] ${look.grid}`}
          style={{ "--footer-columns": `${look.brandColumn} repeat(${columns.length}, minmax(0, 1fr))` }}
        >
          <div className={`col-span-2 md:col-span-3 lg:col-span-1 ${look.brand}`}>
            <img src={images.logo} alt={footer.logoAlt} className={look.logo} />
            <div>
              <p className={look.description}>{footer.description}</p>
              <div className={look.contactRow}>
                {contact}
                {socialIcons}
              </div>
            </div>
          </div>

          {columns.map((column) => (
            <div key={column.title} className="flex flex-col items-start">
              <h4 className={look.heading}>{column.title}</h4>
              {column.links.map((link) => (
                <SmartLink key={`${link.label}-${link.to}`} to={link.to} className={`${look.link} transition-colors hover:text-white`}>
                  {link.label}
                </SmartLink>
              ))}
            </div>
          ))}
        </div>

        <div className={`flex flex-col sm:flex-row justify-between gap-x-6 gap-y-1 border-t ${look.bottom}`}>
          <span>
            © {new Date().getFullYear()} {footer.copyright}
          </span>
          <span>{footer.tagline}</span>
        </div>
      </div>
    </footer>
  );
}
