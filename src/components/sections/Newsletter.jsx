import { useState } from "react";
import { motion } from "framer-motion";
import { Send, CheckCircle2 } from "lucide-react";
import Reveal from "../ui/Reveal";
import Section from "../ui/Section";

// `dark` lets a page override the default light background when this
// section needs to continue that page's own light/dark alternation
// differently (see Home.jsx, where an extra section above it shifted the
// whole sequence's parity).
export default function Newsletter({ dark = false }) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
  };

  return (
    <Section light={!dark} dark={dark}>
      <Reveal className="max-w-4xl mx-auto glass rounded-3xl p-10 md:p-16 text-center relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-rtg-orange-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-rtg-purple-500/30 rounded-full blur-3xl" />
        <div className="relative z-10">
          <h2 className="font-display text-3xl md:text-5xl mb-3">Never Miss a Ride</h2>
          <p className="text-rtg-mist mb-8 max-w-md mx-auto">
            Get event announcements, training tips, and community stories straight to your inbox.
          </p>

          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center justify-center gap-2 text-rtg-orange-400 font-semibold"
            >
              <CheckCircle2 size={22} /> You're on the list — see you out there!
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="flex-1 rounded-full bg-white/5 border border-white/15 px-5 py-3.5 text-sm text-rtg-white placeholder:text-rtg-mist focus:outline-none focus:border-rtg-orange-400 transition-colors"
              />
              <motion.button
                type="submit"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.96 }}
                className="rounded-full bg-rtg-orange-500 text-rtg-ink font-semibold px-6 py-3.5 flex items-center justify-center gap-2 hover:bg-rtg-orange-400 transition-colors"
              >
                Subscribe <Send size={16} />
              </motion.button>
            </form>
          )}
        </div>
      </Reveal>
    </Section>
  );
}
