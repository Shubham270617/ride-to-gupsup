// The branded frame every RTG email sits in: purple header with the white
// logo, the orange→lilac accent bar, a white content card, and a footer with
// the colour logo mark and social links. Written the way email clients need
// it — nested tables and inline styles, no external CSS — so it holds up in
// Gmail, Outlook and Apple Mail alike.
//
// Images are loaded from the live site (public/images/email/), so they only
// appear once the site is deployed and FRONTEND_URL points at it.

const SOCIAL = [
  { label: "Instagram", url: "https://www.instagram.com/rideteagupshup" },
  { label: "Facebook", url: "https://www.facebook.com/share/1DV6yBmEF7/?mibextid=wwXIfr" },
  { label: "YouTube", url: "https://youtube.com/@RideTeaGupShup" },
];

export const FONT = "'Montserrat', 'Segoe UI', Helvetica, Arial, sans-serif";
export const DISPLAY_FONT = "'Bebas Neue', 'Oswald', Impact, 'Arial Narrow', Arial, sans-serif";

// Where links and images in emails point. FRONTEND_URL is the live site.
export function siteUrl(req) {
  return (process.env.FRONTEND_URL || `https://${req.headers.host}`).replace(/\/+$/, "");
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// A big orange pill button. Table-based so Outlook draws it too.
export function button(href, label) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto">
  <tr><td align="center" bgcolor="#f76b1c" style="border-radius:999px;background:#f76b1c;background-image:linear-gradient(135deg,#f45b18,#ff8a3d);box-shadow:0 12px 24px -10px rgba(247,107,28,0.7)">
    <a href="${href}" target="_blank" style="display:inline-block;padding:16px 36px;font-family:${FONT};font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px;letter-spacing:0.3px">${label}</a>
  </td></tr>
</table>`;
}

export function emailLayout({ site, preheader, content, footerNote }) {
  const socials = SOCIAL.map(
    (s) => `<a href="${s.url}" target="_blank" style="color:#ffb073;text-decoration:none;font-weight:600">${s.label}</a>`
  ).join(`<span style="color:#6b5a8e">&nbsp;&nbsp;·&nbsp;&nbsp;</span>`);

  return `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>Ride Tea GupShup</title>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Montserrat:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  body { margin:0; padding:0; -webkit-text-size-adjust:100%; }
  img { border:0; outline:none; text-decoration:none; display:block; }
  a { color:#d94f0e; }
  @media (max-width:620px) {
    .rtg-pad { padding-left:24px !important; padding-right:24px !important; }
    .rtg-col { display:block !important; width:100% !important; box-sizing:border-box; }
    .rtg-col-gap { padding:0 0 12px 0 !important; }
    .rtg-h1 { font-size:38px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#f3eff9">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f3eff9" style="background:#f3eff9">
    <tr><td align="center" style="padding:28px 12px">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px">

        <!-- Header -->
        <tr><td align="center" bgcolor="#1b1130" style="background:#1b1130;background-image:linear-gradient(140deg,#1b1130 0%,#35246f 70%,#5e43a1 100%);border-radius:24px 24px 0 0;padding:30px 24px 26px">
          <a href="${site}" target="_blank" style="text-decoration:none">
            <img src="${site}/images/email/rtg-logo-white.png" width="270" alt="Ride Tea GupShup" style="width:270px;max-width:80%;height:auto;margin:0 auto;color:#ffffff;font-family:${FONT};font-size:22px;font-weight:700">
          </a>
        </td></tr>
        <tr><td height="5" bgcolor="#f76b1c" style="height:5px;line-height:5px;font-size:0;background:#f76b1c;background-image:linear-gradient(90deg,#f45b18,#ff8a3d,#b981d8)">&nbsp;</td></tr>

        <!-- Content -->
        <tr><td bgcolor="#ffffff" style="background:#ffffff">
          ${content}
        </td></tr>

        <!-- Footer -->
        <tr><td align="center" bgcolor="#1b1130" style="background:#1b1130;border-radius:0 0 24px 24px;padding:32px 24px 30px">
          <img src="${site}/images/email/rtg-logo-mark.png" width="64" alt="" style="width:64px;height:auto;margin:0 auto 12px;border-radius:16px;background:#ffffff;padding:6px">
          <p style="margin:0 0 6px;font-family:${DISPLAY_FONT};font-size:20px;letter-spacing:1.5px;color:#ffffff">RIDE TOGETHER. RUN TOGETHER. GROW TOGETHER.</p>
          <p style="margin:0 0 18px;font-family:${FONT};font-size:12px;color:#b9acd6">India's endurance sports community</p>
          <p style="margin:0 0 18px;font-family:${FONT};font-size:13px">${socials}</p>
          <p style="margin:0;font-family:${FONT};font-size:11px;line-height:1.7;color:#8f80b3">
            ${footerNote ? `${footerNote}<br>` : ""}
            Questions? Write to <a href="mailto:info@rideteagupshup.com" style="color:#ffb073;text-decoration:none">info@rideteagupshup.com</a>
            · <a href="${site}" style="color:#ffb073;text-decoration:none">rideteagupshup.com</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
