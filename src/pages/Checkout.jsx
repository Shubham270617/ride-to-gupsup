import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, ShoppingBag, QrCode, ExternalLink } from "lucide-react";
import { useCart } from "../lib/CartContext";
import useSession from "../lib/useSession";
import { useAuthGate } from "../lib/AuthGateContext";
import { useSiteSettings, pickText } from "../lib/publicData";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";
import { buildUpiUri, buildUpiQrDataUrl } from "../lib/upi";
import Section from "../components/ui/Section";
import GlassCard from "../components/ui/GlassCard";
import Reveal from "../components/ui/Reveal";
import Button from "../components/ui/Button";

function formatPrice(n) {
  return `₹${n.toLocaleString("en-IN")}`;
}

function LoggedOutPrompt() {
  const { requestLogin } = useAuthGate();
  return (
    <Section>
      <GlassCard className="max-w-md mx-auto text-center py-14">
        <ShoppingBag className="text-rtg-orange-400 mx-auto mb-4" size={32} />
        <h1 className="font-display text-3xl mb-2">Checkout</h1>
        <p className="text-rtg-mist mb-8">Log in to place your order — this ties it to your account so you can track it from your dashboard.</p>
        <Button onClick={() => requestLogin("login")} size="lg">Log In</Button>
      </GlassCard>
    </Section>
  );
}

function EmptyCart() {
  return (
    <Section>
      <GlassCard className="max-w-md mx-auto text-center py-14">
        <ShoppingBag className="text-rtg-mist mx-auto mb-4" size={32} />
        <h1 className="font-display text-3xl mb-2">Your Cart is Empty</h1>
        <p className="text-rtg-mist mb-8">Add something from the store before checking out.</p>
        <Button to="/merchandise" size="lg">Browse Merchandise</Button>
      </GlassCard>
    </Section>
  );
}

export default function Checkout() {
  const { user, loading: sessionLoading } = useSession();
  const { items, subtotal, clear } = useCart();
  const settings = useSiteSettings();
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
      setError("Enter the UPI transaction reference (UTR) you received after paying.");
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
      setError(err.message || "Something went wrong placing your order. Please try again.");
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

  if (!user) return <LoggedOutPrompt />;
  if (items.length === 0) return <EmptyCart />;

  return (
    <div className="pt-32 pb-10">
      <Section eyebrow="Almost There" title="Checkout" center>
        <div className="grid lg:grid-cols-5 gap-10">
          <Reveal direction="right" className="lg:col-span-3">
            <GlassCard>
              <h3 className="font-display text-2xl mb-6">Shipping Details</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  required
                  name="customer_name"
                  value={form.customer_name}
                  onChange={handleChange}
                  placeholder="Full Name"
                  className="w-full rounded-xl bg-white/5 border border-white/15 px-4 py-3.5 text-sm focus:outline-none focus:border-rtg-orange-400 transition-colors"
                />
                <input
                  required
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="Phone Number"
                  className="w-full rounded-xl bg-white/5 border border-white/15 px-4 py-3.5 text-sm focus:outline-none focus:border-rtg-orange-400 transition-colors"
                />
                <textarea
                  required
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Delivery Address"
                  className="w-full rounded-xl bg-white/5 border border-white/15 px-4 py-3.5 text-sm focus:outline-none focus:border-rtg-orange-400 transition-colors resize-none"
                />
                <div className="grid sm:grid-cols-2 gap-4">
                  <input
                    required
                    name="city"
                    value={form.city}
                    onChange={handleChange}
                    placeholder="City"
                    className="rounded-xl bg-white/5 border border-white/15 px-4 py-3.5 text-sm focus:outline-none focus:border-rtg-orange-400 transition-colors"
                  />
                  <input
                    required
                    name="pincode"
                    value={form.pincode}
                    onChange={handleChange}
                    placeholder="Pincode"
                    className="rounded-xl bg-white/5 border border-white/15 px-4 py-3.5 text-sm focus:outline-none focus:border-rtg-orange-400 transition-colors"
                  />
                </div>

                <div className="pt-4 border-t border-white/10">
                  <h3 className="font-display text-2xl mb-4">Pay via UPI</h3>
                  {!upiId ? (
                    <p className="text-sm text-rtg-mist">
                      Payment isn't set up yet — an admin needs to add a UPI ID in Admin → Site Content.
                    </p>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-6 items-start">
                      {qrDataUrl && (
                        <img src={qrDataUrl} alt="UPI QR code" className="w-40 h-40 rounded-2xl bg-white p-2 shrink-0" />
                      )}
                      <div className="flex-1 space-y-3">
                        <p className="text-sm text-rtg-mist">
                          Scan the QR, or tap below to pay <strong className="text-rtg-white">{formatPrice(total)}</strong> directly to{" "}
                          <span className="text-rtg-orange-400 font-semibold">{upiId}</span>.
                        </p>
                        <a
                          href={upiUri}
                          className="inline-flex items-center gap-2 text-sm font-semibold rounded-full bg-white/5 px-4 py-2.5 hover:bg-white/10 transition-colors"
                        >
                          <QrCode size={15} /> Pay in UPI App <ExternalLink size={13} />
                        </a>
                      </div>
                    </div>
                  )}

                  <div className="mt-5">
                    <input
                      required
                      value={utr}
                      onChange={(e) => setUtr(e.target.value)}
                      placeholder="UPI Transaction Reference (UTR) — from your payment app"
                      className="w-full rounded-xl bg-white/5 border border-white/15 px-4 py-3.5 text-sm focus:outline-none focus:border-rtg-orange-400 transition-colors"
                    />
                    <p className="text-xs text-rtg-mist mt-2">
                      We'll verify this against our bank/UPI records and confirm your order within 24 hours.
                    </p>
                  </div>
                </div>

                {error && <p className="text-sm text-rtg-orange-400">{error}</p>}

                <motion.button
                  type="submit"
                  disabled={submitting}
                  whileHover={{ scale: submitting ? 1 : 1.02 }}
                  whileTap={{ scale: submitting ? 1 : 0.98 }}
                  className="w-full rounded-full bg-rtg-orange-500 text-rtg-ink font-semibold px-6 py-4 flex items-center justify-center gap-2 hover:bg-rtg-orange-400 transition-colors disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      Placing Order… <Loader2 size={16} className="animate-spin" />
                    </>
                  ) : (
                    "I've Paid — Submit Order"
                  )}
                </motion.button>
              </form>
            </GlassCard>
          </Reveal>

          <Reveal direction="left" delay={0.1} className="lg:col-span-2">
            <GlassCard>
              <h3 className="font-display text-2xl mb-6">Order Summary</h3>
              <div className="space-y-4 mb-6">
                {items.map((item) => (
                  <div key={`${item.productId}-${item.size || ""}`} className="flex justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate">{item.name}{item.size ? ` (${item.size})` : ""} × {item.quantity}</p>
                    </div>
                    <span className="text-rtg-white/90 shrink-0">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <span className="text-rtg-mist">Total</span>
                <span className="font-display text-3xl">{formatPrice(total)}</span>
              </div>
            </GlassCard>
          </Reveal>
        </div>
      </Section>
    </div>
  );
}

