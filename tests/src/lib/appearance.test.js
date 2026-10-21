import { describe, expect, it, vi } from "vitest";
import { APPEARANCE_KEYS, applyAppearance, pageTargetFor, parsePageScales, resolveAppearance } from "../../../src/lib/appearance.js";

vi.spyOn(console, "warn").mockImplementation(() => {});

describe("pageTargetFor()", () => {
  it("matches a page and the pages under it", () => {
    expect(pageTargetFor("/events").path).toBe("/events");
    expect(pageTargetFor("/events/endurance-league-vol-2").path).toBe("/events");
    expect(pageTargetFor("/merchandise/abc").path).toBe("/merchandise");
    expect(pageTargetFor("/membership/checkout").path).toBe("/membership");
  });

  it("prefers the most specific page, and exact pages don't swallow sub-pages", () => {
    expect(pageTargetFor("/lab/strava").path).toBe("/lab/strava");
    expect(pageTargetFor("/lab").path).toBe("/lab");
    expect(pageTargetFor("/").path).toBe("/");
    expect(pageTargetFor("/about").path).toBe("/about");
  });

  it("ignores a trailing slash and returns null for unknown pages", () => {
    expect(pageTargetFor("/events/").path).toBe("/events");
    expect(pageTargetFor("/nope")).toBeNull();
    expect(pageTargetFor("/eventsfoo")).toBeNull();
  });
});

describe("parsePageScales()", () => {
  it("keeps only known pages and preset sizes", () => {
    expect(parsePageScales('{"/events":"1.06","/nope":"1.06","/lab":"3","/":1.12}')).toEqual({ "/events": "1.06", "/": "1.12" });
  });

  it("survives bad input", () => {
    expect(parsePageScales("not json")).toEqual({});
    expect(parsePageScales(undefined)).toEqual({});
    expect(parsePageScales("[1,2]")).toEqual({});
  });
});

describe("resolveAppearance() with a page", () => {
  const settings = {
    [APPEARANCE_KEYS.scale]: "0.94",
    [APPEARANCE_KEYS.pages]: JSON.stringify({ "/events": "1.12", "/lab/strava": "1.06" }),
  };

  it("uses a page's own size when it has one", () => {
    expect(resolveAppearance(settings, "/events/some-ride").scale.value).toBe("1.12");
    expect(resolveAppearance(settings, "/lab/strava").scale.value).toBe("1.06");
  });

  it("falls back to the sitewide size elsewhere", () => {
    expect(resolveAppearance(settings, "/about").scale.value).toBe("0.94");
    expect(resolveAppearance(settings, "/lab").scale.value).toBe("0.94");
    expect(resolveAppearance(settings).scale.value).toBe("0.94");
  });

  it("never applies page sizes inside the admin area", () => {
    expect(resolveAppearance(settings, "/admin/events").scale.value).toBe("0.94");
  });
});

describe("applyAppearance()", () => {
  it("sets the root text scale for the given page", () => {
    const el = document.createElement("div");
    applyAppearance({ [APPEARANCE_KEYS.pages]: '{"/chat":"1.12"}' }, el, "/chat");
    expect(el.style.getPropertyValue("--rtg-text-scale")).toBe("1.12");
    applyAppearance({ [APPEARANCE_KEYS.pages]: '{"/chat":"1.12"}' }, el, "/faq");
    expect(el.style.getPropertyValue("--rtg-text-scale")).toBe("1");
  });
});
