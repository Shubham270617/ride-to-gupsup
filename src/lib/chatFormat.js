// Small pure helpers for the chat UI (src/pages/Chat.jsx), kept apart so
// they can be tested without a browser.

export const MAX_MESSAGE_LENGTH = 1000;

// Messages from the same person within this window share one header.
const GROUP_WINDOW_MS = 5 * 60 * 1000;

// "just now", "5m", "14:05" today, "Mon 14:05" this week, "12 Oct" older.
export function formatChatTime(iso, now = Date.now()) {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const diff = now - t;
  if (diff < 60 * 1000) return "just now";
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)}m`;
  const d = new Date(t);
  const today = new Date(now);
  const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" });
  const sameDay = d.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" }) === today.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" });
  if (sameDay) return time;
  if (diff < 6 * 24 * 60 * 60 * 1000) {
    return `${d.toLocaleDateString("en-IN", { weekday: "short", timeZone: "Asia/Kolkata" })} ${time}`;
  }
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
}

export function initials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "R";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

// Marks which messages start a new visual group (new author, or a gap of
// more than five minutes) so only those show a name and avatar.
export function groupMessages(messages, authorOf = (m) => m.user_id) {
  return messages.map((m, i) => {
    const prev = messages[i - 1];
    const startsGroup =
      !prev ||
      authorOf(prev) !== authorOf(m) ||
      new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() > GROUP_WINDOW_MS;
    return { ...m, startsGroup };
  });
}

// Turns a Postgres/Supabase error from posting into something to show.
export function chatErrorMessage(error) {
  const text = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`;
  if (/chat_rate_limited/.test(text)) return "Slow down a little — max 5 messages every 10 seconds.";
  if (/row-level security|violates row-level/i.test(text)) return "You can't post right now — an admin may have muted you.";
  if (/check constraint/i.test(text)) return `Messages must be 1 to ${MAX_MESSAGE_LENGTH} characters.`;
  return "Couldn't send that. Check your connection and try again.";
}

// Keeps a message list sorted and free of duplicates when realtime and the
// sender's own insert both deliver the same row.
export function mergeMessage(list, message) {
  const at = list.findIndex((m) => m.id === message.id);
  if (at >= 0) {
    const next = list.slice();
    next[at] = { ...list[at], ...message };
    return next;
  }
  const next = [...list, message];
  next.sort((a, b) => new Date(a.created_at) - new Date(b.created_at) || a.id - b.id);
  return next;
}
