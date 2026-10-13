import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import LabDialog from "./LabDialog";
import { Lines } from "./RichText";
import useSession from "../../lib/useSession";
import { useSiteSettings } from "../../lib/publicData";
import {
  buildMembershipCopy,
  fill,
  isActiveClub,
  money,
  quotePlan,
  splitList,
  useMembershipPerks,
  useMembershipPlans,
  useMyMemberships,
  useSplitPlans,
} from "../../lib/labData";

// ============================================================================
// MEMBERSHIP PLANS — the RTG Club card and the Ridge Repeats session packs,
// with the "Your plan at a glance" window that leads to payment
// (/membership/checkout). Used twice:
//   on /membership            both cards, side by side
//   on /lab/ridge (only="ridge")  the session packs alone, under the board
//
//   membership_plans  (Admin -> Membership — Plans)       prices, packs
//   membership_perks  (Admin -> Membership — Club Perks)  the Club's perks
//   "text.membership.<field>" (Admin -> Site Content -> Membership) wording
// Layout is in styles/lab.css under .rtg-mem.
//
// `review` / `onReview` let the page open the window itself (the "See an
// example" link of /membership); without them the component keeps its own.
// ============================================================================

export default function MembershipPlans({ only, heading, review: controlledReview, onReview }) {
  const settings = useSiteSettings();
  const copy = useMemo(() => buildMembershipCopy(settings), [settings]);
  const { user } = useSession();
  const { plans } = useMembershipPlans();
  const perks = useMembershipPerks();
  const mine = useMyMemberships(user?.id);
  const { club, ridge } = useSplitPlans(plans);

  const [packSlug, setPackSlug] = useState("");
  const [clubMember, setClubMember] = useState(false);
  const [ownReview, setOwnReview] = useState(null);
  const review = controlledReview !== undefined ? controlledReview : ownReview;
  const setReview = onReview || setOwnReview;

  // A member who holds an active Club membership starts with the box ticked.
  const activeClub = isActiveClub(mine);
  useEffect(() => {
    if (activeClub) setClubMember(true);
  }, [activeClub]);

  const pack = ridge.find((p) => p.slug === packSlug) || ridge.find((p) => p.featured) || ridge[0] || null;
  const quote = pack ? quotePlan(pack, plans, clubMember) : null;
  const single = ridge.find((p) => p.sessions === 1) || null;
  const open = String(copy.enrolment).trim().toLowerCase() !== "closed";
  const validity = (weeks) => (weeks ? fill(copy.validityWeeks, { weeks }) : copy.validitySingle);

  const clubNote = !pack
    ? ""
    : pack.sessions === 1
      ? clubMember
        ? copy.clubNoteSingleOn
        : single?.clubPrice !== null && single?.clubPrice !== undefined
          ? fill(copy.clubNoteSingle, { price: money(single.clubPrice) })
          : ""
      : copy.clubNotePack;

  // What the "at a glance" window shows for each kind of review.
  const receipt = (() => {
    if (review === "club" && club) {
      return {
        title: club.name,
        rows: [
          [copy.rowMembership, copy.reviewClubRegion],
          ...perks.filter((p) => p.reviewLabel).map((p) => [p.reviewLabel, p.reviewValue]),
          [copy.rowClubPrice, `${money(club.price)} ${club.billingLabel}`],
        ],
        note: copy.reviewClubNote,
        checkout: `/membership/checkout?plan=${encodeURIComponent(club.slug)}`,
      };
    }
    if (review === "both" && club) {
      const example = ridge.find((p) => p.featured) || ridge.find((p) => p.sessions > 1) || ridge[0];
      if (!example) return null;
      return {
        title: copy.reviewBothTitle,
        rows: [
          [copy.rowExamplePack, fill(copy.examplePackValue, { count: example.sessions, price: money(example.price) })],
          [copy.rowClub, `${money(club.price)} ${club.billingLabel}`],
          [copy.rowPackValidity, example.validityWeeks ? fill(copy.packValidityValue, { weeks: example.validityWeeks }) : copy.rowValiditySingle],
          [copy.rowBothTotal, money(example.price + club.price)],
        ],
        note: copy.reviewBothNote,
        checkout: null,
      };
    }
    if (review === "ridge" && pack && quote) {
      return {
        title: pack.sessions === 1 ? copy.reviewSingleTitle : fill(copy.reviewPackTitle, { count: pack.sessions }),
        rows: [
          [copy.rowLocation, copy.rowLocationValue],
          [copy.rowSessions, String(pack.sessions)],
          [copy.rowPerSession, money(quote.per)],
          [copy.rowValidity, quote.weeks ? validity(quote.weeks) : copy.rowValiditySingle],
          [copy.rowTotal, money(quote.total)],
        ],
        note: copy.reviewRidgeNote,
        checkout: `/membership/checkout?plan=${encodeURIComponent(pack.slug)}${quote.clubRate ? "&club=1" : ""}`,
      };
    }
    return null;
  })();

  const foot = splitList(copy.ridgeFoot);

  const clubCard = club && (
    <article className="club">
      <div className="topline">
        <span>{copy.clubNumber}</span>
        <span className="tag">{copy.clubTag}</span>
      </div>
      <div className="club-title">
        <div className="eyebrow">{copy.clubEyebrow}</div>
        <h3>{club.name}</h3>
        <p>{copy.clubText}</p>
      </div>
      <div className="price">
        <strong>{money(club.price)}</strong>
        <span>{club.billingLabel}</span>
      </div>
      <div className="benefits">
        {perks.map((perk) => (
          <div key={perk.id}>
            <span>{perk.icon}</span>
            <p>
              <b>{perk.title}</b>
              <small>{perk.text}</small>
            </p>
          </div>
        ))}
      </div>
      <button type="button" className="btn club-cta" onClick={() => setReview("club")}>
        {copy.clubButton}
      </button>
      <p className="fine">{copy.clubFine}</p>
    </article>
  );

  const ridgeCard = (
    <article className="ridge">
      <div className="topline">
        <span>{copy.ridgeNumber}</span>
        <span className="tag purple-tag">{copy.ridgeTag}</span>
      </div>
      <div className="eyebrow">{copy.ridgeEyebrow}</div>
      <h3>{copy.ridgeTitle}</h3>
      <p className="intro">
        <Lines text={copy.ridgeText} />
      </p>
      {pack && quote ? (
        <>
          <div className="pack-tabs" role="group" aria-label={copy.rowSessions}>
            {ridge.map((p) => (
              <button key={p.id} type="button" aria-pressed={p.slug === pack.slug} onClick={() => setPackSlug(p.slug)}>
                {p.sessions}
                <small>{p.sessions === 1 ? copy.sessionWord : copy.sessionsWord}</small>
              </button>
            ))}
          </div>
          <div aria-live="polite">
            <div className="pack-price">
              <div className="price">
                <strong>{money(quote.total)}</strong>
                <span>{pack.billingLabel}</span>
              </div>
              <span className="saving">{quote.saving ? fill(copy.saveLabel, { amount: money(quote.saving) }) : copy.noSavingLabel}</span>
            </div>
            <div className="pack-facts">
              <div>
                <strong>{money(quote.per)}</strong>
                <span>{copy.perSessionLabel}</span>
              </div>
              <div>
                <strong>{validity(quote.weeks)}</strong>
                <span>{quote.weeks ? copy.validityLabel : copy.validitySingleLabel}</span>
              </div>
              <div>
                <strong>{Number(quote.percent.toFixed(1))}%</strong>
                <span>{copy.savingLabel}</span>
              </div>
            </div>
          </div>
          <label className="member-toggle">
            <input type="checkbox" checked={clubMember} onChange={(e) => setClubMember(e.target.checked)} />
            <span>{copy.clubToggle}</span>
          </label>
          <p className="fine">{clubNote}</p>
          <button type="button" className="btn purple" onClick={() => setReview("ridge")}>
            {pack.sessions === 1 ? copy.reviewSingle : fill(copy.reviewPack, { count: pack.sessions })}
          </button>
        </>
      ) : (
        <p className="fine">{copy.noPlans}</p>
      )}
      {foot.length > 0 && (
        <div className="ridge-foot">
          {foot.map((item, i) => (
            <span key={item}>
              {i > 0 && <b>• </b>}
              {item}
            </span>
          ))}
        </div>
      )}
    </article>
  );

  const body = (
    <>
      {heading && (
        <div className="section-top">
          <div>
            <div className="eyebrow">{heading.eyebrow}</div>
            <h2>
              {heading.title}
              <br />
              <span>{heading.accent}</span>
            </h2>
          </div>
          <p>
            <Lines text={heading.text} />
            {heading.linkLabel && (
              <>
                <br />
                <Link className="text-link" to="/membership">
                  {heading.linkLabel}
                </Link>
              </>
            )}
          </p>
        </div>
      )}
      <div className={only === "ridge" ? "plan-grid solo" : "plan-grid"}>
        {only !== "ridge" && clubCard}
        {ridgeCard}
      </div>
      {!open && (
        <div className="status-note">
          <span>{copy.closedBadge}</span> {copy.closedText}
        </div>
      )}

      <LabDialog open={Boolean(receipt)} onClose={() => setReview(null)} scope="rtg-mem" labelledBy="mem-review-title">
        {receipt && (
          <>
            <button type="button" className="close" onClick={() => setReview(null)} aria-label={copy.backLabel}>
              ×
            </button>
            <div className="eyebrow">{copy.reviewEyebrow}</div>
            <h2 id="mem-review-title">{receipt.title}</h2>
            <div>
              <div className="receipt">
                {receipt.rows.map(([label, value]) => (
                  <div key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
              <p>{receipt.note}</p>
            </div>
            {!open && (
              <div className="checkout-note">
                <b>{copy.closedTitle}</b>
                <p>{copy.closedText}</p>
              </div>
            )}
            <div className="review-actions">
              {open && receipt.checkout && (
                <Link className="btn" to={receipt.checkout}>
                  {copy.payLabel}
                </Link>
              )}
              <button type="button" className="btn purple" onClick={() => setReview(null)}>
                {copy.backLabel}
              </button>
            </div>
          </>
        )}
      </LabDialog>
    </>
  );

  // On another page (the Ridge lab) the band brings the Membership look with it.
  return only === "ridge" ? <section className="rtg-mem rtg-mem-band">{body}</section> : body;
}
