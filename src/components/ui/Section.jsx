import { useEffect, useState } from "react";
import { motion, useAnimationControls } from "framer-motion";
import Reveal from "./Reveal";

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
}) {
  // Scroll-linked theme flip: the section smoothly turns to a light
  // background as it scrolls into view, and back to dark on the way out
  // (not `once: true` — this is meant to happen both directions, unlike
  // the entrance animations elsewhere on the site).
  const [lit, setLit] = useState(false);

  // A soft blur pulse plays exactly when the theme flips, so the color
  // change reads as coming into focus rather than an abrupt flat swap.
  // useAnimationControls + useEffect (rather than putting the keyframe
  // array straight on `animate`) means this only fires on an actual `lit`
  // change, not on every unrelated re-render.
  const controls = useAnimationControls();
  useEffect(() => {
    controls.start({
      filter: ["blur(0px)", "blur(10px)", "blur(0px)"],
      transition: { duration: 0.9, ease: "easeInOut" },
    });
  }, [lit, controls]);

  return (
    <motion.section
      id={id}
      animate={controls}
      onViewportEnter={() => light && setLit(true)}
      onViewportLeave={() => light && setLit(false)}
      viewport={{ margin: "-35% 0px -35% 0px" }}
      className={`relative py-20 md:py-28 px-6 md:px-10 ${dark ? "bg-rtg-purple-950" : ""} ${light && lit ? "theme-light" : ""} ${className}`}
    >
      <div className="max-w-7xl mx-auto">
        {(eyebrow || title || subtitle) && (
          <Reveal className={`mb-12 md:mb-16 ${center ? "text-center mx-auto max-w-3xl" : "max-w-2xl"}`}>
            {eyebrow && (
              <span className="inline-block text-rtg-orange-400 font-semibold tracking-[0.2em] uppercase text-xs md:text-sm mb-4">
                {eyebrow}
              </span>
            )}
            {title && (
              <h2 className="font-display text-rtg-white text-4xl md:text-6xl leading-[0.95] mb-4">{title}</h2>
            )}
            {subtitle && <p className="text-rtg-mist text-base md:text-lg leading-relaxed">{subtitle}</p>}
          </Reveal>
        )}
        {children}
      </div>
    </motion.section>
  );
}
