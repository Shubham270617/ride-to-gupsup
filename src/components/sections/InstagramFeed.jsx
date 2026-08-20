import { InstagramIcon } from "../ui/SocialIcons";
import { images } from "../../data/images";
import { brand, instagramPlaceholderCount } from "../../data/content";
import { useSiteSettings, pickText } from "../../lib/publicData";
import Section from "../ui/Section";
import { StaggerGroup, StaggerItem } from "../ui/Reveal";

const EMBED_KEY = "integration.instagram_embed_url";

export default function InstagramFeed() {
  const settings = useSiteSettings();
  const embedUrl = pickText(settings, EMBED_KEY, "");
  const posts = Array.from({ length: instagramPlaceholderCount }, (_, i) => images.gallery[i % images.gallery.length]);

  return (
    <Section
      eyebrow="Follow Along"
      title={
        <>
          @{brand.social.instagram.handle} <span className="text-gradient">on Instagram</span>
        </>
      }
      subtitle="Real moments from real rides, runs, and finish lines."
    >
      {embedUrl ? (
        // A real, auto-updating feed from a free Instagram embed widget (see
        // admin Site Content > Home > Instagram Feed for setup) — swaps in
        // once that's configured, instead of the placeholder grid below.
        <div className="rounded-2xl overflow-hidden">
          <iframe
            src={embedUrl}
            title="Instagram feed"
            className="w-full border-0"
            style={{ minHeight: 420 }}
            loading="lazy"
          />
        </div>
      ) : (
        <StaggerGroup className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {posts.map((src, i) => (
            <StaggerItem key={i}>
              <a
                href={brand.social.instagram.url}
                target="_blank"
                rel="noopener noreferrer"
                className="relative block aspect-square rounded-2xl overflow-hidden group"
              >
                <img src={src} alt="RTG Instagram post" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                <div className="absolute inset-0 bg-rtg-purple-950/0 group-hover:bg-rtg-purple-950/50 transition-colors flex items-center justify-center text-rtg-white opacity-0 group-hover:opacity-100">
                  <InstagramIcon size={28} />
                </div>
              </a>
            </StaggerItem>
          ))}
        </StaggerGroup>
      )}
    </Section>
  );
}
