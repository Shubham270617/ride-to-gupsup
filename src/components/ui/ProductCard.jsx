import { motion } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import { images } from "../../data/images";
import GlassCard from "./GlassCard";
import Button from "./Button";

export default function ProductCard({ product }) {
  return (
    <GlassCard className="p-0 overflow-hidden group" hover>
      <div className="relative overflow-hidden h-64 bg-rtg-purple-900">
        <motion.img
          src={images[product.imgKey]}
          alt={product.name}
          className="w-full h-full object-cover"
          whileHover={{ scale: 1.08 }}
          transition={{ duration: 0.5 }}
        />
        {product.tag && (
          <span className="absolute top-4 right-4 bg-rtg-orange-500 text-rtg-ink text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
            {product.tag}
          </span>
        )}
      </div>
      <div className="p-6">
        <h3 className="font-display text-2xl mb-1">{product.name}</h3>
        <p className="text-rtg-orange-400 font-semibold text-lg mb-4">₹{product.price.toLocaleString("en-IN")}</p>
        <Button variant="secondary" size="md" className="w-full" icon={ShoppingBag}>
          Buy Now
        </Button>
      </div>
    </GlassCard>
  );
}
