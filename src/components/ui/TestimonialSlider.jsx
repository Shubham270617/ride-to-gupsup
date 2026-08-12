import { useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { images } from "../../data/images";

export default function TestimonialSlider({ items, autoPlay = true, interval = 6000 }) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  const go = useCallback(
    (dir) => {
      setDirection(dir);
      setIndex((i) => (i + dir + items.length) % items.length);
    },
    [items.length]
  );

  useEffect(() => {
    if (!autoPlay) return;
    const t = setInterval(() => go(1), interval);
    return () => clearInterval(t);
  }, [go, autoPlay, interval]);

  const t = items[index];

  return (
    <div className="relative max-w-3xl mx-auto">
      <div className="glass rounded-3xl p-8 md:p-14 text-center min-h-[320px] flex flex-col items-center justify-center overflow-hidden relative">
        <Quote className="text-rtg-orange-500/30 mb-4" size={48} />
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={index}
            custom={direction}
            initial={{ opacity: 0, x: 60 * direction }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 * direction }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center"
          >
            <p className="text-lg md:text-2xl font-medium leading-relaxed mb-8 text-rtg-white">"{t.quote}"</p>
            <img
              src={t.image || images[t.avatarKey]}
              alt={t.name}
              className="w-14 h-14 rounded-full object-cover border-2 border-rtg-orange-400 mb-3"
            />
            <p className="font-semibold text-rtg-white">{t.name}</p>
            <p className="text-sm text-rtg-mist">{t.role}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-center gap-4 mt-8">
        <button
          onClick={() => go(-1)}
          className="w-11 h-11 rounded-full glass flex items-center justify-center hover:text-rtg-orange-400 hover:border-rtg-orange-400/60 transition-colors"
          aria-label="Previous testimonial"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex gap-2">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setDirection(i > index ? 1 : -1);
                setIndex(i);
              }}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === index ? "w-8 bg-rtg-orange-500" : "w-2 bg-white/25"
              }`}
              aria-label={`Go to testimonial ${i + 1}`}
            />
          ))}
        </div>
        <button
          onClick={() => go(1)}
          className="w-11 h-11 rounded-full glass flex items-center justify-center hover:text-rtg-orange-400 hover:border-rtg-orange-400/60 transition-colors"
          aria-label="Next testimonial"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
