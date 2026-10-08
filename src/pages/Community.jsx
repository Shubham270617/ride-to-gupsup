import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Reveal from "../components/ui/Reveal";
import {
  useCommunityPaths,
  useCommunityPrinciples,
  useCommunityMilestones,
  useCommunityNetworkCities,
  useCommunityNetworkGroups,
  useCommunityCities,
  useCommunityCityMoments,
  useSiteImages,
  useSiteSettings,
  buildCommunityPageCopy,
} from "../lib/publicData";

// ============================================================================
// COMMUNITY PAGE — a photo hero, the "Find Your Place" 3D carousel, the dark
// "RTG Way" card accordion, the "RTG in Motion" timeline, the network of
// connected communities on an India map, and each city's rotating photos.
// (The Join band under it is components/sections/JoinCTA.jsx.)
//
// Nothing here is written in code:
//   community_paths           (Admin -> Community — Find Your Place)   carousel cards
//   community_principles      (Admin -> Community — The RTG Way)       accordion cards
//   community_milestones      (Admin -> Community — RTG in Motion)     timeline cards
//   community_network_groups  (Admin -> Community — Network Groups)    the communities
//   community_network_cities  (Admin -> Community — Network Map Pins)  pins on the map
//   community_cities          (Admin -> Community — Cities)            city buttons
//   community_city_moments    (Admin -> Community — City Photos)       rotating photos
//   "text.community.<field>"  (Admin -> Site Content -> Community)     every heading,
//                                                                      label, paragraph
//   the hero / RTG Way / map pictures (Admin -> Site Photos)
// Layout and motion are in index.css under "COMMUNITY PAGE" (.rtg-com-*).
// ============================================================================

// How long each carousel rests on a card before moving on by itself.
const PLACE_MS = 3800;
const WAY_MS = 4200;
const MOTION_MS = 3800;
const NETWORK_MS = 4600;
const MOMENTS_MS = 3900;
const SPOTLIGHT_MS = 2800;

const MOMENT_FRAMES = 3; // one large photo frame + two small
const MOMENT_STAGGER_MS = 320; // the frames change one after another, left to right
const MOMENT_SETTLE_MS = 1200;
const SWIPE_PX = 42;
const TILT_MIN_WIDTH = 900;

const REDUCED_MOTION = typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

const pad2 = (n) => String(n).padStart(2, "0");
const splitList = (text) => (text || "").split(",").map((s) => s.trim()).filter(Boolean);
// "Hello {name}" + { name: "RTG" } -> "Hello RTG"
const fill = (template, values) => (template || "").replace(/\{(\w+)\}/g, (match, key) => (key in values ? values[key] : match));
// Inline style that paints a photo as an element's background.
const backdrop = (url, position) => (url ? { backgroundImage: `url(${JSON.stringify(url)})`, backgroundPosition: position || undefined } : undefined);

// A card rotation that advances by itself. `turn` goes up on every change
// (and every resume), which restarts the progress bar; `hold` pauses it
// while the pointer is over an element, `swipe` moves it by touch.
function useCarousel(count, delay) {
  const [index, setIndex] = useState(0);
  const [turn, setTurn] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef(0);
  const current = count ? index % count : 0;

  const go = useCallback(
    (next) => {
      setIndex(count ? ((next % count) + count) % count : 0);
      setTurn((t) => t + 1);
    },
    [count]
  );

  useEffect(() => {
    if (count < 2 || paused || REDUCED_MOTION) return undefined;
    const id = setTimeout(() => go(current + 1), delay);
    return () => clearTimeout(id);
  }, [count, paused, current, turn, delay, go]);

  const resume = () => {
    setPaused(false);
    setTurn((t) => t + 1);
  };
  const hold = { onMouseEnter: () => setPaused(true), onMouseLeave: resume };
  const swipe = {
    onTouchStart: (e) => {
      touchX.current = e.changedTouches[0].screenX;
      setPaused(true);
    },
    onTouchEnd: (e) => {
      const moved = e.changedTouches[0].screenX - touchX.current;
      setPaused(false);
      if (Math.abs(moved) > SWIPE_PX) go(current + (moved < 0 ? 1 : -1));
      else setTurn((t) => t + 1);
    },
  };

  return { current, turn, paused, go, hold, swipe };
}

// Where a card sits around the one in front.
function slotOf(i, current, count) {
  const ahead = (i - current + count) % count;
  if (ahead === 0) return "is-center";
  if (ahead === 1) return "is-right";
  if (ahead === count - 1) return "is-left";
  return "is-back";
}

// A link typed in the admin: "/page" stays in the app, "#part" scrolls
// within this page, anything else opens in a new tab. No address at all
// renders plain text.
function PageLink({ to, children, ...rest }) {
  if (!to) return <span {...rest}>{children}</span>;
  if (to.startsWith("/")) {
    return (
      <Link to={to} {...rest}>
        {children}
      </Link>
    );
  }
  const external = to.startsWith("#") ? null : { target: "_blank", rel: "noopener noreferrer" };
  return (
    <a href={to} {...external} {...rest}>
      {children}
    </a>
  );
}

// The thin bar that fills while a carousel waits to advance.
function Progress({ carousel, duration, dark }) {
  return (
    <div className={`rtg-com-progress${dark ? " is-dark" : ""}`} aria-hidden="true">
      <span key={carousel.turn} className={carousel.paused ? "is-paused" : undefined} style={{ animationDuration: `${duration}ms` }} />
    </div>
  );
}

// A dashed route with a dot travelling along it.
function Route({ id, className, viewBox, d, seconds, radius = 6 }) {
  return (
    <svg className={className} viewBox={viewBox} preserveAspectRatio="none" aria-hidden="true">
      <path id={id} d={d} />
      <circle r={radius}>
        <animateMotion dur={`${seconds}s`} repeatCount="indefinite">
          <mpath href={`#${id}`} />
        </animateMotion>
      </circle>
    </svg>
  );
}

// The glass bar under a carousel: previous, one button per card, next.
function Controller({ carousel, items, prevLabel, nextLabel, dark }) {
  return (
    <div className={`rtg-com-ctrl${dark ? " is-dark" : ""}`} {...carousel.hold}>
      <button type="button" className={`rtg-com-arrow${dark ? " is-dark" : ""}`} aria-label={prevLabel} onClick={() => carousel.go(carousel.current - 1)}>
        ←
      </button>
      <div className="rtg-com-ctrl-nav" style={{ "--n": items.length }}>
        {items.map((item, i) => (
          <button
            key={item.id}
            type="button"
            className={i === carousel.current ? "active" : undefined}
            aria-pressed={i === carousel.current}
            onClick={() => carousel.go(i)}
          >
            <span>{pad2(i + 1)}</span>
            <b>{item.navLabel}</b>
          </button>
        ))}
      </div>
      <button type="button" className={`rtg-com-arrow${dark ? " is-dark" : ""}`} aria-label={nextLabel} onClick={() => carousel.go(carousel.current + 1)}>
        →
      </button>
    </div>
  );
}

// ----------------------------------------------------------------------------
// HERO — the community photo pinned behind the headline, with orbit rings
// and a dashed route drifting on the right.
// ----------------------------------------------------------------------------
function Hero({ copy, image }) {
  return (
    <section className="rtg-com-hero" style={backdrop(image)}>
      <div className="rtg-com-hero-motion" aria-hidden="true">
        <span className="rtg-com-hero-orbit rtg-com-hero-orbit-1" />
        <span className="rtg-com-hero-orbit rtg-com-hero-orbit-2" />
        <span className="rtg-com-hero-orbit rtg-com-hero-orbit-3" />
        <Route
          id="rtg-com-hero-route"
          className="rtg-com-hero-route"
          viewBox="0 0 520 360"
          d="M18 310C95 260 112 158 206 181C300 204 300 80 390 94C446 103 463 53 507 31"
          seconds={9}
          radius={5}
        />
        <span className="rtg-com-ping rtg-com-hero-ping-a" />
        <span className="rtg-com-ping rtg-com-hero-ping-b" />
        <span className="rtg-com-ping rtg-com-hero-ping-c" />
      </div>

      <div className="rtg-com-hero-inner">
        <Reveal className="rtg-com-hero-copy">
          <span className="rtg-com-kicker">{copy.heroKicker}</span>
          <h1 className="font-display">
            <span>{copy.heroTitle}</span>
            <span className="text-gradient">{copy.heroTitleAccent}</span>
          </h1>
          <p>{copy.heroText}</p>
          <div className="rtg-com-hero-actions">
            <PageLink to={copy.heroCtaLink} className="rtg-com-btn rtg-com-btn-glass rtg-com-btn-live">
              {copy.heroCtaLabel} <span>→</span>
            </PageLink>
          </div>
        </Reveal>
        <div className="rtg-com-hero-note">{copy.heroNote}</div>
      </div>

      {/* Phones and tablets: two rows of tags drifting in opposite
          directions. Each row is rendered twice so the loop has no seam. */}
      <div className="rtg-com-hero-pulse">
        {[copy.heroPulseTop, copy.heroPulseBottom].map((row, i) => {
          const tags = splitList(row);
          if (tags.length === 0) return null;
          return (
            <div key={i} className="rtg-com-hero-pulse-window">
              <div className={`rtg-com-hero-pulse-track ${i % 2 ? "is-right" : "is-left"}`}>
                {[false, true].map((copyOfRow) => (
                  <div key={String(copyOfRow)} aria-hidden={copyOfRow}>
                    {tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ----------------------------------------------------------------------------
// FIND YOUR PLACE — a 3D carousel: one photo card in front, one tilted away
// on each side, the rest behind. Clicking a side card brings it forward;
// the front card follows its link.
// ----------------------------------------------------------------------------
function FindYourPlace({ copy, paths }) {
  const carousel = useCarousel(paths.length, PLACE_MS);
  if (paths.length === 0) return null;

  return (
    <section className="rtg-com-light rtg-com-place" id="find-your-place">
      <div className="rtg-com-art" aria-hidden="true">
        <svg className="rtg-com-art-bike" viewBox="0 0 170 105">
          <circle cx="38" cy="72" r="27" />
          <circle cx="131" cy="72" r="27" />
          <path d="M38 72 67 37l29 35H38l29-35 27-5 37 40" />
          <path d="M86 32h17" />
          <path d="m93 32 6-14" />
        </svg>
        <svg className="rtg-com-art-run" viewBox="0 0 150 150">
          <circle cx="91" cy="22" r="9" />
          <path d="M82 37 65 54l12 20 19-13 12 17" />
          <path d="M66 54 44 60 27 50" />
          <path d="M77 74 58 98 34 118" />
          <path d="M79 75 98 98l25 10" />
          <path d="M99 98 121 126" />
          <path d="M58 98 50 130" />
          <path d="M95 40 114 53l19-2" />
        </svg>
        <svg className="rtg-com-art-watch" viewBox="0 0 100 110">
          <circle cx="50" cy="61" r="34" />
          <path d="M50 27V14M38 12h24M73 35l9-9M50 61l15-11" />
        </svg>
        <svg className="rtg-com-art-route" viewBox="0 0 300 150">
          <path d="M10 123c52-73 100-6 143-60 36-45 67 22 137-43" />
          <path d="M260 17v52M260 17h25l-8 11 8 11h-25" />
        </svg>
        <span className="rtg-com-dot rtg-com-dot-a" />
        <span className="rtg-com-dot rtg-com-dot-b" />
        <span className="rtg-com-dot rtg-com-dot-c" />
        <span className="rtg-com-dot rtg-com-dot-d" />
      </div>

      <Reveal className="rtg-com-head">
        <span className="rtg-com-kicker">{copy.placeKicker}</span>
        <h2 className="font-display">
          {copy.placeTitle} <span className="text-gradient">{copy.placeTitleAccent}</span>
        </h2>
        <p>{copy.placeText}</p>
      </Reveal>

      <Reveal className="rtg-com-place-shell" amount={0.18}>
        <div className="rtg-com-place-glow" aria-hidden="true" />

        <div className="rtg-com-place-stage" {...carousel.swipe}>
          <div className="rtg-com-place-orbit rtg-com-place-orbit-a" aria-hidden="true" />
          <div className="rtg-com-place-orbit rtg-com-place-orbit-b" aria-hidden="true" />
          <Route
            id="rtg-com-place-route"
            className="rtg-com-place-route"
            viewBox="0 0 1200 280"
            d="M20 192C174 58 291 252 452 126C612 0 751 239 912 111C1029 18 1104 105 1182 53"
            seconds={11.8}
          />

          <div className="rtg-com-place-cards">
            {paths.map((path, i) => {
              const front = i === carousel.current;
              return (
                <PageLink
                  key={path.id}
                  to={path.link}
                  className={`rtg-com-place-card ${slotOf(i, carousel.current, paths.length)}`}
                  aria-current={front}
                  onClick={(e) => {
                    if (front) return;
                    e.preventDefault();
                    carousel.go(i);
                  }}
                  {...carousel.hold}
                >
                  <span className="rtg-com-place-photo" style={backdrop(path.image, path.imagePosition)} />
                  <span className="rtg-com-place-num">{pad2(i + 1)}</span>
                  <span className="rtg-com-place-body">
                    <strong className="font-display">{path.title}</strong>
                    {path.desc && <span className="rtg-com-place-text">{path.desc}</span>}
                    <span className="rtg-com-place-arrow">→</span>
                  </span>
                </PageLink>
              );
            })}
          </div>
        </div>

        <Controller carousel={carousel} items={paths} prevLabel={copy.placePrevLabel} nextLabel={copy.placeNextLabel} />
        <Progress carousel={carousel} duration={PLACE_MS} />
      </Reveal>
    </section>
  );
}

// ----------------------------------------------------------------------------
// THE RTG WAY — glass cards over a pinned photo. The open card is wide and
// shows its paragraph and tags; the others stay narrow. On a phone it is one
// card with a peek of its neighbours, moved by swipe.
// ----------------------------------------------------------------------------
// Line-art for each card, picked by the card's `icon` value (the dropdown in
// Admin -> Community — The RTG Way — keep COMMUNITY_ICON_OPTIONS in
// admin/resourceConfig.js in step with these keys). All drawn in a 100x100 box.
const WAY_ICONS = {
  people: (
    <>
      <circle cx="31" cy="37" r="12" />
      <circle cx="69" cy="37" r="12" />
      <path d="M14 82c2-18 14-28 29-28 12 0 21 5 27 15" />
      <path d="M86 82c-2-18-14-28-29-28-12 0-21 5-27 15" />
      <path d="M39 74 50 84l11-10" />
    </>
  ),
  target: (
    <>
      <circle cx="50" cy="50" r="29" />
      <circle cx="50" cy="50" r="18" />
      <circle cx="50" cy="50" r="6" />
      <path d="M50 7v13M50 80v13M7 50h13M80 50h13" />
    </>
  ),
  chat: (
    <>
      <path d="M17 23h45v36H35L21 73V59h-4Z" />
      <path d="M48 35h35v29h-7v12L64 64H48" />
      <path d="M28 36h22M28 45h16M58 47h15M58 55h10" />
    </>
  ),
  shield: (
    <>
      <path d="M50 14 75 25v21c0 19-12 31-25 40-13-9-25-21-25-40V25Z" />
      <path d="m35 50 10 10 21-23" />
    </>
  ),
};

function RtgWay({ copy, principles, image }) {
  const carousel = useCarousel(principles.length, WAY_MS);
  if (principles.length === 0) return null;

  return (
    <section className="rtg-com-way" id="rtg-way" style={backdrop(image)}>
      <div className="rtg-com-way-motion" aria-hidden="true">
        <div className="rtg-com-way-orbit rtg-com-way-orbit-1" />
        <div className="rtg-com-way-orbit rtg-com-way-orbit-2" />
        <Route
          id="rtg-com-way-route"
          className="rtg-com-way-line"
          viewBox="0 0 1280 260"
          d="M10 166C130 68 253 224 381 129C518 27 640 219 780 122C904 36 1038 190 1260 72"
          seconds={12}
        />
        <span className="rtg-com-ping rtg-com-way-ping-a" />
        <span className="rtg-com-ping rtg-com-way-ping-b" />
        <span className="rtg-com-ping rtg-com-way-ping-c" />
      </div>

      <div className="rtg-com-way-ghost" aria-hidden="true">
        {principles.map((principle, i) => (
          <span key={principle.id} className={i === carousel.current ? "active" : undefined}>
            {principle.ghostWord}
          </span>
        ))}
      </div>

      <Reveal className="rtg-com-head rtg-com-head-dark rtg-com-way-head">
        <span className="rtg-com-kicker">{copy.wayKicker}</span>
        <h2 className="font-display">
          {copy.wayTitle} <span className="text-gradient">{copy.wayTitleAccent}</span>
        </h2>
        <p>{copy.wayText}</p>
      </Reveal>

      <Reveal className="rtg-com-way-shell">
        <div className="rtg-com-way-stage" {...carousel.swipe}>
          {principles.map((principle, i) => {
            const open = i === carousel.current;
            return (
              <article
                key={principle.id}
                className={`rtg-com-way-card ${open ? "active" : slotOf(i, carousel.current, principles.length)}`}
                aria-current={open}
                onClick={() => !open && carousel.go(i)}
                {...carousel.hold}
              >
                <div className="rtg-com-way-top">
                  <span className="rtg-com-way-num">{pad2(i + 1)}</span>
                  <svg className="rtg-com-way-icon" viewBox="0 0 100 100" aria-hidden="true">
                    {WAY_ICONS[principle.icon] || WAY_ICONS.people}
                  </svg>
                </div>

                <div className="rtg-com-way-copy">
                  {principle.label && <span className="rtg-com-way-label">{principle.label}</span>}
                  <h3 className="font-display">{principle.title}</h3>
                  {principle.desc && <p>{principle.desc}</p>}
                </div>

                {principle.tags.length > 0 && (
                  <div className="rtg-com-way-foot">
                    {principle.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>

        <Controller carousel={carousel} items={principles} prevLabel={copy.wayPrevLabel} nextLabel={copy.wayNextLabel} dark />
        <Progress carousel={carousel} duration={WAY_MS} dark />
      </Reveal>

      <Reveal className="rtg-com-way-closing">
        <span>{copy.wayClosingText}</span>
        <PageLink to={copy.wayCtaLink} className="rtg-com-btn rtg-com-btn-orange">
          {copy.wayCtaLabel} <span>→</span>
        </PageLink>
      </Reveal>
    </section>
  );
}

// ----------------------------------------------------------------------------
// RTG IN MOTION — a timeline of milestone cards; the track above them fills
// up to the card in focus.
// ----------------------------------------------------------------------------
function InMotion({ copy, milestones }) {
  const carousel = useCarousel(milestones.length, MOTION_MS);
  const count = milestones.length;
  if (count === 0) return null;

  return (
    <section className="rtg-com-motion" id="rtg-motion">
      <div className="rtg-com-motion-art" aria-hidden="true">
        <svg className="rtg-com-motion-bike" viewBox="0 0 240 150">
          <circle cx="52" cy="104" r="32" />
          <circle cx="187" cy="104" r="32" />
          <path d="M52 104 93 46h34l60 58M93 46l31 58M82 72h76M110 28h39" />
        </svg>
        <svg className="rtg-com-motion-runner" viewBox="0 0 150 150">
          <circle cx="92" cy="22" r="9" />
          <path d="M83 37 65 55l13 20 19-13 12 17" />
          <path d="M66 55 44 61 26 51" />
          <path d="M78 75 58 99 34 120" />
          <path d="M80 76 99 99l25 10" />
          <path d="M99 99 121 128" />
          <path d="M58 99 50 131" />
        </svg>
      </div>

      <Reveal className="rtg-com-motion-head">
        <span className="rtg-com-kicker">{copy.motionKicker}</span>
        <h2 className="font-display">
          {copy.motionTitle} <span className="text-gradient">{copy.motionTitleAccent}</span>
        </h2>
        <p>{copy.motionText}</p>
      </Reveal>

      <Reveal className="rtg-com-motion-shell">
        <div className="rtg-com-motion-track" aria-hidden="true">
          <span style={{ width: `${((carousel.current + 1) / count) * 100}%` }} />
        </div>

        <div className="rtg-com-motion-grid" style={{ "--n": Math.min(count, 4) }}>
          {milestones.map((milestone, i) => (
            <article
              key={milestone.id}
              className={`rtg-com-motion-card${i === carousel.current ? " active" : ""}`}
              aria-current={i === carousel.current}
              onClick={() => carousel.go(i)}
              {...carousel.hold}
            >
              <div className="rtg-com-motion-node">{pad2(i + 1)}</div>
              {milestone.label && <span className="rtg-com-motion-label">{milestone.label}</span>}
              <h3 className="font-display">{milestone.title}</h3>
              {milestone.desc && <p>{milestone.desc}</p>}
            </article>
          ))}
        </div>

        <div className="rtg-com-motion-controls">
          <button type="button" className="rtg-com-arrow" aria-label={copy.motionPrevLabel} onClick={() => carousel.go(carousel.current - 1)}>
            ←
          </button>
          <div className="rtg-com-motion-dots">
            {milestones.map((milestone, i) => (
              <button
                key={milestone.id}
                type="button"
                className={i === carousel.current ? "active" : undefined}
                aria-label={`${pad2(i + 1)} — ${milestone.title}`}
                aria-pressed={i === carousel.current}
                onClick={() => carousel.go(i)}
              />
            ))}
          </div>
          <button type="button" className="rtg-com-arrow" aria-label={copy.motionNextLabel} onClick={() => carousel.go(carousel.current + 1)}>
            →
          </button>
        </div>

        <div className="rtg-com-motion-cta">
          <PageLink to={copy.motionCtaLink} className="rtg-com-btn rtg-com-btn-orange">
            {copy.motionCtaLabel} <span>→</span>
          </PageLink>
        </div>
      </Reveal>
    </section>
  );
}

// ----------------------------------------------------------------------------
// THE RTG NETWORK — two tabs of communities. On the left an India map whose
// pin lights up for the community on show; on the right that community's
// card, a rail of the others, and arrows.
// ----------------------------------------------------------------------------
// The two tabs; `label` / `status` are fields of the copy.
const NETWORK_TABS = [
  { type: "connected", label: "connectedTabLabel", status: "connectedStatus" },
  { type: "wider", label: "widerTabLabel", status: "widerStatus" },
];
const MAP_TILT = 4;
const CARD_TILT = 3.5;

// A gently bowed line between two pins, in the map's 0–100 coordinates.
function routeBetween(from, to) {
  const bow = 0.15;
  const midX = (from.x + to.x) / 2 - (to.y - from.y) * bow;
  const midY = (from.y + to.y) / 2 + (to.x - from.x) * bow;
  return `M${from.x} ${from.y} Q${midX.toFixed(2)} ${midY.toFixed(2)} ${to.x} ${to.y}`;
}

// Leans a card a few degrees towards the pointer (desktop only).
function useTilt(strength) {
  const ref = useRef(null);
  const lean = (x, y) => {
    ref.current?.style.setProperty("--tilt-x", `${x.toFixed(2)}deg`);
    ref.current?.style.setProperty("--tilt-y", `${y.toFixed(2)}deg`);
  };
  return {
    ref,
    onPointerMove: (e) => {
      if (REDUCED_MOTION || window.innerWidth <= TILT_MIN_WIDTH || !ref.current) return;
      const box = ref.current.getBoundingClientRect();
      lean(-((e.clientY - box.top) / box.height - 0.5) * strength, ((e.clientX - box.left) / box.width - 0.5) * strength);
    },
    onPointerLeave: () => lean(0, 0),
  };
}

function Network({ copy, groups, pins, mapImage }) {
  const [type, setType] = useState(NETWORK_TABS[0].type);
  const tab = NETWORK_TABS.find((t) => t.type === type);
  const list = useMemo(() => groups.filter((g) => g.type === type), [groups, type]);
  const carousel = useCarousel(list.length, NETWORK_MS);
  const group = list[carousel.current] || null;

  const hub = pins.find((pin) => pin.isHub) || null;
  const cityPins = pins.filter((pin) => !pin.isHub);
  const mapTilt = useTilt(MAP_TILT);
  const cardTilt = useTilt(CARD_TILT);
  const railRef = useRef(null);
  const shown = carousel.current;

  // Phones: the rail scrolls sideways — keep the community on show in view.
  // (Scrolls the rail itself, never the page.)
  useEffect(() => {
    const rail = railRef.current;
    const active = rail?.children[shown];
    if (!active || window.innerWidth > 720) return;
    rail.scrollTo({ left: Math.max(0, active.offsetLeft - (rail.clientWidth - active.offsetWidth) / 2), behavior: REDUCED_MOTION ? "auto" : "smooth" });
  }, [shown, type]);

  if (groups.length === 0) return null;

  const pickTab = (next) => {
    setType(next);
    carousel.go(0);
  };
  const pickPin = (slug) => {
    const match = list.findIndex((g) => g.city === slug);
    if (match >= 0) carousel.go(match);
  };
  const contacts = group
    ? [
        { label: copy.contactLabel, value: group.contact },
        { label: copy.reachLabel, value: group.reach },
        { label: copy.joinLabel, value: group.join },
      ].filter((row) => row.value)
    : [];

  return (
    <section className="rtg-com-net" id="rtg-network" {...carousel.hold}>
      <div className="rtg-com-net-ambient" aria-hidden="true">
        <span className="rtg-com-net-orbit rtg-com-net-orbit-a" />
        <span className="rtg-com-net-orbit rtg-com-net-orbit-b" />
        <span className="rtg-com-net-glow rtg-com-net-glow-a" />
        <span className="rtg-com-net-glow rtg-com-net-glow-b" />
      </div>

      <div className="rtg-com-net-wrap">
        <Reveal className="rtg-com-net-copy">
          <span className="rtg-com-kicker">{copy.networkKicker}</span>
          <h2 className="font-display">
            <span>{copy.networkTitle}</span>
            <span className="text-gradient">{copy.networkTitleAccent}</span>
          </h2>
          <p>{copy.networkText}</p>

          <div className="rtg-com-net-tabs">
            {NETWORK_TABS.map((t) => (
              <button key={t.type} type="button" className={t.type === type ? "active" : undefined} aria-pressed={t.type === type} onClick={() => pickTab(t.type)}>
                {copy[t.label]}
                <span>{pad2(groups.filter((g) => g.type === t.type).length)}</span>
              </button>
            ))}
          </div>

          <div className="rtg-com-net-mapcard" {...mapTilt}>
            <span className="rtg-com-net-watermark" aria-hidden="true">
              {copy.mapWatermark}
            </span>
            <div className="rtg-com-net-maplabel">
              <span>{copy.mapLabel}</span>
              <b>{group?.location}</b>
            </div>

            <div className="rtg-com-net-mapbox">
              <div className="rtg-com-net-map">
                <img src={mapImage} alt={copy.mapAlt} />

                {hub && (
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                    {cityPins.map((pin) => (
                      <path key={pin.slug} className={group?.city === pin.slug ? "active" : undefined} d={routeBetween(hub, pin)} />
                    ))}
                  </svg>
                )}

                {hub && (
                  <span className="rtg-com-net-pin is-hub" style={{ "--pin-x": `${hub.x}%`, "--pin-y": `${hub.y}%` }}>
                    <i />
                    <i />
                    <i />
                    <b>{hub.name}</b>
                  </span>
                )}

                {cityPins.map((pin) => (
                  <button
                    key={pin.slug}
                    type="button"
                    className={`rtg-com-net-pin${group?.city === pin.slug ? " active" : ""}`}
                    style={{ "--pin-x": `${pin.x}%`, "--pin-y": `${pin.y}%` }}
                    aria-label={pin.name}
                    aria-pressed={group?.city === pin.slug}
                    onClick={() => pickPin(pin.slug)}
                  >
                    <i />
                    <i />
                    <i />
                    <b>{pin.name}</b>
                  </button>
                ))}
              </div>
            </div>

            <div className="rtg-com-net-status">
              <i />
              <span>{fill(copy[tab.status], { count: list.length })}</span>
            </div>
            <PageLink to={copy.mapCreditLink} className="rtg-com-net-credit">
              {copy.mapCreditLabel}
            </PageLink>
          </div>
        </Reveal>

        <Reveal className="rtg-com-net-stage" delay={0.08}>
          <div className="rtg-com-net-stagetop">
            <span>{copy.stageLabel}</span>
            {group && (
              <span>
                {pad2(carousel.current + 1)} / {pad2(list.length)}
              </span>
            )}
          </div>

          {group ? (
            <article className={`rtg-com-net-feature${group.featured ? " featured" : ""}`} {...cardTilt}>
              {/* Keyed by the community, so the sweep and fade replay on every change. */}
              <span key={`shine-${group.id}`} className="rtg-com-net-shine" aria-hidden="true" />

              <div key={group.id} className="rtg-com-net-swap">
                <div className="rtg-com-net-featurehead">
                  <div className="rtg-com-net-monogram font-display">{group.monogram}</div>
                  {group.relation && <div className="rtg-com-net-relation">{group.relation}</div>}
                </div>

                <div className="rtg-com-net-featurecopy">
                  {group.tagline && <span className="rtg-com-net-tagline">{group.tagline}</span>}
                  <h3 className="font-display">{group.name}</h3>
                  {group.desc && <p>{group.desc}</p>}

                  {contacts.length > 0 && (
                    <div className="rtg-com-net-contacts">
                      {contacts.map((row) => (
                        <div key={row.label}>
                          <small>{row.label}</small>
                          <strong>{row.value}</strong>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rtg-com-net-featurefoot">
                  <div>
                    <small>{copy.locationLabel}</small>
                    <strong>{group.location}</strong>
                  </div>
                  <div>
                    <small>{copy.connectionLabel}</small>
                    <strong>{group.connection}</strong>
                  </div>
                  <div className="rtg-com-net-signal" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
            </article>
          ) : (
            <p className="rtg-com-net-empty">{copy.networkEmptyText}</p>
          )}

          <div className="rtg-com-net-rail" ref={railRef} style={{ "--n": Math.min(list.length, 4) || 1 }}>
            {list.map((item, i) => (
              <button
                key={item.id}
                type="button"
                className={`rtg-com-net-mini${i === carousel.current ? " active" : ""}`}
                aria-pressed={i === carousel.current}
                onClick={() => carousel.go(i)}
              >
                <span className="font-display">{item.monogram}</span>
                <span>
                  <b>{item.name}</b>
                  <small>{[item.location, item.sport].filter(Boolean).join(" • ")}</small>
                </span>
              </button>
            ))}
          </div>

          <div className="rtg-com-net-controls">
            <button type="button" className="rtg-com-arrow is-dark" aria-label={copy.networkPrevLabel} onClick={() => carousel.go(carousel.current - 1)}>
              ←
            </button>
            <Progress carousel={carousel} duration={NETWORK_MS} dark />
            <button type="button" className="rtg-com-arrow is-dark" aria-label={copy.networkNextLabel} onClick={() => carousel.go(carousel.current + 1)}>
              →
            </button>
          </div>

          <p className="rtg-com-net-note">{copy.networkNote}</p>
        </Reveal>
      </div>

      <Reveal className="rtg-com-net-quote">
        <span>{copy.networkQuote}</span>
      </Reveal>
    </section>
  );
}

// ----------------------------------------------------------------------------
// CITIES — pick a city on the left; its photos rotate through one large and
// two small frames on the right.
// ----------------------------------------------------------------------------
// One photo frame. It keeps two stacked layers so a new photo slides in over
// the old one: the hidden layer takes the new photo, then the two swap.
function MomentFrame({ moment, delay, lit }) {
  const [layers, setLayers] = useState({ a: moment, b: moment, front: "a", leaving: null });

  useEffect(() => {
    const swap = setTimeout(() => {
      setLayers((now) => {
        if (now[now.front].id === moment.id) return now;
        const back = now.front === "a" ? "b" : "a";
        return { ...now, [back]: moment, front: back, leaving: now.front };
      });
    }, delay);
    const settle = setTimeout(() => setLayers((now) => (now.leaving ? { ...now, leaving: null } : now)), delay + MOMENT_SETTLE_MS);
    return () => {
      clearTimeout(swap);
      clearTimeout(settle);
    };
  }, [moment, delay]);

  const label = layers[layers.front].label;

  return (
    <div className={`rtg-com-moment${lit ? " is-lit" : ""}`}>
      {["a", "b"].map((name) => (
        <div
          key={name}
          className={`rtg-com-moment-photo${layers.front === name ? " active" : ""}${layers.leaving === name ? " exit" : ""}`}
          style={backdrop(layers[name].image, layers[name].imagePosition)}
        />
      ))}
      {label && <span>{label}</span>}
    </div>
  );
}

function Cities({ copy, cities, moments }) {
  const [slug, setSlug] = useState(null);
  const city = cities.find((c) => c.slug === slug) || cities[0] || null;
  const citySlug = city?.slug;
  const pool = useMemo(() => moments.filter((m) => m.city === citySlug && m.image), [moments, citySlug]);

  const rotation = useCarousel(pool.length, MOMENTS_MS); // which photo the first frame shows
  const frameCount = Math.min(MOMENT_FRAMES, pool.length);
  const spotlight = useCarousel(frameCount, SPOTLIGHT_MS); // which frame is lifted
  if (!city) return null;

  // Spread the frames across the pool so no two show the same photo.
  const stride = pool.length >= MOMENT_FRAMES * 2 - 1 ? 2 : 1;
  const frames = Array.from({ length: frameCount }, (_, i) => pool[(rotation.current + i * stride) % pool.length]);

  const pickCity = (next) => {
    setSlug(next);
    rotation.go(0);
  };

  return (
    <section className="rtg-com-light rtg-com-cities" id="cities">
      <div className="rtg-com-art" aria-hidden="true">
        <svg className="rtg-com-art-run rtg-com-art-run-left" viewBox="0 0 150 150">
          <circle cx="91" cy="22" r="9" />
          <path d="M82 37 65 54l12 20 19-13 12 17" />
          <path d="M66 54 44 60 27 50" />
          <path d="M77 74 58 98 34 118" />
          <path d="M79 75 98 98l25 10" />
          <path d="M99 98 121 126" />
          <path d="M58 98 50 130" />
        </svg>
        <span className="rtg-com-dot rtg-com-dot-b" />
        <span className="rtg-com-dot rtg-com-dot-c" />
      </div>

      <div className="rtg-com-cities-wrap">
        <Reveal className="rtg-com-cities-panel">
          <span className="rtg-com-kicker">{copy.citiesKicker}</span>
          <h2 className="font-display">
            {copy.citiesTitle} <span className="text-gradient">{copy.citiesTitleAccent}</span>
          </h2>
          <p>{copy.citiesText}</p>

          <div className="rtg-com-city-chips">
            {cities.map((c) => (
              <button key={c.slug} type="button" className={c.slug === city.slug ? "active" : undefined} aria-pressed={c.slug === city.slug} onClick={() => pickCity(c.slug)}>
                {c.name}
              </button>
            ))}
          </div>

          {city.context && (
            <div className="rtg-com-city-context">
              <i />
              <span>{city.context}</span>
            </div>
          )}
        </Reveal>

        <Reveal className="rtg-com-moments" delay={0.08}>
          <div className="rtg-com-moments-head">
            <div>
              <div className="rtg-com-moments-label">{copy.momentsLabel}</div>
              <div className="rtg-com-moments-city font-display">{city.name}</div>
            </div>
            <div className="rtg-com-moments-hint">{copy.momentsHint}</div>
          </div>

          {frames.length > 0 ? (
            <div className="rtg-com-moments-grid" {...rotation.hold}>
              {frames.map((moment, i) => (
                // Keyed by the city, so picking another city starts its frames afresh.
                <MomentFrame key={`${city.slug}-${i}`} moment={moment} delay={i * MOMENT_STAGGER_MS} lit={i === spotlight.current} />
              ))}
            </div>
          ) : (
            <p className="rtg-com-moments-empty">{copy.momentsEmptyText}</p>
          )}

          {city.caption && <div className="rtg-com-moments-caption">{city.caption}</div>}
        </Reveal>
      </div>
    </section>
  );
}

export default function Community() {
  const settings = useSiteSettings();
  const copy = useMemo(() => buildCommunityPageCopy(settings), [settings]);
  const images = useSiteImages();
  const paths = useCommunityPaths();
  const principles = useCommunityPrinciples();
  const milestones = useCommunityMilestones();
  const networkPins = useCommunityNetworkCities();
  const networkGroups = useCommunityNetworkGroups();
  const cities = useCommunityCities();
  const cityMoments = useCommunityCityMoments();

  return (
    <div className="rtg-com">
      <Hero copy={copy} image={images.communityHero} />
      <FindYourPlace copy={copy} paths={paths} />
      <RtgWay copy={copy} principles={principles} image={images.communityWay} />
      <InMotion copy={copy} milestones={milestones} />
      <Network copy={copy} groups={networkGroups} pins={networkPins} mapImage={images.communityIndiaMap} />
      <Cities copy={copy} cities={cities} moments={cityMoments} />
    </div>
  );
}
