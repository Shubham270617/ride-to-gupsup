import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import Reveal from "../components/ui/Reveal";
import useSession from "../lib/useSession";
import { useAuthGate } from "../lib/AuthGateContext";
import { supabase } from "../lib/supabaseClient";
import { useSiteSettings, pickText } from "../lib/publicData";
import { buildUpiUri, buildUpiQrDataUrl } from "../lib/upi";
import { buildMembershipCopy, fill, isActiveClub, money, quotePlan, useMembershipPlans, useMyMemberships } from "../lib/labData";

// ============================================================================
// MEMBERSHIP CHECKOUT (/membership/checkout?plan=<slug>[&club=1]) — pays for
// one plan the same way the Store takes an order: the member pays by UPI,
// types in the payment reference, and the purchase is saved for an admin to
// verify (Admin -> Membership — Purchases). `club=1` asks for the Club member
// price; it is only given to an account that holds an active Club
// membership.
//
// The UPI ID and payee name are the Store's (Admin -> Site Content -> Store);
// the wording is in Admin -> Site Content -> Membership ("checkout page").
// The page wears the Store checkout's look (index.css, .rtg-co-*).
// ============================================================================

// "Pay {amount} to {upi}" -> the sentence with each {name} in bold.
function fillParts(template, parts) {
  return String(template || "")
    .split(/(\{\w+\})/g)
    .map((piece, i) => {
      const key = piece.match(/^\{(\w+)\}$/)?.[1];
      return key && key in parts ? <b key={i}>{parts[key]}</b> : piece;
    });
}

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

export default function MembershipCheckout() {
  const settings = useSiteSettings();
  const copy = useMemo(() => buildMembershipCopy(settings), [settings]);
  const { user, loading: sessionLoading } = useSession();
  const { requestLogin } = useAuthGate();
  const [params] = useSearchParams();
  const { plans, loading: plansLoading } = useMembershipPlans();
  const mine = useMyMemberships(user?.id);

  const plan = plans.find((p) => p.slug === params.get("plan")) || null;
  // The Club member price needs an active Club membership on this account.
  const club = params.get("club") === "1" && isActiveClub(mine);
  const quote = plan ? quotePlan(plan, plans, club) : null;
  const open = String(copy.enrolment).trim().toLowerCase() !== "closed";

  const [form, setForm] = useState({ customer_name: "", phone: "" });
  const [utr, setUtr] = useState("");
  const [qr, setQr] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(null);

  const upiId = pickText(settings, "payment.upiId", "");
  const payeeName = pickText(settings, "payment.payeeName", "");
  const upiUri = upiId && quote ? buildUpiUri({ upiId, payeeName, amount: quote.total, note: plan.name }) : null;

  useEffect(() => {
    if (!upiUri) return;
    let cancelled = false;
    buildUpiQrDataUrl(upiUri).then((url) => {
      if (!cancelled) setQr(url);
    });
    return () => {
      cancelled = true;
    };
  }, [upiUri]);

  // Start the form from what the member already told RTG.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return;
        setForm((f) => ({ customer_name: f.customer_name || data.full_name || "", phone: f.phone || data.phone || "" }));
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!utr.trim()) {
      setError(copy.utrMissing);
      return;
    }
    setSubmitting(true);
    try {
      const { data, error: saveError } = await supabase
        .from("membership_purchases")
        .insert({
          user_id: user.id,
          plan_slug: plan.slug,
          plan_name: plan.name,
          kind: plan.kind,
          sessions_total: plan.kind === "ridge" ? plan.sessions : 0,
          amount: quote.total,
          club_rate: quote.clubRate,
          customer_name: form.customer_name.trim(),
          phone: form.phone.trim(),
          email: user.email,
          utr_reference: utr.trim(),
        })
        .select()
        .single();
      if (saveError) throw saveError;
      setSaved(data);
    } catch {
      setError(copy.saveError);
    } finally {
      setSubmitting(false);
    }
  };

  if (sessionLoading || plansLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-rtg-orange-400" size={28} />
      </div>
    );
  }

  if (!plan || !open) {
    return (
      <Notice title={copy.missingTitle} text={open ? copy.missingText : copy.closedText}>
        <Link to="/membership" className="rtg-co-submit">
          {copy.missingButton}
        </Link>
      </Notice>
    );
  }

  if (!user) {
    return (
      <Notice title={copy.loginTitle} text={copy.loginText}>
        <button type="button" className="rtg-co-submit" onClick={() => requestLogin("login")}>
          {copy.loginButton}
        </button>
      </Notice>
    );
  }

  if (saved) {
    return (
      <Notice title={copy.doneTitle} text={fill(copy.doneText, { reference: saved.utr_reference })}>
        <Link to="/membership" className="rtg-co-submit">
          {copy.doneButton}
        </Link>
      </Notice>
    );
  }

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
            <form onSubmit={submit} className="rtg-co-card rtg-co-form">
              <h2>
                <i>01</i> {copy.detailsHeading}
              </h2>
              <input
                required
                value={form.customer_name}
                onChange={(e) => setForm((f) => ({ ...f, customer_name: e.target.value }))}
                placeholder={copy.namePlaceholder}
                aria-label={copy.namePlaceholder}
              />
              <input
                required
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder={copy.phonePlaceholder}
                aria-label={copy.phonePlaceholder}
              />

              <h2 className="rtg-co-pay-head">
                <i>02</i> {copy.payHeading}
              </h2>
              {!upiId ? (
                <p className="rtg-co-muted">{copy.payNotSet}</p>
              ) : (
                <div className="rtg-co-pay">
                  {qr && <img src={qr} alt={copy.payHeading} />}
                  <div>
                    <p className="rtg-co-muted">{fillParts(copy.payText, { amount: money(quote.total), upi: upiId })}</p>
                    <a href={upiUri}>{copy.payButton} ↗</a>
                  </div>
                </div>
              )}

              <input required value={utr} onChange={(e) => setUtr(e.target.value)} placeholder={copy.utrPlaceholder} aria-label={copy.utrPlaceholder} />
              <p className="rtg-co-help">{copy.utrHelp}</p>
              {error && <p className="rtg-co-error">{error}</p>}

              <button type="submit" disabled={submitting || !upiId} className="rtg-co-submit">
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
                <div>
                  <p>
                    <strong>{plan.name}</strong>
                    <span>{[plan.billingLabel, quote.clubRate && copy.clubRateLine].filter(Boolean).join(" · ")}</span>
                  </p>
                  <b>{money(quote.total)}</b>
                </div>
              </div>
              <div className="rtg-co-total">
                <span>{copy.totalLabel}</span>
                <strong>{money(quote.total)}</strong>
              </div>
            </aside>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
