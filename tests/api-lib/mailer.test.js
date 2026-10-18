import { beforeEach, describe, expect, it, vi } from "vitest";
import { jsonResponse } from "../helpers/http.js";
import { isMailerConfigured, sendEmail } from "../../api-lib/mailer.js";

let fetchMock;

beforeEach(() => {
  vi.stubEnv("BREVO_API_KEY", "brevo-key");
  vi.stubEnv("MAIL_FROM_EMAIL", "no-reply@rideteagupshup.com");
  vi.stubEnv("MAIL_FROM_NAME", "");
  fetchMock = vi.fn(async () => jsonResponse({ messageId: "m1" }, { status: 201 }));
  vi.stubGlobal("fetch", fetchMock);
});

const msg = { to: "a@b.co", subject: "Hi", html: "<p>Hi</p>", text: "Hi" };

describe("isMailerConfigured()", () => {
  it("is true only when both the API key and the sender are set", () => {
    expect(isMailerConfigured()).toBe(true);
    vi.stubEnv("BREVO_API_KEY", "");
    expect(isMailerConfigured()).toBe(false);
    vi.stubEnv("BREVO_API_KEY", "k");
    vi.stubEnv("MAIL_FROM_EMAIL", "");
    expect(isMailerConfigured()).toBe(false);
  });
});

describe("sendEmail()", () => {
  it("POSTs Brevo's transactional email API with the right shape", async () => {
    await sendEmail(msg);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.brevo.com/v3/smtp/email");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({
      "api-key": "brevo-key",
      "content-type": "application/json",
      accept: "application/json",
    });
    expect(JSON.parse(init.body)).toEqual({
      sender: { email: "no-reply@rideteagupshup.com", name: "Ride Tea GupShup" },
      to: [{ email: "a@b.co" }],
      subject: "Hi",
      htmlContent: "<p>Hi</p>",
      textContent: "Hi",
    });
  });

  it("uses MAIL_FROM_NAME when set", async () => {
    vi.stubEnv("MAIL_FROM_NAME", "RTG Crew");
    await sendEmail(msg);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).sender.name).toBe("RTG Crew");
  });

  it("resolves on any 2xx", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, { status: 202 }));
    await expect(sendEmail(msg)).resolves.toBeUndefined();
  });

  it("throws with the status and a truncated body on a non-2xx", async () => {
    fetchMock.mockResolvedValue(jsonResponse("x".repeat(1000), { status: 401 }));
    const err = await sendEmail(msg).catch((e) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toMatch(/^Brevo send failed \(401\): x+$/);
    expect(err.message.length).toBeLessThan(340);
  });

  it("still throws a useful error when the error body cannot be read", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, text: () => Promise.reject(new Error("stream")) });
    await expect(sendEmail(msg)).rejects.toThrow("Brevo send failed (500): ");
  });

  it("propagates network errors", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    await expect(sendEmail(msg)).rejects.toThrow("fetch failed");
  });
});
