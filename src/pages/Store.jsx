import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Truck, RotateCcw, Percent, ArrowLeft, ArrowRight } from "lucide-react";
import { useProducts, useSiteImages, useSizeGuide, useMerchReviews, useSiteSettings, pickText } from "../lib/publicData";
import { shippingInfo } from "../data/content";
import { images as imageLib } from "../data/images";
import PageHero from "../components/ui/PageHero";
import Section from "../components/ui/Section";
import GlassCard from "../components/ui/GlassCard";
import ProductCard from "../components/ui/ProductCard";
import { StaggerGroup, StaggerItem } from "../components/ui/Reveal";
import Reveal from "../components/ui/Reveal";
import Newsletter from "../components/sections/Newsletter";

// Hero "featured drop" rotator — mirrors the reference's storeHeroCounterV2
// mechanic (counter, prev/next, auto-advancing progress bar) but is driven
// entirely by the real `products` list, capped to the first 3 so it reads
// as a curated "featured" set rather than inventing new data.
function FeaturedDropRotator({ products }) {
  const featured = useMemo(() => products.slice(0, 3), [products]);
  const [index, setIndex] = useState(0);
  const [cycleKey, setCycleKey] = useState(0);
  const count = featured.length;

  useEffect(() => {
    if (count < 2) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % count);
      setCycleKey((k) => k + 1);
    }, 5200);
    return () => clearInterval(id);
  }, [count]);

  if (count === 0) return null;

  const goTo = (next) => {
    setIndex(next);
    setCycleKey((k) => k + 1);
  };

  const current = featured[index];
  const counterLabel = `${String(index + 1).padStart(2, "0")} / ${String(count).padStart(2, "0")}`;

  return (
    <div className="relative glass rounded-[2rem] p-5 md:p-7 overflow-hidden max-w-xl mx-auto">
      <div className="flex items-center justify-between gap-4 text-xs font-bold uppercase tracking-[0.18em] text-rtg-mist mb-4">
        <span>Featured Drop</span>
        <b className="text-rtg-purple-600 font-display text-base tracking-normal">{counterLabel}</b>
      </div>

      {/* Orbit rings — decorative, purely motion. Sized to the photo circle
          only (not the text below it), so the rings never clip the name/price. */}
      <div className="relative w-44 h-44 md:w-52 md:h-52 mx-auto">
        <motion.span
          aria-hidden="true"
          className="absolute inset-0 rounded-full border border-rtg-purple-300/30"
          animate={{ rotate: 360 }}
          transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
        />
        <motion.span
          aria-hidden="true"
          className="absolute -inset-3 rounded-full border border-rtg-orange-300/30"
          animate={{ rotate: -360 }}
          transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, scale: 0.92, x: 30 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.92, x: -30 }}
            transition={{ duration: 0.55, ease: [0.18, 0.74, 0.18, 1] }}
            className="absolute inset-0"
          >
            <div className="w-36 h-36 md:w-44 md:h-44 mx-auto rounded-full overflow-hidden ring-1 ring-rtg-border shadow-xl">
              <img
                src={current.image || imageLib[current.imgKey] || imageLib.placeholder}
                alt={current.name}
                className="w-full h-full object-cover"
              />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.45, ease: [0.18, 0.74, 0.18, 1] }}
          className="text-center mt-5"
        >
          <Link to={`/merchandise/${current.id}`} className="block">
            {current.tag && (
              <span className="inline-block text-[10px] font-bold uppercase tracking-[0.15em] text-rtg-orange-500">
                {current.tag}
              </span>
            )}
            <p className="font-display text-xl md:text-2xl mt-1">{current.name}</p>
            <p className="text-rtg-orange-400 font-semibold text-sm mt-1">
              ₹{current.price.toLocaleString("en-IN")}
            </p>
          </Link>
        </motion.div>
      </AnimatePresence>

      {/* Controller: prev / progress / next */}
      <div className="grid grid-cols-[40px_1fr_40px] items-center gap-3 mt-5">
        <button
          type="button"
          onClick={() => goTo((index - 1 + count) % count)}
          aria-label="Previous featured product"
          className="w-10 h-10 rounded-full border border-rtg-border grid place-items-center text-rtg-purple-600 bg-white/70 hover:bg-white transition"
        >
          <ArrowLeft size={16} />
        </button>

        <div className="h-[3px] rounded-full bg-rtg-border overflow-hidden">
          <motion.span
            key={cycleKey}
            className="block h-full rounded-full bg-gradient-to-r from-rtg-orange-500 via-rtg-orange-400 to-rtg-purple-400"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 5.2, ease: "linear" }}
          />
        </div>

        <button
          type="button"
          onClick={() => goTo((index + 1) % count)}
          aria-label="Next featured product"
          className="w-10 h-10 rounded-full border border-rtg-border grid place-items-center text-rtg-purple-600 bg-white/70 hover:bg-white transition"
        >
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

export default function Merchandise() {
  const images = useSiteImages();
  const products = useProducts();
  const sizeGuide = useSizeGuide();
  const merchReviews = useMerchReviews();
  const settings = useSiteSettings();
  const memberDiscount = pickText(settings, "text.merch.memberDiscount", shippingInfo.memberDiscount);
  const shipping = pickText(settings, "text.merch.shipping", shippingInfo.shipping);
  const returns = pickText(settings, "text.merch.returns", shippingInfo.returns);
  return (
    <>
      <PageHero
        image={images.merchHero}
        eyebrow="RTG Store"
        title="Gear That Earns Every Mile"
        subtitle="Premium kit designed for the road, the trail, and everywhere in between."
      />

      {/* Featured-drop rotator — sits as its own tight band right under the
          hero, echoing the reference's storeHeroCounterV2 stage. */}
      <section className="relative isolate overflow-hidden bg-rtg-ink px-6 md:px-10 py-14 md:py-20">
        <Reveal direction="scale">
          <FeaturedDropRotator products={products} />
        </Reveal>
      </section>

      <Section contentKey="merch.hero" eyebrow="Shop" title="All Merchandise" subtitle="Free community pride, premium quality — order yours today.">
        <StaggerGroup className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((p) => (
            <StaggerItem key={p.id}>
              <ProductCard product={p} />
            </StaggerItem>
          ))}
        </StaggerGroup>
      </Section>

      <Section contentKey="merch.perks" dark eyebrow="Member Perks" title="Members Save 10%">
        <Reveal direction="scale" className="max-w-2xl mx-auto text-center glass rounded-3xl p-8 md:p-10">
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            className="inline-flex"
          >
            <Percent className="text-rtg-orange-400 mx-auto mb-3" size={30} />
          </motion.div>
          <p className="text-rtg-mist leading-relaxed">{memberDiscount}</p>
        </Reveal>
      </Section>

      <Section contentKey="merch.sizeChart" eyebrow="Fit Guide" title="Size Chart">
        <Reveal className="max-w-2xl mx-auto overflow-x-auto rounded-2xl border border-rtg-border glass">
          <table className="w-full text-sm text-center">
            <thead>
              <tr className="border-b border-rtg-border text-xs uppercase tracking-wide text-rtg-mist">
                <th className="px-4 py-3 font-semibold">Size</th>
                <th className="px-4 py-3 font-semibold">Chest</th>
                <th className="px-4 py-3 font-semibold">Length</th>
              </tr>
            </thead>
            <tbody>
              {sizeGuide.map((s, i) => (
                <motion.tr
                  key={s.size}
                  className="border-b border-rtg-border last:border-0"
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.45, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                >
                  <td className="px-4 py-3 font-semibold text-rtg-orange-400">{s.size}</td>
                  <td className="px-4 py-3 text-rtg-white/90">{s.chest}</td>
                  <td className="px-4 py-3 text-rtg-white/90">{s.length}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </Reveal>
      </Section>

      <Section contentKey="merch.reviews" dark eyebrow="Athlete Reviews" title="What Riders Say About Our Gear">
        <StaggerGroup className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {merchReviews.map((r) => (
            <StaggerItem key={r.name}>
              <GlassCard className="h-full">
                <div className="flex items-center gap-1 mb-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <motion.span
                      key={i}
                      initial={{ opacity: 0, scale: 0.5 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: i * 0.07 }}
                    >
                      <Star
                        size={14}
                        className={i < r.rating ? "text-rtg-orange-400 fill-rtg-orange-400" : "text-rtg-purple-950/15"}
                      />
                    </motion.span>
                  ))}
                </div>
                <p className="text-rtg-mist text-sm leading-relaxed mb-4">"{r.quote}"</p>
                <p className="text-sm font-semibold">{r.name}</p>
                <p className="text-xs text-rtg-mist">{r.product}</p>
              </GlassCard>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </Section>

      <Section>
        <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <Reveal>
            <GlassCard className="h-full">
              <Truck className="text-rtg-orange-400 mb-3" size={26} />
              <h3 className="font-display text-xl mb-2">Shipping</h3>
              <p className="text-rtg-mist text-sm leading-relaxed">{shipping}</p>
            </GlassCard>
          </Reveal>
          <Reveal delay={0.05}>
            <GlassCard className="h-full">
              <RotateCcw className="text-rtg-orange-400 mb-3" size={26} />
              <h3 className="font-display text-xl mb-2">Returns</h3>
              <p className="text-rtg-mist text-sm leading-relaxed">{returns}</p>
            </GlassCard>
          </Reveal>
        </div>
      </Section>

      <Newsletter />
    </>
  );
}
