import { motion } from "framer-motion";

// A circular photo collage where the inner grid of photos slowly rotates
// like a wheel, while the outer ring frame stays fixed — the outer circle
// never moves, only the photos inside it do.
export default function RotatingPhotoWheel({ photos = [] }) {
  const stillImages = photos.filter((p) => p.type !== "video").map((p) => p.url);
  const images = stillImages.slice(0, 9);
  // Repeat if we don't have enough real photos yet so the wheel never looks sparse.
  while (images.length > 0 && images.length < 9) {
    images.push(stillImages[images.length % stillImages.length]);
  }

  return (
    <div className="relative w-full max-w-md mx-auto aspect-square">
      {/* Outer ring — fixed, never rotates */}
      <div className="absolute -inset-3 rounded-full border-2 border-dashed border-rtg-orange-400/30 pointer-events-none" />
      <div className="absolute inset-0 rounded-full border border-white/15 pointer-events-none z-10" />

      {/* Inner photo wheel — this is what rotates */}
      <div className="absolute inset-0 rounded-full overflow-hidden">
        {images.length > 0 ? (
          <motion.div
            className="grid grid-cols-3 gap-1 w-[150%] h-[150%] -translate-x-[16.5%] -translate-y-[16.5%]"
            animate={{ rotate: 360 }}
            transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
          >
            {images.map((src, i) => (
              <div key={i} className="aspect-square overflow-hidden">
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
