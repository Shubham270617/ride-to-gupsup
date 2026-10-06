import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { buildHomeMerchCopy, useProducts } from "../../lib/publicData";
import { useCart } from "../../lib/CartContext";
import useIsMobile from "../../hooks/useIsMobile";
import Reveal from "../ui/Reveal";

// Pixels per second the row drifts. 45 = relaxed, 55 = medium, 70 = active.
const SCROLL_SPEED = 55;
// The row must be wider than the screen for the loop to hide its seam, so a
// short product list is repeated until one copy holds at least this many.
const MIN_CARDS_PER_COPY = 4;

// One backdrop per card, cycled — shown behind the product photo (and on
// its own when a product has no photo yet).
const VISUAL_BACKDROPS = [
  "linear-gradient(135deg, #35246f 0%, #4a2f8b 48%, #f76b1c 100%)",
  "linear-gradient(135deg, #281741 0%, #35246f 56%, #8e7acb 100%)",
  "linear-gradient(135deg, #1b1531 0%, #35246f 55%, #5d4ab2 100%)",
];

function MerchCard({ product, index, copy, images, inert }) {
  const { addItem } = useCart();
  const navigate = useNavigate();
  const productPath = `/merchandise/${product.id}`;
  // A product with no real photo yet shows the coloured backdrop on its own
  // rather than the site's generic grey placeholder picture.
  const keyed = images[product.imgKey];
  const image = product.image || (keyed !== images.placeholder ? keyed : null);
  const needsSize = product.sizes?.length > 0;
  const tabIndex = inert ? -1 : undefined;

  // A product with sizes can't go straight into the cart — the buyer picks
  // a size on its own page first.
  const inStock = product.inStock !== false;
  const label = !inStock ? copy.soldOutLabel : needsSize ? copy.chooseLabel : copy.addLabel;
  const onAction = () => (needsSize ? navigate(productPath) : addItem(product));

  return (
    <article className="rtg-merch-card" aria-hidden={inert || undefined}>
      <Link
        to={productPath}
        tabIndex={tabIndex}
        className="rtg-merch-visual relative block h-[130px] sm:h-[250px] overflow-hidden"
        style={{ backgroundImage: VISUAL_BACKDROPS[index % VISUAL_BACKDROPS.length] }}
      >
        <span className="absolute left-1/2 top-1/2 w-[120px] h-[120px] sm:w-[220px] sm:h-[220px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[2px] bg-[radial-gradient(circle,rgba(255,255,255,0.28),rgba(255,255,255,0.03)_50%,transparent_72%)]" />
        {image && <img src={image} alt={product.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />}
        {product.tag && (
          <span className="absolute left-3 top-3 sm:left-9 sm:top-9 px-2 py-[5px] sm:px-2.5 sm:py-[7px] rounded-full border border-white/15 bg-white/12 backdrop-blur-sm text-[8px] sm:text-xs font-bold leading-none tracking-[0.14em] uppercase text-white/90">
            {product.tag}
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col min-h-[150px] sm:min-h-[218px] px-3 pt-3 pb-3.5 sm:px-5 sm:pt-5 sm:pb-[22px]">
        {product.eyebrow && <span className="text-[7px] sm:text-[9px] font-bold tracking-[0.16em] uppercase text-rtg-orange-500">{product.eyebrow}</span>}
        <h3 className="my-1.5 sm:my-2 font-display text-lg sm:text-3xl leading-[0.98] tracking-[0.01em] text-[#3d316e]">
          <Link to={productPath} tabIndex={tabIndex} className="hover:text-rtg-orange-500 transition-colors">
            {product.name}
          </Link>
        </h3>
        {product.description && <p className="mb-3 sm:mb-[18px] text-[10px] sm:text-[12.5px] leading-normal text-[#6f6976] line-clamp-3 sm:line-clamp-2">{product.description}</p>}
        <button
          type="button"
          tabIndex={tabIndex}
          disabled={!inStock}
          onClick={onAction}
          className="rtg-merch-btn mt-auto flex items-center justify-center min-h-[34px] sm:min-h-[46px] px-2.5 sm:px-[18px] rounded-full text-[8.5px] sm:text-[11px] font-bold tracking-[0.11em] uppercase text-[#35246f] transition-colors hover:bg-rtg-orange-500 hover:text-white disabled:opacity-50 disabled:pointer-events-none"
        >
          {label}
        </button>
      </div>
    </article>
  );
}

// "Merchandise Highlights" — the store's products as one row of cards that
// drifts toward the left forever (paused while hovered), over a washed-out
// community photo. The row is rendered twice and slides by exactly one
// copy's width, measured after fonts load so the loop point is exact.
export default function MerchHighlights({ settings, images }) {
  const copy = useMemo(() => buildHomeMerchCopy(settings), [settings]);
  const products = useProducts();
  const isMobile = useIsMobile();
  const trackRef = useRef(null);
  const [scroll, setScroll] = useState(null);

  const cards = useMemo(() => {
    if (products.length === 0) return [];
    const repeats = Math.ceil(MIN_CARDS_PER_COPY / products.length);
    return Array.from({ length: repeats }, () => products).flat();
  }, [products]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || cards.length === 0) return undefined;
    let cancelled = false;

    const measure = () => {
      const first = track.children[0];
      const firstOfCopy = track.children[cards.length];
      if (cancelled || !first || !firstOfCopy) return;
      const distance = firstOfCopy.offsetLeft - first.offsetLeft;
      if (distance > 0) setScroll({ distance, duration: distance / SCROLL_SPEED });
    };

    (document.fonts?.ready ?? Promise.resolve()).then(measure);
    window.addEventListener("resize", measure);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", measure);
    };
  }, [cards]);

  if (cards.length === 0) return null;

  return (
    <section id="merchandise" className="relative isolate overflow-hidden bg-[#f7f5fb] pt-16 pb-14 md:pt-[82px] md:pb-[78px]">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-20"
        style={{
          backgroundImage: `url(${images.homeMerchPreview})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: isMobile ? "scroll" : "fixed",
        }}
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-white/72 to-white/76" />

      <Reveal className="flex flex-col items-center text-center max-w-[1120px] mx-auto px-6">
        <span className="mb-3 text-[10px] font-semibold tracking-[0.24em] uppercase text-rtg-orange-500">{copy.eyebrow}</span>
        <h2 className="font-display text-[clamp(2.4rem,5.4vw,6.375rem)] leading-[0.88] text-[#3d316e]">
          {copy.title} <span className="text-gradient">{copy.titleAccent}</span>
        </h2>
        <p className="mt-[17px] max-w-[800px] text-sm font-medium leading-[1.58] text-[#514b59]">{copy.subtitle}</p>
      </Reveal>

      <div className="rtg-merch-viewport mt-6 sm:mt-8 mx-2 sm:mx-4 px-1 pt-2.5 pb-[30px] overflow-hidden">
        <div
          ref={trackRef}
          className={`rtg-merch-track flex gap-2.5 sm:gap-[22px] w-max ${scroll ? "is-scrolling" : ""}`}
          style={scroll ? { "--merch-set-width": `${scroll.distance}px`, "--merch-scroll-duration": `${scroll.duration}s` } : undefined}
        >
          {[0, 1].flatMap((copyIndex) =>
            cards.map((product, i) => (
              <MerchCard key={`${copyIndex}-${i}`} product={product} index={i} copy={copy} images={images} inert={copyIndex === 1} />
            ))
          )}
        </div>
      </div>

      <div className="relative flex justify-center mt-1 px-5">
        <Link
          to={copy.storeLink}
          className="btn-shine inline-flex items-center justify-center min-h-[50px] px-[29px] rounded-full bg-gradient-to-r from-[#f45b18] via-[#ff7a1a] to-[#ff9a45] text-[11px] font-bold tracking-[0.08em] uppercase text-white shadow-[0_12px_26px_rgba(247,107,28,0.18),inset_1px_1px_0_rgba(255,255,255,0.24)] transition-transform duration-300 hover:-translate-y-0.5"
        >
          {copy.storeLabel}
        </Link>
      </div>
    </section>
  );
}
