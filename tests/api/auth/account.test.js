import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockReq, mockRes } from "../../helpers/http.js";

vi.mock("../../../api-lib/phoneLogin.js", () => ({
  default: vi.fn(async (req, res) => res.status(200).json({ op: "phone" })),
}));
vi.mock("../../../api-lib/passwordReset.js", () => ({
  default: vi.fn(async (req, res) => res.status(200).json({ op: "reset" })),
}));
vi.mock("../../../api-lib/welcomeEmail.js", () => ({
  default: vi.fn(async (req, res) => res.status(200).json({ op: "welcome" })),
}));

import handler from "../../../api/auth/account.js";
import phoneLogin from "../../../api-lib/phoneLogin.js";
import passwordReset from "../../../api-lib/passwordReset.js";
import welcomeEmail from "../../../api-lib/welcomeEmail.js";

beforeEach(() => vi.clearAllMocks());

async function call(query) {
  const req = mockReq({ query });
  const res = mockRes();
  await handler(req, res);
  return { req, res };
}

describe("/api/auth/account router", () => {
  it.each([
    ["phone-login", phoneLogin, "phone"],
    ["password-reset", passwordReset, "reset"],
    ["welcome", welcomeEmail, "welcome"],
  ])("routes op=%s to its handler with the same req/res", async (op, fn, tag) => {
    const { req, res } = await call({ op });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(req, res);
    expect(res.body).toEqual({ op: tag });
  });

  it.each([[{}], [{ op: "" }], [{ op: "delete-everything" }], [{ op: ["welcome", "phone-login"] }]])(
    "answers 404 unknown_op for %j",
    async (query) => {
      const { res } = await call(query);
      expect(res.statusCode).toBe(404);
      expect(res.body).toEqual({ error: "unknown_op" });
      expect(phoneLogin).not.toHaveBeenCalled();
      expect(passwordReset).not.toHaveBeenCalled();
      expect(welcomeEmail).not.toHaveBeenCalled();
    }
  );

  it("handles a request without a query object", async () => {
    const req = mockReq();
    delete req.query;
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(404);
  });

  // Regression for a bug found while testing: OPS was a plain object, so
  // inherited names resolved to Object.prototype functions. op=constructor
  // called Object(req, res) and never responded (the function hung until
  // the platform timeout); op=hasOwnProperty threw a TypeError (500).
  it.each(["constructor", "toString", "hasOwnProperty", "__proto__", "valueOf"])(
    "answers 404 for the inherited property name %s",
    async (op) => {
      const { res } = await call({ op });
      expect(res.statusCode).toBe(404);
      expect(res.body).toEqual({ error: "unknown_op" });
    }
  );
});
