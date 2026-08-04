import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Phone, MapPin, Send, CheckCircle2 } from "lucide-react";
import { images } from "../data/images";
import { brand } from "../data/content";
import PageHero from "../components/ui/PageHero";
import Section from "../components/ui/Section";
import GlassCard from "../components/ui/GlassCard";
import Reveal from "../components/ui/Reveal";
import { InstagramIcon, FacebookIcon, YoutubeIcon, StravaIcon } from "../components/ui/SocialIcons";

const socials = [
  { platform: "instagram", icon: InstagramIcon, ...brand.social.instagram },
  { platform: "facebook", icon: FacebookIcon, ...brand.social.facebook },
  { platform: "youtube", icon: YoutubeIcon, ...brand.social.youtube },
  { platform: "strava", icon: StravaIcon, ...brand.social.strava },
];

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sent, setSent] = useState(false);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const handleSubmit = (e) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <>
      <PageHero
        image={images.contactHero}
        eyebrow="Say Hello"
        title="Get in Touch"
        subtitle="Questions about joining, events, volunteering, or partnerships? We'd love to hear from you."
        height="h-[45vh] md:h-[50vh]"
      />

      <Section>
        <div className="grid lg:grid-cols-5 gap-10">
          <Reveal direction="right" className="lg:col-span-3">
            <GlassCard>
              <h3 className="font-display text-3xl mb-6">Send a Message</h3>
              {sent ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center text-center py-16 gap-3"
                >
                  <CheckCircle2 className="text-rtg-orange-400" size={48} />
                  <p className="font-display text-2xl">Message Sent!</p>
                  <p className="text-rtg-mist">We'll get back to you within 1–2 business days.</p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <input
                      required
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Your Name"
                      className="rounded-xl bg-white/5 border border-white/15 px-4 py-3.5 text-sm focus:outline-none focus:border-rtg-orange-400 transition-colors"
                    />
                    <input
                      required
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="Your Email"
                      className="rounded-xl bg-white/5 border border-white/15 px-4 py-3.5 text-sm focus:outline-none focus:border-rtg-orange-400 transition-colors"
                    />
                  </div>
                  <textarea
                    required
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    rows={6}
                    placeholder="How can we help?"
                    className="w-full rounded-xl bg-white/5 border border-white/15 px-4 py-3.5 text-sm focus:outline-none focus:border-rtg-orange-400 transition-colors resize-none"
                  />
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full rounded-full bg-rtg-orange-500 text-rtg-ink font-semibold px-6 py-4 flex items-center justify-center gap-2 hover:bg-rtg-orange-400 transition-colors"
                  >
                    Send Message <Send size={16} />
                  </motion.button>
                </form>
              )}
            </GlassCard>
          </Reveal>

          <Reveal direction="left" delay={0.1} className="lg:col-span-2 space-y-6">
            <GlassCard>
              <ul className="space-y-5">
                <li className="flex items-start gap-3">
                  <Mail className="text-rtg-orange-400 shrink-0 mt-0.5" size={20} />
                  <div>
                    <p className="text-xs uppercase tracking-widest text-rtg-mist">Email</p>
                    <p className="font-medium">{brand.email}</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Phone className="text-rtg-orange-400 shrink-0 mt-0.5" size={20} />
                  <div>
                    <p className="text-xs uppercase tracking-widest text-rtg-mist">Phone</p>
                    <p className="font-medium">{brand.phone}</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <MapPin className="text-rtg-orange-400 shrink-0 mt-0.5" size={20} />
                  <div>
                    <p className="text-xs uppercase tracking-widest text-rtg-mist">Based In</p>
                    <p className="font-medium">{brand.cities.join(", ")}</p>
                  </div>
                </li>
              </ul>
              <div className="flex gap-3 mt-6 pt-6 border-t border-white/10">
                {socials.map((s) => (
                  <a
                    key={s.platform}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:text-rtg-orange-400 hover:bg-white/10 transition-colors"
                    aria-label={s.handle}
                  >
                    <s.icon size={18} />
                  </a>
                ))}
              </div>
            </GlassCard>

            <div className="rounded-3xl overflow-hidden h-64">
              <iframe
                title="RTG Location Map"
                src="https://www.google.com/maps?q=Nehru+Park+Delhi&output=embed"
                className="w-full h-full border-0 grayscale invert-[0.92] contrast-[1.1]"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </Reveal>
        </div>
      </Section>
    </>
  );
}
