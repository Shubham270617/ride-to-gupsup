import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import LabBackdrop from "../components/lab/LabBackdrop";
import MembershipPlans from "../components/lab/MembershipPlans";
import { Inline, Lines } from "../components/lab/RichText";
import useSession from "../lib/useSession";
import { useSiteSettings } from "../lib/publicData";
import {
  buildMembershipCopy,
  fill,
  formatDay,
  splitList,
  useMembershipFaqs,
  useMembershipGuides,
  useMembershipSteps,
  useMyMemberships,
} from "../lib/labData";

// ============================================================================
// MEMBERSHIP (/membership) — the two ways to belong: RTG Club (perks across
// India) and Ridge Repeats session packs (Delhi NCR). Choosing a plan opens
// "Your plan at a glance", which leads to payment (/membership/checkout).
//
// Nothing here is written in code:
//   membership_plans   (Admin -> Membership — Plans)        prices, packs
//   membership_perks   (Admin -> Membership — Club Perks)   the Club's perks
//   membership_guides  (Admin -> Membership — Which One)    "Two offers"
//   membership_steps   (Admin -> Membership — Steps)        the three steps
//   membership_faqs    (Admin -> Membership — Questions)    the questions
//   membership_purchases (Admin -> Membership — Purchases)  what members hold
//   "text.membership.<field>" (Admin -> Site Content -> Membership) wording
// Layout is in styles/lab.css under .rtg-mem.
// ============================================================================

const STATUS_FIELD = { pending_verification: "minePending", active: "mineActive", rejected: "mineRejected", expired: "mineExpired", cancelled: "mineExpired" };

export default function Membership() {
  const settings = useSiteSettings();
  const copy = useMemo(() => buildMembershipCopy(settings), [settings]);
  const { user } = useSession();
  const guides = useMembershipGuides();
  const steps = useMembershipSteps();
  const faqs = useMembershipFaqs();
  const mine = useMyMemberships(user?.id);
  // Which "at a glance" window is open: null | "club" | "ridge" | "both".
  const [review, setReview] = useState(null);

  const notes = splitList(copy.heroNotes);
  const ticker = splitList(copy.ticker);
  const discount = copy.clubDiscountPercent;
  const toPlans = () => document.getElementById("plans")?.scrollIntoView({ block: "start", behavior: "smooth" });

  return (
    <div className="rtg-mem">
      <LabBackdrop />

      <section data-text-section="hero" className="hero wrap">
        <div>
          <div className="eyebrow">
            <i /> {copy.heroEyebrow}
          </div>
          <h1>
            {copy.heroTitle}
            <br />
            {copy.heroTitleLine2} <em>{copy.heroTitleAccent}</em>
            <br />
            {copy.heroTitleLine3}
          </h1>
          <p className="lead">
            <Lines text={copy.heroText} />
          </p>
          <div className="actions">
            <a className="btn" href="#plans">
              {copy.heroPrimaryLabel}
            </a>
            <a className="text-link" href="#compare">
              {copy.heroSecondaryLabel}
            </a>
          </div>
          {notes.length > 0 && (
            <div className="mini">
              {notes.map((note, i) => (
                <span key={note}>
                  {i > 0 && <b>• </b>}
                  {note}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="hero-art" aria-hidden="true">
          <div className="orb" />
          <svg className="route" viewBox="0 0 540 450">
            <path d="M10 320C180 450 420 420 484 230S335 28 190 124 41 285 231 292 545 75 460 45" />
          </svg>
          <div className="member-card">
            <div className="card-brand">
              {copy.cardBrand} <span>{copy.cardBadge}</span>
              <b>↗</b>
            </div>
            <div className="card-title">
              <Lines text={copy.cardTitle} /> <em>{copy.cardTitleAccent}</em>
            </div>
            <div className="card-bottom">
              <span>{copy.cardBottomLeft}</span>
              <span>{copy.cardBottomRight}</span>
            </div>
          </div>
          <div className="floating perk-one">
            <strong>{fill(copy.perkOneValue, { discount })}</strong>
            <span>
              <Lines text={copy.perkOneText} />
            </span>
          </div>
          <div className="floating perk-two">
            <span className="clock">◷</span>
            <div>
              <strong>{copy.perkTwoTitle}</strong>
              <span>{copy.perkTwoText}</span>
            </div>
          </div>
          <div className="art-caption">{copy.artCaption}</div>
        </div>
      </section>

      {ticker.length > 0 && (
        <div className="ticker" aria-hidden="true">
          <div>
            {[...ticker, ...ticker, ...ticker].map((phrase, i) => (i % 2 ? <span key={i}>{phrase}</span> : <span key={i} className="plain">{phrase}</span>))}
          </div>
        </div>
      )}

      {user && mine.length > 0 && (
        <section data-text-section="mine" className="wrap mine">
          <div className="eyebrow">{copy.mineEyebrow}</div>
          <h2>{copy.mineTitle}</h2>
          <div className="mine-list">
            {mine.map((p) => (
              <article key={p.id} className={`mine-card ${p.status}`}>
                <strong>{p.plan_name}</strong>
                <span className="mine-status">{copy[STATUS_FIELD[p.status]] || p.status}</span>
                {p.kind === "ridge" && p.status === "active" && (
                  <small>{fill(copy.mineCredits, { left: Math.max(0, p.sessions_total - p.sessions_used), total: p.sessions_total })}</small>
                )}
                {p.valid_until && <small>{fill(copy.mineUntil, { date: formatDay(Date.parse(`${p.valid_until}T00:00:00Z`)) })}</small>}
              </article>
            ))}
          </div>
        </section>
      )}

      <section data-text-section="plans" id="plans" className="wrap plans">
        <div className="section-top">
          <div>
            <div className="eyebrow">{copy.plansEyebrow}</div>
            <h2>
              {copy.plansTitle}
              <br />
              <span>{copy.plansTitleAccent}</span>
            </h2>
          </div>
          <p>
            <Lines text={copy.plansText} />
          </p>
        </div>
        <MembershipPlans review={review} onReview={setReview} />
      </section>

      {guides.length > 0 && (
        <section data-text-section="comparison" className="wrap comparison" id="compare">
          <div className="section-top">
            <div>
              <div className="eyebrow">{copy.compareEyebrow}</div>
              <h2>
                {copy.compareTitle}
                <span> {copy.compareTitleAccent}</span>
              </h2>
            </div>
          </div>
          <div className="compare-grid">
            {guides.map((guide, i) => (
              <article key={guide.id}>
                <span>{String(i + 1).padStart(2, "0")}</span>
                <h3>{guide.title}</h3>
                <p>
                  <Inline text={guide.text} />
                </p>
                {guide.linkLabel && (
                  <button type="button" className="text-link" onClick={() => (guide.action === "example" ? setReview("both") : toPlans())}>
                    {guide.linkLabel}
                  </button>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      <section data-text-section="rhythm" className="wrap rhythm">
        <div>
          <div className="eyebrow">{copy.rhythmEyebrow}</div>
          <h2>
            {copy.rhythmTitle}
            <br />
            {copy.rhythmTitleLine2} <em>{copy.rhythmTitleAccent}</em>
          </h2>
          <p>{copy.rhythmText}</p>
          <Link className="text-link" to="/lab/ridge">
            {copy.rhythmLinkLabel}
          </Link>
        </div>
        <div className="steps">
          {steps.map((step, i) => (
            <article key={step.id}>
              <span>{i + 1}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {faqs.length > 0 && (
        <section data-text-section="faq" className="wrap faq">
          <div>
            <div className="eyebrow">{copy.faqEyebrow}</div>
            <h2>
              {copy.faqTitle}
              <br />
              <span>{copy.faqTitleAccent}</span>
            </h2>
            <p>
              <Lines text={copy.faqText} />
            </p>
          </div>
          <div className="questions">
            {faqs.map((faq, i) => (
              <details key={faq.id} open={i === 0}>
                <summary>{faq.question}</summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      <section data-text-section="closing" className="wrap closing">
        <div>
          <div className="eyebrow">{copy.closingEyebrow}</div>
          <h2>
            {copy.closingTitle}
            <br />
            <em>{copy.closingTitleAccent}</em>
          </h2>
        </div>
        <button type="button" className="btn" onClick={toPlans}>
          {copy.closingButton}
        </button>
      </section>
    </div>
  );
}
