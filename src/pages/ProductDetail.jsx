import { useState } from "react";
import { useParams, Navigate, Link } from "react-router-dom";
import { Loader2, ShoppingBag, Check, ArrowLeft, Minus, Plus } from "lucide-react";
import { useProduct } from "../lib/publicData";
import { images } from "../data/images";
import { useCart } from "../lib/CartContext";
import Section from "../components/ui/Section";
import GlassCard from "../components/ui/GlassCard";
import Reveal from "../components/ui/Reveal";
import Button from "../components/ui/Button";

export default function ProductDetail() {
  const { id } = useParams();
  const { product, loading } = useProduct(id);
  const { addItem } = useCart();
  const [size, setSize] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-rtg-orange-400" size={28} />
      </div>
    );
  }

  if (!product) {
    return <Navigate to="/merchandise" replace />;
  }

  const sizes = product.sizes || [];
  const needsSize = sizes.length > 0;
  const inStock = product.inStock !== false;
  const canAdd = inStock && (!needsSize || size);

  const handleAdd = () => {
    if (!canAdd) return;
    addItem(product, { size, quantity });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <div className="pt-32 pb-10">
      <Section center={false}>
        <Reveal>
          <Link
            to="/merchandise"
            className="inline-flex items-center gap-1.5 text-sm text-rtg-mist hover:text-rtg-orange-400 transition-colors mb-8"
          >
            <ArrowLeft size={15} /> Back to Merchandise
          </Link>
        </Reveal>

        <div className="grid md:grid-cols-2 gap-10 md:gap-14 items-start">
          <Reveal direction="right">
            <div className="rounded-3xl overflow-hidden bg-rtg-purple-900 aspect-square">
              <img
                src={product.image || images[product.imgKey]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
          </Reveal>

          <Reveal direction="left" delay={0.1}>
            <GlassCard>
              {product.tag && (
                <span className="inline-block bg-rtg-orange-500 text-rtg-ink text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide mb-4">
                  {product.tag}
                </span>
              )}
              <h1 className="font-display text-4xl md:text-5xl mb-3 leading-none">{product.name}</h1>
              <p className="text-rtg-orange-400 font-semibold text-2xl mb-6">
                ₹{product.price.toLocaleString("en-IN")}
              </p>
              {product.description && (
                <p className="text-rtg-mist leading-relaxed mb-6">{product.description}</p>
              )}

              {!inStock && (
                <p className="text-sm font-semibold text-rtg-orange-400 mb-6">Currently out of stock.</p>
              )}

              {needsSize && (
                <div className="mb-6">
                  <p className="text-xs uppercase tracking-widest text-rtg-mist mb-3">Size</p>
                  <div className="flex flex-wrap gap-2">
                    {sizes.map((s) => (
                      <button
                        key={s}
                        onClick={() => setSize(s)}
                        className={`w-11 h-11 rounded-xl text-sm font-semibold transition-colors ${
                          size === s
                            ? "bg-rtg-orange-500 text-rtg-ink"
                            : "bg-white/5 text-rtg-white hover:bg-white/10"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-8">
                <p className="text-xs uppercase tracking-widest text-rtg-mist mb-3">Quantity</p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    aria-label="Decrease quantity"
                    className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-8 text-center font-semibold">{quantity}</span>
                  <button
                    onClick={() => setQuantity((q) => q + 1)}
                    aria-label="Increase quantity"
                    className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              <Button
                onClick={handleAdd}
                size="lg"
                className="w-full"
                icon={added ? Check : ShoppingBag}
                variant={inStock ? "primary" : "secondary"}
              >
                {!inStock ? "Out of Stock" : added ? "Added to Cart" : needsSize && !size ? "Select a Size" : "Add to Cart"}
              </Button>
            </GlassCard>
          </Reveal>
        </div>
      </Section>
    </div>
  );
}
