import { useMemo } from "react";
import { Link } from "react-router-dom";
import { buildHomeGalleryCopy, useGalleryItems } from "../../lib/publicData";
import Reveal from "../ui/Reveal";

// The tile layout on a 12-column grid: [columns wide, rows tall] for each
// tile in turn — one big tile beside two stacked ones, a row of three tall
// tiles, a full-width strip, then a row of three short tiles. The pattern
// repeats if more photos are shown than it has entries.
const TILE_SPANS = [
  [7, 4],
  [5, 2],
  [5, 2],
  [4, 3],
  [4, 3],
  [4, 3],
  [12, 2],
  [4, 2],
  [4, 2],
  [4, 2],
];
// The same ten tiles on a phone's 2-column grid: big, four small, a wide
// strip, big, two small, a wide strip — no gaps.
const TILE_SPANS_PHONE = [
  [2, 2],
  [1, 1],
  [1, 1],
  [1, 1],
  [1, 1],
  [2, 1],
  [2, 2],
  [1, 1],
  [1, 1],
  [2, 1],
];
// One full pattern.
const MAX_TILES = TILE_SPANS.length;

// "Community Gallery" — heading, paragraph and button pinned on the left
// (plain CSS `position: sticky`) while the taller photo grid on the right
// scrolls past; it lets go once the grid's last row arrives. Side by side
// at every width, phones included — just narrower, with a simpler grid.
// Photos and videos are the gallery items uploaded in Admin -> Gallery,
// each labelled with its caption (or category). No background of its own:
// the fixed SiteBackground shows through.
//
// No `overflow-hidden` on the section — it would create a clipping scroll
// container and silently break the sticky column.
export default function GalleryShowcase({ settings }) {
  const copy = useMemo(() => buildHomeGalleryCopy(settings), [settings]);
  const items = useGalleryItems().slice(0, MAX_TILES);

  return (
    <section id="gallery" className="relative px-[9px] sm:px-6 md:px-10 pt-12 pb-14 md:pt-[88px] md:pb-[92px]">
      <div className="max-w-[1240px] mx-auto grid gap-[9px] sm:gap-6 lg:gap-[42px] items-start grid-cols-[minmax(0,0.61fr)_minmax(0,1fr)] sm:grid-cols-[minmax(0,0.41fr)_minmax(0,1fr)]">
        <div className="sticky top-[78px] lg:top-[100px]">
          <Reveal direction="right">
            <span className="inline-block mb-2 sm:mb-[13px] text-[6.5px] sm:text-[10px] font-semibold leading-tight tracking-[0.2em] sm:tracking-[0.24em] uppercase text-rtg-orange-500">
              {copy.kicker}
            </span>
            <h2 className="font-display text-[clamp(1.95rem,4.85vw,5.75rem)] leading-[0.88] text-[#3d316e]">
              {copy.heading} <span className="text-gradient">{copy.headingAccent}</span>
            </h2>
            <p className="mt-2.5 sm:mt-[18px] max-w-[390px] text-[10px] sm:text-sm leading-[1.5] sm:leading-[1.58] text-[#706976]">{copy.body}</p>
            <Link
              to={copy.buttonLink}
              className="btn-shine inline-flex items-center justify-center min-h-[34px] sm:min-h-12 mt-3 sm:mt-6 px-3 sm:px-[23px] rounded-full bg-gradient-to-r from-[#f45b18] to-[#ff7a1a] text-[7.5px] sm:text-[10px] font-bold tracking-[0.07em] uppercase text-white shadow-[0_14px_28px_rgba(247,107,28,0.22)] transition-transform duration-300 hover:-translate-y-0.5"
            >
              {copy.buttonLabel}
            </Link>
          </Reveal>
        </div>

        {items.length === 0 ? (
          <p className="py-10 text-center text-rtg-mist">{copy.emptyText}</p>
        ) : (
          <div className="grid grid-cols-2 auto-rows-[78px] gap-1.5 sm:grid-cols-12 sm:auto-rows-[64px] sm:gap-3 lg:auto-rows-[92px] lg:gap-3.5">
            {items.map((item, i) => {
              const [cols, rows] = TILE_SPANS[i % TILE_SPANS.length];
              const [phoneCols, phoneRows] = TILE_SPANS_PHONE[i % TILE_SPANS_PHONE.length];
              const label = item.caption || item.category;
              return (
                <Link
                  key={`${item.url}-${i}`}
                  to={copy.buttonLink}
                  className="rtg-gallery-tile"
                  style={{ "--cols": cols, "--rows": rows, "--phone-cols": phoneCols, "--phone-rows": phoneRows }}
                >
                  {item.type === "video" ? (
                    <video src={item.url} muted playsInline preload="metadata" className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <img src={item.url} alt={label || ""} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                  )}
                  {label && (
                    <span className="absolute z-[2] left-2.5 bottom-2 right-2.5 sm:left-4 sm:bottom-3.5 sm:right-4 truncate text-[7px] sm:text-[9px] font-bold tracking-[0.14em] uppercase text-white">
                      {label}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
