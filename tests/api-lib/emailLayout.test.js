import { describe, expect, it, vi } from "vitest";
import { button, emailLayout, escapeHtml, siteUrl } from "../../api-lib/emailLayout.js";

describe("escapeHtml()", () => {
  it("escapes the five HTML-significant characters", () => {
    expect(escapeHtml(`<a href="x" title='y'>&</a>`)).toBe(
      "&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;"
    );
  });

  it("escapes & first so existing entities are not left live", () => {
    expect(escapeHtml("&lt;")).toBe("&amp;lt;");
  });

  it("handles null, undefined and non-strings", () => {
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
    expect(escapeHtml(42)).toBe("42");
  });
});

describe("siteUrl()", () => {
  it("uses FRONTEND_URL and trims trailing slashes", () => {
    vi.stubEnv("FRONTEND_URL", "https://rideteagupshup.com///");
    expect(siteUrl({ headers: { host: "ignored.test" } })).toBe("https://rideteagupshup.com");
  });

  it("falls back to https://<host> when FRONTEND_URL is unset", () => {
    vi.stubEnv("FRONTEND_URL", "");
    expect(siteUrl({ headers: { host: "preview.vercel.app" } })).toBe("https://preview.vercel.app");
  });

  // SECURITY NOTE (config, not a code change): with FRONTEND_URL unset the
  // reset link's origin comes from the client-supplied Host header. On
  // Vercel the Host has to route to this deployment, but behind anything
  // that forwards arbitrary Hosts this is password-reset host-header
  // poisoning. FRONTEND_URL must be set in production.
  it("documents: without FRONTEND_URL the origin is taken from the Host header", () => {
    vi.stubEnv("FRONTEND_URL", "");
    expect(siteUrl({ headers: { host: "attacker.example" } })).toBe("https://attacker.example");
  });
});

describe("button()", () => {
  it("renders a table-based link with the given href and label", () => {
    const html = button("https://x.test/go", "Go &rarr;");
    expect(html).toContain('<a href="https://x.test/go"');
    expect(html).toContain("Go &rarr;</a>");
    expect(html).toContain('role="presentation"');
  });
});

describe("emailLayout()", () => {
  const html = emailLayout({
    site: "https://x.test",
    preheader: 'Hi <there> & "you"',
    content: "<p id=content>BODY</p>",
    footerNote: "Because reasons.",
  });

  it("is a full HTML document with the content embedded verbatim", () => {
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain("<p id=content>BODY</p>");
    expect(html.trim().endsWith("</html>")).toBe(true);
  });

  it("escapes the preheader", () => {
    expect(html).toContain("Hi &lt;there&gt; &amp; &quot;you&quot;");
    expect(html).not.toContain("Hi <there>");
  });

  it("loads images from the site and links the socials", () => {
    expect(html).toContain("https://x.test/images/email/rtg-logo-white.png");
    expect(html).toContain("https://x.test/images/email/rtg-logo-mark.png");
    expect(html).toContain("https://www.instagram.com/rideteagupshup");
    expect(html).toContain("Because reasons.<br>");
  });

  it("omits the footer note when none is given", () => {
    const plain = emailLayout({ site: "https://x.test", preheader: "p", content: "c" });
    expect(plain).not.toContain("<br>\n            Questions?");
    expect(plain).toContain("Questions? Write to");
  });
});
