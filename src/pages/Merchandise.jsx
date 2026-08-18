import { Star, Truck, RotateCcw, Percent } from "lucide-react";
import { useProducts, useSiteImages } from "../lib/publicData";
import { sizeGuide, merchReviews, shippingInfo } from "../data/content";
import PageHero from "../components/ui/PageHero";
import Section from "../components/ui/Section";
import GlassCard from "../components/ui/GlassCard";
import ProductCard from "../components/ui/ProductCard";
import { StaggerGroup, StaggerItem } from "../components/ui/Reveal";
import Reveal from "../components/ui/Reveal";
import Newsletter from "../components/sections/Newsletter";

export default function Merchandise() {
  const images = useSiteImages();
  const products = useProducts();
  return (
    <>
      <PageHero
        image={images.merchHero}
        eyebrow="RTG Store"
        title="Gear That Earns Every Mile"
        subtitle="Premium kit designed for the road, the trail, and everywhere in between."
      />

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
        <Reveal className="max-w-2xl mx-auto text-center glass rounded-3xl p-8 md:p-10">
          <Percent className="text-rtg-orange-400 mx-auto mb-3" size={30} />
          <p className="text-rtg-mist leading-relaxed">{shippingInfo.memberDiscount}</p>
        </Reveal>
      </Section>

      <Section contentKey="merch.sizeChart" eyebrow="Fit Guide" title="Size Chart">
        <Reveal className="max-w-2xl mx-auto overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-sm text-center">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-rtg-mist">
                <th className="px-4 py-3 font-semibold">Size</th>
                <th className="px-4 py-3 font-semibold">Chest</th>
                <th className="px-4 py-3 font-semibold">Length</th>
              </tr>
            </thead>
            <tbody>
              {sizeGuide.map((s) => (
                <tr key={s.size} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3 font-semibold text-rtg-orange-400">{s.size}</td>
                  <td className="px-4 py-3 text-rtg-white/90">{s.chest}</td>
                  <td className="px-4 py-3 text-rtg-white/90">{s.length}</td>
                </tr>
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
                    <Star
                      key={i}
                      size={14}
                      className={i < r.rating ? "text-rtg-orange-400 fill-rtg-orange-400" : "text-white/20"}
                    />
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
              <p className="text-rtg-mist text-sm leading-relaxed">{shippingInfo.shipping}</p>
            </GlassCard>
          </Reveal>
          <Reveal delay={0.05}>
            <GlassCard className="h-full">
              <RotateCcw className="text-rtg-orange-400 mb-3" size={26} />
              <h3 className="font-display text-xl mb-2">Returns</h3>
              <p className="text-rtg-mist text-sm leading-relaxed">{shippingInfo.returns}</p>
            </GlassCard>
          </Reveal>
        </div>
      </Section>

      <Newsletter />
    </>
  );
}
