import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MessagesSquare, LogIn, Search, Users, ChevronRight, Lock, Sparkles } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useChat } from "../lib/ChatContext";
import { useAuthGate } from "../lib/AuthGateContext";
import { formatChatTime } from "../lib/chatFormat";
import { ChatAvatar, AvatarStack, AdminBadge } from "../components/chat/ChatBits";
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
  const [query, setQuery] = useState("");

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

  const othersOnline = useMemo(
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

  const q = query.trim().toLowerCase();
  const matches = (id) => !q || (people[id]?.full_name || "").toLowerCase().includes(q) || (people[id]?.city || "").toLowerCase().includes(q);
  const shownConversations = conversations.filter((c) => matches(c.other_id));
  const shownOnline = othersOnline.filter(({ id }) => matches(id));
  const unreadTotal = conversations.reduce((s, c) => s + (c.unread || 0), 0);

  if (!enabled || !userId) {
    return (
      <section className="px-4 pb-16 pt-28 md:pt-36">
        <div className="relative mx-auto max-w-lg overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#1b1130_0%,#35246f_60%,#5e43a1_100%)] p-8 text-center text-white shadow-[0_30px_80px_-30px_rgba(27,17,48,0.8)] md:p-10">
          <span aria-hidden="true" className="absolute -right-16 -top-20 h-56 w-56 rounded-full border border-white/10 shadow-[0_0_0_44px_rgba(255,255,255,0.03)]" />
          <span aria-hidden="true" className="absolute -bottom-16 left-1/4 h-40 w-40 rounded-full bg-rtg-orange-500/30 blur-3xl" />
          <span className="relative mx-auto mb-5 grid h-16 w-16 place-items-center rounded-3xl bg-[linear-gradient(135deg,#f45b18,#ff8a3d)] shadow-[0_16px_36px_-14px_rgba(247,107,28,0.9)]">
            <MessagesSquare size={28} />
          </span>
          <p className="relative text-[0.6875rem] font-bold uppercase tracking-[0.22em] text-rtg-orange-300">RTG Live</p>
          <h1 className="relative mt-1 font-display text-5xl leading-none">Chat with the crew</h1>
          <p className="relative mx-auto mt-4 max-w-sm text-sm text-white/70">
            The community room, private messages, read receipts and who's online right now. Log in to join.
          </p>
          {enabled ? (
            <button
              type="button"
              onClick={() => requestLogin("login")}
              className="btn-shine relative mt-7 inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#f45b18,#ff8a3d)] px-7 py-3.5 text-sm font-semibold shadow-[0_14px_30px_-12px_rgba(247,107,28,0.9)]"
            >
              <LogIn size={16} /> Log in to chat
            </button>
          ) : (
            <p className="relative mt-6 text-xs text-white/60">Chat isn't connected yet — check back soon.</p>
          )}
        </div>
      </section>
    );
  }

  const showThreadOnMobile = Boolean(target);

  return (
    <section className="px-3 pb-10 pt-24 sm:px-4 md:pt-28">
      <div className="mx-auto max-w-6xl">
        {/* Banner */}
        <div className="relative mb-4 overflow-hidden rounded-[1.75rem] bg-[linear-gradient(135deg,#1b1130_0%,#35246f_62%,#5e43a1_100%)] px-5 py-5 text-white shadow-[0_24px_60px_-34px_rgba(27,17,48,0.8)] md:px-7">
          <span aria-hidden="true" className="absolute -right-14 -top-20 h-52 w-52 rounded-full border border-white/10 shadow-[0_0_0_40px_rgba(255,255,255,0.03)]" />
          <span aria-hidden="true" className="absolute -bottom-16 left-1/3 h-36 w-36 rounded-full bg-rtg-orange-500/25 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[0.6875rem] font-bold uppercase tracking-[0.22em] text-rtg-orange-300">RTG Live</p>
              <h1 className="font-display text-4xl leading-none md:text-5xl">Chat</h1>
            </div>
            <div className="flex items-center gap-3 rounded-full bg-white/10 py-1.5 pl-1.5 pr-4 backdrop-blur">
              {othersOnline.length > 0 ? (
                <AvatarStack people={othersOnline.slice(0, 4).map((o) => o.person)} extra={Math.max(0, othersOnline.length - 4)} />
              ) : (
                <span className="grid h-8 w-8 place-items-center rounded-full bg-white/10">
                  <Users size={15} />
                </span>
              )}
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </span>
              <span className="text-xs font-semibold">
                {othersOnline.length === 0 ? "Only you online right now" : `${othersOnline.length} other${othersOnline.length === 1 ? "" : "s"} online`}
              </span>
            </div>
          </div>
        </div>

        <div className="grid h-[calc(100svh-14rem)] min-h-[540px] overflow-hidden rounded-[2rem] border border-rtg-border bg-white shadow-[0_30px_80px_-30px_rgba(53,36,111,0.35)] lg:grid-cols-[330px_1fr]">
          {/* Sidebar */}
          <aside
            className={`theme-night min-h-0 flex-col bg-[linear-gradient(180deg,#1b1130_0%,#221540_100%)] text-white lg:flex ${showThreadOnMobile ? "hidden" : "flex"}`}
          >
            <div className="p-3 pb-2">
              <label className="relative block">
                <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search people…"
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.07] py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-white/40 focus:border-rtg-orange-400/60 focus:outline-none"
                />
              </label>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 [scrollbar-color:rgba(255,255,255,0.15)_transparent] [scrollbar-width:thin]">
              <button
                type="button"
                onClick={() => open("room")}
                className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-all ${
                  !isDm && (target === "room" || !target)
                    ? "bg-[linear-gradient(90deg,rgba(244,91,24,0.95),rgba(255,138,61,0.85))] shadow-[0_12px_26px_-14px_rgba(247,107,28,0.9)]"
                    : "bg-white/[0.05] hover:bg-white/[0.09]"
                }`}
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/15">
                  <Users size={19} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">Community Room</span>
                  <span className="block truncate text-xs text-white/70">Everyone · plan rides, find the crew</span>
                </span>
                {roomHasNew && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-white shadow-[0_0_0_4px_rgba(255,255,255,0.2)]" aria-label="New messages" />}
                <ChevronRight size={16} className="shrink-0 text-white/50 lg:hidden" />
              </button>

              <p className="mb-1.5 mt-5 flex items-center justify-between px-2 text-[0.625rem] font-bold uppercase tracking-[0.16em] text-white/45">
                <span className="inline-flex items-center gap-1.5">
                  <Lock size={11} /> Private messages
                </span>
                {unreadTotal > 0 && <span className="rounded-full bg-rtg-orange-500 px-2 py-0.5 text-[0.625rem] text-white">{unreadTotal} new</span>}
              </p>
              {shownConversations.length === 0 ? (
                <p className="px-2 py-2 text-xs text-white/50">
                  {q ? "No conversation matches." : "No private chats yet — tap someone who's online, or a name in the room."}
                </p>
              ) : (
                <ul className="space-y-1">
                  {shownConversations.map((c) => {
                    const person = people[c.other_id];
                    const active = target === c.other_id;
                    return (
                      <li key={c.other_id}>
                        <button
                          type="button"
                          onClick={() => open(c.other_id)}
                          className={`flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition-colors ${active ? "bg-white/[0.14]" : "hover:bg-white/[0.07]"}`}
                        >
                          <ChatAvatar person={person} online={online.has(c.other_id)} />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-2">
                              <span className="flex min-w-0 items-center gap-1.5">
                                <span className="truncate text-sm font-semibold">{person?.full_name || "RTG Member"}</span>
                                {person?.is_admin && <AdminBadge />}
                              </span>
                              <span className="shrink-0 text-[0.625rem] text-white/45">{formatChatTime(c.last_at)}</span>
                            </span>
                            <span className={`block truncate text-xs ${c.unread ? "font-semibold text-white" : "text-white/55"}`}>
                              {c.last_from_me ? "You: " : ""}
                              {c.last_body}
                            </span>
                          </span>
                          {c.unread > 0 && (
                            <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-rtg-orange-500 px-1.5 text-[0.625rem] font-bold">{c.unread}</span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              <p className="mb-1.5 mt-5 flex items-center gap-1.5 px-2 text-[0.625rem] font-bold uppercase tracking-[0.16em] text-white/45">
                <span className="h-2 w-2 rounded-full bg-emerald-400" /> Online now · {othersOnline.length}
              </p>
              {shownOnline.length === 0 ? (
                <p className="px-2 py-2 text-xs text-white/50">{q ? "Nobody online matches." : "Nobody else is online right now."}</p>
              ) : (
                <ul className="space-y-0.5">
                  {shownOnline.map(({ id, person }) => (
                    <li key={id}>
                      <button
                        type="button"
                        onClick={() => open(id)}
                        title={`Message ${person?.full_name || "this member"}`}
                        className="group flex w-full items-center gap-3 rounded-2xl p-2 text-left transition-colors hover:bg-white/[0.07]"
                      >
                        <ChatAvatar person={person} online size="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-semibold">{person?.full_name || "RTG Member"}</span>
                            {person?.is_admin && <AdminBadge />}
                          </span>
                          {person?.city && <span className="block truncate text-[0.6875rem] text-white/50">{person.city}</span>}
                        </span>
                        <span className="rounded-full bg-white/10 px-2.5 py-1 text-[0.625rem] font-semibold opacity-0 transition-opacity group-hover:opacity-100">Message</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t border-white/10 px-4 py-3 text-[0.6875rem] text-white/45">
              <span className="inline-flex items-center gap-1.5">
                <Sparkles size={12} className="text-rtg-orange-300" /> Be kind — admins can remove messages and mute members.
              </span>
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
