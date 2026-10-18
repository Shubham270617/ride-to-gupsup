import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Send, Trash2, VolumeX, Volume2, Loader2, Users, MessagesSquare } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { useChat } from "../../lib/ChatContext";
import { MAX_MESSAGE_LENGTH, chatErrorMessage, formatChatTime, groupMessages, mergeMessage } from "../../lib/chatFormat";
import { ChatAvatar, ChatName } from "./ChatBits";

const PAGE = 50;
const ROOM_COLUMNS = "id, user_id, body, created_at, deleted_at";
const DM_COLUMNS = "id, sender_id, recipient_id, body, created_at, read_at";

// One conversation: the community room (mode "room") or a private chat with
// one member (mode "dm", otherId). Loads the latest 50 messages, streams
// new ones in live, and pages back with "Load earlier".
export default function ChatThread({ mode, otherId, onBack, onOpenPerson }) {
  const chat = useChat();
  const { userId, people, online, ensurePeople, isMuted, isAdmin, onRoomEvent, onDirectEvent, refreshUnread, setViewingRoom } = chat;
  const isRoom = mode === "room";
  const authorOf = useCallback((m) => (isRoom ? m.user_id : m.sender_id), [isRoom]);

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [activeId, setActiveId] = useState(null);
  const [muted, setMuted] = useState(() => new Set());

  const scroller = useRef(null);
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

  // --- live updates ---------------------------------------------------------
  useEffect(() => {
    if (isRoom) {
      return onRoomEvent((_event, row) => setMessages((list) => mergeMessage(list, row)));
    }
    return onDirectEvent((_event, row) => {
      const involves =
        (row.sender_id === otherId && row.recipient_id === userId) || (row.sender_id === userId && row.recipient_id === otherId);
      if (!involves) return;
      setMessages((list) => mergeMessage(list, row));
      if (row.sender_id === otherId && !row.read_at) markRead();
    });
  }, [isRoom, otherId, userId, onRoomEvent, onDirectEvent, markRead]);

  // --- scrolling ------------------------------------------------------------
  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
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
  }, [messages, loading]);

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
    const insert = isRoom
      ? supabase.from("chat_messages").insert({ user_id: userId, body }).select(ROOM_COLUMNS).single()
      : supabase.from("direct_messages").insert({ sender_id: userId, recipient_id: otherId, body }).select(DM_COLUMNS).single();
    const { data, error: sendError } = await insert;
    setSending(false);
    if (sendError) {
      setError(chatErrorMessage(sendError));
      return;
    }
    stickToBottom.current = true;
    setDraft("");
    setMessages((list) => mergeMessage(list, data));
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
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
  const othersOnline = Math.max(0, online.size - (online.has(userId) ? 1 : 0));

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-rtg-border px-4 py-3 sm:px-5">
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
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[linear-gradient(135deg,#f45b18,#ff8a3d)] text-white">
              <MessagesSquare size={18} />
            </span>
            <div className="min-w-0">
              <p className="font-display text-xl leading-none">Community Room</p>
              <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-rtg-mist">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> {othersOnline} other{othersOnline === 1 ? "" : "s"} online · everyone can read this
              </p>
            </div>
          </>
        ) : (
          <>
            <ChatAvatar person={other} online={online.has(otherId)} />
            <div className="min-w-0">
              <ChatName person={other} className="max-w-full" />
              <p className="mt-0.5 text-xs text-rtg-mist">
                {online.has(otherId) ? "Online now" : "Offline"} · private — only you two can see this
              </p>
            </div>
          </>
        )}
      </div>

      {/* Messages */}
      <div ref={scroller} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5">
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
                  className="rounded-full bg-rtg-purple-950/5 px-4 py-1.5 text-xs font-semibold text-rtg-mist hover:text-rtg-orange-500 disabled:opacity-60"
                >
                  {loadingMore ? "Loading…" : "Load earlier messages"}
                </button>
              </div>
            )}

            {!grouped.length && (
              <div className="grid h-full place-items-center px-6 text-center">
                <div>
                  <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-rtg-orange-500/10 text-rtg-orange-500">
                    {isRoom ? <Users size={20} /> : <MessagesSquare size={20} />}
                  </span>
                  <p className="font-display text-2xl">{isRoom ? "Say hello to the crew" : `Start the conversation`}</p>
                  <p className="mt-1 text-sm text-rtg-mist">
                    {isRoom ? "Plan a ride, ask where everyone is, share a route." : "Ask where they're riding, or plan your next session."}
                  </p>
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
                  <li key={m.id} className={`flex gap-2.5 ${m.startsGroup ? "mt-4 first:mt-0" : "mt-1"} ${mine ? "flex-row-reverse" : ""}`}>
                    {!mine && isRoom && (
                      <span className="w-8 shrink-0">
                        {m.startsGroup && (
                          <button
                            type="button"
                            onClick={() => onOpenPerson?.(author)}
                            title={`Message ${person?.full_name || "this member"} privately`}
                            className="rounded-full"
                          >
                            <ChatAvatar person={person} online={online.has(author)} size="sm" />
                          </button>
                        )}
                      </span>
                    )}
                    <div className={`flex min-w-0 max-w-[80%] flex-col ${mine ? "items-end" : "items-start"}`}>
                      {m.startsGroup && (
                        <div className={`mb-1 flex max-w-full items-center gap-2 text-xs ${mine ? "flex-row-reverse" : ""}`}>
                          {!mine && isRoom && (
                            <button
                              type="button"
                              onClick={() => onOpenPerson?.(author)}
                              title={`Message ${person?.full_name || "this member"} privately`}
                              className="min-w-0 hover:underline"
                            >
                              <ChatName person={person} />
                            </button>
                          )}
                          {isRoom && muted.has(author) && <span className="text-[10px] font-semibold text-rtg-mist">(muted)</span>}
                          <span className="text-rtg-mist">{formatChatTime(m.created_at)}</span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => setActiveId(activeId === m.id ? null : m.id)}
                        className={`max-w-full whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-left text-sm leading-relaxed ${
                          removed
                            ? "border border-dashed border-rtg-border bg-transparent italic text-rtg-mist"
                            : mine
                              ? "rounded-tr-md bg-[linear-gradient(135deg,#f45b18,#ff8a3d)] text-white"
                              : "rounded-tl-md bg-rtg-purple-950/[0.05] text-rtg-white"
                        }`}
                      >
                        {removed ? "Message removed" : m.body}
                      </button>
                      {!isRoom && mine && m === grouped[grouped.length - 1] && (
                        <span className="mt-1 text-[10px] text-rtg-mist">{m.read_at ? "Seen" : "Sent"}</span>
                      )}
                      {showActions && (
                        <div className={`mt-1 flex gap-1.5 ${mine ? "justify-end" : ""}`}>
                          {canRemove && (
                            <button
                              type="button"
                              onClick={() => removeMessage(m)}
                              className="inline-flex items-center gap-1 rounded-full bg-rtg-purple-950/5 px-2.5 py-1 text-[11px] font-semibold text-rtg-mist hover:text-rtg-orange-500"
                            >
                              <Trash2 size={12} /> Remove
                            </button>
                          )}
                          {canMute && (
                            <button
                              type="button"
                              onClick={() => toggleMute(author)}
                              className="inline-flex items-center gap-1 rounded-full bg-rtg-purple-950/5 px-2.5 py-1 text-[11px] font-semibold text-rtg-mist hover:text-rtg-orange-500"
                            >
                              {muted.has(author) ? <Volume2 size={12} /> : <VolumeX size={12} />}
                              {muted.has(author) ? "Unmute" : "Mute"}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-rtg-border px-3 py-3 sm:px-4">
        {isMuted ? (
          <p className="rounded-2xl bg-rtg-purple-950/5 px-4 py-3 text-center text-sm text-rtg-mist">
            An admin has muted you, so you can read but not post. Contact RTG if you think this is a mistake.
          </p>
        ) : (
          <>
            {error && <p className="mb-2 px-1 text-xs text-rtg-orange-600">{error}</p>}
            <div className="flex items-end gap-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
                onKeyDown={onKeyDown}
                rows={1}
                placeholder={isRoom ? "Message the community…" : `Message ${other?.full_name?.split(" ")[0] || ""}…`}
                className="max-h-32 min-h-[46px] flex-1 resize-none rounded-2xl border border-rtg-border bg-white px-4 py-3 text-sm text-rtg-white placeholder:text-rtg-mist/70 focus:border-rtg-orange-400 focus:outline-none focus:ring-4 focus:ring-rtg-orange-400/15"
                style={{ fieldSizing: "content" }}
              />
              <button
                type="button"
                onClick={send}
                disabled={!draft.trim() || sending}
                aria-label="Send"
                className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#f45b18,#ff8a3d)] text-white shadow-[0_10px_22px_-10px_rgba(247,107,28,0.9)] transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
              >
                {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
            <p className="mt-1.5 px-1 text-[10px] text-rtg-mist">
              Enter to send · Shift+Enter for a new line{draft.length > MAX_MESSAGE_LENGTH - 100 ? ` · ${MAX_MESSAGE_LENGTH - draft.length} left` : ""}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
