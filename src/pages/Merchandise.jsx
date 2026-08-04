import { images } from "../data/images";
import { products } from "../data/content";
import PageHero from "../components/ui/PageHero";
import Section from "../components/ui/Section";
import ProductCard from "../components/ui/ProductCard";
import { StaggerGroup, StaggerItem } from "../components/ui/Reveal";
import Newsletter from "../components/sections/Newsletter";

export default function Merchandise() {
  return (
    <>
      <PageHero
        image={images.merchHero}
        eyebrow="RTG Store"
        title="Gear That Earns Every Mile"
        subtitle="Premium kit designed for the road, the trail, and everywhere in between."
      />

      <Section eyebrow="Shop" title="All Merchandise" subtitle="Free community pride, premium quality — order yours today.">
        <StaggerGroup className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((p) => (
            <StaggerItem key={p.id}>
              <ProductCard product={p} />
            </StaggerItem>
          ))}
        </StaggerGroup>
      </Section>

      <Newsletter />
    </>
  );
}
