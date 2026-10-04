import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const base =
  "btn-shine inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-wide transition-colors duration-200 whitespace-nowrap";

const sizes = {
  md: "px-6 py-3 text-sm",
  // Same footprint as md on phones — "lg" only grows to its full size from
  // md: up, where there's room for it. Used in 13 places across the site,
  // so this alone fixes most of the "buttons are huge on mobile" feedback.
  lg: "px-6 py-3 text-sm md:px-8 md:py-4 md:text-base",
};

const variants = {
  // Literal white text, not the themed ink token — this button is always an
  // orange pill, in every section (light canvas or deliberately-dark), so
  // its label must stay white regardless of which theme scope it's in.
  primary: "bg-gradient-to-r from-[#f45b18] via-rtg-orange-500 to-rtg-orange-400 text-white hover:brightness-110 shadow-[0_13px_28px_rgba(247,107,28,0.25)]",
  secondary: "glass text-rtg-white hover:border-rtg-orange-400/60",
  ghost: "text-rtg-white hover:text-rtg-orange-400",
  outline: "border-2 border-rtg-white/70 text-rtg-white hover:border-rtg-orange-400 hover:text-rtg-orange-400",
};

export default function Button({
  children,
  to,
  href,
  onClick,
  type = "button",
  variant = "primary",
  size = "md",
  icon: Icon,
  className = "",
}) {
  const cls = `${base} ${sizes[size]} ${variants[variant]} ${className}`;
  const content = (
    <motion.span
      className={cls}
      whileHover={{ scale: 1.045, y: -2 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
    >
      {children}
      {Icon && <Icon size={18} strokeWidth={2.5} />}
    </motion.span>
  );

  if (to) {
    return (
      <Link to={to} className="inline-block">
        {content}
      </Link>
    );
  }
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="inline-block">
        {content}
      </a>
    );
  }
  return (
    <button type={type} onClick={onClick} className="inline-block">
      {content}
    </button>
  );
}
