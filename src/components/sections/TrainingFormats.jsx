import { Fragment, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTrainingFormats } from "../../lib/publicData";
import useIsMobile from "../../hooks/useIsMobile";

const AUTO_ADVANCE_MS = 9000;
const STACKED_BELOW = 1024; // the one-column layout — Tailwind's `lg`

const pad2 = (n) => String(n).padStart(2, "0");

// Renders admin text where *starred* words are drawn in the accent colour,
// e.g. "Led by *Manish Jayal*".
function Accented({ text, className = "text-rtg-orange-500" }) {
  return (text || "").split("*").map((part, i) =>
    i % 2 === 1 ? (
      <b key={i} className={`font-black ${className}`}>
        {part}
      </b>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    )
  );
}

const SMALL_LABEL = "block text-[8.5px] max-lg:text-[10px] font-semibold tracking-[0.14em] uppercase";

// "~45 KM Total" -> ["~45 KM", "Total"]: the last word is the caption under
// the number in the phone layout's stat boxes.
function splitStat(stat) {
  const cut = stat.lastIndexOf(" ");
  return cut < 0 ? [stat, ""] : [stat.slice(0, cut), stat.slice(cut + 1)];
}

// Phones, for a format with a route-map picture: a compact row (picture,
// name, arrow to the format's page) with the stats as a row of boxes under
// it — in place of the tall desktop card.
function RouteCardCompact({ format }) {
  return (
    <div className="lg:hidden grid gap-2.5">
      <Link to={format.link || "/weekly-rides"} className="rtg-train-card !rounded-[24px] flex items-center gap-4 p-2.5 pr-4">
        <div className="rtg-train-map !rounded-[18px] shrink-0 w-[40%] h-[104px]">
          <img src={format.cardImage} alt={format.cardTitle || format.tabLabel} />
        </div>
        <div className="min-w-0 flex-1">
          {format.cardLabel && <span className="block mb-1.5 text-[10px] font-semibold tracking-[0.18em] uppercase text-white/65">{format.cardLabel}</span>}
          {format.cardTitle && <strong className="block font-display font-normal text-[22px] leading-[1.05] tracking-[0.02em]">{format.cardTitle}</strong>}
        </div>
        <span className="shrink-0 w-11 h-11 rounded-full grid place-items-center bg-white/12 text-lg" aria-hidden="true">
          ↗
        </span>
      </Link>

      {format.cardStats.length > 0 && (
        <div className="grid grid-flow-col auto-cols-fr gap-2.5">
          {format.cardStats.map((stat) => {
            const [value, caption] = splitStat(stat);
            return (
              <div key={stat} className="rtg-train-tile is-bordered flex flex-col justify-center min-h-[84px] px-3.5 py-3">
                <strong className="block font-display font-normal text-[26px] leading-none tracking-[0.02em]">{value}</strong>
                {caption && <small className="block mt-1.5 text-[9.5px] font-semibold tracking-[0.14em] uppercase text-white/60">{caption}</small>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Left card: a route-map picture with stat pills when the format has one,
// otherwise its steps as a numbered flow. Detail boxes underneath either
// way. (On phones a format with a picture shows RouteCardCompact instead.)
function FormatCard({ format }) {
  return (
    <div className={`rtg-train-card flex-col p-[18px] ${format.cardImage ? "hidden lg:flex" : "flex"}`}>
      <div>
        {format.cardLabel && <span className="block mb-[7px] text-[10px] max-lg:text-[11px] font-semibold tracking-[0.18em] uppercase">{format.cardLabel}</span>}
        {format.cardTitle && <strong className="block font-display font-normal text-xl max-lg:text-[26px] leading-[1.05] tracking-[0.02em]">{format.cardTitle}</strong>}
      </div>

      {format.cardImage ? (
        <>
          <div className="rtg-train-map my-3 h-[292px]">
            <img src={format.cardImage} alt={format.cardTitle || format.tabLabel} />
          </div>
          {format.cardStats.length > 0 && (
            <div className="grid grid-flow-col auto-cols-fr gap-[7px] mb-2.5">
              {format.cardStats.map((stat) => (
                <span key={stat} className="rtg-train-pill bg-white/8 px-[7px] py-[9px] text-center text-[10px] font-semibold tracking-[0.08em] uppercase">
                  {stat}
                </span>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="rtg-train-tile !rounded-[25px] max-lg:!bg-transparent max-lg:!shadow-none max-lg:!backdrop-blur-none flex-1 flex flex-col justify-center my-3 px-3.5 py-4 max-lg:p-0">
          {format.cardSteps.map((step, i) => (
            <Fragment key={step.label}>
              {i > 0 && <span className="block w-0.5 h-[11px] max-lg:h-3.5 ml-[29px] max-lg:ml-[37px] opacity-75 bg-gradient-to-b from-rtg-orange-500 to-white/20" />}
              <div className="rtg-train-tile is-bordered max-lg:!rounded-[24px] flex items-center gap-[13px] max-lg:gap-5 min-h-14 max-lg:min-h-[72px] px-3 max-lg:px-4 py-[9px]">
                <span className="shrink-0 w-[34px] h-[34px] max-lg:w-11 max-lg:h-11 rounded-full grid place-items-center text-[10px] max-lg:text-[13px] font-black tracking-[0.05em] bg-gradient-to-br from-[#35246f] to-[#f76b1c] shadow-[0_6px_16px_rgba(247,107,28,0.14)]">
                  {pad2(i + 1)}
                </span>
                <div>
                  <small className={`${SMALL_LABEL} mb-[3px] max-lg:text-white/70`}>{step.label}</small>
                  <strong className="block text-[10px] max-lg:text-[14px] font-bold leading-[1.1] tracking-[0.04em] uppercase">{step.value}</strong>
                </div>
              </div>
            </Fragment>
          ))}
        </div>
      )}

      {format.cardMeta.length > 0 && (
        <div className="grid grid-cols-2 gap-2 max-lg:gap-2.5 mt-auto pt-2">
          {format.cardMeta.map((m) => (
            <div key={m.label} className="rtg-train-tile !rounded-[18px] max-lg:border max-lg:border-white/18 px-2.5 max-lg:px-3.5 pt-[9px] max-lg:pt-3 pb-2.5 max-lg:pb-3">
              <small className={`${SMALL_LABEL} mb-[5px] max-lg:text-[#ff8a3d]`}>{m.label}</small>
              <strong className="block text-[10px] max-lg:text-[12px] font-bold leading-[1.35] tracking-[0.03em]">{m.value}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Headline, paragraph and pills of one format.
function FormatCopy({ format }) {
  return (
    <div className="order-1 lg:order-none pt-1">
      {format.kicker && (
        <span className="block mb-[9px] text-[9.5px] max-lg:text-[11px] font-semibold leading-normal max-lg:leading-[1.7] tracking-[0.18em] uppercase text-white">
          <Accented text={format.kicker} />
        </span>
      )}
      <h2 className="font-display text-[clamp(4.25rem,19vw,7rem)] lg:text-[clamp(3.5rem,5.4vw,6.375rem)] leading-[0.88]">
        <span className="rtg-train-outline block">{format.titleLine1}</span>
        {format.titleLine2 && <span className="rtg-train-fill block">{format.titleLine2}</span>}
      </h2>
      {format.tagline.length > 0 && (
        <div className="my-[9px] max-lg:my-3 font-display text-[2.5rem] max-lg:text-[2.75rem] leading-none text-white">
          {format.tagline.map((part, i) => (
            <span key={i} className={i % 2 === 1 ? "mx-1 text-[0.75em] italic max-lg:text-rtg-orange-500" : ""}>
              {part}{" "}
            </span>
          ))}
        </div>
      )}
      {format.description && <p className="mb-[11px] max-lg:mb-4 text-[13px] max-lg:text-[15px] leading-[1.52] text-white">{format.description}</p>}
      {format.pills.length > 0 && (
        <div className="flex flex-wrap max-lg:grid max-lg:grid-cols-2 gap-2.5 mb-2.5">
          {format.pills.map((pill) => (
            <span
              key={pill}
              className="rtg-train-pill px-3.5 max-lg:px-4 py-2.5 max-lg:py-3.5 border border-white/15 bg-[rgba(35,24,53,0.5)] backdrop-blur-md text-[8.5px] max-lg:text-[10.5px] font-bold tracking-[0.06em] max-lg:tracking-[0.1em] uppercase text-white"
            >
              {pill}
            </span>
          ))}
        </div>
      )}
      {format.note && (
        <div className="rtg-train-pill flex items-center px-3.5 max-lg:px-4 py-2 max-lg:py-3 bg-[rgba(49,33,68,0.58)] backdrop-blur-md text-[11px] max-lg:text-[10.5px] font-bold tracking-[0.08em] uppercase text-[#ffd0ae]">
          {format.note}
        </div>
      )}
    </div>
  );
}

// The format's button and the tabs that switch format. On desktop they sit
// at the foot of the headline column, tabs above the button; on phones they
// come after the card — button first, then dark tabs and a row of bars.
function FormatControls({ format, formats, activeIndex, onSelect }) {
  return (
    <div className="order-3 lg:order-none flex flex-col-reverse lg:flex-col gap-2 max-lg:gap-3 w-full lg:max-w-[360px] lg:mt-auto lg:pt-2">
      {formats.length > 1 && (
        <div className="grid gap-3">
          <div
            className="grid grid-flow-col auto-cols-fr items-center gap-1 p-[5px] rounded-full border border-[rgba(53,36,111,0.09)] max-lg:border-white/15 bg-white/75 max-lg:bg-[rgba(35,24,53,0.55)] backdrop-blur-md shadow-[0_10px_26px_rgba(53,36,111,0.08)]"
            role="tablist"
          >
            {formats.map((f, i) => (
              <button
                key={f.id || f.tabLabel}
                type="button"
                role="tab"
                aria-selected={i === activeIndex}
                onClick={() => onSelect(i)}
                className={`h-[34px] max-lg:h-12 px-2 rounded-full text-[9px] max-lg:text-[10.5px] font-bold tracking-[0.1em] uppercase truncate transition-all duration-300 ${
                  i === activeIndex
                    ? "bg-[rgba(53,36,111,0.07)] max-lg:bg-white/90 text-[#35246f] shadow-[inset_0_0_0_1px_rgba(53,36,111,0.07)]"
                    : "text-[#756e7e] max-lg:text-white/60 hover:text-[#35246f] max-lg:hover:text-white"
                }`}
              >
                <span className="mr-1 text-rtg-orange-500">{pad2(i + 1)}</span> {f.tabLabel}
              </button>
            ))}
          </div>
          <div className="lg:hidden flex justify-center gap-1.5" aria-hidden="true">
            {formats.map((f, i) => (
              <span key={f.id || f.tabLabel} className={`w-9 h-1 rounded-full transition-colors duration-300 ${i === activeIndex ? "bg-rtg-orange-500" : "bg-white/20"}`} />
            ))}
          </div>
        </div>
      )}
      {format.buttonLabel && (
        <Link
          to={format.link || "/weekly-rides"}
          className="btn-shine flex items-center justify-center gap-3 h-12 max-lg:h-14 px-5 rounded-full bg-gradient-to-r from-[#f45b18] to-[#ff7a1a] text-xs max-lg:text-[13px] font-bold tracking-[0.18em] uppercase text-white shadow-[0_14px_34px_rgba(247,107,28,0.28),inset_0_1px_0_rgba(255,255,255,0.38)] transition-transform duration-300 hover:-translate-y-0.5"
        >
          {format.buttonLabel}
          <span className="lg:hidden text-lg leading-none" aria-hidden="true">
            →
          </span>
        </Link>
      )}
    </div>
  );
}

function FormatPanel({ format }) {
  if (format.panelRows.length === 0) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:col-span-2 lg:grid-cols-4 xl:col-span-1 xl:grid-cols-1">
      {format.panelRows.map((row) => (
        <div key={row.label} className="rtg-train-tile is-bordered flex flex-col justify-center px-4 py-[15px] min-h-[84px]">
          <small className={`${SMALL_LABEL} mb-[7px]`}>{row.label}</small>
          <strong className="block text-[10px] font-bold leading-[1.3] tracking-[0.04em] uppercase">
            <Accented text={row.value} className="text-[#ffb37a]" />
          </strong>
        </div>
      ))}
    </div>
  );
}

// "Training Formats" — a dark, photo-backed band showing one format at a
// time: route/flow card on the left, headline and tabs in the middle,
// fact rows on the right. Each format brings its own background photo;
// switching tabs cross-fades both the photo and the content. Advances on
// its own every few seconds, paused while the pointer is over it.
//
// Phones and tablets get one column in a different order — headline, card,
// button, tabs — without the fact rows. (The headline column's wrapper is
// `display: contents` there, so its two halves can sit either side of the
// card.)
export default function TrainingFormats({ images }) {
  const formats = useTrainingFormats();
  const isMobile = useIsMobile();
  const stacked = useIsMobile(STACKED_BELOW);
  const count = formats.length;
  const [index, setIndex] = useState(0);
  const paused = useRef(false);

  // Restarts whenever `index` changes, so a tab click gets a full interval.
  // Not in the one-column layout: there each format is its own height, and
  // changing by itself would shift the rest of the page under the reader.
  useEffect(() => {
    if (count < 2 || stacked) return undefined;
    const id = setInterval(() => {
      if (!paused.current) setIndex((i) => (i + 1) % count);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [count, index, stacked]);

  if (count === 0) return null;
  const active = index % count;

  return (
    <section
      id="training-formats"
      className="relative isolate overflow-hidden bg-rtg-purple-950"
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
    >
      {/* One photo layer per format, cross-faded. `fixed` attachment pins
          the photo to the viewport while the section scrolls over it
          (plain `scroll` on phones, where fixed backgrounds misbehave). */}
      {formats.map((f, i) => (
        <div
          key={f.id || f.tabLabel}
          aria-hidden="true"
          className={`absolute inset-0 -z-20 transition-opacity duration-[800ms] ${i === active ? "opacity-100" : "opacity-0"}`}
          style={{
            backgroundImage: `url(${f.image || images[f.imageKey] || images.homeWeekly})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundAttachment: isMobile ? "scroll" : "fixed",
          }}
        />
      ))}
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(20,12,36,0.6)_0%,rgba(24,14,43,0.76)_50%,rgba(18,10,33,0.9)_100%)] lg:bg-[linear-gradient(90deg,rgba(26,16,46,0.7)_0%,rgba(52,32,72,0.35)_50%,rgba(24,14,43,0.66)_100%)]" />

      <div className="grid">
        {formats.map((f, i) => (
          <div key={f.id || f.tabLabel} className={`rtg-train-slide ${i === active ? "is-active" : ""}`} aria-hidden={i !== active}>
            <div className="max-w-[560px] lg:max-w-[1320px] mx-auto px-5 md:px-10 xl:px-[72px] pt-12 pb-10 lg:pt-[54px] lg:pb-[46px] grid gap-5 lg:gap-[34px] lg:grid-cols-[350px_minmax(0,1fr)] xl:grid-cols-[350px_minmax(0,1fr)_320px] lg:min-h-[690px]">
              <div className="order-2 lg:order-1 grid">
                {f.cardImage && <RouteCardCompact format={f} />}
                <FormatCard format={f} />
              </div>
              <div className="contents lg:order-2 lg:flex lg:flex-col">
                <FormatCopy format={f} />
                <FormatControls format={f} formats={formats} activeIndex={active} onSelect={setIndex} />
              </div>
              <div className="hidden lg:grid lg:order-3 lg:col-span-2 xl:col-span-1">
                <FormatPanel format={f} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
