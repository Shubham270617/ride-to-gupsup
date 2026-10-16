import { Link, useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { images } from "../data/images";
import { brand } from "../data/content";

// The card the standalone auth screens sit in — /forgot-password and
// /reset-password. These routes live outside <Layout>, like /auth/callback
// and /onboarding do, so they have no navbar or footer of their own and
// have to draw their own frame.
//
// Deliberately the same shape as the right-hand panel of /admin/login
// rather than a new design: someone arriving here from a password-reset
// email should recognise it as the same site.
export default function AuthScreen({ eyebrow, title, children, footer }) {
  const navigate = useNavigate();

  return (
    <main className="relative isolate flex min-h-svh items-center justify-center overflow-hidden bg-rtg-ink px-5 py-10">
      <div aria-hidden="true" className="absolute -left-24 top-10 -z-10 h-72 w-72 rounded-full bg-rtg-orange-400/15 blur-3xl" />
      <div aria-hidden="true" className="absolute -right-20 bottom-0 -z-10 h-80 w-80 rounded-full bg-rtg-purple-600/15 blur-3xl" />

      <div className="relative w-full max-w-md rounded-[2rem] border border-rtg-border bg-white p-7 sm:p-10 shadow-[0_30px_80px_-30px_rgba(53,36,111,0.35)]">
        <span aria-hidden="true" className="absolute inset-x-10 top-0 h-1 rounded-b-full bg-[linear-gradient(90deg,#f45b18,#ff8a3d,#b981d8)]" />
        <button
          onClick={() => navigate("/")}
          aria-label="Back to the site"
          className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center text-rtg-mist hover:text-rtg-orange-500 hover:bg-rtg-purple-950/5 transition-colors"
        >
          <X size={18} />
        </button>

        <Link to="/" className="inline-block">
          <img src={images.logoNav} alt={brand.name} className="h-10 w-auto mb-6" />
        </Link>

        {eyebrow && (
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-rtg-orange-600">{eyebrow}</p>
        )}
        <h1 className="font-display text-3xl leading-none mb-5">{title}</h1>

        {children}

        {footer && <div className="mt-6 pt-5 border-t border-rtg-border text-sm">{footer}</div>}
      </div>
    </main>
  );
}
