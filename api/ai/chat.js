import { getSupabaseAdmin } from "../lib/supabaseAdmin.js";

const MODEL = "claude-haiku-4-5-20251001";
const MAX_HISTORY_TURNS = 16;

const DEFAULT_SYSTEM_PROMPT = `You help members and visitors of Ride Tea GupShup (RTG), an Indian endurance
sports community for cycling, running, and swimming. You do three things:
1. Chat — answer questions about events, joining RTG, routes, and weekly sessions.
2. Plans — suggest a simple training plan or route idea based on the person's fitness level and goals.
3. Discovery — help someone find the right event, weekly session, or gear by describing what they want in plain language.

Be warm, concise, and practical — like a friendly, knowledgeable club member, not a corporate bot.
Use the live RTG data provided below when relevant; if you don't have real data for something, say so
honestly instead of inventing dates, prices, or event names. Keep replies short (a few sentences) unless
the person clearly wants detail.`;

async function loadSettings(supabaseAdmin) {
  const { data } = await supabaseAdmin
    .from("site_settings")
    .select("key,value")
    .in("key", ["ai.enabled", "ai.name", "ai.systemPrompt"]);
  const map = {};
  (data || []).forEach((r) => {
    map[r.key] = r.value;
  });
  return {
    enabled: map["ai.enabled"] !== "false",
    name: map["ai.name"] || "Tapri",
    systemPrompt: map["ai.systemPrompt"] || DEFAULT_SYSTEM_PROMPT,
  };
}

// A small, fresh snapshot of real RTG data so the assistant answers with
// actual upcoming events/sessions instead of guessing — same tables the
// public site itself reads from.
async function loadGroundingData(supabaseAdmin) {
  const [events, sessions, challenges] = await Promise.all([
    supabaseAdmin
      .from("events")
      .select("title,event_date,event_type,categories,description")
      .eq("published", true)
      .order("sort_order")
      .limit(8),
    supabaseAdmin
      .from("weekly_sessions")
      .select("name,day,format,difficulty,description")
      .eq("published", true)
      .order("sort_order")
      .limit(8),
    supabaseAdmin
      .from("challenges")
      .select("title,description,end_date")
      .eq("published", true)
      .order("sort_order")
      .limit(6),
  ]);
  return { events: events.data || [], weeklySessions: sessions.data || [], challenges: challenges.data || [] };
}

function formatEvent(e) {
  return `• ${e.title}${e.event_date ? ` — ${e.event_date}` : ""}`;
}

function formatSession(s) {
  return `• ${s.day}: ${s.name}${s.difficulty ? ` (${s.difficulty})` : ""}`;
}

// Rule-based answers used until an admin adds an Anthropic API key — no LLM
// call, just keyword matching against the same live data the real assistant
// will eventually reason over. Deliberately narrow: a few genuinely useful
// questions (how many events, how to join, what's this week) answered with
// real numbers, rather than pretending to be smarter than it is.
function staticFallbackReply(text, grounding, name) {
  const t = text.toLowerCase();

  if (/how (many|much)|number of/.test(t) && /event/.test(t)) {
    const { events } = grounding;
    if (!events.length) return "There aren't any upcoming events published yet — check back soon, or take a look at the Events page.";
    return `There ${events.length === 1 ? "is" : "are"} currently ${events.length} upcoming event${events.length === 1 ? "" : "s"} listed:\n${events.map(formatEvent).join("\n")}\n\nSee full details on the Events page.`;
  }

  if (/join|become a member|sign ?up|how (do|can) i (get involved|start)/.test(t)) {
    return "Joining RTG is free — hit \"Join Community\" on the homepage, sign up with email, phone, or Google, and you're in. You can also just show up to a Weekly Ride to meet everyone first, no signup required.";
  }

  if (/weekly|this week|schedule|what.*(session|ride).*week/.test(t)) {
    const { weeklySessions } = grounding;
    if (!weeklySessions.length) return "Weekly session details are being updated — check the Weekly Rides page for the latest.";
    return `Here's our weekly rhythm:\n${weeklySessions.map(formatSession).join("\n")}\n\nFull details (routes, difficulty, how to join) are on the Weekly Rides page.`;
  }

  if (/challenge/.test(t)) {
    const { challenges } = grounding;
    if (!challenges.length) return "No active challenges right now — check back soon!";
    return `Current challenges:\n${challenges.map((c) => `• ${c.title}`).join("\n")}`;
  }

  return `${name} here — I'm running in basic mode right now (my full AI brain isn't switched on yet), but I can answer real questions about events, weekly sessions, and challenges, or tell you how to join. Try asking "how many events are there?" or "what's on this week?"`;
}

async function getOrCreateConversation(supabaseAdmin, sessionId, userId) {
  const { data: existing } = await supabaseAdmin
    .from("ai_conversations")
    .select("id")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await supabaseAdmin
    .from("ai_conversations")
    .insert({ session_id: sessionId, user_id: userId || null })
    .select("id")
    .single();
  if (error) throw error;
  return created.id;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const { sessionId, message, history } = req.body || {};
  if (!sessionId || typeof sessionId !== "string") {
    res.status(400).json({ error: "missing_session_id" });
    return;
  }
  const text = typeof message === "string" ? message.trim() : "";
  if (!text) {
    res.status(400).json({ error: "missing_message" });
    return;
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    res.status(500).json({ error: "server_misconfigured" });
    return;
  }

  // Optional — if a logged-in member is chatting, attribute the
  // conversation to them so they (and admins) can find it later. Guests
  // chat too; this just falls back to null.
  let userId = null;
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (token) {
    const { data: userData } = await supabaseAdmin.auth.getUser(token);
    userId = userData?.user?.id || null;
  }

  const settings = await loadSettings(supabaseAdmin);
  if (!settings.enabled) {
    res.status(200).json({ reply: "The AI assistant is switched off right now — check back soon!" });
    return;
  }

  let conversationId;
  try {
    conversationId = await getOrCreateConversation(supabaseAdmin, sessionId, userId);
    await supabaseAdmin.from("ai_messages").insert({ conversation_id: conversationId, role: "user", content: text });
  } catch (err) {
    res.status(500).json({ error: "log_failed", message: err.message });
    return;
  }

  const grounding = await loadGroundingData(supabaseAdmin);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const reply = staticFallbackReply(text, grounding, settings.name);
    await supabaseAdmin.from("ai_messages").insert({ conversation_id: conversationId, role: "assistant", content: reply });
    await supabaseAdmin.from("ai_conversations").update({ last_message_at: new Date().toISOString() }).eq("id", conversationId);
    res.status(200).json({ reply });
    return;
  }

  const systemPrompt = `${settings.systemPrompt}\n\nYour name is ${settings.name}.\n\nCurrent RTG data (JSON):\n${JSON.stringify(grounding)}`;

  const priorTurns = Array.isArray(history) ? history.slice(-MAX_HISTORY_TURNS) : [];
  const messages = [
    ...priorTurns
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: text },
  ];

  let reply;
  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 600,
        system: systemPrompt,
        messages,
      }),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data?.error?.message || "Anthropic API request failed.");
    reply = (data.content || []).map((block) => block.text || "").join("").trim() || "Sorry, I didn't catch that — could you rephrase?";
  } catch (err) {
    reply = "I'm having trouble thinking right now — please try again in a moment.";
    res.status(200).json({ reply, error: err.message });
    return;
  }

  await supabaseAdmin
    .from("ai_messages")
    .insert({ conversation_id: conversationId, role: "assistant", content: reply });
  await supabaseAdmin.from("ai_conversations").update({ last_message_at: new Date().toISOString() }).eq("id", conversationId);

  res.status(200).json({ reply });
}
