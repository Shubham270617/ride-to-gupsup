import { beforeEach, vi } from "vitest";

// Every test starts with a fetch that refuses to go anywhere. Tests that
// exercise code calling fetch (Brevo, Strava, our own /api routes) replace
// it with vi.stubGlobal("fetch", ...) — so nothing ever reaches a real
// network service, and an unexpected call fails loudly instead.
beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url) => {
      throw new Error(`Unexpected network call in a test: ${url}`);
    })
  );
});
