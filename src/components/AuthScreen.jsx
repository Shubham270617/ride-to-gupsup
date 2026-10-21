import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X, Check, ShieldCheck, Mail, KeyRound, Lock } from "lucide-react";
import { images } from "../data/images";
import { brand } from "../data/content";

// The frame the standalone auth screens sit in — /forgot-password and
// /reset-password. These routes live outside <Layout>, like /auth/callback
// and /onboarding do, so they have no navbar or footer of their own and
// have to draw their own frame.
//
// Same split shape as /admin/login (photo + brand panel left, card right)
// so someone arriving from a password-reset email recognises the site.
//
// `step` (0–3) drives the Email → Verify → New password tracker; 3 means
// every step is done. Leave it out to hide the tracker.

const RESET_STEPS = [
  { label: "Email", hint: "Tell us where to send it", Icon: Mail },
  { label: "Verify", hint: "Code or link from your inbox", Icon: KeyRound },
  { label: "New password", hint: "Then you're straight back in", Icon: Lock },
];

function StepList({ step }) {
  return (
    <ol className="relative mt-10 max-w-sm space-y-2">
      {RESET_STEPS.map(({ label, hint, Icon }, i) => {
        const done = step > i;
        const current = step === i;
        return (
          <li
            key={label}
            className={`relative flex items-center gap-4 rounded-2xl border px-4 py-3.5 backdrop-blur-sm transition-all duration-500 ${
              current
                ? "border-rtg-orange-400/60 bg-white/[0.13] shadow-[0_10px_40px_-12px_rgba(247,107,28,0.6)]"
                : "border-white/10 bg-white/[0.05]"
            }`}
          >
            <span
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-colors duration-500 ${
                done || current ? "bg-[linear-gradient(135deg,#f45b18,#ff8a3d)] text-white" : "bg-white/10 text-white/50"
              }`}
            >
              {done ? <Check size={18} strokeWidth={3} /> : <Icon size={18} />}
            </span>
            <span className="min-w-0">
              <strong className={`block text-sm font-semibold ${done || current ? "text-white" : "text-white/60"}`}>
                {label}
              </strong>
              <small className="block text-xs text-white/55">{hint}</small>
            </span>
            {current && (
              <span className="ml-auto relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rtg-orange-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rtg-orange-400" />
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

// The compact tracker inside the card, for screens without the side panel.
function StepDots({ step }) {
  return (
    <div className="mb-7 flex items-center gap-2 lg:hidden" aria-hidden="true">
      {RESET_STEPS.map(({ label }, i) => (
        <div key={label} className="flex-1">
          <div className="h-1.5 overflow-hidden rounded-full bg-rtg-purple-950/[0.07]">
            <motion.div
              className="h-full rounded-full bg-[linear-gradient(90deg,#f45b18,#ff8a3d)]"
              initial={false}
              animate={{ width: step > i ? "100%" : step === i ? "50%" : "0%" }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
          <p className={`mt-1.5 text-[length:calc(0.625rem*var(--rtg-sec,1))] font-semibold uppercase tracking-[0.12em] ${step >= i ? "text-rtg-orange-600" : "text-rtg-mist/70"}`}>
            {label}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function AuthScreen({ eyebrow, title, subtitle, icon: HeaderIcon, step, children, footer }) {
  const navigate = useNavigate();
  const showSteps = typeof step === "number";

  return (
    <div className="min-h-svh bg-rtg-ink lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* LEFT — photo + brand panel (large screens) */}
      <aside className="theme-night relative isolate hidden lg:flex flex-col justify-between overflow-hidden p-12 xl:p-16 text-white bg-[#1b1130]">
        <motion.div
          aria-hidden="true"
          className="absolute inset-0 -z-20 bg-cover bg-center"
          style={{ backgroundImage: `url(${images.heroCycling})` }}
          initial={{ scale: 1.12 }}
          animate={{ scale: 1 }}
          transition={{ duration: 8, ease: "easeOut" }}
        />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(150deg,rgba(27,17,48,0.95)_0%,rgba(53,36,111,0.85)_55%,rgba(247,107,28,0.55)_130%)]" />
        <div aria-hidden="true" className="absolute -right-40 -top-40 -z-10 h-[520px] w-[520px] rounded-full border border-white/10 shadow-[0_0_0_70px_rgba(255,255,255,0.03),0_0_0_150px_rgba(255,255,255,0.02)]" />
        <div aria-hidden="true" className="absolute -left-24 bottom-24 -z-10 h-72 w-72 rounded-full bg-rtg-orange-500/25 blur-3xl" />

        <Link to="/" className="inline-flex self-start rounded-2xl bg-white px-4 py-2.5 shadow-lg transition-transform hover:-translate-y-0.5">
          <img src={images.logoNav} alt={brand.name} className="h-9 w-auto" />
        </Link>

        <div>
          <p className="mb-4 inline-flex items-center gap-2 text-[length:calc(0.6875rem*var(--rtg-sec,1))] font-bold uppercase tracking-[0.22em] text-rtg-orange-300">
            <ShieldCheck size={14} /> Account recovery
          </p>
          <h2 className="font-display text-6xl xl:text-7xl leading-[0.9]">
            Lost the trail?
            <span className="block text-gradient">Back in the saddle.</span>
          </h2>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-white/75">
            One email, one code, one new password — and you're riding with the crew again in under a minute.
          </p>

          {showSteps && <StepList step={step} />}
        </div>

        <p className="inline-flex items-center gap-2 text-xs text-white/55">
          <ShieldCheck size={13} /> Codes and links work once and expire in 30 minutes.
        </p>
      </aside>

      {/* RIGHT — the card */}
      <main className="relative isolate flex min-h-svh items-center justify-center overflow-hidden px-4 py-10 sm:px-5">
        <div aria-hidden="true" className="absolute -left-24 top-10 -z-10 h-72 w-72 rounded-full bg-rtg-orange-400/20 blur-3xl animate-pulse [animation-duration:6s]" />
        <div aria-hidden="true" className="absolute -right-20 bottom-0 -z-10 h-80 w-80 rounded-full bg-rtg-purple-600/20 blur-3xl animate-pulse [animation-duration:8s]" />

        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-md rounded-[2rem] border border-rtg-border bg-white p-7 sm:p-10 shadow-[0_30px_80px_-30px_rgba(53,36,111,0.35)]"
        >
          <span aria-hidden="true" className="absolute inset-x-10 top-0 h-1 rounded-b-full bg-[linear-gradient(90deg,#f45b18,#ff8a3d,#b981d8)]" />
          <button
            onClick={() => navigate("/")}
            aria-label="Back to the site"
            className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center text-rtg-mist hover:text-rtg-orange-500 hover:bg-rtg-purple-950/5 transition-colors"
          >
            <X size={18} />
          </button>

          <Link to="/" className="inline-block lg:hidden">
            <img src={images.logoNav} alt={brand.name} className="h-10 w-auto mb-6" />
          </Link>

          {showSteps && <StepDots step={step} />}

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={title}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
            >
              {HeaderIcon && (
                <span className="mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-[linear-gradient(135deg,#f45b18,#ff8a3d)] text-white shadow-[0_14px_30px_-10px_rgba(247,107,28,0.7)]">
                  <HeaderIcon size={24} />
                </span>
              )}
              {eyebrow && (
                <p className="mb-2 inline-flex items-center rounded-full bg-rtg-orange-500/10 px-3 py-1 text-[length:calc(0.625rem*var(--rtg-sec,1))] font-bold uppercase tracking-[0.16em] text-rtg-orange-600">
                  {eyebrow}
                </p>
              )}
              <h1 className="font-display text-4xl leading-none mb-2">{title}</h1>
              {subtitle && <div className="text-sm text-rtg-mist leading-relaxed mb-6">{subtitle}</div>}
              {!subtitle && <div className="mb-5" />}

              {children}
            </motion.div>
          </AnimatePresence>

          {footer && <div className="mt-6 pt-5 border-t border-rtg-border text-sm">{footer}</div>}
        </motion.div>
      </main>
    </div>
  );
}
