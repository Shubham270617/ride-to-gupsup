import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { useGalleryItems, useSiteImages } from "../lib/publicData";
import PageHero from "../components/ui/PageHero";
import Section from "../components/ui/Section";
import MasonryGallery from "../components/ui/MasonryGallery";

const categories = ["All", "Cycling", "Running", "Swimming", "Events", "Volunteers", "Videos"];

export default function Gallery() {
  const images = useSiteImages();
  const [active, setActive] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const galleryItems = useGalleryItems();

  const gallery = galleryItems.filter((item) => {
    if (categoryFilter === "All") return true;
    if (categoryFilter === "Videos") return item.type === "video";
    return item.category === categoryFilter;
  });

  const selectCategory = (c) => {
    setCategoryFilter(c);
    setActive(null);
  };

  const close = () => setActive(null);
  const next = (e) => {
    e?.stopPropagation();
    setActive((i) => (i + 1) % gallery.length);
  };
  const prev = (e) => {
    e?.stopPropagation();
    setActive((i) => (i - 1 + gallery.length) % gallery.length);
  };

  return (
    <>
      <PageHero
        image={galleryItems[4]?.url || images.gallery[4]}
        eyebrow="Captured Moments"
        title="Community Gallery"
        subtitle="Sunrise starts, medal ceremonies, finish line joy, and everything in between — from drone footage to phone snaps at the chai stop."
      />

      <Section>
        <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => selectCategory(c)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                categoryFilter === c ? "bg-rtg-orange-500 text-rtg-ink" : "glass text-rtg-white/75 hover:text-rtg-white"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {gallery.length === 0 ? (
          <p className="text-center text-rtg-mist py-16">No {categoryFilter.toLowerCase()} moments yet — check back soon.</p>
        ) : (
          <MasonryGallery items={gallery} onSelect={setActive} />
        )}
      </Section>

      <AnimatePresence>
        {active !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 md:p-10"
            onClick={close}
          >
            <button className="absolute top-6 right-6 text-white/80 hover:text-rtg-orange-400" onClick={close} aria-label="Close">
              <X size={32} />
            </button>
            <button
              className="absolute left-4 md:left-8 text-white/80 hover:text-rtg-orange-400"
              onClick={prev}
              aria-label="Previous image"
            >
              <ChevronLeft size={36} />
            </button>
            {gallery[active]?.type === "video" ? (
              <motion.video
                key={active}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25 }}
                src={gallery[active]?.url}
                className="max-h-[85vh] max-w-full rounded-2xl object-contain"
                controls
                autoPlay
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <motion.img
                key={active}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25 }}
                src={gallery[active]?.url}
                alt="RTG gallery moment"
                className="max-h-[85vh] max-w-full rounded-2xl object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            )}
            <button
              className="absolute right-4 md:right-8 text-white/80 hover:text-rtg-orange-400"
              onClick={next}
              aria-label="Next image"
            >
              <ChevronRight size={36} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
