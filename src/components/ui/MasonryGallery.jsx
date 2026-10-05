import { motion } from "framer-motion";

const spans = ["row-span-2", "row-span-1", "row-span-1", "row-span-2", "row-span-1", "row-span-1"];

// items: array of URL strings (legacy) or { url, type: "image" | "video",
// caption?, category? } objects.
function normalize(item) {
  return typeof item === "string" ? { url: item, type: "image" } : item;
}

export default function MasonryGallery({ items, onSelect }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 auto-rows-[160px] md:auto-rows-[200px] gap-3 md:gap-4">
      {items.map((raw, i) => {
        const { url, type, caption, category } = normalize(raw);
        // Caption takes priority (admin-entered, specific to the photo);
        // falls back to category so items without a caption still get a
        // label, matching the reference's always-visible bottom-left tag.
        const label = caption || category;
        return (
          <motion.button
            key={i}
            onClick={() => onSelect?.(i)}
            className={`relative rounded-2xl overflow-hidden group ${spans[i % spans.length]}`}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: (i % 8) * 0.06, ease: [0.22, 1, 0.36, 1] }}
          >
            {type === "video" ? (
              <video
                src={url}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                muted
                loop
                autoPlay
                playsInline
              />
            ) : (
              <img
                src={url}
                alt={label ? `RTG — ${label}` : `RTG community moment ${i + 1}`}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            )}
            {/* Permanent bottom gradient (not hover-only) so the label stays
                readable at rest, matching the reference — hover just adds a
                bit more depth on top of it. */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent group-hover:from-black/70 transition-colors" />
            {label && (
              <span className="absolute left-3 bottom-2.5 text-white text-[10px] font-bold uppercase tracking-wide drop-shadow">
                {label}
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
