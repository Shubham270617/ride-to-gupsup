import crypto from "node:crypto";
import { getSupabaseAdmin } from "./supabaseAdmin.js";
import { isMailerConfigured, sendEmail } from "./mailer.js";
import { emailLayout, button, siteUrl, FONT, DISPLAY_FONT } from "./emailLayout.js";

// POST /api/auth/account?op=password-reset — forgot password, without Supabase's
// mailer (2 emails/hour for the whole project). One email carries both a
// 6-digit code and a link; either one lets the member set a new password,
// after which they're signed straight in.
//
//   { action: "request",  email }                      send the email
//   { action: "verify",   email, code } | { token }    check before showing the password form
//   { action: "complete", email, code | token, password }
//                                                       set the password, return a session
//
// Codes and link tokens are stored only as HMACs (keyed by OTP_SECRET) in
// password_reset_codes — see supabase/migrations/021_password_reset_codes.sql.
// Signing in at the end reuses the trick from api/auth/[provider]/callback.js:
// generateLink() mints a one-time magic-link token WITHOUT sending any email,
// and the browser trades it for a session with verifyOtp().

const TABLE = "password_reset_codes";
const TTL_MINUTES = 30;
const RESEND_COOLDOWN_SECONDS = 45;
const MAX_PER_EMAIL_PER_HOUR = 5;
const MAX_PER_IP_PER_HOUR = 15;
// Wrong guesses allowed per code. Each check is counted before comparing
// (so parallel guesses cannot share one), and a right code gives its check
// back, so "verify" followed by "complete" never eats into the allowance.
const MAX_CODE_CHECKS = 8;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 72; // bcrypt ignores anything past 72 bytes
// Strava/XFitConnect accounts get a synthetic address at this domain (see
// api/auth/[provider]/callback.js) — no mailbox behind it.
const SYNTHETIC_DOMAIN = "@members.";

const hmac = (value) => crypto.createHmac("sha256", process.env.OTP_SECRET).update(value).digest("hex");
const codeHash = (email, code) => hmac(`code:${email}:${code}`);
const linkHash = (token) => hmac(`link:${token}`);

function sameHash(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

const normalizeEmail = (value) => (typeof value === "string" ? value.trim().toLowerCase() : "");

function clientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded || "").split(",")[0].trim();
  return first || req.socket?.remoteAddress || null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin || !process.env.OTP_SECRET || !isMailerConfigured()) {
    res.status(500).json({ error: "server_misconfigured" });
    return;
  }

  const body = req.body || {};
  try {
    if (body.action === "request") return await requestReset(supabaseAdmin, req, res, body);
    if (body.action === "verify") return await verifyReset(supabaseAdmin, res, body);
    if (body.action === "complete") return await completeReset(supabaseAdmin, res, body);
    res.status(400).json({ error: "unknown_action" });
  } catch (err) {
    console.error("[auth/password-reset]", err);
    res.status(500).json({ error: "unexpected_error" });
  }
}

async function requestReset(supabaseAdmin, req, res, body) {
  const email = normalizeEmail(body.email);
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: "invalid_email" });
    return;
  }

  // Rate limits. Every request writes a row, even for addresses with no
  // account, so they cap lookups as well as emails sent. An unregistered
  // address is told so plainly (404 no_account) — a deliberate choice, so
  // a typo shows up straight away instead of as an email that never comes.
  const ip = clientIp(req);
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data: recent, error: recentErr } = await supabaseAdmin
    .from(TABLE)
    .select("created_at")
    .eq("email", email)
    .gte("created_at", hourAgo)
    .order("created_at", { ascending: false });
  if (recentErr) throw recentErr;

  if (recent.length) {
    const wait = RESEND_COOLDOWN_SECONDS - (Date.now() - new Date(recent[0].created_at).getTime()) / 1000;
    if (wait > 0) {
      res.status(429).json({ error: "too_soon", retryAfter: Math.ceil(wait) });
      return;
    }
  }
  if (recent.length >= MAX_PER_EMAIL_PER_HOUR) {
    res.status(429).json({ error: "too_many_requests" });
    return;
  }
  if (ip) {
    const { count, error: ipErr } = await supabaseAdmin
      .from(TABLE)
      .select("id", { count: "exact", head: true })
      .eq("request_ip", ip)
      .gte("created_at", hourAgo);
    if (ipErr) throw ipErr;
    if (count >= MAX_PER_IP_PER_HOUR) {
      res.status(429).json({ error: "too_many_requests" });
      return;
    }
  }

  let userId = null;
  if (!email.includes(SYNTHETIC_DOMAIN)) {
    const { data: profiles, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .limit(1);
    if (profileErr) throw profileErr;
    userId = profiles?.[0]?.id || null;
  }

  // Only the newest code and link work.
  const { error: retireErr } = await supabaseAdmin
    .from(TABLE)
    .update({ consumed_at: new Date().toISOString() })
    .eq("email", email)
    .is("consumed_at", null);
  if (retireErr) throw retireErr;

  const expiresAt = new Date(Date.now() + TTL_MINUTES * 60 * 1000).toISOString();

  if (!userId) {
    // Still recorded, so the per-email and per-IP limits apply to lookups
    // of unregistered addresses too — that's what keeps "No account uses
    // this email" from being a fast way to test which addresses exist.
    const { error: insertErr } = await supabaseAdmin.from(TABLE).insert({ email, request_ip: ip, expires_at: expiresAt });
    if (insertErr) throw insertErr;
    res.status(404).json({ error: email.includes(SYNTHETIC_DOMAIN) ? "provider_account" : "no_account" });
    return;
  }

  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  const token = crypto.randomBytes(32).toString("base64url");

  const { data: row, error: insertErr } = await supabaseAdmin
    .from(TABLE)
    .insert({
      email,
      user_id: userId,
      code_hash: codeHash(email, code),
      link_hash: linkHash(token),
      request_ip: ip,
      expires_at: expiresAt,
    })
    .select("id")
    .single();
  if (insertErr) throw insertErr;

  const site = siteUrl(req);
  const link = `${site}/reset-password?token=${token}`;

  try {
    await sendEmail({ to: email, ...resetEmail(code, link, site) });
  } catch (err) {
    console.error("[auth/password-reset] send", err);
    // Retire the row so the failed attempt doesn't hold a live code.
    await supabaseAdmin.from(TABLE).update({ consumed_at: new Date().toISOString() }).eq("id", row.id);
    res.status(502).json({ error: "send_failed" });
    return;
  }

  res.status(200).json({ ok: true });
}

// Finds the live row a code or link belongs to. A code is checked against
// the newest live row for that email and every check is counted; a link
// token is 256 random bits, so it isn't.
async function findActiveRow(supabaseAdmin, body) {
  const live = () =>
    supabaseAdmin
      .from(TABLE)
      .select("id, email, user_id, code_hash, attempts")
      .is("consumed_at", null)
      .not("user_id", "is", null)
      .gt("expires_at", new Date().toISOString());

  if (typeof body.token === "string" && body.token) {
    const { data, error } = await live().eq("link_hash", linkHash(body.token)).maybeSingle();
    if (error) throw error;
    return data ? { row: data } : { failure: "invalid_link" };
  }

  const email = normalizeEmail(body.email);
  const code = typeof body.code === "string" ? body.code.replace(/\D/g, "") : "";
  if (!email || code.length !== 6) return { failure: "invalid_code" };

  const { data, error } = await live().eq("email", email).order("created_at", { ascending: false }).limit(1);
  if (error) throw error;
  const row = data?.[0];
  if (!row) return { failure: "invalid_code" };
  if (row.attempts >= MAX_CODE_CHECKS) return { failure: "too_many_attempts" };

  // Count the check before comparing, conditioned on the count we read —
  // parallel guesses can't share one attempt, so the cap actually holds.
  const { data: counted, error: countErr } = await supabaseAdmin
    .from(TABLE)
    .update({ attempts: row.attempts + 1 })
    .eq("id", row.id)
    .eq("attempts", row.attempts)
    .select("id");
  if (countErr) throw countErr;
  if (!counted?.length) return { failure: "invalid_code" };

  if (!sameHash(row.code_hash, codeHash(email, code))) {
    return { failure: row.attempts + 1 >= MAX_CODE_CHECKS ? "too_many_attempts" : "invalid_code" };
  }

  // Right code: give the check back, so only wrong guesses use up the
  // allowance — otherwise a code that just verified could be refused by
  // the "complete" call that follows it.
  const { error: refundErr } = await supabaseAdmin
    .from(TABLE)
    .update({ attempts: row.attempts })
    .eq("id", row.id)
    .eq("attempts", row.attempts + 1);
  if (refundErr) throw refundErr;
  return { row };
}

async function verifyReset(supabaseAdmin, res, body) {
  const { row, failure } = await findActiveRow(supabaseAdmin, body);
  if (failure) {
    res.status(400).json({ error: failure });
    return;
  }
  res.status(200).json({ ok: true, email: row.email });
}

async function completeReset(supabaseAdmin, res, body) {
  const password = typeof body.password === "string" ? body.password : "";
  if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    res.status(400).json({ error: "weak_password" });
    return;
  }

  const { row, failure } = await findActiveRow(supabaseAdmin, body);
  if (failure) {
    res.status(400).json({ error: failure });
    return;
  }

  // Use it up before changing anything, so the same code or link can't
  // succeed twice even if two requests race.
  const { data: claimed, error: claimErr } = await supabaseAdmin
    .from(TABLE)
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", row.id)
    .is("consumed_at", null)
    .select("id");
  if (claimErr) throw claimErr;
  if (!claimed?.length) {
    res.status(400).json({ error: body.token ? "invalid_link" : "invalid_code" });
    return;
  }

  const { data: updated, error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(row.user_id, { password });
  if (updateErr) {
    // Supabase's own password rules (Authentication > Policies) said no.
    // Nothing changed, so hand the code/link back for another try.
    console.error("[auth/password-reset] updateUserById", updateErr);
    const { error: releaseErr } = await supabaseAdmin.from(TABLE).update({ consumed_at: null }).eq("id", row.id);
    if (releaseErr) console.error("[auth/password-reset] release", releaseErr);
    res.status(400).json({ error: "password_rejected", message: updateErr.message });
    return;
  }

  const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: updated.user.email,
  });
  if (linkErr) {
    // The password did change — the browser tells them to log in with it.
    console.error("[auth/password-reset] generateLink", linkErr);
    res.status(200).json({ ok: true, token_hash: null });
    return;
  }

  res.status(200).json({ ok: true, token_hash: linkData.properties.hashed_token });
}

function resetEmail(code, link, site) {
  // The code stays inside the email — not in the subject or the preview
  // line, where it would show on lock screens and in the inbox list.
  const subject = "Reset your Ride Tea GupShup password";
  const text = [
    "Someone asked to reset the password on your Ride Tea GupShup account.",
    "",
    `Your code: ${code}`,
    "",
    "Or open this link to set a new password:",
    link,
    "",
    `The code and link work once and expire in ${TTL_MINUTES} minutes.`,
    "If this wasn't you, ignore this email — your password stays the same.",
  ].join("\n");

  const content = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td class="rtg-pad" style="padding:40px 48px 44px">
        <p style="margin:0 0 12px"><span style="display:inline-block;padding:6px 14px;border-radius:999px;background:#fff1e8;font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:2px;color:#d94f0e">PASSWORD RESET</span></p>
        <h1 class="rtg-h1" style="margin:0 0 14px;font-family:${DISPLAY_FONT};font-size:44px;line-height:0.95;font-weight:400;letter-spacing:0.5px;color:#17121f">BACK IN THE <span style="color:#f76b1c">SADDLE</span></h1>
        <p style="margin:0 0 24px;font-family:${FONT};font-size:15px;line-height:1.7;color:#4a4458">Enter this code on the reset page to set a new password:</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td align="center" bgcolor="#fff4ec" style="background:#fff4ec;background-image:linear-gradient(135deg,#fff4ec,#f6effd);border:1px solid #fde0cc;border-radius:20px;padding:22px 10px">
            <p style="margin:0 0 4px;font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:2px;color:#a2958f">YOUR CODE</p>
            <p style="margin:0;font-family:${DISPLAY_FONT};font-size:48px;letter-spacing:14px;color:#17121f">${code}</p>
          </td></tr>
        </table>
        <p style="margin:28px 0 18px;font-family:${FONT};font-size:14px;line-height:1.6;color:#6d6772;text-align:center">Rather click than type? This button does the same thing:</p>
        ${button(link, "Set a new password &rarr;")}
        <p style="margin:30px 0 0;padding-top:20px;border-top:1px solid #efeaf5;font-family:${FONT};font-size:12px;line-height:1.7;color:#8a809c">
          The code and link work once and expire in ${TTL_MINUTES} minutes. If you didn't ask for this, ignore this email — your password stays the same.
        </p>
      </td></tr>
    </table>`;

  const html = emailLayout({
    site,
    preheader: `Your one-time code and reset link are inside. They expire in ${TTL_MINUTES} minutes.`,
    content,
    footerNote: "You're getting this because a password reset was requested for your RTG account.",
  });

  return { subject, text, html };
}

// Exposed for previewing the design without sending anything.
export { resetEmail };
