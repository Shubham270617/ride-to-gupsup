import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MessagesSquare, LogIn, Circle, ChevronRight } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useChat } from "../lib/ChatContext";
import { useAuthGate } from "../lib/AuthGateContext";
import { formatChatTime } from "../lib/chatFormat";
import { ChatAvatar, ChatName } from "../components/chat/ChatBits";
import ChatThread from "../components/chat/ChatThread";

// /chat — the community room everyone can read, private one-to-one
// messages, and who's online right now (admins carry a badge). Live through
// Supabase Realtime; the shared state is in lib/ChatContext.jsx.
//
// ?c=room opens the room, ?c=<member id> a private chat. Without ?c the
// room is shown on wide screens, and the list of conversations on phones.
export default function Chat() {
  const chat = useChat();
  const { enabled, userId, online, people, ensurePeople, roomHasNew, conversationsVersion } = chat;
  const { requestLogin } = useAuthGate();
  const [params, setParams] = useSearchParams();
  const target = params.get("c");
  const [conversations, setConversations] = useState([]);

  const open = (c) => setParams(c ? { c } : {});
  const isDm = Boolean(target && target !== "room" && target !== userId);

  useEffect(() => {
    if (!enabled || !userId) return;
    let cancelled = false;
    supabase.rpc("chat_conversations").then(({ data }) => {
      if (cancelled) return;
      setConversations(data || []);
      ensurePeople((data || []).map((c) => c.other_id));
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, userId, conversationsVersion, ensurePeople]);

  const onlinePeople = useMemo(
    () =>
      [...online]
        .filter((id) => id !== userId)
        .map((id) => ({ id, person: people[id] }))
        .sort(
          (a, b) =>
            Number(Boolean(b.person?.is_admin)) - Number(Boolean(a.person?.is_admin)) ||
            (a.person?.full_name || "").localeCompare(b.person?.full_name || "")
        ),
    [online, people, userId]
  );

  if (!enabled || !userId) {
    return (
      <section className="px-4 pb-16 pt-28 md:pt-36">
        <div className="mx-auto max-w-md rounded-[2rem] border border-rtg-border bg-white p-8 text-center shadow-[0_30px_80px_-30px_rgba(53,36,111,0.35)]">
          <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[linear-gradient(135deg,#f45b18,#ff8a3d)] text-white">
            <MessagesSquare size={24} />
          </span>
          <h1 className="font-display text-4xl leading-none">RTG Chat</h1>
          <p className="mt-3 text-sm text-rtg-mist">
            Talk to the crew live — the community room, private messages, and who's riding online right now. Log in to join.
          </p>
          {enabled ? (
            <button
              type="button"
              onClick={() => requestLogin("login")}
              className="btn-shine mt-6 inline-flex items-center gap-2 rounded-full bg-rtg-orange-500 px-6 py-3 text-sm font-semibold text-white hover:bg-rtg-orange-400"
            >
              <LogIn size={16} /> Log in to chat
            </button>
          ) : (
            <p className="mt-6 text-xs text-rtg-mist">Chat isn't connected yet — check back soon.</p>
          )}
        </div>
      </section>
    );
  }

  const showThreadOnMobile = Boolean(target);

  return (
    <section className="px-3 pb-10 pt-24 sm:px-4 md:pt-32">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2 px-1">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-rtg-orange-600">RTG Live</p>
            <h1 className="font-display text-4xl leading-none md:text-5xl">Chat</h1>
          </div>
          <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-rtg-white shadow-sm ring-1 ring-rtg-border">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            {online.size} online now
          </p>
        </div>

        <div className="grid h-[calc(100svh-11rem)] min-h-[520px] overflow-hidden rounded-[2rem] border border-rtg-border bg-white shadow-[0_30px_80px_-30px_rgba(53,36,111,0.35)] md:h-[calc(100svh-13rem)] lg:grid-cols-[320px_1fr]">
          {/* Sidebar */}
          <aside className={`min-h-0 flex-col border-rtg-border lg:flex lg:border-r ${showThreadOnMobile ? "hidden" : "flex"}`}>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <button
                type="button"
                onClick={() => open("room")}
                className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-colors ${
                  !isDm && (target === "room" || !target) ? "bg-rtg-orange-500/10" : "hover:bg-rtg-purple-950/[0.04]"
                }`}
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(135deg,#f45b18,#ff8a3d)] text-white">
                  <MessagesSquare size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-rtg-white">Community Room</span>
                  <span className="block truncate text-xs text-rtg-mist">Everyone · plan rides, find the crew</span>
                </span>
                {roomHasNew && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-rtg-orange-500" aria-label="New messages" />}
                <ChevronRight size={16} className="shrink-0 text-rtg-mist lg:hidden" />
              </button>

              <p className="mb-1 mt-5 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-rtg-mist">Messages</p>
              {conversations.length === 0 ? (
                <p className="px-3 py-2 text-xs text-rtg-mist">No private chats yet. Tap someone who's online to start one.</p>
              ) : (
                <ul>
                  {conversations.map((c) => {
                    const person = people[c.other_id];
                    const active = target === c.other_id;
                    return (
                      <li key={c.other_id}>
                        <button
                          type="button"
                          onClick={() => open(c.other_id)}
                          className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-colors ${
                            active ? "bg-rtg-orange-500/10" : "hover:bg-rtg-purple-950/[0.04]"
                          }`}
                        >
                          <ChatAvatar person={person} online={online.has(c.other_id)} />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-2">
                              <ChatName person={person} className="text-sm" />
                              <span className="shrink-0 text-[10px] text-rtg-mist">{formatChatTime(c.last_at)}</span>
                            </span>
                            <span className={`block truncate text-xs ${c.unread ? "font-semibold text-rtg-white" : "text-rtg-mist"}`}>
                              {c.last_from_me ? "You: " : ""}
                              {c.last_body}
                            </span>
                          </span>
                          {c.unread > 0 && (
                            <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-rtg-orange-500 px-1.5 text-[10px] font-bold text-white">
                              {c.unread}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              <p className="mb-1 mt-5 flex items-center gap-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-rtg-mist">
                <Circle size={7} className="fill-emerald-500 text-emerald-500" /> Online now · {onlinePeople.length}
              </p>
              {onlinePeople.length === 0 ? (
                <p className="px-3 py-2 text-xs text-rtg-mist">Nobody else is online right now.</p>
              ) : (
                <ul>
                  {onlinePeople.map(({ id, person }) => (
                    <li key={id}>
                      <button
                        type="button"
                        onClick={() => open(id)}
                        title={`Message ${person?.full_name || "this member"}`}
                        className="flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition-colors hover:bg-rtg-purple-950/[0.04]"
                      >
                        <ChatAvatar person={person} online size="sm" />
                        <span className="min-w-0 flex-1">
                          <ChatName person={person} className="text-sm" />
                          {person?.city && <span className="block truncate text-[11px] text-rtg-mist">{person.city}</span>}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>

          {/* Conversation */}
          <div className={`min-h-0 ${showThreadOnMobile ? "block" : "hidden"} lg:block`}>
            {isDm ? (
              <ChatThread key={target} mode="dm" otherId={target} onBack={() => open(null)} onOpenPerson={open} />
            ) : (
              <ChatThread key="room" mode="room" onBack={() => open(null)} onOpenPerson={open} />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
