import { motion } from "framer-motion";

const spans = ["row-span-2", "row-span-1", "row-span-1", "row-span-2", "row-span-1", "row-span-1"];

export default function MasonryGallery({ items, onSelect }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 auto-rows-[160px] md:auto-rows-[200px] gap-3 md:gap-4">
      {items.map((src, i) => (
        <motion.button
          key={i}
          onClick={() => onSelect?.(i)}
          className={`relative rounded-2xl overflow-hidden group ${spans[i % spans.length]}`}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, delay: (i % 8) * 0.06, ease: [0.22, 1, 0.36, 1] }}
        >
          <img
            src={src}
            alt={`RTG community moment ${i + 1}`}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </motion.button>
      ))}
    </div>
  );
}
