import { useEffect, useState } from "react";
import { Package, Loader2 } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import Pagination from "../components/Pagination";

const PAGE_SIZE = 15;

const STATUSES = [
  { value: "pending_verification", label: "Pending Verification" },
  { value: "confirmed", label: "Confirmed" },
  { value: "rejected", label: "Rejected" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
];

const STATUS_STYLE = {
  pending_verification: "bg-amber-500/15 text-amber-300",
  confirmed: "bg-green-500/15 text-green-300",
  rejected: "bg-red-500/15 text-red-300",
  shipped: "bg-blue-500/15 text-blue-300",
  delivered: "bg-rtg-orange-500/15 text-rtg-orange-300",
};

function formatPrice(n) {
  return `₹${Number(n).toLocaleString("en-IN")}`;
}

function formatDate(iso) {
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

// Orders placed through the self-hosted UPI checkout — every order starts
// "Pending Verification" until you check the buyer's UTR against your own
// bank/UPI app and update its status here. See Checkout.jsx and
// supabase/schema.sql (the "Merchandise Orders" section) for the rest of
// this flow.
export default function OrdersAdmin() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false });
    setOrders(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (order, status) => {
    setBusyId(order.id);
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status } : o)));
    await supabase.from("orders").update({ status }).eq("id", order.id);
    setBusyId(null);
  };

  const pendingCount = orders.filter((o) => o.status === "pending_verification").length;
  const totalPages = Math.max(1, Math.ceil(orders.length / PAGE_SIZE));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  const pageOrders = orders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-3xl">Orders</h1>
        {pendingCount > 0 && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-full bg-amber-500/15 text-amber-300 px-3 py-1">
            {pendingCount} pending verification
          </span>
        )}
      </div>
      <p className="text-rtg-mist text-sm mb-6 max-w-2xl">
        Check each order's UTR against your bank/UPI app, then update its status.
      </p>

      {loading ? (
        <p className="text-rtg-mist text-sm">Loading…</p>
      ) : orders.length === 0 ? (
        <p className="text-rtg-mist text-sm py-10 text-center">No orders yet.</p>
      ) : (
        <div className="space-y-2">
          {pageOrders.map((order) => {
            const isOpen = openId === order.id;
            return (
              <div key={order.id} className="glass rounded-2xl overflow-hidden">
                <button
                  onClick={() => setOpenId(isOpen ? null : order.id)}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-white/5 transition-colors"
                >
                  <Package size={16} className="text-rtg-orange-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">
                      {order.customer_name} <span className="text-rtg-mist font-normal">— {formatPrice(order.total)}</span>
                    </p>
                    <p className="text-xs text-rtg-mist truncate">{order.email} · {order.phone}</p>
                  </div>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full shrink-0 ${STATUS_STYLE[order.status] || STATUS_STYLE.pending_verification}`}>
                    {STATUSES.find((s) => s.value === order.status)?.label || order.status}
                  </span>
                  <span className="text-xs text-rtg-mist shrink-0 hidden sm:inline">{formatDate(order.created_at)}</span>
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 border-t border-white/5 space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-rtg-mist mb-1">Shipping Address</p>
                        <p>{order.address}</p>
                        <p>{order.city} — {order.pincode}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-rtg-mist mb-1">UPI Transaction Reference</p>
                        <p className="font-mono">{order.utr_reference || "—"}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-wide text-rtg-mist mb-2">Items</p>
                      <div className="space-y-1.5">
                        {order.order_items.map((item) => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span>{item.product_name}{item.size ? ` (${item.size})` : ""} × {item.quantity}</span>
                            <span className="text-rtg-mist">{formatPrice(item.price * item.quantity)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <label className="text-xs uppercase tracking-wide text-rtg-mist">Status</label>
                      <select
                        value={order.status}
                        onChange={(e) => updateStatus(order, e.target.value)}
                        disabled={busyId === order.id}
                        className="rounded-lg bg-white/5 border border-white/15 px-3 py-1.5 text-sm text-rtg-white focus:outline-none focus:border-rtg-orange-400 transition-colors disabled:opacity-60"
                      >
                        {STATUSES.map((s) => (
                          <option key={s.value} value={s.value} className="bg-rtg-ink">
                            {s.label}
                          </option>
                        ))}
                      </select>
                      {busyId === order.id && <Loader2 size={14} className="animate-spin text-rtg-mist" />}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}
