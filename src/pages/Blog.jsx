import { useBlogPosts, useSiteImages } from "../lib/publicData";
import PageHero from "../components/ui/PageHero";
import Section from "../components/ui/Section";
import GlassCard from "../components/ui/GlassCard";
import { StaggerGroup, StaggerItem } from "../components/ui/Reveal";
import { ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";

export default function Blog() {
  const images = useSiteImages();
  const blogPosts = useBlogPosts();
  return (
    <>
      <PageHero
        image={images.blogHero}
        eyebrow="Learn & Grow"
        title="The RTG Journal"
        subtitle="Tips, guides, and stories to help you train smarter and go further."
      />

      <Section contentKey="blog.hero" eyebrow="Latest" title="From the Journal">
        <StaggerGroup className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {blogPosts.map((p) => (
            <StaggerItem key={p.id}>
              <GlassCard className="p-0 overflow-hidden h-full group cursor-pointer" hover>
                <div className="h-52 overflow-hidden">
                  <motion.img
                    src={p.image || images[p.imgKey]}
                    alt={p.title}
                    className="w-full h-full object-cover"
                    whileHover={{ scale: 1.1 }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <div className="p-6">
                  <span className="text-xs uppercase tracking-widest text-rtg-orange-400 font-semibold">{p.category}</span>
                  <h3 className="font-display text-2xl my-2 leading-tight">{p.title}</h3>
                  <p className="text-rtg-mist text-sm leading-relaxed mb-4">{p.excerpt}</p>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold group-hover:text-rtg-orange-400 transition-colors">
                    Read more <ArrowUpRight size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </span>
                </div>
              </GlassCard>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </Section>
    </>
  );
}
