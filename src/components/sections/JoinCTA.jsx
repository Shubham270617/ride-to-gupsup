import { motion } from "framer-motion";
import { images } from "../../data/images";
import Reveal from "../ui/Reveal";
import Button from "../ui/Button";

export default function JoinCTA() {
  return (
    <section className="relative py-28 md:py-40 px-6 md:px-10 overflow-hidden">
      <motion.div
        className="absolute inset-0"
        initial={{ scale: 1.1 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
      >
        <img src={images.homeCTA} alt="RTG adventure" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-rtg-ink/85 via-rtg-purple-950/80 to-rtg-ink/90" />
      </motion.div>

      <div className="relative z-10 max-w-4xl mx-auto text-center">
        <Reveal>
          <span className="inline-block text-rtg-orange-400 font-semibold tracking-[0.2em] uppercase text-xs md:text-sm mb-5">
            Your Next Chapter Starts Here
          </span>
          <h2 className="font-display text-5xl md:text-8xl leading-[0.92] mb-6">
            Join the <span className="text-gradient">Movement</span>
          </h2>
          <p className="text-rtg-mist text-base md:text-xl max-w-xl mx-auto mb-10">
            500+ athletes across India are already riding, running, and growing together. Your seat at the chai stop is waiting.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button to="/community" size="lg">Join Community</Button>
            <Button to="/events" variant="outline" size="lg">Explore Events</Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
