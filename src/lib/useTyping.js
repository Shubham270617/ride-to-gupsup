import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, isSupabaseConfigured } from "./supabaseClient";

// "Someone is typing…" for one conversation, over Supabase Realtime
// Broadcast — messages that go straight from browser to browser and are
// never stored. Each typer re-announces at most every 2 seconds while they
// type; a typer is dropped 4 seconds after their last announcement, or at
// once when they send.
//
// `room` is a stable name for the conversation: "room" for the community
// room, or both member ids sorted for a private chat.
const ANNOUNCE_EVERY_MS = 2000;
const FORGET_AFTER_MS = 4000;

export default function useTyping(room, userId) {
  const [typers, setTypers] = useState({}); // userId -> last seen ms
  const channel = useRef(null);
  const lastSent = useRef(0);

  useEffect(() => {
    if (!isSupabaseConfigured || !room || !userId) return undefined;
    setTypers({});
    const ch = supabase.channel(`typing:${room}`, { config: { broadcast: { self: false } } });
    ch.on("broadcast", { event: "typing" }, ({ payload }) => {
      if (!payload?.user_id || payload.user_id === userId) return;
      setTypers((prev) => {
        const next = { ...prev };
        if (payload.stop) delete next[payload.user_id];
        else next[payload.user_id] = Date.now();
        return next;
      });
    }).subscribe();
    channel.current = ch;

    const sweep = setInterval(() => {
      setTypers((prev) => {
        const now = Date.now();
        const live = Object.entries(prev).filter(([, at]) => now - at < FORGET_AFTER_MS);
        return live.length === Object.keys(prev).length ? prev : Object.fromEntries(live);
      });
    }, 1000);

    return () => {
      clearInterval(sweep);
      channel.current = null;
      supabase.removeChannel(ch);
    };
  }, [room, userId]);

  // Call on every keystroke; it throttles itself.
  const announce = useCallback(() => {
    const now = Date.now();
    if (!channel.current || now - lastSent.current < ANNOUNCE_EVERY_MS) return;
    lastSent.current = now;
    channel.current.send({ type: "broadcast", event: "typing", payload: { user_id: userId } });
  }, [userId]);

  // Call when the message is sent or the box is cleared.
  const stop = useCallback(() => {
    if (!channel.current || !lastSent.current) return;
    lastSent.current = 0;
    channel.current.send({ type: "broadcast", event: "typing", payload: { user_id: userId, stop: true } });
  }, [userId]);

  return { typingIds: Object.keys(typers), announce, stop };
}
