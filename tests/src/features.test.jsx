import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { createFakeSupabase } from "../helpers/fakeSupabase";

const state = vi.hoisted(() => ({ db: null }));
vi.mock("../../src/lib/supabaseClient", () => ({
  isSupabaseConfigured: true,
  get supabase() {
    return state.db;
  },
}));

// Fresh modules each test, so the per-page-load switch cache starts empty.
async function load() {
  vi.resetModules();
  const features = await import("../../src/lib/features");
  const { default: FeatureGate } = await import("../../src/components/FeatureGate");
  const { default: FeatureSwitch } = await import("../../src/admin/components/FeatureSwitch");
  return { ...features, FeatureGate, FeatureSwitch };
}
const setting = (value) => state.db.on("site_settings", { data: value === undefined ? null : { value } }, { action: "select" });

beforeEach(() => {
  state.db = createFakeSupabase();
});

describe("RTG Crew page switch (feature.volunteer.enabled)", () => {
  it("is off when the setting has never been saved: the page is 'not found'", async () => {
    setting(undefined);
    const { FeatureGate, FEATURE_KEYS } = await load();
    render(<MemoryRouter><FeatureGate feature={FEATURE_KEYS.volunteer}><p>Crew page</p></FeatureGate></MemoryRouter>);
    expect(await screen.findByText("Off the Marked Route")).toBeInTheDocument(); // the site's 404 page
    expect(screen.queryByText("Crew page")).not.toBeInTheDocument();
    expect(state.db.queries[0].filters).toContainEqual({ op: "eq", column: "key", value: "feature.volunteer.enabled" });
  });

  it("shows the page when the admin has switched it on", async () => {
    setting("true");
    const { FeatureGate, FEATURE_KEYS } = await load();
    render(<MemoryRouter><FeatureGate feature={FEATURE_KEYS.volunteer}><p>Crew page</p></FeatureGate></MemoryRouter>);
    expect(await screen.findByText("Crew page")).toBeInTheDocument();
  });

  it("the admin switch saves 'true' to site_settings when flipped on", async () => {
    setting("false");
    state.db.on("site_settings", { data: null }, { action: "upsert" });
    const { FeatureSwitch, FEATURE_KEYS } = await load();
    render(<FeatureSwitch settingKey={FEATURE_KEYS.volunteer} title="Show the RTG Crew page" onText="Live" offText="Hidden" />);
    expect(await screen.findByText("Hidden")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("switch", { name: "Show the RTG Crew page" }));
    expect(await screen.findByText("Live")).toBeInTheDocument();
    const write = state.db.queries.find((q) => q.action === "upsert");
    expect(write.payload).toMatchObject({ key: "feature.volunteer.enabled", value: "true" });
  });

  it("Layout Studio and the site editor stay hidden until their tables exist", async () => {
    const { SITE_EDITOR_READY } = await load();
    expect(SITE_EDITOR_READY).toBe(false);
    const { allLinks } = await import("../../src/admin/adminNav");
    expect(allLinks.map((l) => l.to)).not.toContain("/admin/layout-studio");
    expect(allLinks.map((l) => l.to)).toContain("/admin/volunteer");
  });
});

describe("parts switched off in code", () => {
  it("Chat and Tapri are hidden, and Ridge Import is gone from the admin menu", async () => {
    const { CHAT_READY, TAPRI_READY } = await load();
    expect(CHAT_READY).toBe(false);
    expect(TAPRI_READY).toBe(false);
    const { allLinks, groups } = await import("../../src/admin/adminNav");
    const paths = allLinks.map((l) => l.to);
    expect(paths).not.toContain("/admin/ridge-import");
    expect(paths).not.toContain("/admin/ai");
    expect(groups.every((g) => g.links.length > 0)).toBe(true);
  });
});
