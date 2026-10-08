import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useCart } from "../lib/CartContext";
import useSession from "../lib/useSession";
import { useAuthGate } from "../lib/AuthGateContext";
import { useSiteSettings, pickText, buildStorePageCopy } from "../lib/publicData";
import { supabase } from "../lib/supabaseClient";
import { buildUpiUri, buildUpiQrDataUrl } from "../lib/upi";
import Reveal from "../components/ui/Reveal";

// ============================================================================
// CHECKOUT PAGE — delivery details, UPI payment and the order summary, in
// the Store's "Drop Lab" look. How an order is placed is unchanged: the
// buyer pays by UPI, types in the payment reference, and the order and its
// lines are saved for an admin to verify (Admin -> Orders).
//
// Its wording is in Admin -> Site Content -> Store ("Checkout page"); the
// UPI ID and payee name are on that same Store page of Site Content. Layout is in
// index.css under "CHECKOUT PAGE" (.rtg-co-*).
// ============================================================================

function formatPrice(n) {
  return `₹${n.toLocaleString("en-IN")}`;
}

// "Pay {amount} to {upi}" -> the sentence with each {name} swapped for its
// highlighted value.
function fillParts(template, parts) {
  return (template || "").split(/(\{\w+\})/g).map((piece, i) => {
    const key = piece.match(/^\{(\w+)\}$/)?.[1];
    return key && key in parts ? <b key={i}>{parts[key]}</b> : piece;
  });
}

// The page with one centred card: not logged in, or nothing in the bag.
function Notice({ title, text, children }) {
  return (
    <div className="rtg-co">
      <div className="rtg-co-shell">
        <Reveal className="rtg-co-card rtg-co-notice">
          <h1>{title}</h1>
          <p>{text}</p>
          {children}
        </Reveal>
      </div>
    </div>
  );
}

function LoggedOutPrompt({ copy }) {
  const { requestLogin } = useAuthGate();
  return (
    <Notice title={copy.loginTitle} text={copy.loginText}>
      <button type="button" className="rtg-co-submit" onClick={() => requestLogin("login")}>
        {copy.loginButtonLabel}
      </button>
    </Notice>
  );
}

function EmptyCart({ copy }) {
  return (
    <Notice title={copy.emptyTitle} text={copy.emptyText}>
      <Link to="/merchandise" className="rtg-co-submit">
        {copy.emptyButtonLabel}
      </Link>
    </Notice>
  );
}

export default function Checkout() {
  const { user, loading: sessionLoading } = useSession();
  const { items, subtotal, clear } = useCart();
  const settings = useSiteSettings();
  const copy = useMemo(() => buildStorePageCopy(settings), [settings]);
  const navigate = useNavigate();

  const [form, setForm] = useState({ customer_name: "", phone: "", address: "", city: "", pincode: "" });
  const [utr, setUtr] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const upiId = pickText(settings, "payment.upiId", "");
  const payeeName = pickText(settings, "payment.payeeName", "Ride Tea GupShup");
  const total = subtotal;
  const upiUri = upiId ? buildUpiUri({ upiId, payeeName, amount: total, note: "RTG Order" }) : null;

  useEffect(() => {
    if (!upiUri) return;
    let cancelled = false;
    buildUpiQrDataUrl(upiUri).then((url) => {
      if (!cancelled) setQrDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [upiUri]);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!utr.trim()) {
      setError(copy.utrMissingError);
      return;
    }
    setSubmitting(true);
    try {
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          customer_name: form.customer_name,
          phone: form.phone,
          email: user.email,
          address: form.address,
          city: form.city,
          pincode: form.pincode,
          subtotal,
          total,
          utr_reference: utr.trim(),
        })
        .select()
        .single();
      if (orderError) throw orderError;

      const orderItems = items.map((i) => ({
        order_id: order.id,
        product_id: i.productId,
        product_name: i.name,
        price: i.price,
        size: i.size,
        quantity: i.quantity,
      }));
      const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
      if (itemsError) throw itemsError;

      clear();
      navigate(`/order-confirmation/${order.id}`);
    } catch (err) {
      setError(err.message || copy.orderError);
    } finally {
      setSubmitting(false);
    }
  };

  if (sessionLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-rtg-orange-400" size={28} />
      </div>
    );
  }

  if (!user) return <LoggedOutPrompt copy={copy} />;
  if (items.length === 0) return <EmptyCart copy={copy} />;

  return (
    <div className="rtg-co">
      <div className="rtg-co-shell">
        <Reveal className="rtg-co-head">
          <span>{copy.checkoutKicker}</span>
          <h1>
            {copy.checkoutTitle} <b>{copy.checkoutTitleAccent}</b>
          </h1>
          <p>{copy.checkoutText}</p>
        </Reveal>

        <div className="rtg-co-grid">
          <Reveal direction="right">
            <form onSubmit={handleSubmit} className="rtg-co-card rtg-co-form">
              <h2>
                <i>01</i> {copy.shippingHeading}
              </h2>
              <input required name="customer_name" value={form.customer_name} onChange={handleChange} placeholder={copy.namePlaceholder} aria-label={copy.namePlaceholder} />
              <input required name="phone" value={form.phone} onChange={handleChange} placeholder={copy.phonePlaceholder} aria-label={copy.phonePlaceholder} />
              <textarea required name="address" value={form.address} onChange={handleChange} rows={3} placeholder={copy.addressPlaceholder} aria-label={copy.addressPlaceholder} />
              <div className="rtg-co-pair">
                <input required name="city" value={form.city} onChange={handleChange} placeholder={copy.cityPlaceholder} aria-label={copy.cityPlaceholder} />
                <input required name="pincode" value={form.pincode} onChange={handleChange} placeholder={copy.pincodePlaceholder} aria-label={copy.pincodePlaceholder} />
              </div>

              <h2 className="rtg-co-pay-head">
                <i>02</i> {copy.payHeading}
              </h2>
              {!upiId ? (
                <p className="rtg-co-muted">{copy.payNotSetText}</p>
              ) : (
                <div className="rtg-co-pay">
                  {qrDataUrl && <img src={qrDataUrl} alt={copy.qrAlt} />}
                  <div>
                    <p className="rtg-co-muted">{fillParts(copy.payText, { amount: formatPrice(total), upi: upiId })}</p>
                    <a href={upiUri}>{copy.payButtonLabel} ↗</a>
                  </div>
                </div>
              )}

              <input required value={utr} onChange={(e) => setUtr(e.target.value)} placeholder={copy.utrPlaceholder} aria-label={copy.utrPlaceholder} />
              <p className="rtg-co-help">{copy.utrHelpText}</p>

              {error && <p className="rtg-co-error">{error}</p>}

              <button type="submit" disabled={submitting} className="rtg-co-submit">
                {submitting ? (
                  <>
                    {copy.submittingLabel} <Loader2 size={16} className="animate-spin" />
                  </>
                ) : (
                  copy.submitLabel
                )}
              </button>
            </form>
          </Reveal>

          <Reveal direction="left" delay={0.1}>
            <aside className="rtg-co-card rtg-co-summary">
              <h2>{copy.summaryHeading}</h2>
              <div className="rtg-co-lines">
                {items.map((item) => (
                  <div key={`${item.productId}-${item.size || ""}`}>
                    {item.image && <img src={item.image} alt="" />}
                    <p>
                      <strong>{item.name}</strong>
                      <span>{[item.size, `× ${item.quantity}`].filter(Boolean).join(" ")}</span>
                    </p>
                    <b>{formatPrice(item.price * item.quantity)}</b>
                  </div>
                ))}
              </div>
              <div className="rtg-co-total">
                <span>{copy.totalLabel}</span>
                <strong>{formatPrice(total)}</strong>
              </div>
            </aside>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
