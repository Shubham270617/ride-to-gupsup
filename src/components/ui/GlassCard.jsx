import { motion } from "framer-motion";

export default function GlassCard({ children, className = "", hover = true, as = "div" }) {
  const Comp = motion[as] || motion.div;
  return (
    <Comp
      className={`glass rounded-3xl p-6 md:p-8 ${className}`}
      whileHover={hover ? { y: -8, borderColor: "rgba(247,107,28,0.5)" } : undefined}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
    >
      {children}
    </Comp>
  );
}
