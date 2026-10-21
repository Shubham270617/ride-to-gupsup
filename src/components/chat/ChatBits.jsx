import { ShieldCheck } from "lucide-react";
import { initials } from "../../lib/chatFormat";

const SIZES = {
  sm: "h-8 w-8 text-[length:calc(0.6875rem*var(--rtg-sec,1))]",
  md: "h-10 w-10 text-xs",
  lg: "h-12 w-12 text-sm",
  xl: "h-20 w-20 text-xl",
};

// A member's photo, or their initials on the brand gradient. The green dot
// shows when they have the site open right now.
export function ChatAvatar({ person, online = false, size = "md" }) {
  const name = person?.full_name || "RTG Member";
  return (
    <span className={`relative inline-flex shrink-0 ${SIZES[size]}`}>
      {person?.avatar_url ? (
        <img src={person.avatar_url} alt="" className="h-full w-full rounded-full object-cover ring-2 ring-white" />
      ) : (
        <span className="grid h-full w-full place-items-center rounded-full bg-[linear-gradient(135deg,#35246f,#5e43a1)] font-bold text-white ring-2 ring-white">
          {initials(name)}
        </span>
      )}
      {online && (
        <span
          aria-label="Online"
          className={`absolute -bottom-0.5 -right-0.5 rounded-full bg-emerald-500 ring-2 ring-white ${size === "xl" ? "h-5 w-5" : "h-3 w-3"}`}
        />
      )}
    </span>
  );
}

export function AdminBadge({ className = "" }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-[linear-gradient(135deg,#f45b18,#ff8a3d)] px-2 py-0.5 text-[length:calc(0.5625rem*var(--rtg-sec,1))] font-extrabold uppercase tracking-[0.12em] text-white shadow-[0_6px_14px_-8px_rgba(247,107,28,0.9)] ${className}`}
    >
      <ShieldCheck size={10} strokeWidth={3} /> Admin
    </span>
  );
}

// "Name [ADMIN]" on one line, truncating long names.
export function ChatName({ person, className = "" }) {
  return (
    <span className={`inline-flex min-w-0 items-center gap-1.5 ${className}`}>
      <span className="truncate font-semibold text-rtg-white">{person?.full_name || "RTG Member"}</span>
      {person?.is_admin && <AdminBadge />}
    </span>
  );
}

// Overlapping faces of who's online, with a "+N" for the rest.
export function AvatarStack({ people, extra = 0 }) {
  if (!people.length) return null;
  return (
    <span className="hidden items-center sm:flex" aria-label={`${people.length + extra} online`}>
      {people.map((p, i) => (
        <span key={p?.id || i} className={i ? "-ml-2.5" : ""}>
          <ChatAvatar person={p} size="sm" />
        </span>
      ))}
      {extra > 0 && (
        <span className="-ml-2.5 grid h-8 w-8 place-items-center rounded-full bg-rtg-purple-950 text-[length:calc(0.625rem*var(--rtg-sec,1))] font-bold text-white ring-2 ring-white">
          +{extra}
        </span>
      )}
    </span>
  );
}

// Three bouncing dots — someone is typing.
export function TypingDots() {
  return (
    <span className="flex items-center gap-1" aria-label="typing">
      {[0, 150, 300].map((delay) => (
        <span key={delay} className="h-2 w-2 animate-bounce rounded-full bg-rtg-mist/70" style={{ animationDelay: `${delay}ms`, animationDuration: "900ms" }} />
      ))}
    </span>
  );
}
