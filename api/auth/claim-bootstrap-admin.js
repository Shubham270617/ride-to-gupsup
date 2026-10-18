import { getSupabaseAdmin } from "../../api-lib/supabaseAdmin.js";

// POST /api/auth/claim-bootstrap-admin — called right after a successful
// sign-in on /admin/login (and from the Google callback) to decide whether
// this account may enter the admin dashboard.
//
// The rule: the first 3 people to sign in on the admin page are the admins.
// An account that already holds a seat is let straight in; anyone else gets
// a seat if one is free, and a 409 "seats_full" once all 3 are taken. The
// limit itself is enforced by the admin_seat_cap trigger in the database
// (supabase/schema.sql), under a lock, so two people signing in at the same
// moment can never end up as a 4th admin. Removing an admin (Admin →
// Members) frees their seat for the next person who signs in here.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) {
    res.status(401).json({ error: "missing_token" });
    return;
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    res.status(500).json({ error: "server_misconfigured" });
    return;
  }

  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !userData?.user) {
    res.status(401).json({ error: "invalid_session" });
    return;
  }
  const user = userData.user;

  // Already an admin — nothing to grant, just confirm.
  const { data: existingAdmin } = await supabaseAdmin
    .from("admin_profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (existingAdmin) {
    res.status(200).json({ granted: true, alreadyAdmin: true });
    return;
  }

  const fullName = user.user_metadata?.full_name || user.user_metadata?.name || null;

  // admin_profiles.id has a foreign key to profiles.id, so an account with
  // no profiles row (created before the signup trigger existed, or whose
  // row was deleted by hand) could never be granted a seat — the insert
  // below failed with a foreign-key error. Make sure the row exists first;
  // ignoreDuplicates leaves an existing row untouched.
  const { error: profileErr } = await supabaseAdmin
    .from("profiles")
    .upsert({ id: user.id, email: user.email, full_name: fullName }, { onConflict: "id", ignoreDuplicates: true });
  if (profileErr) {
    console.error("[claim-bootstrap-admin] profiles upsert", profileErr);
    res.status(500).json({ granted: false, reason: "grant_failed", message: profileErr.message });
    return;
  }

  const { error: insertErr } = await supabaseAdmin
    .from("admin_profiles")
    .insert({ id: user.id, full_name: fullName });

  if (insertErr) {
    // The seat-cap trigger surfaces as an insert error. Report it
    // distinctly so the interface can say something useful.
    const seatsFull = /seat cap/i.test(insertErr.message || "");
    if (!seatsFull) console.error("[claim-bootstrap-admin] admin_profiles insert", insertErr);
    res.status(seatsFull ? 409 : 500).json({
      granted: false,
      reason: seatsFull ? "seats_full" : "grant_failed",
      message: seatsFull
        ? "All 3 admin seats are in use. An existing admin must remove someone in Admin → Members first."
        : insertErr.message,
    });
    return;
  }

  res.status(200).json({ granted: true });
}
