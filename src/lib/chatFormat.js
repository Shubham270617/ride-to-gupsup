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

const istDay = (t) => new Date(t).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }); // YYYY-MM-DD

// "Today", "Yesterday", "Monday", or "12 Oct 2026" — the label on the day
// divider between messages (India time).
export function dayLabel(iso, now = Date.now()) {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const day = istDay(t);
  if (day === istDay(now)) return "Today";
  if (day === istDay(now - 24 * 60 * 60 * 1000)) return "Yesterday";
  if (now - t < 6 * 24 * 60 * 60 * 1000) return new Date(t).toLocaleDateString("en-IN", { weekday: "long", timeZone: "Asia/Kolkata" });
  return new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
}

// Marks which messages start a new visual group (new author, a gap of more
// than five minutes, or a new day) so only those show a name and avatar,
// and which start a new day (so a divider is drawn above them). The last
// message of each group is marked too — that's where the time goes.
export function groupMessages(messages, authorOf = (m) => m.user_id) {
  const out = messages.map((m, i) => {
    const prev = messages[i - 1];
    const startsDay = !prev || istDay(prev.created_at) !== istDay(m.created_at);
    const startsGroup =
      startsDay ||
      authorOf(prev) !== authorOf(m) ||
      new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() > GROUP_WINDOW_MS;
    return { ...m, startsGroup, startsDay };
  });
  return out.map((m, i) => ({ ...m, endsGroup: !out[i + 1] || out[i + 1].startsGroup }));
}

// The read receipt on one of your private messages.
export function receiptOf(message) {
  if (!message) return null;
  return message.read_at ? { state: "seen", at: message.read_at } : { state: "sent", at: message.created_at };
}

// "Priya is typing…", "Priya and Rahul are typing…", "3 people are typing…"
export function typingLabel(names) {
  const list = names.filter(Boolean);
  if (!list.length) return "";
  if (list.length === 1) return `${list[0]} is typing…`;
  if (list.length === 2) return `${list[0]} and ${list[1]} are typing…`;
  return `${list.length} people are typing…`;
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
