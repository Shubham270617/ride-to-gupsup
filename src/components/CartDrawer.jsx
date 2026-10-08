import { useMemo } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useCart } from "../lib/CartContext";
import { useSiteSettings, buildStorePageCopy } from "../lib/publicData";

function formatPrice(n) {
  return `₹${n.toLocaleString("en-IN")}`;
}

// The bag: slides in from the right on any page (the navbar's bag button,
// or adding a product). Its wording is in Admin -> Site Content -> Store;
// its look is in index.css under "BAG DRAWER" (.rtg-bag-*).
export default function CartDrawer() {
  const { items, updateQuantity, removeItem, subtotal, count, open, setOpen } = useCart();
  const settings = useSiteSettings();
  const copy = useMemo(() => buildStorePageCopy(settings), [settings]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="rtg-bag-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
          <motion.aside
            className="rtg-bag"
            aria-label={copy.bagTitle}
            initial={{ x: "105%" }}
            animate={{ x: 0 }}
            exit={{ x: "105%" }}
            transition={{ duration: 0.35, ease: [0.2, 0.7, 0.2, 1] }}
          >
            <div className="rtg-bag-head">
              <div>
                <span>{copy.bagKicker}</span>
                <h2>{copy.bagTitle}</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label={copy.bagCloseLabel}>
                ×
              </button>
            </div>

            <div className="rtg-bag-count">
              <span>
                {count} {count === 1 ? copy.bagItemLabel : copy.bagItemsLabel}
              </span>
              <b>
                {copy.bagSubtotalLabel} {formatPrice(subtotal)}
              </b>
            </div>

            {items.length === 0 ? (
              <div className="rtg-bag-items">
                <div className="rtg-bag-empty">
                  <p>{copy.bagEmptyText}</p>
                  <Link to="/merchandise" onClick={() => setOpen(false)}>
                    {copy.bagBrowseLabel}
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="rtg-bag-items">
                  {items.map((item) => (
                    <div key={`${item.productId}-${item.size || ""}`} className="rtg-bag-row">
                      {item.image && <img src={item.image} alt={item.name} />}
                      <div className="rtg-bag-info">
                        <strong>{item.name}</strong>
                        <span>
                          {[item.size && `${copy.bagSizeLabel} ${item.size}`, formatPrice(item.price)].filter(Boolean).join(" • ")}
                        </span>
                        <button type="button" className="rtg-bag-remove" onClick={() => removeItem(item.productId, item.size)}>
                          {copy.bagRemoveLabel}
                        </button>
                      </div>
                      <div className="rtg-bag-qty">
                        <button type="button" onClick={() => updateQuantity(item.productId, item.size, item.quantity - 1)} aria-label={`− ${item.name}`}>
                          −
                        </button>
                        <b>{item.quantity}</b>
                        <button type="button" onClick={() => updateQuantity(item.productId, item.size, item.quantity + 1)} aria-label={`+ ${item.name}`}>
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rtg-bag-foot">
                  <div className="rtg-bag-total">
                    <span>{copy.bagSubtotalLabel}</span>
                    <strong>{formatPrice(subtotal)}</strong>
                  </div>
                  {copy.bagNote && <p>{copy.bagNote}</p>}
                  <Link to="/checkout" onClick={() => setOpen(false)}>
                    {copy.bagCheckoutLabel}
                  </Link>
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
