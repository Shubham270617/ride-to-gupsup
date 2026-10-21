import { describe, expect, it, vi } from "vitest";
import {
  APPEARANCE_KEYS,
  BODY_FONTS,
  applyAppearance,
  ensureFontLoaded,
  fontByValue,
  pageTargetFor,
  parsePageSettings,
  resolveAppearance,
  sitewideSize,
  sizeNote,
  toSize,
} from "../../../src/lib/appearance.js";

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
  });

  it("ignores a trailing slash and returns null for unknown pages", () => {
    expect(pageTargetFor("/events/").path).toBe("/events");
    expect(pageTargetFor("/nope")).toBeNull();
    expect(pageTargetFor("/eventsfoo")).toBeNull();
  });
});

describe("sizes in pixels (like WordPad)", () => {
  it("accepts the offered sizes, from 8 to 24", () => {
    expect(toSize("8")).toBe(8);
    expect(toSize(12)).toBe(12);
    expect(toSize("24")).toBe(24);
  });

  it("rejects sizes that aren't offered", () => {
    expect(toSize("19")).toBeNull();
    expect(toSize("99")).toBeNull();
    expect(toSize("abc")).toBeNull();
  });

  it("still understands the older presets (0.94 / 1 / 1.06 / 1.12)", () => {
    expect(toSize("0.94")).toBe(15);
    expect(toSize("1")).toBe(16);
    expect(toSize("1.06")).toBe(17);
    expect(toSize("1.12")).toBe(18);
  });

  it("sitewide size: new pixel setting, else the old scale, else 16", () => {
    expect(sitewideSize({ [APPEARANCE_KEYS.size]: "12", [APPEARANCE_KEYS.scale]: "1.12" })).toBe(12);
    expect(sitewideSize({ [APPEARANCE_KEYS.scale]: "1.12" })).toBe(18);
    expect(sitewideSize({})).toBe(16);
  });

  it("warns about very small and very large sizes", () => {
    expect(sizeNote(8)).toMatch(/hard to read/);
    expect(sizeNote(16)).toMatch(/Normal/);
    expect(sizeNote(24)).toMatch(/Very large/);
    expect(sizeNote(17)).toBe("");
  });
});

describe("fonts", () => {
  it("offers the familiar word-processor fonts", () => {
    const labels = BODY_FONTS.map((f) => f.label);
    for (const name of ["Arial", "Times New Roman", "Georgia", "Verdana", "Courier New", "Montserrat"]) expect(labels).toContain(name);
  });

  it("falls back to Montserrat for an unknown font", () => {
    expect(fontByValue("comic-sans").label).toBe("Montserrat");
  });

  it("loads a Google font only once, and never for system fonts", () => {
    ensureFontLoaded(fontByValue("arial"));
    ensureFontLoaded(fontByValue("poppins"));
    ensureFontLoaded(fontByValue("poppins"));
    const links = document.head.querySelectorAll("link[id^='rtg-font-']");
    expect(links).toHaveLength(1);
    expect(links[0].href).toContain("family=Poppins");
  });
});

describe("parsePageSettings()", () => {
  it("keeps only known pages, offered sizes and offered fonts", () => {
    expect(
      parsePageSettings(
        JSON.stringify({
          "/events": { size: 18, font: "georgia" },
          "/chat": { size: 19, font: "arial" },
          "/nope": { size: 18 },
          "/faq": { font: "comic-sans" },
        })
      )
    ).toEqual({ "/events": { size: 18, font: "georgia" }, "/chat": { font: "arial" } });
  });

  it("reads the older per-page format (a scale per page)", () => {
    expect(parsePageSettings('{"/events":"1.06","/":1.12}')).toEqual({ "/events": { size: 17 }, "/": { size: 18 } });
  });

  it("survives bad input", () => {
    expect(parsePageSettings("not json")).toEqual({});
    expect(parsePageSettings(undefined)).toEqual({});
    expect(parsePageSettings("[1,2]")).toEqual({});
  });
});

describe("resolveAppearance() with a page", () => {
  const settings = {
    [APPEARANCE_KEYS.size]: "14",
    [APPEARANCE_KEYS.font]: "verdana",
    [APPEARANCE_KEYS.pages]: JSON.stringify({ "/events": { size: 20 }, "/lab/strava": { font: "times" } }),
  };

  it("uses what a page sets and the sitewide choice for the rest", () => {
    const events = resolveAppearance(settings, "/events/some-ride");
    expect(events.size).toBe(20);
    expect(events.font.label).toBe("Verdana");
    const strava = resolveAppearance(settings, "/lab/strava");
    expect(strava.size).toBe(14);
    expect(strava.font.label).toBe("Times New Roman");
  });

  it("falls back to the sitewide choice elsewhere", () => {
    const about = resolveAppearance(settings, "/about");
    expect([about.size, about.font.label]).toEqual([14, "Verdana"]);
  });

  it("never restyles the admin area", () => {
    const admin = resolveAppearance(settings, "/admin/events");
    expect([admin.size, admin.font.label]).toEqual([16, "Montserrat"]);
  });
});

describe("applyAppearance()", () => {
  it("sets the root text scale and font for the given page", () => {
    const el = document.createElement("div");
    const settings = { [APPEARANCE_KEYS.pages]: JSON.stringify({ "/chat": { size: 8, font: "courier" } }) };
    applyAppearance(settings, el, "/chat");
    expect(el.style.getPropertyValue("--rtg-text-scale")).toBe("0.5");
    expect(el.style.getPropertyValue("--font-sans")).toContain("Courier New");
    applyAppearance(settings, el, "/faq");
    expect(el.style.getPropertyValue("--rtg-text-scale")).toBe("1");
  });
});
