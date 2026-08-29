import QRCode from "qrcode";

// Builds a standard UPI deep link — opening it on a phone launches
// Google Pay/PhonePe/Paytm/etc. pre-filled with the payee and amount. This
// is the entire "payment gateway": no server, no fees, no KYC — the buyer
// pays you directly and reports back the transaction reference at
// checkout, which an admin then verifies by hand (see Checkout.jsx and
// OrdersAdmin.jsx).
export function buildUpiUri({ upiId, payeeName, amount, note }) {
  const params = new URLSearchParams({
    pa: upiId,
    pn: payeeName || "RTG",
    am: Number(amount).toFixed(2),
    cu: "INR",
  });
  if (note) params.set("tn", note);
  return `upi://pay?${params.toString()}`;
}

// Renders the UPI URI as a scannable QR code (data URL) — same information
// as the deep link above, for anyone paying by scanning from a second
// device instead of tapping through on the same phone.
export function buildUpiQrDataUrl(upiUri) {
  return QRCode.toDataURL(upiUri, { margin: 1, width: 320, color: { dark: "#1d1726", light: "#ffffff" } });
}
