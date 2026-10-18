import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Static checks across files: things no single unit test would notice.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (p) => readFileSync(path.join(ROOT, p), "utf8");
const relativeImports = (source) => [...source.matchAll(/^import .* from "(\.\.?\/[^"]+)";/gm)].map((m) => m[1]);

describe("serverless functions", () => {
  // Vercel Hobby allows 12 functions; account.js exists to stay under it.
  it("api/ stays within Vercel Hobby's 12-function limit", () => {
    const walk = (dir) =>
      readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((d) =>
        d.isDirectory() ? walk(path.join(dir, d.name)) : d.name.endsWith(".js") ? [path.join(dir, d.name)] : []
      );
    expect(walk("api").length).toBeLessThanOrEqual(12);
  });

  it("every relative import under api/ and api-lib/ resolves", () => {
    const files = ["api/auth/account.js", "api/auth/claim-bootstrap-admin.js", "api/auth/delete-account.js"];
    for (const dir of ["api-lib", "api/cron", "api/webhooks", "api/admin", "api/ai"]) {
      for (const f of readdirSync(path.join(ROOT, dir))) if (f.endsWith(".js")) files.push(`${dir}/${f}`);
    }
    for (const file of files) {
      for (const spec of relativeImports(read(file))) {
        expect(existsSync(path.join(ROOT, path.dirname(file), spec)), `${file} -> ${spec}`).toBe(true);
      }
    }
  });

  it("nothing still points at the old api/auth/phone-login.js route", () => {
    for (const file of ["src/lib/phoneAuth.js", "src/lib/passwordReset.js", "src/lib/useWelcomeEmail.js"]) {
      expect(read(file)).not.toMatch(/\/api\/auth\/phone-login|\/api\/auth\/password-reset[^?]/);
    }
  });

  // BUG (not fixed): server.js (the `npm start` / Express deployment target)
  // still imports ./api/cloudinary/sign.js, which no longer exists, so
  // `npm start` crashes with ERR_MODULE_NOT_FOUND before listening. It also
  // doesn't mount /api/auth/account, delete-account, claim-bootstrap-admin,
  // the webhook, cron or AI routes. Vercel deployments are unaffected.
  it.fails("server.js only imports modules that exist", () => {
    for (const spec of relativeImports(read("server.js"))) {
      expect(existsSync(path.join(ROOT, spec)), spec).toBe(true);
    }
  });
});

describe("database migrations match the code", () => {
  const m021 = read("supabase/migrations/021_password_reset_codes.sql");
  const m022 = read("supabase/migrations/022_welcome_email.sql");
  const schema = read("supabase/schema.sql");

  it("password_reset_codes has every column passwordReset.js uses", () => {
    for (const col of [
      "id",
      "email",
      "user_id",
      "code_hash",
      "link_hash",
      "attempts",
      "expires_at",
      "consumed_at",
      "request_ip",
      "created_at",
    ]) {
      expect(m021, col).toMatch(new RegExp(`\\n\\s+${col}\\s`));
    }
  });

  it("password_reset_codes is locked down with RLS and no policies", () => {
    expect(m021).toMatch(/alter table password_reset_codes enable row level security/);
    expect(m021).not.toMatch(/create policy/i);
  });

  it("022 adds profiles.welcome_email_sent_at and only back-fills old accounts", () => {
    expect(m022).toMatch(/add column if not exists welcome_email_sent_at timestamptz/);
    expect(m022).toMatch(/created_at < now\(\) - interval '7 days'/);
  });

  it("schema.sql includes both new migrations for fresh installs", () => {
    expect(schema).toContain("create table if not exists password_reset_codes");
    expect(schema).toContain("add column if not exists welcome_email_sent_at");
  });
});
