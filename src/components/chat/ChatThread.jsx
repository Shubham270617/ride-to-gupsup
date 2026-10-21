import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Send, Trash2, VolumeX, Volume2, Loader2, MessagesSquare, Check, CheckCheck, Smile, ArrowDown, Lock, Users } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { useChat } from "../../lib/ChatContext";
import useTyping from "../../lib/useTyping";
import { MAX_MESSAGE_LENGTH, chatErrorMessage, dayLabel, formatChatTime, groupMessages, mergeMessage, typingLabel } from "../../lib/chatFormat";
import { ChatAvatar, ChatName, AvatarStack, TypingDots } from "./ChatBits";

const PAGE = 50;
const ROOM_COLUMNS = "id, user_id, body, created_at, deleted_at";
const DM_COLUMNS = "id, sender_id, recipient_id, body, created_at, read_at";
const EMOJI = ["👍", "🔥", "🚴", "🏃", "🏊", "💪", "☕", "😂", "😍", "🙌", "👏", "🎉", "⛰️", "🗺️", "📍", "⏰", "🙏", "😅", "🤝", "❤️"];

const timeOf = (iso) =>
  new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" });

// One conversation: the community room (mode "room") or a private chat with
// one member (mode "dm", otherId). Loads the latest 50 messages, streams new
// ones in live, shows who's typing, read receipts on private messages, and
// pages back with "Load earlier".
export default function ChatThread({ mode, otherId, onBack, onOpenPerson }) {
  const chat = useChat();
  const { userId, people, online, ensurePeople, isMuted, isAdmin, onRoomEvent, onDirectEvent, refreshUnread, setViewingRoom } = chat;
  const isRoom = mode === "room";
  const authorOf = useCallback((m) => (isRoom ? m.user_id : m.sender_id), [isRoom]);
  const typingRoom = isRoom ? "room" : otherId && userId ? `dm:${[userId, otherId].sort().join(":")}` : null;
  const { typingIds, announce, stop } = useTyping(typingRoom, userId);

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [activeId, setActiveId] = useState(null);
  const [muted, setMuted] = useState(() => new Set());
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [newBelow, setNewBelow] = useState(0);

  const scroller = useRef(null);
  const input = useRef(null);
  const stickToBottom = useRef(true);
  const preserveFrom = useRef(null);

  const baseQuery = useCallback(() => {
    if (isRoom) return supabase.from("chat_messages").select(ROOM_COLUMNS);
    return supabase
      .from("direct_messages")
      .select(DM_COLUMNS)
      .or(`and(sender_id.eq.${userId},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${userId})`);
  }, [isRoom, userId, otherId]);

  const markRead = useCallback(async () => {
    if (isRoom || !otherId) return;
    await supabase.rpc("chat_mark_read", { p_other: otherId });
    refreshUnread();
  }, [isRoom, otherId, refreshUnread]);

  // --- initial load ---------------------------------------------------------
  useEffect(() => {
    if (!userId || (!isRoom && !otherId)) return undefined;
    let cancelled = false;
    setLoading(true);
    setMessages([]);
    setError("");
    setActiveId(null);
    setNewBelow(0);
    stickToBottom.current = true;
    if (!isRoom) ensurePeople([otherId]);

    baseQuery()
      .order("created_at", { ascending: false })
      .limit(PAGE)
      .then(({ data }) => {
        if (cancelled) return;
        const rows = (data || []).slice().reverse();
        setMessages(rows);
        setHasMore((data || []).length === PAGE);
        setLoading(false);
        ensurePeople(rows.map(authorOf));
      });
    if (!isRoom) markRead();

    return () => {
      cancelled = true;
    };
  }, [userId, isRoom, otherId, baseQuery, ensurePeople, authorOf, markRead]);

  // The room tells the floating button "seen" while it is open.
  useEffect(() => {
    if (!isRoom) return undefined;
    setViewingRoom(true);
    return () => setViewingRoom(false);
  }, [isRoom, setViewingRoom]);

  // Admins see who is muted, so the menu can offer Unmute.
  useEffect(() => {
    if (!isAdmin || !isRoom) return;
    supabase
      .from("chat_bans")
      .select("user_id")
      .then(({ data }) => setMuted(new Set((data || []).map((b) => b.user_id))));
  }, [isAdmin, isRoom]);

  useEffect(() => {
    if (typingIds.length) ensurePeople(typingIds);
  }, [typingIds, ensurePeople]);

  // --- live updates ---------------------------------------------------------
  const arrive = useCallback(
    (row) => {
      setMessages((list) => {
        const isNew = !list.some((m) => m.id === row.id);
        if (isNew && !stickToBottom.current && authorOf(row) !== userId) setNewBelow((n) => n + 1);
        return mergeMessage(list, row);
      });
    },
    [authorOf, userId]
  );

  useEffect(() => {
    if (isRoom) return onRoomEvent((_event, row) => arrive(row));
    return onDirectEvent((_event, row) => {
      const involves =
        (row.sender_id === otherId && row.recipient_id === userId) || (row.sender_id === userId && row.recipient_id === otherId);
      if (!involves) return;
      arrive(row);
      if (row.sender_id === otherId && !row.read_at) markRead();
    });
  }, [isRoom, otherId, userId, onRoomEvent, onDirectEvent, markRead, arrive]);

  // --- scrolling ------------------------------------------------------------
  const scrollToBottom = (smooth = false) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    stickToBottom.current = true;
    setNewBelow(0);
  };

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (stickToBottom.current) setNewBelow(0);
  };

  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (preserveFrom.current != null) {
      el.scrollTop = el.scrollHeight - preserveFrom.current;
      preserveFrom.current = null;
    } else if (stickToBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, loading, typingIds.length]);

  const loadEarlier = async () => {
    if (!messages.length) return;
    setLoadingMore(true);
    const { data } = await baseQuery().lt("created_at", messages[0].created_at).order("created_at", { ascending: false }).limit(PAGE);
    const rows = (data || []).slice().reverse();
    preserveFrom.current = scroller.current ? scroller.current.scrollHeight - scroller.current.scrollTop : null;
    setMessages((list) => rows.reduce(mergeMessage, list));
    setHasMore((data || []).length === PAGE);
    ensurePeople(rows.map(authorOf));
    setLoadingMore(false);
  };

  // --- sending --------------------------------------------------------------
  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError("");
    stop();
    const insert = isRoom
      ? supabase.from("chat_messages").insert({ user_id: userId, body }).select(ROOM_COLUMNS).single()
      : supabase.from("direct_messages").insert({ sender_id: userId, recipient_id: otherId, body }).select(DM_COLUMNS).single();
    const { data, error: sendError } = await insert;
    setSending(false);
    if (sendError) {
      setError(chatErrorMessage(sendError));
      return;
    }
    setDraft("");
    setEmojiOpen(false);
    setMessages((list) => mergeMessage(list, data));
    requestAnimationFrame(() => scrollToBottom(true));
    input.current?.focus();
  };

  const onChange = (e) => {
    const value = e.target.value.slice(0, MAX_MESSAGE_LENGTH);
    setDraft(value);
    if (value.trim()) announce();
    else stop();
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };

  const addEmoji = (emoji) => {
    setDraft((d) => (d + emoji).slice(0, MAX_MESSAGE_LENGTH));
    announce();
    input.current?.focus();
  };

  // --- moderation (room only) -----------------------------------------------
  const removeMessage = async (m) => {
    if (!window.confirm("Remove this message for everyone?")) return;
    const { error: delError } = await supabase.rpc("chat_delete_message", { p_id: m.id });
    if (delError) {
      setError("Couldn't remove that message.");
      return;
    }
    setMessages((list) => mergeMessage(list, { ...m, body: "", deleted_at: new Date().toISOString() }));
    setActiveId(null);
  };

  const toggleMute = async (memberId) => {
    const name = people[memberId]?.full_name || "this member";
    const isMutedNow = muted.has(memberId);
    if (!window.confirm(isMutedNow ? `Let ${name} post again?` : `Mute ${name}? They'll still read the chat but can't post or send messages.`)) return;
    const { error: muteError } = isMutedNow
      ? await supabase.from("chat_bans").delete().eq("user_id", memberId)
      : await supabase.from("chat_bans").insert({ user_id: memberId });
    if (muteError) {
      setError("Couldn't change that member's mute.");
      return;
    }
    setMuted((prev) => {
      const next = new Set(prev);
      if (isMutedNow) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
    setActiveId(null);
  };

  const grouped = useMemo(() => groupMessages(messages, authorOf), [messages, authorOf]);
  const other = otherId ? people[otherId] : null;
  const otherOnline = Boolean(otherId && online.has(otherId));
  const othersOnline = [...online].filter((id) => id !== userId);
  const typingNames = typingIds.map((id) => people[id]?.full_name?.split(" ")[0] || "Someone");
  const lastMine = !isRoom ? [...grouped].reverse().find((m) => m.sender_id === userId) : null;

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-[radial-gradient(circle_at_100%_0%,rgba(255,138,61,0.07),transparent_40%),radial-gradient(circle_at_0%_100%,rgba(94,67,161,0.07),transparent_45%)]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-rtg-border bg-white/85 px-4 py-3 backdrop-blur sm:px-5">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="-ml-1 grid h-9 w-9 place-items-center rounded-full text-rtg-mist hover:bg-rtg-purple-950/5 hover:text-rtg-orange-500 lg:hidden"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        {isRoom ? (
          <>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(135deg,#f45b18,#ff8a3d)] text-white shadow-[0_10px_22px_-10px_rgba(247,107,28,0.9)]">
              <Users size={19} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-xl leading-none">Community Room</p>
              <p className="mt-1 truncate text-xs text-rtg-mist">
                {typingNames.length ? (
                  <span className="font-semibold text-rtg-orange-600">{typingLabel(typingNames)}</span>
                ) : (
                  <>Everyone in RTG can read this · {othersOnline.length} other{othersOnline.length === 1 ? "" : "s"} online</>
                )}
              </p>
            </div>
            <AvatarStack people={othersOnline.slice(0, 5).map((id) => people[id])} extra={Math.max(0, othersOnline.length - 5)} />
          </>
        ) : (
          <>
            <ChatAvatar person={other} online={otherOnline} size="lg" />
            <div className="min-w-0 flex-1">
              <ChatName person={other} className="max-w-full text-base" />
              <p className="mt-0.5 flex items-center gap-1.5 text-xs">
                {typingNames.length ? (
                  <span className="font-semibold text-rtg-orange-600">typing…</span>
                ) : otherOnline ? (
                  <span className="font-semibold text-emerald-700">Online now</span>
                ) : (
                  <span className="text-rtg-mist">Offline</span>
                )}
                <span className="text-rtg-mist">·</span>
                <span className="inline-flex items-center gap-1 text-rtg-mist">
                  <Lock size={11} /> Private
                </span>
              </p>
            </div>
          </>
        )}
      </div>

      {/* Messages */}
      <div ref={scroller} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6">
        {loading ? (
          <div className="grid h-full place-items-center text-rtg-mist">
            <Loader2 className="animate-spin" size={22} />
          </div>
        ) : (
          <>
            {hasMore && (
              <div className="mb-4 text-center">
                <button
                  type="button"
                  onClick={loadEarlier}
                  disabled={loadingMore}
                  className="rounded-full border border-rtg-border bg-white px-4 py-1.5 text-xs font-semibold text-rtg-mist shadow-sm hover:text-rtg-orange-500 disabled:opacity-60"
                >
                  {loadingMore ? "Loading…" : "Load earlier messages"}
                </button>
              </div>
            )}

            {!grouped.length && (
              <div className="grid h-full place-items-center px-6 text-center">
                <div>
                  {isRoom ? (
                    <span className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-3xl bg-[linear-gradient(135deg,#f45b18,#ff8a3d)] text-white shadow-[0_16px_36px_-14px_rgba(247,107,28,0.9)]">
                      <MessagesSquare size={26} />
                    </span>
                  ) : (
                    <span className="mx-auto mb-4 block w-fit">
                      <ChatAvatar person={other} online={otherOnline} size="xl" />
                    </span>
                  )}
                  <p className="font-display text-3xl leading-none">{isRoom ? "Say hello to the crew" : `Say hi to ${other?.full_name?.split(" ")[0] || "them"}`}</p>
                  <p className="mx-auto mt-2 max-w-xs text-sm text-rtg-mist">
                    {isRoom ? "Plan a ride, ask where everyone is, share a route." : "Ask where they're riding, or plan your next session together."}
                  </p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    {(isRoom ? ["Who's riding this weekend? 🚴", "Chai after the ride? ☕", "Where's everyone right now? 📍"] : ["Hey! 👋", "Where are you riding today? 🚴", "Up for a run tomorrow? 🏃"]).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setDraft(t);
                          input.current?.focus();
                        }}
                        className="rounded-full border border-rtg-border bg-white px-3.5 py-1.5 text-xs font-semibold text-rtg-white shadow-sm transition-colors hover:border-rtg-orange-400 hover:text-rtg-orange-600"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <ul className="flex flex-col">
              {grouped.map((m) => {
                const author = authorOf(m);
                const mine = author === userId;
                const person = people[author];
                const removed = Boolean(m.deleted_at);
                const canRemove = isRoom && !removed && (mine || isAdmin);
                const canMute = isRoom && isAdmin && !mine && !person?.is_admin;
                const showActions = activeId === m.id && (canRemove || canMute);
                return (
                  <li key={m.id}>
                    {m.startsDay && (
                      <div className="my-5 flex items-center gap-3 first:mt-0" aria-hidden="true">
                        <span className="h-px flex-1 bg-rtg-border" />
                        <span className="rounded-full border border-rtg-border bg-white px-3 py-1 text-[length:calc(0.625rem*var(--rtg-sec,1))] font-bold uppercase tracking-[0.14em] text-rtg-mist shadow-sm">
                          {dayLabel(m.created_at)}
                        </span>
                        <span className="h-px flex-1 bg-rtg-border" />
                      </div>
                    )}
                    <div className={`flex gap-2.5 ${m.startsGroup && !m.startsDay ? "mt-4" : "mt-1"} ${mine ? "flex-row-reverse" : ""}`}>
                      {!mine && isRoom && (
                        <span className="w-9 shrink-0 self-end">
                          {m.endsGroup && (
                            <button type="button" onClick={() => onOpenPerson?.(author)} title={`Message ${person?.full_name || "this member"} privately`} className="rounded-full">
                              <ChatAvatar person={person} online={online.has(author)} size="sm" />
                            </button>
                          )}
                        </span>
                      )}
                      <div className={`flex min-w-0 max-w-[78%] flex-col ${mine ? "items-end" : "items-start"}`}>
                        {m.startsGroup && !mine && isRoom && (
                          <div className="mb-1 flex max-w-full items-center gap-2 px-1 text-xs">
                            <button type="button" onClick={() => onOpenPerson?.(author)} className="min-w-0 hover:underline" title={`Message ${person?.full_name || "this member"} privately`}>
                              <ChatName person={person} />
                            </button>
                            {muted.has(author) && <span className="text-[length:calc(0.625rem*var(--rtg-sec,1))] font-semibold text-rtg-mist">(muted)</span>}
                          </div>
                        )}
                        <motion.button
                          type="button"
                          layout="position"
                          initial={{ opacity: 0, y: 6, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ duration: 0.18 }}
                          onClick={() => setActiveId(activeId === m.id ? null : m.id)}
                          className={`max-w-full whitespace-pre-wrap break-words px-4 py-2.5 text-left text-[length:calc(0.92rem*var(--rtg-sec,1))] leading-relaxed ${
                            removed
                              ? "rounded-2xl border border-dashed border-rtg-border bg-white/60 italic text-rtg-mist"
                              : mine
                                ? `rounded-3xl bg-[linear-gradient(135deg,#f45b18,#ff8a3d)] text-white shadow-[0_10px_22px_-14px_rgba(247,107,28,0.9)] ${m.endsGroup ? "rounded-br-md" : ""}`
                                : `rounded-3xl border border-rtg-border bg-white text-rtg-white shadow-[0_8px_20px_-16px_rgba(53,36,111,0.5)] ${m.endsGroup ? "rounded-bl-md" : ""}`
                          }`}
                        >
                          {removed ? "Message removed" : m.body}
                        </motion.button>
                        {m.endsGroup && (
                          <span className={`mt-1 inline-flex items-center gap-1 px-1 text-[length:calc(0.625rem*var(--rtg-sec,1))] text-rtg-mist ${mine ? "flex-row-reverse" : ""}`}>
                            <span title={new Date(m.created_at).toLocaleString("en-IN")}>{timeOf(m.created_at)}</span>
                            {!isRoom && mine && (
                              <span
                                className={`inline-flex items-center gap-0.5 ${m.read_at ? "font-semibold text-[#2a78d6]" : ""}`}
                                title={m.read_at ? `Seen ${formatChatTime(m.read_at)}` : "Sent"}
                              >
                                {m.read_at ? <CheckCheck size={13} /> : <Check size={13} />}
                                {m.id === lastMine?.id && (m.read_at ? `Seen ${timeOf(m.read_at)}` : "Sent")}
                              </span>
                            )}
                          </span>
                        )}
                        {showActions && (
                          <div className={`mt-1 flex gap-1.5 ${mine ? "justify-end" : ""}`}>
                            {canRemove && (
                              <button
                                type="button"
                                onClick={() => removeMessage(m)}
                                className="inline-flex items-center gap-1 rounded-full border border-rtg-border bg-white px-2.5 py-1 text-[length:calc(0.6875rem*var(--rtg-sec,1))] font-semibold text-rtg-mist hover:text-red-600"
                              >
                                <Trash2 size={12} /> Remove
                              </button>
                            )}
                            {canMute && (
                              <button
                                type="button"
                                onClick={() => toggleMute(author)}
                                className="inline-flex items-center gap-1 rounded-full border border-rtg-border bg-white px-2.5 py-1 text-[length:calc(0.6875rem*var(--rtg-sec,1))] font-semibold text-rtg-mist hover:text-rtg-orange-600"
                              >
                                {muted.has(author) ? <Volume2 size={12} /> : <VolumeX size={12} />}
                                {muted.has(author) ? "Unmute" : "Mute"}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Someone typing */}
            <AnimatePresence>
              {typingIds.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  className="mt-3 flex items-end gap-2.5"
                >
                  <span className="w-9 shrink-0">
                    <ChatAvatar person={people[typingIds[0]]} size="sm" />
                  </span>
                  <div>
                    <div className="inline-flex rounded-3xl rounded-bl-md border border-rtg-border bg-white px-4 py-3 shadow-[0_8px_20px_-16px_rgba(53,36,111,0.5)]">
                      <TypingDots />
                    </div>
                    <p className="mt-1 px-1 text-[length:calc(0.625rem*var(--rtg-sec,1))] text-rtg-mist">{typingLabel(typingNames)}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>

      {/* Jump to new messages */}
      <AnimatePresence>
        {newBelow > 0 && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={() => scrollToBottom(true)}
            className="absolute bottom-28 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-rtg-purple-950 px-4 py-2 text-xs font-semibold text-white shadow-lg"
          >
            <ArrowDown size={14} /> {newBelow} new message{newBelow === 1 ? "" : "s"}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Composer */}
      <div className="border-t border-rtg-border bg-white/90 px-3 py-3 backdrop-blur sm:px-4">
        {isMuted ? (
          <p className="rounded-2xl bg-rtg-purple-950/5 px-4 py-3 text-center text-sm text-rtg-mist">
            An admin has muted you, so you can read but not post. Contact RTG if you think this is a mistake.
          </p>
        ) : (
          <>
            {error && <p className="mb-2 px-1 text-xs text-red-600">{error}</p>}
            <AnimatePresence>
              {emojiOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="mb-2 grid grid-cols-10 gap-1 rounded-2xl border border-rtg-border bg-white p-2 shadow-lg"
                >
                  {EMOJI.map((e) => (
                    <button key={e} type="button" onClick={() => addEmoji(e)} className="grid h-9 place-items-center rounded-xl text-xl transition-transform hover:scale-125 hover:bg-rtg-purple-950/5">
                      {e}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
            <div className="flex items-end gap-2 rounded-[1.6rem] border border-rtg-border bg-white p-1.5 pl-2 shadow-[0_10px_30px_-22px_rgba(53,36,111,0.6)] focus-within:border-rtg-orange-400 focus-within:ring-4 focus-within:ring-rtg-orange-400/15">
              <button
                type="button"
                onClick={() => setEmojiOpen((v) => !v)}
                aria-label="Emoji"
                aria-pressed={emojiOpen}
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-full transition-colors ${emojiOpen ? "bg-rtg-orange-500/10 text-rtg-orange-600" : "text-rtg-mist hover:text-rtg-orange-500"}`}
              >
                <Smile size={20} />
              </button>
              <textarea
                ref={input}
                value={draft}
                onChange={onChange}
                onKeyDown={onKeyDown}
                onBlur={() => !draft.trim() && stop()}
                rows={1}
                placeholder={isRoom ? "Message the community…" : `Message ${other?.full_name?.split(" ")[0] || ""}…`}
                className="max-h-32 min-h-[40px] flex-1 resize-none bg-transparent py-2.5 text-sm text-rtg-white placeholder:text-rtg-mist/70 focus:outline-none"
                style={{ fieldSizing: "content" }}
              />
              <button
                type="button"
                onClick={send}
                disabled={!draft.trim() || sending}
                aria-label="Send"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#f45b18,#ff8a3d)] text-white shadow-[0_10px_22px_-10px_rgba(247,107,28,0.9)] transition-transform hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
              >
                {sending ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
              </button>
            </div>
            <p className="mt-1.5 px-2 text-[length:calc(0.625rem*var(--rtg-sec,1))] text-rtg-mist">
              Enter to send · Shift+Enter for a new line{draft.length > MAX_MESSAGE_LENGTH - 100 ? ` · ${MAX_MESSAGE_LENGTH - draft.length} left` : ""}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
