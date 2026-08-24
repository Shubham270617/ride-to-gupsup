const SESSION_KEY = "rtg_ai_session_id";

// One id per browser, persisted in localStorage — lets a guest's chat
// history survive a page refresh/revisit without requiring an account, and
// doubles as the row key api/ai/chat.js upserts ai_conversations against.
export function getAiSessionId() {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export async function sendAiMessage({ sessionId, message, history, token }) {
  const res = await fetch("/api/ai/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ sessionId, message, history }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data.reply;
}
