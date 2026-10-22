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

describe("admin access: the first 3 people to sign in at /admin/login", () => {
  const schema = () => read("supabase/schema.sql");

  it("schema.sql's is_admin() only checks for an admin_profiles seat", () => {
    const fn = schema().match(/create or replace function is_admin\(\)[\s\S]*?\$\$;/)[0];
    expect(fn).toContain("admin_profiles");
    expect(fn).not.toContain("admin_allowed_emails");
  });

  it("schema.sql only mentions the old email allowlist to drop it", () => {
    const lines = schema().split("\n").filter((l) => /admin_allowed_emails|enforce_admin_allowlist/.test(l));
    for (const line of lines) expect(line, line).toMatch(/^\s*(--|drop )/);
  });

  it("the 3-seat cap is still enforced in the database", () => {
    expect(schema()).toMatch(/count\(\*\) from public\.admin_profiles\) >= 3/);
    expect(read("supabase/migrations/024_first_three_admins.sql")).toMatch(/>= 3/);
  });

  it("no app code reads the old allowlist table", () => {
    for (const file of ["api/auth/claim-bootstrap-admin.js", "api-lib/requireAdmin.js", "src/admin/pages/AdminsAdmin.jsx"]) {
      expect(read(file), file).not.toContain("admin_allowed_emails");
    }
  });
});

describe("chat (migration 025)", () => {
  const sql = () => read("supabase/migrations/025_chat.sql");

  it("turns on row level security for every chat table", () => {
    for (const t of ["chat_messages", "direct_messages", "chat_bans"]) {
      expect(sql()).toMatch(new RegExp(`alter table ${t} enable row level security`));
    }
  });

  it("lets only the two participants read a private message", () => {
    expect(sql()).toMatch(/on direct_messages\s+for select using \(auth\.uid\(\) = sender_id or auth\.uid\(\) = recipient_id\)/);
  });

  it("has no update/delete policy on messages — removal goes through chat_delete_message()", () => {
    expect(sql()).not.toMatch(/on chat_messages\s+for (update|delete)/);
    expect(sql()).not.toMatch(/on direct_messages\s+for (update|delete)/);
    expect(sql()).toMatch(/create or replace function chat_delete_message/);
  });

  it("stops muted members from posting and rate-limits everyone", () => {
    expect(sql().match(/not chat_is_banned\(auth\.uid\(\)\)/g)).toHaveLength(2);
    expect(sql()).toMatch(/v_recent >= 5/);
  });

  it("streams both message tables through Supabase Realtime", () => {
    expect(sql()).toMatch(/alter publication supabase_realtime add table chat_messages/);
    expect(sql()).toMatch(/alter publication supabase_realtime add table direct_messages/);
  });

  it("schema.sql carries the same chat definitions for fresh installs", () => {
    const schema = read("supabase/schema.sql");
    for (const name of ["create table if not exists chat_messages", "create table if not exists direct_messages", "create or replace function chat_people"]) {
      expect(schema).toContain(name);
    }
  });

  it("adds no serverless function (stays within Vercel Hobby's 12)", () => {
    expect(existsSync(path.join(ROOT, "api/chat"))).toBe(false);
  });
});

describe("admin menu (src/admin/adminNav.js)", () => {
  it("has a sidebar entry for every admin screen, and no dead links", async () => {
    const app = read("src/App.jsx");
    const block = app.slice(app.indexOf('path="/admin"'), app.indexOf("</Route>", app.indexOf('path="/admin"')));
    const routes = [...block.matchAll(/<Route path="([a-z0-9-]+)"/g)].map((m) => `/admin/${m[1]}`);
    const editorRoutes = read("src/admin/site-editor/EditorEntry.jsx");
    routes.push(...[...editorRoutes.matchAll(/<Route path="(\/admin[^"]*)"/g)].map(m => m[1]).filter(route => route !== '/admin/site-canvas'));
    expect(editorRoutes).toContain('<ProtectedRoute>');
    const nav = read("src/admin/adminNav.js");
    const links = [...nav.matchAll(/to: "(\/admin[^"]*)"/g)].map((m) => m[1]);
    expect(routes.length).toBeGreaterThan(40);
    const ridgeAliases = ["ridge-sessions", "ridge-results", "ridge-awards", "ridge-spotlight"];
    for (const alias of ridgeAliases) expect(block).toContain(`<Route path="${alias}" element={<RidgeAdmin />} />`);
    expect(block).toContain('<Route path="ridge-volunteers" element={<Navigate to="/admin/ridge-codes" replace/>}');
    expect(links).not.toContain("/admin/ridge-volunteers");
    for (const r of routes.filter(route => route !== "/admin/ridge-volunteers" && !ridgeAliases.some(alias => route === `/admin/${alias}`))) expect(links, `missing sidebar link for ${r}`).toContain(r);
    for (const l of links) if (l !== "/admin") expect(routes, `sidebar links to missing route ${l}`).toContain(l);
  });
});

describe("online now (migration 026)", () => {
  it("counts people, not browser tabs", () => {
    for (const file of ["supabase/schema.sql", "supabase/migrations/026_online_people_not_tabs.sql"]) {
      const sql = read(file);
      expect(sql, file).toMatch(/'online', \(select count\(distinct coalesce\(user_id::text, 'v:' \|\| visitor_id::text\)\)/);
      expect(sql, file).toMatch(/'online_members', \(select count\(distinct user_id\)/);
    }
  });
});

describe("per-section text (Admin -> Appearance)", () => {
  it("every section listed in the admin is tagged somewhere in the site", async () => {
    const { SECTION_TEXT_TARGETS } = await import("../../src/lib/appearance.js");
    const walk = (dir) =>
      readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((d) =>
        d.isDirectory() ? walk(path.join(dir, d.name)) : /\.jsx$/.test(d.name) ? [path.join(dir, d.name)] : []
      );
    const code = walk("src").map((f) => read(f)).join("\n");
    for (const [page, sections] of Object.entries(SECTION_TEXT_TARGETS)) {
      for (const { id } of sections) {
        const tagged =
          code.includes(`data-text-section="${id}"`) ||
          code.includes(`textSection={"${id}"}`) ||
          code.includes(`contentKey="${id}"`) ||
          (id === "hero" && code.includes('textSection = "hero"'));
        expect(tagged, `${page} → ${id} has no data-text-section tag`).toBe(true);
      }
    }
  });

  it("every public font size follows the section factor", () => {
    for (const file of ["src/index.css", "src/styles/lab.css"]) {
      const sizes = [...read(file).matchAll(/font-size\s*:\s*([^;}]*)/g)].map((m) => m[1].trim());
      const fixed = sizes.filter((v) => /(rem|px|vw)\b/.test(v) && !v.includes("--rtg-sec") && !v.includes("--rtg-text-scale"));
      expect(fixed, file).toEqual([]);
    }
  });
});
