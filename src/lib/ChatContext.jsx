import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase, isSupabaseConfigured } from "./supabaseClient";
import useSession from "./useSession";

// Everything live about chat, shared by the /chat page and the floating
// chat button (supabase/migrations/025_chat.sql has the database side):
//
//   online         ids of logged-in members with the site open right now
//                  (Supabase Realtime Presence — stored nowhere)
//   people         chat identity per member id: name, photo, city, admin
//                  badge — fetched through chat_people(), so a badge can't
//                  be faked from the browser
//   unreadDMs      private messages sent to you that you haven't opened
//   roomHasNew     the community room has messages since you last looked
//   onRoomEvent / onDirectEvent
//                  subscribe to new/changed messages as they arrive
//
// One Realtime connection per open tab, only while logged in. Logged-out
// visitors never connect and never appear online.

const ChatContext = createContext(null);
const ONLINE_CHANNEL = "rtg-online";
const roomSeenKey = (userId) => `rtg_chat_room_seen_${userId}`;

function readRoomSeen(userId) {
  try {
    return window.localStorage.getItem(roomSeenKey(userId)) || "";
  } catch {
    return "";
  }
}

export function ChatProvider({ children }) {
  const { user } = useSession();
  const userId = user?.id || null;

  const [online, setOnline] = useState(() => new Set());
  const [people, setPeople] = useState({});
  const [unreadDMs, setUnreadDMs] = useState(0);
  const [roomHasNew, setRoomHasNew] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [conversationsVersion, setConversationsVersion] = useState(0);

  const requested = useRef(new Set());
  const roomListeners = useRef(new Set());
  const directListeners = useRef(new Set());
  const viewingRoom = useRef(false);

  // --- people cache -------------------------------------------------------
  const ensurePeople = useCallback(async (ids) => {
    if (!isSupabaseConfigured || !ids?.length) return;
    const missing = [...new Set(ids)].filter((id) => id && !requested.current.has(id));
    if (!missing.length) return;
    missing.forEach((id) => requested.current.add(id));
    const { data, error } = await supabase.rpc("chat_people", { p_ids: missing });
    if (error) {
      missing.forEach((id) => requested.current.delete(id));
      return;
    }
    setPeople((prev) => {
      const next = { ...prev };
      for (const p of data || []) next[p.id] = p;
      return next;
    });
  }, []);

  const refreshUnread = useCallback(async () => {
    if (!userId) return;
    const { count } = await supabase
      .from("direct_messages")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", userId)
      .is("read_at", null);
    setUnreadDMs(count || 0);
  }, [userId]);

  const markRoomSeen = useCallback(() => {
    if (!userId) return;
    try {
      window.localStorage.setItem(roomSeenKey(userId), new Date().toISOString());
    } catch {
      /* storage blocked — the dot just comes back next visit */
    }
    setRoomHasNew(false);
  }, [userId]);

  const setViewingRoom = useCallback(
    (value) => {
      viewingRoom.current = value;
      if (value) markRoomSeen();
    },
    [markRoomSeen]
  );

  const onRoomEvent = useCallback((cb) => {
    roomListeners.current.add(cb);
    return () => roomListeners.current.delete(cb);
  }, []);

  const onDirectEvent = useCallback((cb) => {
    directListeners.current.add(cb);
    return () => directListeners.current.delete(cb);
  }, []);

  // --- reset on logout / account switch -----------------------------------
  useEffect(() => {
    setOnline(new Set());
    setUnreadDMs(0);
    setRoomHasNew(false);
    setIsMuted(false);
  }, [userId]);

  // --- presence: who's online ---------------------------------------------
  useEffect(() => {
    if (!isSupabaseConfigured || !userId) return undefined;
    const channel = supabase.channel(ONLINE_CHANNEL, { config: { presence: { key: userId } } });
    channel
      .on("presence", { event: "sync" }, () => {
        const ids = Object.keys(channel.presenceState());
        setOnline(new Set(ids));
        ensurePeople(ids);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") await channel.track({ online_at: new Date().toISOString() });
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, ensurePeople]);

  // --- message streams, unread counts, mute status -------------------------
  useEffect(() => {
    if (!isSupabaseConfigured || !userId) return undefined;
    let cancelled = false;

    refreshUnread();
    ensurePeople([userId]);

    supabase
      .from("chat_bans")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => !cancelled && setIsMuted(Boolean(data)));

    // Anything new in the room since this member last looked?
    const seen = readRoomSeen(userId);
    let latest = supabase.from("chat_messages").select("id").neq("user_id", userId).is("deleted_at", null).limit(1);
    if (seen) latest = latest.gt("created_at", seen);
    latest.then(({ data }) => !cancelled && setRoomHasNew(Boolean(data?.length) && !viewingRoom.current));

    const emitRoom = (payload) => {
      const row = payload.new;
      if (!row?.id) return;
      ensurePeople([row.user_id]);
      if (payload.eventType === "INSERT" && row.user_id !== userId && !viewingRoom.current) setRoomHasNew(true);
      roomListeners.current.forEach((cb) => cb(payload.eventType, row));
    };
    const emitDirect = (payload) => {
      const row = payload.new;
      if (!row?.id) return;
      ensurePeople([row.sender_id, row.recipient_id]);
      setConversationsVersion((v) => v + 1);
      if (row.recipient_id === userId) refreshUnread();
      directListeners.current.forEach((cb) => cb(payload.eventType, row));
    };

    const channel = supabase
      .channel(`rtg-chat-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, emitRoom)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_messages" }, emitRoom)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages", filter: `recipient_id=eq.${userId}` }, emitDirect)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages", filter: `sender_id=eq.${userId}` }, emitDirect)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "direct_messages", filter: `recipient_id=eq.${userId}` }, emitDirect)
      // Read receipts: the other person opening your message sets read_at.
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "direct_messages", filter: `sender_id=eq.${userId}` }, emitDirect)
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId, ensurePeople, refreshUnread]);

  const value = useMemo(
    () => ({
      enabled: isSupabaseConfigured,
      user,
      userId,
      online,
      people,
      ensurePeople,
      unreadDMs,
      refreshUnread,
      roomHasNew,
      markRoomSeen,
      setViewingRoom,
      isMuted,
      isAdmin: Boolean(userId && people[userId]?.is_admin),
      conversationsVersion,
      onRoomEvent,
      onDirectEvent,
    }),
    [user, userId, online, people, ensurePeople, unreadDMs, refreshUnread, roomHasNew, markRoomSeen, setViewingRoom, isMuted, conversationsVersion, onRoomEvent, onDirectEvent]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used inside <ChatProvider>");
  return ctx;
}
