import { beforeEach, it, expect, vi } from "vitest";
import { createFakeSupabase } from "../helpers/fakeSupabase.js";
import { mockReq, mockRes } from "../helpers/http.js";
import handler from "../../api-lib/admin/ridge.js";
import { requireAdmin } from "../../api-lib/requireAdmin.js";
vi.mock("../../api-lib/requireAdmin.js", () => ({ requireAdmin: vi.fn() }));
let db;
const requestId = "00000000-0000-4000-8000-000000000003";
const command = { type: "create_rider", name: "Rider A" };
const req = (body = { version: 0, requestId, command }) => mockReq({ body });
beforeEach(() => {
  db = createFakeSupabase();
  db.rpc = vi.fn().mockResolvedValue({ data: 1, error: null });
  requireAdmin.mockResolvedValue({
    ok: true,
    user: { id: "admin" },
    supabaseAdmin: db,
  });
  db.on("ridge_workspace", {
    data: { version: 0, state: { schemaVersion: 1, riders: [], sessions: [] } },
  });
});
it("does not read or write Ridge data without server authorization", async () => {
  requireAdmin.mockResolvedValue({
    ok: false,
    status: 403,
    error: "not_admin",
  });
  const res = mockRes();
  await handler(req(), res);
  expect(res.statusCode).toBe(403);
  expect(db.queries).toHaveLength(0);
  expect(db.rpc).not.toHaveBeenCalled();
});
it("rejects stale revisions without mutation", async () => {
  const res = mockRes();
  await handler(req({ version: 9, requestId, command }), res);
  expect(res.statusCode).toBe(409);
  expect(db.rpc).not.toHaveBeenCalled();
});
it("recognises a retry even when JSONB has reordered command keys", async () => {
  db.on("ridge_audit", {
    data: {
      actor_id: "admin",
      version: 1,
      details: { command: { name: "Rider A", type: "create_rider" } },
    },
  });
  const res = mockRes();
  await handler(req(), res);
  expect(res.body.alreadySaved).toBe(true);
  expect(db.rpc).not.toHaveBeenCalled();
});
it("derives state server-side and supplies the authenticated admin identity", async () => {
  const res = mockRes();
  await handler(req(), res);
  expect(res.statusCode).toBe(200);
  const [name, args] = db.rpc.mock.calls[0];
  expect(name).toBe("ridge_commit");
  expect(args.p_actor).toBe("admin");
  expect(args.p_state.riders[0].name).toBe("Rider A");
  expect(args.p_feed.results).toEqual([]);
});
it("returns an explicit conflict if a concurrent save wins the database lock", async () => {
  db.rpc.mockResolvedValue({ error: { code: "40001" } });
  const res = mockRes();
  await handler(req(), res);
  expect(res.statusCode).toBe(409);
  expect(res.body.ok).toBeUndefined();
});

