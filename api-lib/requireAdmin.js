import { getSupabaseAdmin } from "./supabaseAdmin.js";

// Resolves the caller of an /api request to a real, current admin — or says
// why not.
//
// "Admin" means the same thing the database means by is_admin(): the
// account holds one of the 3 admin_profiles seats. It is re-checked here on
// every request rather than trusted from the browser, so a non-admin is
// refused by the server even if they open the admin URL directly, call the
// endpoint with curl, or get past whatever the interface is showing them.
//
// Returns { ok: true, user, supabaseAdmin } or { ok: false, status, error }.
export async function requireAdmin(req) {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return { ok: false, status: 401, error: "missing_token" };

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return { ok: false, status: 500, error: "server_misconfigured" };

  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !userData?.user) return { ok: false, status: 401, error: "invalid_session" };

  const user = userData.user;
  const { data: adminRow } = await supabaseAdmin.from("admin_profiles").select("id").eq("id", user.id).maybeSingle();
  if (!adminRow) return { ok: false, status: 403, error: "not_admin" };

  return { ok: true, user, supabaseAdmin };
}
