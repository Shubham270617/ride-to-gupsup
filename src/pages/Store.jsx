import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Reveal from "../components/ui/Reveal";
import { useCart } from "../lib/CartContext";
import { images as imageLib } from "../data/images";
import { useProducts, useStoreCategories, useSiteSettings, buildStorePageCopy } from "../lib/publicData";

// ============================================================================
// STORE PAGE — the "Drop Lab": a hero with a rotating featured product, the
// product list by category ("The Drop"), a kit builder, the dark Limited /
// Event Edition card, and a quick-view window. Adding to the bag opens the
// site's bag drawer (components/CartDrawer.jsx).
//
// Nothing here is written in code:
//   products          (Admin -> Merchandise)          every product, its photo,
//                                                     price, sizes, colours and
//                                                     which sections it shows in
//   store_categories  (Admin -> Store — Categories)   the tabs
//   "text.store.<field>" (Admin -> Site Content -> Store) every heading, label
//                                                     and paragraph
// Layout and motion are in index.css under "STORE PAGE" (.rtg-st-*).
// ============================================================================

const HERO_MS = 4700; // how long the hero rests on a featured product
const FEATURED_FALLBACK = 3; // featured products shown when none is ticked
const ALL = "all";
const KIT_SPOTS = 5; // places a kit piece can sit in the preview

const pad2 = (n) => String(n).padStart(2, "0");
const splitList = (text) => (text || "").split(",").map((s) => s.trim()).filter(Boolean);
const formatPrice = (n) => `₹${Number(n).toLocaleString("en-IN")}`;
const photoOf = (product) => product.image || imageLib[product.imgKey] || imageLib.placeholder;
// Inline style carrying a product's two accent colours (the stylesheet's
// own blue pair is used when a product has none).
const toneOf = (product) => ({
  ...(product.color ? { "--tone-a": product.color } : null),
  ...(product.colorAlt ? { "--tone-b": product.colorAlt } : null),
});
// What goes into the bag: the product with the photo it is shown with.
const bagItem = (product) => ({ ...product, image: photoOf(product) });

// ----------------------------------------------------------------------------
// BACKDROP — retail line-art fixed to the viewport: tee, bottle, tag and box
// drifting, two dashed routes and three pulsing dots.
// ----------------------------------------------------------------------------
function StoreBackdrop() {
  return (
    <div className="rtg-st-bg" aria-hidden="true">
      <svg className="rtg-st-bg-tee" viewBox="0 0 180 170">
        <path d="M55 25 76 16h28l21 9 35 30-18 25-22-17v83H60V63L38 80 20 55Z" />
        <path d="M76 16c3 14 25 14 28 0" />
      </svg>
      <svg className="rtg-st-bg-bottle" viewBox="0 0 90 170">
        <path d="M33 16h24v19c10 7 15 18 15 31v73c0 11-8 19-19 19H37c-11 0-19-8-19-19V66c0-13 5-24 15-31Z" />
        <path d="M33 31h24M28 83h34" />
      </svg>
      <svg className="rtg-st-bg-tag" viewBox="0 0 150 120">
        <path d="M20 32 81 16l50 40-55 48-56-31Z" />
        <circle cx="83" cy="39" r="6" />
      </svg>
      <svg className="rtg-st-bg-box" viewBox="0 0 170 150">
        <path d="m24 51 61-31 61 31-61 34Z" />
        <path d="M24 51v62l61 27 61-27V51M85 85v55" />
      </svg>
      <svg className="rtg-st-bg-routes" viewBox="0 0 1440 900" preserveAspectRatio="none">
        <path className="rtg-st-route-a" d="M-80 180C100 85 260 250 430 170C610 82 724 270 900 157C1050 62 1182 192 1490 82" />
        <path className="rtg-st-route-b" d="M-80 735C100 620 270 800 455 690C630 585 805 752 980 650C1130 562 1262 670 1490 550" />
      </svg>
      <span className="rtg-st-pulse rtg-st-pulse-a" />
      <span className="rtg-st-pulse rtg-st-pulse-b" />
      <span className="rtg-st-pulse rtg-st-pulse-c" />
    </div>
  );
}

// A product's photo in a rounded, softly lit frame.
function ProductArt({ product, className = "" }) {
  return (
    <div className={`rtg-st-art ${className}`} style={toneOf(product)}>
      <img src={photoOf(product)} alt={product.name} />
    </div>
  );
}

// ----------------------------------------------------------------------------
// HERO — headline on the left; on the right a glass stage that rotates
// through the featured products (paused while the pointer is over it).
// ----------------------------------------------------------------------------
function StoreHero({ copy, featured, bagCount, onOpenBag }) {
  const count = featured.length;
  const [index, setIndex] = useState(0);
  const [turn, setTurn] = useState(0); // goes up on every change — restarts the progress bar
  const [paused, setPaused] = useState(false);
  const current = count ? index % count : 0;

  const go = (next) => {
    setIndex(((next % count) + count) % count);
    setTurn((t) => t + 1);
  };

  useEffect(() => {
    if (count < 2 || paused) return undefined;
    const id = setTimeout(() => {
      setIndex((i) => (i + 1) % count);
      setTurn((t) => t + 1);
    }, HERO_MS);
    return () => clearTimeout(id);
  }, [count, paused, turn]);

  const tags = splitList(copy.heroTags);

  return (
    <section className="rtg-st-hero">
      <div className="rtg-st-hero-inner">
        <Reveal direction="right">
          <div className="rtg-st-hero-meta">
            <span>{copy.heroMetaLabel}</span>
            <b>{copy.heroMetaIndex}</b>
          </div>
          <h1>
            <span>{copy.heroTitle}</span>
            <strong>{copy.heroTitleAccent}</strong>
          </h1>
          <p className="rtg-st-hero-text">{copy.heroText}</p>
          <div className="rtg-st-hero-tags">
            {tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
          <div className="rtg-st-hero-actions">
            <a href="#the-drop">{copy.heroCtaLabel}</a>
            <button type="button" onClick={onOpenBag}>
              {copy.heroBagLabel} <b>{bagCount}</b>
            </button>
          </div>
        </Reveal>

        {count > 0 && (
          <Reveal direction="left" delay={0.1}>
            <div
              className="rtg-st-stage"
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => {
                setPaused(false);
                setTurn((t) => t + 1);
              }}
            >
              <div className="rtg-st-stage-top">
                <span>{copy.stageLabel}</span>
                <b>
                  {pad2(current + 1)} / {pad2(count)}
                </b>
              </div>

              <div className="rtg-st-stage-orbit">
                <span className="rtg-st-ring rtg-st-ring-a" />
                <span className="rtg-st-ring rtg-st-ring-b" />
                {featured.map((product, i) => (
                  <Link
                    key={product.id}
                    to={`/merchandise/${product.id}`}
                    className={`rtg-st-stage-product${i === current ? " active" : ""}`}
                    aria-hidden={i !== current}
                    tabIndex={i === current ? 0 : -1}
                  >
                    <ProductArt product={product} />
                    <span className="rtg-st-stage-label">
                      {product.eyebrow && <span>{product.eyebrow}</span>}
                      <strong>{product.name}</strong>
                    </span>
                  </Link>
                ))}
              </div>

              <div className="rtg-st-stage-controls">
                <button type="button" aria-label={copy.heroPrevLabel} onClick={() => go(current - 1)}>
                  ←
                </button>
                <div className="rtg-st-progress">
                  <span key={turn} className={paused ? "is-paused" : undefined} style={{ animationDuration: `${HERO_MS}ms` }} />
                </div>
                <button type="button" aria-label={copy.heroNextLabel} onClick={() => go(current + 1)}>
                  →
                </button>
              </div>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}

// ----------------------------------------------------------------------------
// THE DROP — category tabs, the product in focus on the left and the list
// of products in the tab on the right. A product with sizes opens the quick
// view to pick one; one without goes straight into the bag.
// ----------------------------------------------------------------------------
function TheDrop({ copy, products, categories, onQuickView, onAdd }) {
  const [filter, setFilter] = useState(ALL);
  const [activeId, setActiveId] = useState(null);

  // A tab left pointing at a category that's since been removed falls back
  // to "all".
  const activeFilter = filter === ALL || categories.some((c) => c.slug === filter) ? filter : ALL;
  const visible = activeFilter === ALL ? products : products.filter((p) => p.category === activeFilter);
  const active = visible.find((p) => p.id === activeId) || visible[0] || null;

  const tabs = [
    { key: ALL, label: copy.allTabLabel, count: products.length },
    ...categories.map((c) => ({ key: c.slug, label: c.name, count: products.filter((p) => p.category === c.slug).length })),
  ];
  const details = active
    ? [
        { label: copy.useLabel, value: active.use },
        { label: copy.dropLabel, value: active.drop },
        { label: copy.priceLabel, value: formatPrice(active.price) },
      ].filter((row) => row.value)
    : [];
  const needsSize = active ? active.sizes.length > 0 : false;

  return (
    <section className="rtg-st-drop" id="the-drop">
      <div className="rtg-st-shell">
        <Reveal className="rtg-st-editorial">
          <div className="rtg-st-editorial-index">
            <span>{copy.dropNumber}</span>
            <small>{copy.dropIndexLabel}</small>
          </div>
          <div className="rtg-st-editorial-copy">
            <span>{copy.dropKicker}</span>
            <h2>
              {copy.dropTitle} <b>{copy.dropTitleAccent}</b>
            </h2>
            <p>{copy.dropText}</p>
          </div>
        </Reveal>

        <Reveal className="rtg-st-tabs">
          {tabs.map((tab) => (
            <button key={tab.key} type="button" className={tab.key === activeFilter ? "active" : undefined} aria-pressed={tab.key === activeFilter} onClick={() => setFilter(tab.key)}>
              {tab.label} <span>{pad2(tab.count)}</span>
            </button>
          ))}
        </Reveal>

        {active ? (
          <Reveal className="rtg-st-drop-stage" amount={0.08}>
            <div className="rtg-st-active" style={toneOf(active)}>
              <div className="rtg-st-active-visual">
                {/* Keyed by the product, so the photo fades in on every change. */}
                <ProductArt key={active.id} product={active} className="is-large" />
                {active.tag && <span className="rtg-st-active-badge">{active.tag}</span>}
                {active.watermark && <div className="rtg-st-active-watermark">{active.watermark}</div>}
              </div>

              <div className="rtg-st-active-copy">
                {active.eyebrow && <span>{active.eyebrow}</span>}
                <h3>{active.name}</h3>
                {active.description && <p>{active.description}</p>}

                {details.length > 0 && (
                  <div className="rtg-st-active-details">
                    {details.map((row) => (
                      <div key={row.label}>
                        <small>{row.label}</small>
                        <strong>{row.value}</strong>
                      </div>
                    ))}
                  </div>
                )}

                <div className="rtg-st-active-actions">
                  <button
                    type="button"
                    className="rtg-st-primary"
                    disabled={!active.inStock}
                    onClick={() => (needsSize ? onQuickView(active) : onAdd(active))}
                  >
                    {!active.inStock ? copy.soldOutLabel : needsSize ? copy.chooseSizeLabel : copy.addLabel}
                  </button>
                  <button type="button" className="rtg-st-secondary" onClick={() => onQuickView(active)}>
                    {copy.quickViewLabel}
                  </button>
                </div>
              </div>
            </div>

            <div className="rtg-st-rail">
              {visible.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  className={`rtg-st-row${product.id === active.id ? " active" : ""}`}
                  style={toneOf(product)}
                  aria-pressed={product.id === active.id}
                  onClick={() => setActiveId(product.id)}
                >
                  <span>{pad2(products.indexOf(product) + 1)}</span>
                  <div>
                    <b>{product.name}</b>
                    <small>{[product.eyebrow, formatPrice(product.price)].filter(Boolean).join(" • ")}</small>
                  </div>
                  <i>→</i>
                </button>
              ))}
            </div>
          </Reveal>
        ) : (
          <p className="rtg-st-empty">{copy.dropEmptyText}</p>
        )}
      </div>
    </section>
  );
}

// ----------------------------------------------------------------------------
// BUILD YOUR KIT — tick the pieces you want (the products marked "Offer in
// Build Your Kit"), see them stacked in the preview, and add them all to
// the bag at once. A piece with sizes gets a size picker while it's ticked.
// ----------------------------------------------------------------------------
function KitBuilder({ copy, pieces, onAddKit }) {
  const [picked, setPicked] = useState(null); // ids of the ticked pieces; null = just the first one
  const [sizes, setSizes] = useState({}); // productId -> chosen size

  const pickedIds = picked ?? pieces.slice(0, 1).map((p) => p.id);
  const chosen = pieces.filter((p) => pickedIds.includes(p.id));
  const buyable = chosen.filter((p) => p.inStock);
  const sizeOf = (piece) => sizes[piece.id] || piece.sizes[0] || null;
  const toggle = (id) => setPicked(pickedIds.includes(id) ? pickedIds.filter((x) => x !== id) : [...pickedIds, id]);

  return (
    <section className="rtg-st-kit">
      <div className="rtg-st-shell">
        <div className="rtg-st-kit-grid">
          <Reveal className="rtg-st-kit-copy">
            <span>{copy.kitKicker}</span>
            <h2>
              {copy.kitTitle} <b>{copy.kitTitleAccent}</b>
            </h2>
            <p>{copy.kitText}</p>
            {copy.kitNote && (
              <div className="rtg-st-kit-note">
                <i />
                <span>{copy.kitNote}</span>
              </div>
            )}
          </Reveal>

          <Reveal className="rtg-st-kit-builder" delay={0.08}>
            <div className="rtg-st-kit-preview">
              <div className="rtg-st-kit-orbit" />
              {pieces.map((piece, i) => (
                <div key={piece.id} className={`rtg-st-kit-layer is-spot-${i % KIT_SPOTS}${pickedIds.includes(piece.id) ? " active" : ""}`}>
                  <ProductArt product={piece} />
                </div>
              ))}
              <div className="rtg-st-kit-count">
                <span>{copy.kitCountLabel}</span>
                <strong>{pad2(chosen.length)}</strong>
              </div>
              <div className="rtg-st-kit-count is-total">
                <span>{copy.kitTotalLabel}</span>
                <strong>{formatPrice(buyable.reduce((sum, p) => sum + p.price, 0))}</strong>
              </div>
            </div>

            <div className="rtg-st-kit-controls">
              {pieces.map((piece, i) => {
                const on = pickedIds.includes(piece.id);
                return (
                  <div key={piece.id} className={`rtg-st-kit-piece${on ? " active" : ""}`} style={toneOf(piece)}>
                    <button type="button" aria-pressed={on} disabled={!piece.inStock} onClick={() => toggle(piece.id)}>
                      <span>{pad2(i + 1)}</span>
                      <div>
                        <b>{piece.kitLabel || piece.name}</b>
                        <small>{piece.inStock ? [piece.eyebrow, formatPrice(piece.price)].filter(Boolean).join(" • ") : copy.soldOutLabel}</small>
                      </div>
                      <i>{on ? "✓" : "+"}</i>
                    </button>
                    {on && piece.sizes.length > 0 && (
                      <label>
                        <span>{copy.kitSizeLabel}</span>
                        <select value={sizeOf(piece)} onChange={(e) => setSizes((prev) => ({ ...prev, [piece.id]: e.target.value }))}>
                          {piece.sizes.map((size) => (
                            <option key={size} value={size}>
                              {size}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>
                );
              })}

              <button type="button" className="rtg-st-kit-add" disabled={buyable.length === 0} onClick={() => onAddKit(buyable.map((piece) => ({ piece, size: sizeOf(piece) })))}>
                {copy.kitAddLabel}
              </button>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// ----------------------------------------------------------------------------
// LIMITED / EVENT EDITION — a dark card previewing the product marked as the
// limited one; without one it is the wording alone.
// ----------------------------------------------------------------------------
function LimitedDrop({ copy, product, onQuickView }) {
  return (
    <section className="rtg-st-limited">
      <div className="rtg-st-shell">
        <Reveal as={motion.article} className="rtg-st-limited-card">
          <div className="rtg-st-limited-number">{copy.limitedNumber}</div>

          <div className="rtg-st-limited-copy">
            <span>{copy.limitedKicker}</span>
            <h2>
              {copy.limitedTitle} <b>{copy.limitedTitleAccent}</b>
            </h2>
            <p>{copy.limitedText}</p>
            {product && (
              <button type="button" onClick={() => onQuickView(product)}>
                {copy.limitedButtonLabel}
              </button>
            )}
          </div>

          <div className="rtg-st-limited-art" aria-hidden="true">
            <span className="rtg-st-limited-orbit is-one" />
            <span className="rtg-st-limited-orbit is-two" />
            {product && <ProductArt product={product} />}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ----------------------------------------------------------------------------
// QUICK VIEW — opens over the page; closes with the × button, a click
// outside, or Escape. A product with sizes needs one picked before it can
// be added.
// ----------------------------------------------------------------------------
function QuickView({ product, copy, onClose, onAdd }) {
  const closeRef = useRef(null);
  const [size, setSize] = useState(null);

  useEffect(() => {
    if (!product) return undefined;
    setSize(null);
    const opener = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
      opener?.focus?.();
    };
  }, [product, onClose]);

  const needsSize = product ? product.sizes.length > 0 : false;
  const canAdd = product ? product.inStock && (!needsSize || size) : false;
  const meta = product
    ? [
        { label: copy.modalPriceLabel, value: formatPrice(product.price) },
        { label: copy.modalStatusLabel, value: product.inStock ? copy.modalInStockText : copy.modalSoldOutText },
        { label: copy.modalDropLabel, value: product.drop },
      ].filter((row) => row.value)
    : [];

  return createPortal(
    <AnimatePresence>
      {product && (
        <motion.div className="rtg-st-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
          <div className="rtg-st-modal-backdrop" onClick={onClose} />

          <motion.div
            className="rtg-st-modal-dialog"
            style={toneOf(product)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="rtg-st-modal-title"
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.34, ease: [0.18, 0.74, 0.18, 1] }}
          >
            <button ref={closeRef} type="button" className="rtg-st-modal-close" aria-label={copy.modalCloseLabel} onClick={onClose}>
              ×
            </button>

            <div className="rtg-st-modal-visual">
              <ProductArt product={product} className="is-large" />
            </div>

            <div className="rtg-st-modal-copy">
              {product.eyebrow && <span>{product.eyebrow}</span>}
              <h2 id="rtg-st-modal-title">{product.name}</h2>
              {product.description && <p>{product.description}</p>}

              {needsSize && (
                <div className="rtg-st-sizes">
                  <span>{copy.modalSizeLabel}</span>
                  {product.sizes.map((s) => (
                    <button key={s} type="button" className={s === size ? "active" : undefined} aria-pressed={s === size} onClick={() => setSize(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              )}

              <div className="rtg-st-modal-meta">
                {meta.map((row) => (
                  <div key={row.label}>
                    <small>{row.label}</small>
                    <strong>{row.value}</strong>
                  </div>
                ))}
              </div>

              <button type="button" className="rtg-st-modal-add" disabled={!canAdd} onClick={() => onAdd(product, size)}>
                {!product.inStock ? copy.soldOutLabel : needsSize && !size ? copy.chooseSizeLabel : copy.addLabel}
              </button>
              <Link to={`/merchandise/${product.id}`} className="rtg-st-modal-link" onClick={onClose}>
                {copy.modalDetailsLabel}
              </Link>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export default function Store() {
  const settings = useSiteSettings();
  const copy = useMemo(() => buildStorePageCopy(settings), [settings]);
  const rows = useProducts();
  // The built-in sample products (shown until real ones are added) carry
  // fewer fields than a saved product — fill in what the page reads.
  const products = useMemo(() => rows.map((p) => ({ ...p, sizes: p.sizes || [], inStock: p.inStock !== false })), [rows]);
  const categories = useStoreCategories();
  const { addItem, count, setOpen } = useCart();
  const [quickView, setQuickView] = useState(null); // the product in the quick-view window

  const featured = useMemo(() => {
    const ticked = products.filter((p) => p.featured);
    return ticked.length ? ticked : products.slice(0, FEATURED_FALLBACK);
  }, [products]);
  const kitPieces = useMemo(() => products.filter((p) => p.inKit), [products]);
  const limited = products.find((p) => p.limited) || null;

  const closeQuickView = useMemo(() => () => setQuickView(null), []);
  const addToBag = (product, size = null) => {
    addItem(bagItem(product), { size });
    setQuickView(null);
  };
  const addKit = (lines) => lines.forEach(({ piece, size }) => addItem(bagItem(piece), { size }));

  return (
    <div className="rtg-st">
      <StoreBackdrop />

      <div className="rtg-st-page">
        <StoreHero copy={copy} featured={featured} bagCount={count} onOpenBag={() => setOpen(true)} />
        <TheDrop copy={copy} products={products} categories={categories} onQuickView={setQuickView} onAdd={addToBag} />
        {kitPieces.length > 0 && <KitBuilder copy={copy} pieces={kitPieces} onAddKit={addKit} />}
        <LimitedDrop copy={copy} product={limited} onQuickView={setQuickView} />
      </div>

      <QuickView product={quickView} copy={copy} onClose={closeQuickView} onAdd={addToBag} />
    </div>
  );
}
