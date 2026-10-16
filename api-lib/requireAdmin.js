import { getSupabaseAdmin } from "./supabaseAdmin.js";

// Resolves the caller of an /api request to a real, currently-authorised
// admin — or says why not.
//
// "Authorised" means the same two things the database means by is_admin()
// (see supabase/migrations/020_admin_allowlist.sql): the account holds an
// admin_profiles row AND its email is on admin_allowed_emails. Both are
// re-checked here on every request rather than trusted from the browser,
// so an unauthorised caller is refused by the server even if they open the
// admin URL directly, call the endpoint with curl, or get past whatever the
// interface happens to be showing them.
//
// Returns { ok: true, user } or { ok: false, status, error }.
export async function requireAdmin(req) {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return { ok: false, status: 401, error: "missing_token" };

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return { ok: false, status: 500, error: "server_misconfigured" };

  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !userData?.user) return { ok: false, status: 401, error: "invalid_session" };

  const user = userData.user;
  const email = (user.email || "").toLowerCase();
  if (!email) return { ok: false, status: 403, error: "not_authorised" };

  const [{ data: allowed }, { data: adminRow }] = await Promise.all([
    supabaseAdmin.from("admin_allowed_emails").select("email").eq("email", email).maybeSingle(),
    supabaseAdmin.from("admin_profiles").select("id").eq("id", user.id).maybeSingle(),
  ]);

  if (!allowed) return { ok: false, status: 403, error: "not_authorised" };
  if (!adminRow) return { ok: false, status: 403, error: "not_admin" };

  return { ok: true, user, supabaseAdmin };
}
