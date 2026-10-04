import Reveal from "./Reveal";
import FloatingIcons from "./FloatingIcons";
import { useSiteSettings, pickText } from "../../lib/publicData";

export default function Section({
  id,
  eyebrow,
  title,
  subtitle,
  children,
  className = "",
  center = true,
  // `dark` = a deliberately dark band (the brand reference's "Life at RTG" /
  // final-CTA treatment) — deep purple, optionally with a background photo,
  // white text. Everything else on the site is light canvas by default.
  dark = false,
  // Optional photo for a `dark` section — adds the Ken Burns drift + gradient
  // overlay from the reference. Omit for a flat dark-purple band instead.
  image,
  // `light` no longer switches any color logic (the whole site is light by
  // default now) — it just opts into the decorative floating sports-art
  // layer used on the reference's `.light-section`s.
  light = false,
  // Lets the admin's Site Content page edit this section's eyebrow/title/
  // subtitle without touching code — e.g. contentKey="about.mission" reads
  // overrides from "text.about.mission.{eyebrow,title,subtitle}", falling
  // back to whatever's passed in as props above when nothing's been set.
  contentKey,
}) {
  const settings = useSiteSettings();
  const resolvedEyebrow = contentKey ? pickText(settings, `text.${contentKey}.eyebrow`, eyebrow) : eyebrow;
  const resolvedTitle = contentKey ? pickText(settings, `text.${contentKey}.title`, title) : title;
  const resolvedSubtitle = contentKey ? pickText(settings, `text.${contentKey}.subtitle`, subtitle) : subtitle;

  return (
    <section
      id={id}
      className={`relative isolate overflow-hidden py-20 md:py-28 px-6 md:px-10 ${
        dark ? "theme-night bg-rtg-purple-950" : light ? "bg-rtg-canvas" : "bg-rtg-ink"
      } ${className}`}
    >
      {dark && image && (
        <>
          <div
            className="absolute inset-0 -z-20 rtg-kenburns"
            style={{ backgroundImage: `url(${image})`, backgroundSize: "cover", backgroundPosition: "center" }}
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-rtg-purple-950/90 via-rtg-purple-950/70 to-rtg-purple-950/50" />
        </>
      )}
      {dark && !image && (
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_75%_35%,rgba(247,107,28,.18),transparent_38%)]" />
      )}
      {light && !dark && <FloatingIcons />}

      <div className="relative max-w-7xl mx-auto">
        {(resolvedEyebrow || resolvedTitle || resolvedSubtitle) && (
          <Reveal className={`mb-12 md:mb-16 ${center ? "text-center mx-auto max-w-3xl" : "max-w-2xl"}`}>
            {resolvedEyebrow && (
              <span className="inline-block text-rtg-orange-500 font-bold tracking-[0.2em] uppercase text-xs md:text-sm mb-4">
                {resolvedEyebrow}
              </span>
            )}
            {resolvedTitle && (
              <h2 className="font-display text-rtg-white text-4xl md:text-6xl leading-[0.95] mb-4">{resolvedTitle}</h2>
            )}
            {resolvedSubtitle && <p className="text-rtg-mist text-base md:text-lg leading-relaxed">{resolvedSubtitle}</p>}
            <span className={`section-underline ${center ? "center" : ""}`} />
          </Reveal>
        )}
        {children}
      </div>
    </section>
  );
}
