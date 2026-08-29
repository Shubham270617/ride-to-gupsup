import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "rtg-cart";
const CartContext = createContext(null);

function loadCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Same product in a different size is a separate line item — this is what
// tells two lines apart (or identifies the same one to merge quantities).
function lineKey(productId, size) {
  return `${productId}::${size || ""}`;
}

// Cart lives in localStorage, not the database — browsing and adding to
// cart works for guests without forcing a login, matching normal e-commerce
// UX. Login is only required at checkout (see Checkout.jsx), where the
// cart's contents get turned into a real `orders` row.
export function CartProvider({ children }) {
  const [items, setItems] = useState(loadCart);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((product, { size = null, quantity = 1 } = {}) => {
    setItems((prev) => {
      const key = lineKey(product.id, size);
      const existing = prev.find((i) => lineKey(i.productId, i.size) === key);
      if (existing) {
        return prev.map((i) =>
          lineKey(i.productId, i.size) === key ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [
        ...prev,
        { productId: product.id, name: product.name, price: product.price, image: product.image, size, quantity },
      ];
    });
    setOpen(true);
  }, []);

  const updateQuantity = useCallback((productId, size, quantity) => {
    setItems((prev) => {
      const key = lineKey(productId, size);
      if (quantity <= 0) return prev.filter((i) => lineKey(i.productId, i.size) !== key);
      return prev.map((i) => (lineKey(i.productId, i.size) === key ? { ...i, quantity } : i));
    });
  }, []);

  const removeItem = useCallback((productId, size) => {
    const key = lineKey(productId, size);
    setItems((prev) => prev.filter((i) => lineKey(i.productId, i.size) !== key));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const count = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const value = useMemo(
    () => ({ items, addItem, updateQuantity, removeItem, clear, count, subtotal, open, setOpen }),
    [items, addItem, updateQuantity, removeItem, clear, count, subtotal, open]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  return useContext(CartContext);
}
