import { useLocation } from "react-router-dom";
import { activeLink } from "../adminNav";

// The banner at the top of every admin screen: the screen's group and icon
// (looked up from the sidebar menu, so nothing is repeated per page), its
// title, a one-line description, optional stat chips and action buttons.
export default function AdminPageHeader({ title, description, actions, stats, icon: IconOverride }) {
  const { pathname } = useLocation();
  const link = activeLink(pathname);
  const Icon = IconOverride || link?.icon;

  return (
    <div className="relative mb-6 overflow-hidden rounded-[1.75rem] bg-[linear-gradient(135deg,#1b1130_0%,#35246f_62%,#5e43a1_100%)] p-5 text-white shadow-[0_24px_60px_-34px_rgba(27,17,48,0.8)] md:p-7">
      <span
        aria-hidden="true"
        className="absolute -right-14 -top-20 h-56 w-56 rounded-full border border-white/10 shadow-[0_0_0_44px_rgba(255,255,255,0.03),0_0_0_96px_rgba(255,255,255,0.02)]"
      />
      <span aria-hidden="true" className="absolute -bottom-16 left-1/4 h-40 w-40 rounded-full bg-rtg-orange-500/25 blur-3xl" />

      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          {Icon && (
            <span className="hidden h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(135deg,#f45b18,#ff8a3d)] shadow-[0_12px_28px_-12px_rgba(247,107,28,0.9)] sm:grid">
              <Icon size={22} />
            </span>
          )}
          <div className="min-w-0">
            {link?.group && <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-rtg-orange-300">{link.group}</p>}
            <h1 className="mt-1 font-display text-3xl leading-none md:text-4xl">{title}</h1>
            {description && <p className="mt-2 max-w-2xl text-sm text-white/70">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>

      {stats?.length > 0 && (
        <div className="relative mt-5 flex flex-wrap gap-2">
          {stats.map((s) => (
            <span key={s.label} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/75 backdrop-blur">
              <b className="font-display text-base leading-none text-white tabular-nums">{s.value}</b> {s.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// Primary action button for the header (orange pill).
export function HeaderButton({ children, ...props }) {
  return (
    <button
      type="button"
      {...props}
      className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#f45b18,#ff8a3d)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_28px_-12px_rgba(247,107,28,0.9)] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
    >
      {children}
    </button>
  );
}
