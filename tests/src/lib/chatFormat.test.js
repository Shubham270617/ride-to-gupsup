import { describe, expect, it } from "vitest";
import { chatErrorMessage, formatChatTime, groupMessages, initials, mergeMessage } from "../../../src/lib/chatFormat.js";

describe("formatChatTime()", () => {
  const now = Date.parse("2026-10-18T12:00:00Z"); // 17:30 IST

  it("says 'just now' under a minute", () => {
    expect(formatChatTime("2026-10-18T11:59:30Z", now)).toBe("just now");
  });

  it("uses minutes under an hour", () => {
    expect(formatChatTime("2026-10-18T11:35:00Z", now)).toBe("25m");
  });

  it("uses the India time of day for earlier today", () => {
    expect(formatChatTime("2026-10-18T04:00:00Z", now)).toBe("09:30");
  });

  it("uses weekday + time within the week, date beyond it", () => {
    expect(formatChatTime("2026-10-16T04:00:00Z", now)).toMatch(/^[A-Z][a-z]{2} 09:30$/);
    expect(formatChatTime("2026-09-01T04:00:00Z", now)).toMatch(/1 Sept?/);
  });

  it("returns an empty string for a bad date", () => {
    expect(formatChatTime("nope", now)).toBe("");
  });
});

describe("initials()", () => {
  it("takes first and last initials", () => {
    expect(initials("Narendra Kumar Mishra")).toBe("NM");
    expect(initials("simran")).toBe("S");
  });

  it("falls back to R", () => {
    expect(initials("")).toBe("R");
    expect(initials(null)).toBe("R");
  });
});

describe("groupMessages()", () => {
  const m = (id, user_id, created_at) => ({ id, user_id, created_at });

  it("starts a group on a new author or a gap over five minutes", () => {
    const out = groupMessages([
      m(1, "a", "2026-10-18T10:00:00Z"),
      m(2, "a", "2026-10-18T10:01:00Z"),
      m(3, "b", "2026-10-18T10:02:00Z"),
      m(4, "b", "2026-10-18T10:20:00Z"),
    ]);
    expect(out.map((x) => x.startsGroup)).toEqual([true, false, true, true]);
  });

  it("can group private messages by sender", () => {
    const out = groupMessages(
      [
        { id: 1, sender_id: "a", created_at: "2026-10-18T10:00:00Z" },
        { id: 2, sender_id: "a", created_at: "2026-10-18T10:00:30Z" },
      ],
      (x) => x.sender_id
    );
    expect(out.map((x) => x.startsGroup)).toEqual([true, false]);
  });
});

describe("mergeMessage()", () => {
  const list = [
    { id: 1, created_at: "2026-10-18T10:00:00Z", body: "one" },
    { id: 3, created_at: "2026-10-18T10:02:00Z", body: "three" },
  ];

  it("never duplicates a message delivered twice (own insert + realtime)", () => {
    expect(mergeMessage(list, { id: 3, created_at: "2026-10-18T10:02:00Z", body: "three" })).toHaveLength(2);
  });

  it("applies updates in place (e.g. a removed message)", () => {
    const out = mergeMessage(list, { id: 1, body: "", deleted_at: "2026-10-18T10:05:00Z" });
    expect(out[0]).toMatchObject({ id: 1, body: "", deleted_at: "2026-10-18T10:05:00Z", created_at: "2026-10-18T10:00:00Z" });
  });

  it("inserts out-of-order arrivals in time order", () => {
    const out = mergeMessage(list, { id: 2, created_at: "2026-10-18T10:01:00Z", body: "two" });
    expect(out.map((x) => x.id)).toEqual([1, 2, 3]);
  });

  it("does not mutate the original list", () => {
    mergeMessage(list, { id: 9, created_at: "2026-10-18T11:00:00Z" });
    expect(list).toHaveLength(2);
  });
});

describe("chatErrorMessage()", () => {
  it("explains the spam limit", () => {
    expect(chatErrorMessage({ message: "chat_rate_limited" })).toMatch(/Slow down/);
  });

  it("explains a mute (RLS refusal)", () => {
    expect(chatErrorMessage({ message: 'new row violates row-level security policy for table "chat_messages"' })).toMatch(/muted/);
  });

  it("explains the length limit", () => {
    expect(chatErrorMessage({ message: 'violates check constraint "chat_messages_body_check"' })).toMatch(/1 to 1000/);
  });

  it("has a generic fallback", () => {
    expect(chatErrorMessage(null)).toMatch(/Couldn't send/);
  });
});
