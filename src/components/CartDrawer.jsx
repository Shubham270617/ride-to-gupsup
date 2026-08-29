import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X, Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useCart } from "../lib/CartContext";
import Button from "./ui/Button";

function formatPrice(n) {
  return `₹${n.toLocaleString("en-IN")}`;
}

export default function CartDrawer() {
  const { items, updateQuantity, removeItem, subtotal, open, setOpen } = useCart();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/60 z-[70]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />
          <motion.aside
            className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-rtg-purple-950 border-l border-white/10 z-[71] flex flex-col"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
              <h2 className="font-display text-2xl">Your Cart</h2>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close cart"
                className="w-9 h-9 rounded-full glass flex items-center justify-center hover:text-rtg-orange-400 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {items.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-8 gap-3">
                <ShoppingBag className="text-rtg-mist" size={32} />
                <p className="text-rtg-mist">Your cart is empty.</p>
                <Button to="/merchandise" onClick={() => setOpen(false)} size="md" variant="secondary">
                  Browse Merchandise
                </Button>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                  {items.map((item) => (
                    <div key={`${item.productId}-${item.size || ""}`} className="flex gap-4">
                      {item.image && (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-16 h-16 rounded-xl object-cover shrink-0 bg-white/5"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{item.name}</p>
                        {item.size && <p className="text-xs text-rtg-mist">Size: {item.size}</p>}
                        <p className="text-xs text-rtg-orange-400 font-semibold mt-0.5">{formatPrice(item.price)}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => updateQuantity(item.productId, item.size, item.quantity - 1)}
                            aria-label="Decrease quantity"
                            className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="text-sm w-5 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.productId, item.size, item.quantity + 1)}
                            aria-label="Increase quantity"
                            className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                          >
                            <Plus size={12} />
                          </button>
                          <button
                            onClick={() => removeItem(item.productId, item.size)}
                            aria-label="Remove item"
                            className="ml-2 text-rtg-mist hover:text-rtg-orange-400 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="px-6 py-5 border-t border-white/10 space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-rtg-mist">Subtotal</span>
                    <span className="font-display text-2xl">{formatPrice(subtotal)}</span>
                  </div>
                  <Link
                    to="/checkout"
                    onClick={() => setOpen(false)}
                    className="block w-full text-center rounded-full bg-rtg-orange-500 text-rtg-ink font-semibold px-6 py-4 hover:bg-rtg-orange-400 transition-colors"
                  >
                    Checkout
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
