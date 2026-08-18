import { motion } from "framer-motion";

// A circular photo frame: the outer ring spins continuously (the "effect"),
// while the photos themselves don't rotate at all — they sit in a
// horizontal filmstrip that slides left-to-right behind the circular
// window, so what's visible is always upright, just continuously panning.
export default function RotatingPhotoWheel({ photos = [] }) {
  const stillImages = photos.filter((p) => p.type !== "video").map((p) => p.url);
  const images = stillImages.slice(0, 8);
  while (images.length > 0 && images.length < 4) {
    images.push(stillImages[images.length % stillImages.length]);
  }
  // Duplicated so the strip can loop seamlessly from "-50%" back to "0%".
  const strip = [...images, ...images];

  return (
    <div className="relative w-full max-w-md mx-auto aspect-square">
      {/* Outer rings — these are what rotate, not the photos */}
      <motion.div
        className="absolute -inset-3 rounded-full border-2 border-dashed border-rtg-orange-400/30 pointer-events-none"
        animate={{ rotate: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
      />
      <div className="absolute inset-0 rounded-full border border-white/15 pointer-events-none z-10" />

      {/* Photo filmstrip — slides left-to-right on a loop, images stay upright */}
      <div className="absolute inset-0 rounded-full overflow-hidden">
        {images.length > 0 ? (
          <motion.div
            className="flex h-full"
            style={{ width: `${strip.length * 100}%` }}
            animate={{ x: [`-${(images.length / strip.length) * 100}%`, "0%"] }}
            transition={{ duration: images.length * 6, repeat: Infinity, ease: "linear" }}
          >
            {strip.map((src, i) => (
              <div key={i} className="h-full shrink-0" style={{ width: `${100 / strip.length}%` }}>
                <img src={src} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </motion.div>
        ) : (
          <div className="w-full h-full bg-white/5" />
        )}
      </div>
    </div>
  );
}
