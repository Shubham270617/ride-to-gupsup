import { afterEach, describe, expect, it, vi } from "vitest";
import { formatPrize, formatRupees, hasPrice, splitTitle } from "../../../src/lib/format.js";
import { ageFromDob, GENDERS, RIDER_TYPES, RIDE_FREQUENCIES } from "../../../src/lib/profileFields.js";
import { heroFallbackSrc, heroSrcSet } from "../../../src/lib/responsiveImage.js";
import { buildUpiQrDataUrl, buildUpiUri } from "../../../src/lib/upi.js";
import { downloadIcsFile } from "../../../src/lib/ics.js";
import { isSupabaseStorageUrl } from "../../../src/lib/supabaseUpload.js";

afterEach(() => vi.useRealTimers());

describe("format.js", () => {
  it("formatPrize formats rupees the Indian way", () => {
    expect(formatPrize(500000)).toBe("Prize Pool Worth ₹5,00,000");
    expect(formatPrize("25000")).toBe("Prize Pool Worth ₹25,000");
    expect(formatPrize(0)).toBe("Prize Pool Worth ₹0");
  });

  it("formatPrize passes legacy free text through and blanks to null", () => {
    expect(formatPrize("Medals + goodies")).toBe("Medals + goodies");
    expect(formatPrize(null)).toBeNull();
    expect(formatPrize(undefined)).toBeNull();
    expect(formatPrize("")).toBeNull();
  });

  it("splitTitle uses the accent when it really ends the title", () => {
    expect(splitTitle("RTG MTB Challenge 2026", "Challenge 2026")).toEqual(["RTG MTB", "Challenge 2026"]);
    expect(splitTitle("RTG MTB Challenge 2026", "challenge 2026")).toEqual(["RTG MTB", "Challenge 2026"]);
  });

  it("splitTitle splits words down the middle otherwise", () => {
    expect(splitTitle("RTG MTB Challenge 2026")).toEqual(["RTG MTB", "Challenge 2026"]);
    expect(splitTitle("One Two Three")).toEqual(["One Two", "Three"]);
    expect(splitTitle("Solo")).toEqual(["Solo", ""]);
    expect(splitTitle("A B", "not the end")).toEqual(["A", "B"]);
    expect(splitTitle()).toEqual(["", ""]);
  });

  it("hasPrice only for positive prices", () => {
    expect(hasPrice({ price: 1799 })).toBe(true);
    expect(hasPrice({ price: "10" })).toBe(true);
    expect(hasPrice({ price: 0 })).toBe(false);
    expect(hasPrice({ price: null })).toBe(false);
    expect(hasPrice({})).toBe(false);
    expect(hasPrice(null)).toBe(false);
  });

  it("formatRupees", () => {
    expect(formatRupees(1799)).toBe("₹1,799");
    expect(formatRupees(123456)).toBe("₹1,23,456");
  });
});

describe("profileFields.js", () => {
  it("exposes the registration options", () => {
    expect(GENDERS).toEqual(["Male", "Female"]);
    expect(RIDER_TYPES).toContain("Both");
    expect(RIDE_FREQUENCIES).toHaveLength(5);
  });

  it("ageFromDob counts completed years", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 18, 12)); // 18 Oct 2026, local
    expect(ageFromDob("2000-10-18")).toBe("26");
    expect(ageFromDob("2000-10-19")).toBe("25");
    expect(ageFromDob("2000-11-01")).toBe("25");
    expect(ageFromDob("2000-09-30")).toBe("26");
    expect(ageFromDob("2026-10-18")).toBe("0");
  });

  it("ageFromDob returns '' for missing, future or absurd dates", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 18, 12));
    expect(ageFromDob("")).toBe("");
    expect(ageFromDob(null)).toBe("");
    expect(ageFromDob("2000-10")).toBe("");
    expect(ageFromDob("2027-01-01")).toBe("");
    expect(ageFromDob("1800-01-01")).toBe("");
    expect(ageFromDob("abcd-ef-gh")).toBe("");
  });
});

describe("responsiveImage.js", () => {
  const unsplash = "https://images.unsplash.com/photo-1?auto=format&w=4000";

  it("builds a srcSet for resizable Unsplash URLs", () => {
    const set = heroSrcSet(unsplash);
    const parts = set.split(", ");
    expect(parts).toHaveLength(3);
    expect(parts[0]).toMatch(/w=800&q=75 800w$|q=75.* 800w$/);
    expect(parts[0]).toContain("w=800");
    expect(parts[2]).toContain("w=2000");
    expect(parts[2].endsWith(" 2000w")).toBe(true);
    expect(set).not.toContain("w=4000");
  });

  it("honours custom widths", () => {
    expect(heroSrcSet(unsplash, { mobile: 400, tablet: 900, desktop: 1600 })).toContain("w=400");
  });

  it("returns undefined srcSet for local or Supabase images", () => {
    expect(heroSrcSet("/images/hero.jpg")).toBeUndefined();
    expect(heroSrcSet("https://p.supabase.co/storage/v1/object/public/rtg-media/a.jpg")).toBeUndefined();
    expect(heroSrcSet(null)).toBeUndefined();
  });

  it("fallback src is resized only when resizable", () => {
    expect(heroFallbackSrc(unsplash)).toContain("w=2000");
    expect(heroFallbackSrc(unsplash, 1200)).toContain("w=1200");
    expect(heroFallbackSrc("/images/a.jpg")).toBe("/images/a.jpg");
    expect(heroFallbackSrc("")).toBe("");
  });
});

describe("upi.js", () => {
  it("builds a UPI deep link with a 2-decimal amount", () => {
    const uri = buildUpiUri({ upiId: "rtg@okaxis", payeeName: "Ride Tea GupShup", amount: 1799, note: "Order #12" });
    expect(uri.startsWith("upi://pay?")).toBe(true);
    const params = new URLSearchParams(uri.slice("upi://pay?".length));
    expect(params.get("pa")).toBe("rtg@okaxis");
    expect(params.get("pn")).toBe("Ride Tea GupShup");
    expect(params.get("am")).toBe("1799.00");
    expect(params.get("cu")).toBe("INR");
    expect(params.get("tn")).toBe("Order #12");
  });

  it("defaults the payee name and omits an empty note", () => {
    const params = new URLSearchParams(buildUpiUri({ upiId: "a@b", amount: "99.5" }).split("?")[1]);
    expect(params.get("pn")).toBe("RTG");
    expect(params.get("am")).toBe("99.50");
    expect(params.has("tn")).toBe(false);
  });

  it("renders a QR code data URL", async () => {
    const url = await buildUpiQrDataUrl("upi://pay?pa=a@b&am=1.00");
    expect(url.startsWith("data:image/png;base64,")).toBe(true);
  });
});

describe("ics.js", () => {
  async function capture(args) {
    let blob;
    const created = vi.fn((b) => {
      blob = b;
      return "blob:fake";
    });
    const revoked = vi.fn();
    URL.createObjectURL = created;
    URL.revokeObjectURL = revoked;
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function () {
      capture.download = this.download;
      capture.href = this.href;
    });
    downloadIcsFile(args);
    click.mockRestore();
    return { text: await blob.text(), type: blob.type, revoked };
  }

  it("writes an all-day event (DTEND is the next day) and cleans up", async () => {
    const { text, type, revoked } = await capture({
      title: "Sunday Ride, Delhi; 60km",
      description: "Line one\nLine two",
      location: "India Gate",
      allDayDate: new Date(2026, 11, 31),
    });
    expect(type).toBe("text/calendar;charset=utf-8");
    const lines = text.split("\r\n");
    expect(lines[0]).toBe("BEGIN:VCALENDAR");
    expect(lines.at(-1)).toBe("END:VCALENDAR");
    expect(lines).toContain("DTSTART;VALUE=DATE:20261231");
    expect(lines).toContain("DTEND;VALUE=DATE:20270101");
    expect(lines).toContain("SUMMARY:Sunday Ride\\, Delhi\\; 60km");
    expect(lines).toContain("DESCRIPTION:Line one\\nLine two");
    expect(lines).toContain("LOCATION:India Gate");
    expect(text).toMatch(/UID:\d+-[a-z0-9]+@rideteagupshup\.com/);
    expect(capture.download).toBe("sunday-ride-delhi-60km.ics");
    expect(revoked).toHaveBeenCalledWith("blob:fake");
    expect(document.querySelector("a[download]")).toBeNull();
  });

  it("writes a timed event in UTC and omits empty fields", async () => {
    const { text } = await capture({
      title: "Track Night",
      start: new Date(Date.UTC(2026, 0, 5, 1, 30, 0)),
      end: new Date(Date.UTC(2026, 0, 5, 3, 0, 0)),
    });
    expect(text).toContain("DTSTART:20260105T013000Z");
    expect(text).toContain("DTEND:20260105T030000Z");
    expect(text).not.toContain("DESCRIPTION:");
    expect(text).not.toContain("LOCATION:");
  });

  it("uses the start as the end when no end is given", async () => {
    const { text } = await capture({ title: "T", start: new Date(Date.UTC(2026, 0, 5, 1, 0, 0)) });
    expect(text).toContain("DTEND:20260105T010000Z");
  });

  it("escapes backslashes", async () => {
    const { text } = await capture({ title: "a\\b", allDayDate: new Date(2026, 0, 1) });
    expect(text).toContain("SUMMARY:a\\\\b");
  });
});

describe("supabaseUpload.isSupabaseStorageUrl()", () => {
  it("recognises rtg-media public URLs only", () => {
    expect(isSupabaseStorageUrl("https://p.supabase.co/storage/v1/object/public/rtg-media/a.jpg")).toBe(true);
    expect(isSupabaseStorageUrl("https://p.supabase.co/storage/v1/object/public/other/a.jpg")).toBe(false);
    expect(isSupabaseStorageUrl("/images/a.jpg")).toBe(false);
    expect(isSupabaseStorageUrl(null)).toBe(false);
  });
});
