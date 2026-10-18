import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// A fake Realtime channel: records what the hook sends and lets the test
// deliver broadcasts to it.
const channels = [];
vi.mock("../../../src/lib/supabaseClient", () => ({
  isSupabaseConfigured: true,
  supabase: {
    channel: (name, opts) => {
      const ch = {
        name,
        opts,
        handler: null,
        sent: [],
        on(_type, _filter, cb) {
          ch.handler = cb;
          return ch;
        },
        subscribe() {
          return ch;
        },
        send(msg) {
          ch.sent.push(msg);
        },
      };
      channels.push(ch);
      return ch;
    },
    removeChannel: vi.fn(),
  },
}));

import useTyping from "../../../src/lib/useTyping";

const deliver = (payload) => act(() => channels.at(-1).handler({ payload }));

beforeEach(() => {
  channels.length = 0;
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe("useTyping()", () => {
  it("joins a per-conversation broadcast channel and ignores its own echo", () => {
    renderHook(() => useTyping("dm:a:b", "a"));
    expect(channels[0].name).toBe("typing:dm:a:b");
    expect(channels[0].opts).toEqual({ config: { broadcast: { self: false } } });
  });

  it("shows someone typing, and forgets them about 4 s after their last signal", () => {
    const { result } = renderHook(() => useTyping("room", "a"));
    deliver({ user_id: "b" });
    deliver({ user_id: "a" }); // own id never counts
    expect(result.current.typingIds).toEqual(["b"]);
    act(() => vi.advanceTimersByTime(5000));
    expect(result.current.typingIds).toEqual([]);
  });

  it("drops a typer at once when they send (stop signal)", () => {
    const { result } = renderHook(() => useTyping("room", "a"));
    deliver({ user_id: "b" });
    deliver({ user_id: "b", stop: true });
    expect(result.current.typingIds).toEqual([]);
  });

  it("announces at most every 2 seconds while typing, then stop once", () => {
    const { result } = renderHook(() => useTyping("room", "a"));
    act(() => {
      result.current.announce();
      result.current.announce();
      result.current.announce();
    });
    expect(channels[0].sent).toHaveLength(1);
    expect(channels[0].sent[0]).toEqual({ type: "broadcast", event: "typing", payload: { user_id: "a" } });
    act(() => vi.advanceTimersByTime(2100));
    act(() => result.current.announce());
    expect(channels[0].sent).toHaveLength(2);
    act(() => result.current.stop());
    act(() => result.current.stop()); // nothing to stop the second time
    expect(channels[0].sent.at(-1).payload).toEqual({ user_id: "a", stop: true });
    expect(channels[0].sent).toHaveLength(3);
  });

  it("does nothing without a conversation", () => {
    renderHook(() => useTyping(null, "a"));
    expect(channels).toHaveLength(0);
  });
});
