import { getSupabaseAdmin } from "./supabaseAdmin.js";
import { isMailerConfigured, sendEmail } from "./mailer.js";
import { emailLayout, button, escapeHtml, siteUrl, FONT, DISPLAY_FONT } from "./emailLayout.js";

// POST /api/auth/account?op=welcome — sends the welcome email, once per
// member, the first time they're signed in. Called by the browser
// (src/lib/useWelcomeEmail.js) with the member's own session token; every
// rule is decided here, so calling it twice, from two devices, or with curl
// still sends at most one email.
//
// "Once" is profiles.welcome_email_sent_at (migration 022): claimed with a
// conditional update before sending, so two racing calls can't both send,
// and released again if Brevo fails so a later sign-in retries.

// Only brand-new accounts. Members who joined before this shipped were
// marked as already welcomed by migration 022; this is the backstop in case
// that migration ran late.
const NEW_ACCOUNT_DAYS = 7;
// Strava/XFitConnect accounts have a synthetic address with no mailbox.
const SYNTHETIC_DOMAIN = "@members.";

export default async function welcomeEmail(req, res) {
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
  if (!supabaseAdmin || !isMailerConfigured()) {
    res.status(500).json({ error: "server_misconfigured" });
    return;
  }

  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !userData?.user) {
    res.status(401).json({ error: "invalid_session" });
    return;
  }
  const user = userData.user;
  const email = (user.email || "").toLowerCase();

  if (!email || email.includes(SYNTHETIC_DOMAIN)) {
    res.status(200).json({ sent: false, reason: "no_mailbox" });
    return;
  }
  if (Date.now() - new Date(user.created_at).getTime() > NEW_ACCOUNT_DAYS * 24 * 60 * 60 * 1000) {
    res.status(200).json({ sent: false, reason: "not_new" });
    return;
  }

  const { data: claimed, error: claimErr } = await supabaseAdmin
    .from("profiles")
    .update({ welcome_email_sent_at: new Date().toISOString() })
    .eq("id", user.id)
    .is("welcome_email_sent_at", null)
    .select("full_name");
  if (claimErr) {
    console.error("[welcome-email] claim", claimErr);
    res.status(500).json({ error: "unexpected_error" });
    return;
  }
  if (!claimed?.length) {
    res.status(200).json({ sent: false, reason: "already_sent" });
    return;
  }

  const fullName =
    claimed[0].full_name || user.user_metadata?.full_name || user.user_metadata?.name || email.split("@")[0];
  const firstName = String(fullName).trim().split(/\s+/)[0] || "rider";

  try {
    await sendEmail({ to: email, ...welcomeContent(firstName, siteUrl(req)) });
  } catch (err) {
    console.error("[welcome-email] send", err);
    await supabaseAdmin.from("profiles").update({ welcome_email_sent_at: null }).eq("id", user.id);
    res.status(502).json({ error: "send_failed" });
    return;
  }

  res.status(200).json({ sent: true });
}

const MOVES = [
  {
    title: "Complete your profile",
    text: "Add a photo, your city and your sports, so the crew knows who's riding next to them.",
    cta: "Open my dashboard",
    path: "/dashboard",
  },
  {
    title: "Connect Strava",
    text: "Your rides and runs sync on their own, ready for the RTG Lab podiums and your progress charts.",
    cta: "Connect from my dashboard",
    path: "/dashboard",
  },
  {
    title: "Show up for a weekly ride",
    text: "Pick a session near you. Every one ends the RTG way: chai and gupshup.",
    cta: "See weekly rides",
    path: "/weekly-rides",
  },
];

const EXPLORE = [
  { icon: "🚴", title: "Events", text: "Rides, runs & race days", path: "/events" },
  { icon: "🏆", title: "Challenges", text: "Push your limits", path: "/challenges" },
  { icon: "📊", title: "RTG Lab", text: "Podiums & progress", path: "/lab" },
];

const CITIES = ["Delhi", "Chandigarh", "Dehradun", "Jaipur", "Shimla", "Punjab", "Pune", "Mumbai"];

function welcomeContent(firstName, site) {
  const name = escapeHtml(firstName);
  const subject = `Welcome to the movement, ${firstName}! 🚴`;

  const moves = MOVES.map(
    (m, i) => `<tr>
      <td width="52" valign="top" style="padding:0 0 22px">
        <div style="width:40px;height:40px;line-height:40px;border-radius:12px;background:#f76b1c;background-image:linear-gradient(135deg,#f45b18,#ff8a3d);color:#ffffff;font-family:${DISPLAY_FONT};font-size:22px;text-align:center">${i + 1}</div>
      </td>
      <td valign="top" style="padding:0 0 22px">
        <p style="margin:0 0 4px;font-family:${FONT};font-size:15px;font-weight:700;color:#17121f">${m.title}</p>
        <p style="margin:0 0 6px;font-family:${FONT};font-size:13px;line-height:1.6;color:#6d6772">${m.text}</p>
        <a href="${site}${m.path}" target="_blank" style="font-family:${FONT};font-size:13px;font-weight:700;color:#d94f0e;text-decoration:none">${m.cta} &rarr;</a>
      </td>
    </tr>`
  ).join("");

  const explore = EXPLORE.map(
    (e, i) => `<td class="rtg-col ${i < EXPLORE.length - 1 ? "rtg-col-gap" : ""}" width="33.33%" valign="top" style="padding:0 ${i < EXPLORE.length - 1 ? "10px" : "0"} 0 0">
      <a href="${site}${e.path}" target="_blank" style="display:block;text-decoration:none;background:#faf7fd;border:1px solid #ece6f6;border-radius:18px;padding:20px 12px;text-align:center">
        <span style="display:block;font-size:30px;line-height:1">${e.icon}</span>
        <span style="display:block;margin-top:10px;font-family:${FONT};font-size:14px;font-weight:700;color:#17121f">${e.title}</span>
        <span style="display:block;margin-top:3px;font-family:${FONT};font-size:12px;color:#6d6772">${e.text}</span>
      </a>
    </td>`
  ).join("");

  const content = `
    <!-- Hero photo -->
    <a href="${site}/community" target="_blank" style="text-decoration:none">
      <img src="${site}/images/email/welcome-hero.jpg" width="600" alt="The RTG crew after a ride" style="width:100%;max-width:600px;height:auto">
    </a>

    <!-- Greeting -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td class="rtg-pad" style="padding:38px 48px 8px">
        <p style="margin:0 0 12px"><span style="display:inline-block;padding:6px 14px;border-radius:999px;background:#fff1e8;font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:2px;color:#d94f0e">WELCOME TO RTG</span></p>
        <h1 class="rtg-h1" style="margin:0 0 16px;font-family:${DISPLAY_FONT};font-size:48px;line-height:0.95;font-weight:400;letter-spacing:0.5px;color:#17121f">YOU'RE IN, <span style="color:#f76b1c">${name.toUpperCase()}!</span></h1>
        <p style="margin:0 0 14px;font-family:${FONT};font-size:15px;line-height:1.7;color:#4a4458">
          Welcome to <strong style="color:#17121f">Ride Tea GupShup</strong>, India's endurance sports community. We're cyclists, runners, swimmers and first-timers who show up for each other, push a little harder together, and always finish with chai and good conversation.
        </p>
        <p style="margin:0 0 28px;font-family:${FONT};font-size:15px;line-height:1.7;color:#4a4458">
          Whether you're chasing your first 10K or your fifth century ride, there's a place for you in this crew.
        </p>
        ${button(`${site}/dashboard`, "Complete my profile &rarr;")}
      </td></tr>
    </table>

    <!-- First three moves -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td class="rtg-pad" style="padding:40px 48px 10px">
        <p style="margin:0 0 4px;font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:2px;color:#d94f0e">GET ROLLING</p>
        <h2 style="margin:0 0 22px;font-family:${DISPLAY_FONT};font-size:30px;font-weight:400;letter-spacing:0.5px;color:#17121f">YOUR FIRST THREE MOVES</h2>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${moves}</table>
      </td></tr>
    </table>

    <!-- Explore -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td class="rtg-pad" style="padding:6px 48px 40px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${explore}</tr></table>
      </td></tr>
    </table>

    <!-- Cities band -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td class="rtg-pad" bgcolor="#fff4ec" style="background:#fff4ec;background-image:linear-gradient(135deg,#fff4ec,#f6effd);padding:30px 48px;text-align:center">
        <p style="margin:0 0 8px;font-family:${DISPLAY_FONT};font-size:24px;letter-spacing:0.5px;color:#17121f">RIDING &amp; RUNNING ACROSS INDIA</p>
        <p style="margin:0;font-family:${FONT};font-size:13px;line-height:1.8;color:#6d6772">${CITIES.join(" &nbsp;·&nbsp; ")}</p>
      </td></tr>
    </table>

    <!-- Sign-off -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td class="rtg-pad" style="padding:34px 48px 40px">
        <p style="margin:0 0 6px;font-family:${FONT};font-size:15px;line-height:1.7;color:#4a4458">See you on the road,</p>
        <p style="margin:0;font-family:${DISPLAY_FONT};font-size:26px;letter-spacing:0.5px;color:#f76b1c">TEAM RTG 🧡</p>
        <p style="margin:14px 0 0;font-family:${FONT};font-size:13px;line-height:1.6;color:#6d6772">
          P.S. Follow us on <a href="https://www.instagram.com/rideteagupshup" target="_blank" style="color:#d94f0e;font-weight:700;text-decoration:none">Instagram</a> for ride photos, route drops and race-day stories.
        </p>
      </td></tr>
    </table>`;

  const text = [
    `You're in, ${firstName}!`,
    "",
    "Welcome to Ride Tea GupShup, India's endurance sports community. We're cyclists, runners, swimmers and first-timers who show up for each other, push a little harder together, and always finish with chai and good conversation.",
    "",
    "YOUR FIRST THREE MOVES",
    ...MOVES.map((m, i) => `${i + 1}. ${m.title}: ${m.text}\n   ${site}${m.path}`),
    "",
    `Events: ${site}/events`,
    `Challenges: ${site}/challenges`,
    `RTG Lab: ${site}/lab`,
    "",
    "See you on the road,",
    "Team RTG",
    "",
    "Questions? info@rideteagupshup.com",
  ].join("\n");

  const html = emailLayout({
    site,
    preheader: `Your RTG account is ready, ${firstName}. Here are your first three moves.`,
    content,
    footerNote: "You're getting this because you just created an RTG account.",
  });

  return { subject, text, html };
}

// Exposed for previewing the design without sending anything.
export { welcomeContent };
