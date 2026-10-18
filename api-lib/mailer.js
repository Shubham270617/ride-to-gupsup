// Sends transactional email through Brevo's HTTP API — free plan, about 300
// emails a day. Used instead of Supabase's built-in mailer, which is capped
// at 2 emails an hour for the whole project.
//
// Needs BREVO_API_KEY and MAIL_FROM_EMAIL (an address on a domain verified
// in Brevo, with its SPF/DKIM records in DNS — otherwise mail lands in
// spam). MAIL_FROM_NAME is optional.
export function isMailerConfigured() {
  return Boolean(process.env.BREVO_API_KEY && process.env.MAIL_FROM_EMAIL);
}

export async function sendEmail({ to, subject, html, text }) {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: { email: process.env.MAIL_FROM_EMAIL, name: process.env.MAIL_FROM_NAME || "Ride Tea GupShup" },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Brevo send failed (${res.status}): ${body.slice(0, 300)}`);
  }
}
