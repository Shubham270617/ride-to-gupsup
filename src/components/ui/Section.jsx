import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Reveal from "./Reveal";
import { useSiteSettings, pickText } from "../../lib/publicData";

// Color pairs the "light" scroll effect interpolates between — dark (site
// default) at each end of the section's scroll range, light at its center.
// Same values the old static .theme-light class used, just animated now.
const DARK = {
  ink: "#0a0612",
  white: "#fdfbff",
  mist: "#a99fc0",
  purple950: "#0d0518",
  glassBg: "rgba(21, 10, 41, 0.55)",
  glassBorder: "rgba(172, 140, 229, 0.15)",
};
const LIGHT = {
  ink: "#f7f3ee",
  white: "#1d1726",
  mist: "#5c5468",
  purple950: "#efe8f7",
  glassBg: "rgba(255, 255, 255, 0.6)",
  glassBorder: "rgba(93, 60, 145, 0.14)",
};

export default function Section({
  id,
  eyebrow,
  title,
  subtitle,
  children,
  className = "",
  center = true,
  dark = false,
  light = false,
  // Lets the admin's Site Content page edit this section's eyebrow/title/
  // subtitle without touching code — e.g. contentKey="about.mission" reads
  // overrides from "text.about.mission.{eyebrow,title,subtitle}", falling
  // back to whatever's passed in as props above when nothing's been set.
  contentKey,
}) {
  const ref = useRef(null);
  const settings = useSiteSettings();
  const resolvedEyebrow = contentKey ? pickText(settings, `text.${contentKey}.eyebrow`, eyebrow) : eyebrow;
  const resolvedTitle = contentKey ? pickText(settings, `text.${contentKey}.title`, title) : title;
  const resolvedSubtitle = contentKey ? pickText(settings, `text.${contentKey}.subtitle`, subtitle) : subtitle;

  // Tied directly to scroll position, not a viewport-enter/leave event — the
  // color eases in as the section scrolls up through view and back out as it
  // scrolls away, continuously, instead of snapping at a threshold.
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const progress = useTransform(scrollYProgress, [0, 0.35, 0.65, 1], [0, 1, 1, 0]);

  const ink = useTransform(progress, [0, 1], [DARK.ink, LIGHT.ink]);
  const white = useTransform(progress, [0, 1], [DARK.white, LIGHT.white]);
  const mist = useTransform(progress, [0, 1], [DARK.mist, LIGHT.mist]);
  const purple950 = useTransform(progress, [0, 1], [DARK.purple950, LIGHT.purple950]);
  const glassBg = useTransform(progress, [0, 1], [DARK.glassBg, LIGHT.glassBg]);
  const glassBorder = useTransform(progress, [0, 1], [DARK.glassBorder, LIGHT.glassBorder]);

  const lightStyle = light
    ? {
        "--color-rtg-ink": ink,
        "--color-rtg-white": white,
        "--color-rtg-mist": mist,
        "--color-rtg-purple-950": purple950,
        "--glass-bg": glassBg,
        "--glass-border": glassBorder,
        backgroundColor: ink,
        color: white,
      }
    : undefined;

  return (
    <motion.section
      id={id}
      ref={ref}
      style={lightStyle}
      className={`relative py-20 md:py-28 px-6 md:px-10 ${dark ? "bg-rtg-purple-950" : ""} ${className}`}
    >
      <div className="max-w-7xl mx-auto">
        {(resolvedEyebrow || resolvedTitle || resolvedSubtitle) && (
          <Reveal className={`mb-12 md:mb-16 ${center ? "text-center mx-auto max-w-3xl" : "max-w-2xl"}`}>
            {resolvedEyebrow && (
              <span className="inline-block text-rtg-orange-400 font-semibold tracking-[0.2em] uppercase text-xs md:text-sm mb-4">
                {resolvedEyebrow}
              </span>
            )}
            {resolvedTitle && (
              <h2 className="font-display text-rtg-white text-4xl md:text-6xl leading-[0.95] mb-4">{resolvedTitle}</h2>
            )}
            {resolvedSubtitle && <p className="text-rtg-mist text-base md:text-lg leading-relaxed">{resolvedSubtitle}</p>}
          </Reveal>
        )}
        {children}
      </div>
    </motion.section>
  );
}
