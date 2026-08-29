import { useEffect, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { Loader2, CheckCircle2 } from "lucide-react";
import useSession from "../lib/useSession";
import { supabase } from "../lib/supabaseClient";
import Section from "../components/ui/Section";
import GlassCard from "../components/ui/GlassCard";
import Button from "../components/ui/Button";

function formatPrice(n) {
  return `₹${Number(n).toLocaleString("en-IN")}`;
}

export default function OrderConfirmation() {
  const { orderId } = useParams();
  const { user, loading: sessionLoading } = useSession();
  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionLoading || !user) return;
    let cancelled = false;
    (async () => {
      const [{ data: orderData }, { data: itemsData }] = await Promise.all([
        supabase.from("orders").select("*").eq("id", orderId).maybeSingle(),
        supabase.from("order_items").select("*").eq("order_id", orderId),
      ]);
      if (cancelled) return;
      setOrder(orderData || null);
      setItems(itemsData || []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId, user, sessionLoading]);

  if (sessionLoading || loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-rtg-orange-400" size={28} />
      </div>
    );
  }

  if (!order) {
    return <Navigate to="/merchandise" replace />;
  }

  return (
    <div className="pt-32 pb-20">
      <Section center>
        <GlassCard className="max-w-xl mx-auto text-center py-14">
          <CheckCircle2 className="text-rtg-orange-400 mx-auto mb-4" size={40} />
          <h1 className="font-display text-4xl mb-3">Order Placed!</h1>
          <p className="text-rtg-mist mb-8">
            We'll verify your payment (reference <span className="text-rtg-white">{order.utr_reference}</span>) and confirm
            your order within 24 hours. You can track its status from your dashboard.
          </p>

          <div className="text-left space-y-3 mb-8">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-rtg-white/90">
                  {item.product_name}{item.size ? ` (${item.size})` : ""} × {item.quantity}
                </span>
                <span className="text-rtg-mist">{formatPrice(item.price * item.quantity)}</span>
              </div>
            ))}
            <div className="flex justify-between pt-3 border-t border-white/10 font-semibold">
              <span>Total</span>
              <span>{formatPrice(order.total)}</span>
            </div>
          </div>

          <Button to="/dashboard" size="lg">View My Orders</Button>
        </GlassCard>
      </Section>
    </div>
  );
}
