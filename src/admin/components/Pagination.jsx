import { ChevronLeft, ChevronRight } from "lucide-react";

// Shared numbered pagination for admin list pages — same look everywhere
// (Gallery and Site Photos already used this exact pattern inline; this is
// that pattern, reusable, for every other admin board).
export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-1.5 mt-6">
      <button
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        aria-label="Previous page"
        className="w-9 h-9 rounded-full border border-rtg-border bg-white flex items-center justify-center text-rtg-mist hover:text-rtg-orange-600 hover:border-rtg-orange-400/50 transition-colors disabled:opacity-40 disabled:pointer-events-none"
      >
        <ChevronLeft size={16} />
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className={`w-9 h-9 rounded-full text-sm font-semibold transition-colors ${
            n === page ? "bg-[linear-gradient(135deg,#f45b18,#ff8a3d)] text-white shadow-[0_10px_24px_-12px_rgba(247,107,28,0.9)]" : "border border-rtg-border bg-white text-rtg-mist hover:text-rtg-orange-600"
          }`}
        >
          {n}
        </button>
      ))}
      <button
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        aria-label="Next page"
        className="w-9 h-9 rounded-full border border-rtg-border bg-white flex items-center justify-center text-rtg-mist hover:text-rtg-orange-600 hover:border-rtg-orange-400/50 transition-colors disabled:opacity-40 disabled:pointer-events-none"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
