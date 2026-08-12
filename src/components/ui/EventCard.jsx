import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, Calendar, Tag } from "lucide-react";
import { images } from "../../data/images";
import { formatPrize } from "../../lib/format";
import GlassCard from "./GlassCard";

export default function EventCard({ event, featured = false }) {
  const img = event.image || images[event.imgKey];
  const to = `/events/${event.slug || event.id}`;

  if (featured) {
    return (
      <Link to={to} className="block">
        <motion.div
          className="relative rounded-3xl overflow-hidden group cursor-pointer"
          whileHover="hover"
          initial="rest"
        >
          <motion.img
            src={img}
            alt={event.title}
            className="w-full h-[420px] md:h-[520px] object-cover"
            variants={{ rest: { scale: 1 }, hover: { scale: 1.06 } }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-rtg-ink via-rtg-ink/50 to-transparent" />
          <div className="absolute top-6 left-6 flex gap-2">
            {event.categories.map((c) => (
              <span key={c} className="glass px-3 py-1.5 rounded-full text-xs font-semibold text-rtg-orange-300">
                {c}
              </span>
            ))}
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
            <span className="inline-block bg-rtg-orange-500 text-rtg-ink text-xs font-bold px-3 py-1.5 rounded-full mb-4 tracking-wide uppercase">
              Featured Event
            </span>
            <h3 className="font-display text-4xl md:text-6xl mb-3 leading-none">{event.title}</h3>
            <p className="text-rtg-mist mb-2 text-sm md:text-base">{event.type}</p>
            <div className="flex flex-wrap items-center gap-4 mt-4">
              <span className="flex items-center gap-2 text-sm text-rtg-white/90"><Calendar size={16} /> {event.date}</span>
              {formatPrize(event.prize) && (
                <span className="flex items-center gap-2 text-sm font-semibold text-rtg-orange-300"><Tag size={16} /> {formatPrize(event.prize)}</span>
              )}
            </div>
          </div>
        </motion.div>
      </Link>
    );
  }

  return (
    <Link to={to} className="block h-full">
      <GlassCard className="p-0 overflow-hidden group cursor-pointer h-full" hover>
        <div className="relative overflow-hidden h-52">
          <motion.img
            src={img}
            alt={event.title}
            className="w-full h-full object-cover"
            whileHover={{ scale: 1.1 }}
            transition={{ duration: 0.5 }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-rtg-purple-950/90 to-transparent" />
          <span className="absolute top-4 left-4 glass px-3 py-1 rounded-full text-xs font-semibold text-rtg-orange-300">
            {event.categories[0]}
          </span>
        </div>
        <div className="p-6">
          <p className="text-xs text-rtg-orange-400 font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Calendar size={13} /> {event.date}
          </p>
          <h3 className="font-display text-2xl mb-2 leading-tight">{event.title}</h3>
          <p className="text-rtg-mist text-sm leading-relaxed mb-4">{event.desc}</p>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-rtg-white group-hover:text-rtg-orange-400 transition-colors">
            Learn more <ArrowUpRight size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </span>
        </div>
      </GlassCard>
    </Link>
  );
}
