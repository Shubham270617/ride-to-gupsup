import { motion } from "framer-motion";
import { heroSrcSet, heroFallbackSrc } from "../../lib/responsiveImage";

export default function PageHero({ image, eyebrow, title, subtitle, height = "h-[60vh] md:h-[70vh]" }) {
  return (
    <section className={`relative ${height} min-h-[420px] flex items-end overflow-hidden`}>
      <motion.div
        className="absolute inset-0"
        initial={{ scale: 1.15 }}
        animate={{ scale: 1 }}
        transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <img
          src={heroFallbackSrc(image)}
          srcSet={heroSrcSet(image)}
          sizes="100vw"
          alt={title}
          className="w-full h-full object-cover"
        />
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-t from-rtg-ink via-rtg-ink/60 to-rtg-ink/20" />
      <div className="absolute inset-0 bg-gradient-to-r from-rtg-purple-950/70 via-transparent to-transparent" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 pb-14 md:pb-20 w-full">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          {eyebrow && (
            <span className="inline-block text-rtg-orange-400 font-semibold tracking-[0.2em] uppercase text-xs md:text-sm mb-4">
              {eyebrow}
            </span>
          )}
          <h1 className="font-display text-5xl md:text-8xl leading-[0.92] mb-4 max-w-4xl">{title}</h1>
          {subtitle && <p className="text-rtg-mist text-base md:text-xl max-w-2xl leading-relaxed">{subtitle}</p>}
        </motion.div>
      </div>
    </section>
  );
}
