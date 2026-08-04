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
}) {
  return (
    <section id={id} className={`relative py-20 md:py-28 px-6 md:px-10 ${dark ? "bg-rtg-purple-950" : ""} ${className}`}>
      <div className="max-w-7xl mx-auto">
        {(eyebrow || title || subtitle) && (
          <Reveal className={`mb-12 md:mb-16 ${center ? "text-center mx-auto max-w-3xl" : "max-w-2xl"}`}>
            {eyebrow && (
              <span className="inline-block text-rtg-orange-400 font-semibold tracking-[0.2em] uppercase text-xs md:text-sm mb-4">
                {eyebrow}
              </span>
            )}
            {title && (
              <h2 className="font-display text-4xl md:text-6xl leading-[0.95] mb-4">{title}</h2>
            )}
            {subtitle && <p className="text-rtg-mist text-base md:text-lg leading-relaxed">{subtitle}</p>}
          </Reveal>
        )}
        {children}
      </div>
    </section>
  );
}
