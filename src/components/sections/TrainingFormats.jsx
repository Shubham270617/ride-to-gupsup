import { Fragment, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTrainingFormats } from "../../lib/publicData";
import useIsMobile from "../../hooks/useIsMobile";

const AUTO_ADVANCE_MS = 9000;

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

const SMALL_LABEL = "block text-[8.5px] font-semibold tracking-[0.14em] uppercase";

// Left card: a route-map picture with stat pills when the format has one,
// otherwise its steps as a numbered flow. Detail boxes underneath either way.
function FormatCard({ format }) {
  return (
    <div className="rtg-train-card flex flex-col p-[18px]">
      <div>
        {format.cardLabel && <span className="block mb-[7px] text-[10px] font-semibold tracking-[0.18em] uppercase">{format.cardLabel}</span>}
        {format.cardTitle && <strong className="block font-display font-normal text-xl leading-[1.05] tracking-[0.02em]">{format.cardTitle}</strong>}
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
        <div className="rtg-train-tile !rounded-[25px] flex-1 flex flex-col justify-center my-3 px-3.5 py-4">
          {format.cardSteps.map((step, i) => (
            <Fragment key={step.label}>
              {i > 0 && <span className="block w-0.5 h-[11px] ml-[29px] opacity-75 bg-gradient-to-b from-rtg-orange-500 to-white/20" />}
              <div className="rtg-train-tile is-bordered flex items-center gap-[13px] min-h-14 px-3 py-[9px]">
                <span className="shrink-0 w-[34px] h-[34px] rounded-full grid place-items-center text-[10px] font-black tracking-[0.05em] bg-gradient-to-br from-[#35246f] to-[#f76b1c] shadow-[0_6px_16px_rgba(247,107,28,0.14)]">
                  {pad2(i + 1)}
                </span>
                <div>
                  <small className={`${SMALL_LABEL} mb-[3px]`}>{step.label}</small>
                  <strong className="block text-[10px] font-bold leading-[1.1] tracking-[0.04em] uppercase">{step.value}</strong>
                </div>
              </div>
            </Fragment>
          ))}
        </div>
      )}

      {format.cardMeta.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mt-auto pt-2">
          {format.cardMeta.map((m) => (
            <div key={m.label} className="rtg-train-tile !rounded-[18px] px-2.5 pt-[9px] pb-2.5">
              <small className={`${SMALL_LABEL} mb-[5px]`}>{m.label}</small>
              <strong className="block text-[10px] font-bold leading-[1.35] tracking-[0.03em]">{m.value}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FormatCopy({ format, formats, activeIndex, onSelect }) {
  return (
    <div className="flex flex-col pt-1">
      {format.kicker && (
        <span className="block mb-[9px] text-[9.5px] font-semibold leading-normal tracking-[0.18em] uppercase text-white">
          <Accented text={format.kicker} />
        </span>
      )}
      <h2 className="font-display text-[clamp(3.5rem,5.4vw,6.375rem)] leading-[0.88]">
        <span className="rtg-train-outline block">{format.titleLine1}</span>
        {format.titleLine2 && <span className="rtg-train-fill block">{format.titleLine2}</span>}
      </h2>
      {format.tagline.length > 0 && (
        <div className="my-[9px] font-display text-[2.5rem] leading-none text-white">
          {format.tagline.map((part, i) => (
            <span key={i} className={i % 2 === 1 ? "mx-1 text-[0.75em] italic" : ""}>
              {part}{" "}
            </span>
          ))}
        </div>
      )}
      {format.description && <p className="mb-[11px] text-[13px] leading-[1.52] text-white">{format.description}</p>}
      {format.pills.length > 0 && (
        <div className="flex flex-wrap gap-2.5 mb-2.5">
          {format.pills.map((pill) => (
            <span
              key={pill}
              className="rtg-train-pill px-3.5 py-2.5 border border-white/15 bg-[rgba(35,24,53,0.5)] backdrop-blur-md text-[8.5px] font-bold tracking-[0.06em] uppercase text-white"
            >
              {pill}
            </span>
          ))}
        </div>
      )}
      {format.note && (
        <div className="rtg-train-pill flex items-center px-3.5 py-2 bg-[rgba(49,33,68,0.58)] backdrop-blur-md text-[11px] font-bold tracking-[0.08em] uppercase text-[#ffd0ae]">
          {format.note}
        </div>
      )}

      <div className="grid gap-2 w-full max-w-[360px] mt-5 lg:mt-auto pt-2">
        {formats.length > 1 && (
          <div
            className="grid grid-flow-col auto-cols-fr items-center gap-1 p-[5px] rounded-full border border-[rgba(53,36,111,0.09)] bg-white/75 backdrop-blur-md shadow-[0_10px_26px_rgba(53,36,111,0.08)]"
            role="tablist"
          >
            {formats.map((f, i) => (
              <button
                key={f.id || f.tabLabel}
                type="button"
                role="tab"
                aria-selected={i === activeIndex}
                onClick={() => onSelect(i)}
                className={`h-[34px] px-2 rounded-full text-[9px] font-bold tracking-[0.1em] uppercase truncate transition-all duration-300 ${
                  i === activeIndex
                    ? "bg-[rgba(53,36,111,0.07)] text-[#35246f] shadow-[inset_0_0_0_1px_rgba(53,36,111,0.07)]"
                    : "text-[#756e7e] hover:text-[#35246f]"
                }`}
              >
                <span className="mr-1 text-rtg-orange-500">{pad2(i + 1)}</span> {f.tabLabel}
              </button>
            ))}
          </div>
        )}
        {format.buttonLabel && (
          <Link
            to={format.link || "/weekly-rides"}
            className="btn-shine flex items-center justify-center h-12 px-5 rounded-full bg-gradient-to-r from-[#f45b18] to-[#ff7a1a] text-xs font-bold tracking-[0.18em] uppercase text-white shadow-[0_14px_34px_rgba(247,107,28,0.28),inset_0_1px_0_rgba(255,255,255,0.38)] transition-transform duration-300 hover:-translate-y-0.5"
          >
            {format.buttonLabel}
          </Link>
        )}
      </div>
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
export default function TrainingFormats({ images }) {
  const formats = useTrainingFormats();
  const isMobile = useIsMobile();
  const count = formats.length;
  const [index, setIndex] = useState(0);
  const paused = useRef(false);

  // Restarts whenever `index` changes, so a tab click gets a full interval.
  useEffect(() => {
    if (count < 2) return undefined;
    const id = setInterval(() => {
      if (!paused.current) setIndex((i) => (i + 1) % count);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [count, index]);

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
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(26,16,46,0.7)_0%,rgba(52,32,72,0.35)_50%,rgba(24,14,43,0.66)_100%)]" />

      <div className="grid">
        {formats.map((f, i) => (
          <div key={f.id || f.tabLabel} className={`rtg-train-slide ${i === active ? "is-active" : ""}`} aria-hidden={i !== active}>
            <div className="max-w-[1320px] mx-auto px-6 md:px-10 xl:px-[72px] pt-12 pb-10 lg:pt-[54px] lg:pb-[46px] grid gap-6 lg:gap-[34px] lg:grid-cols-[350px_minmax(0,1fr)] xl:grid-cols-[350px_minmax(0,1fr)_320px] lg:min-h-[690px]">
              <div className="order-2 lg:order-1 grid">
                <FormatCard format={f} />
              </div>
              <div className="order-1 lg:order-2 grid">
                <FormatCopy format={f} formats={formats} activeIndex={active} onSelect={setIndex} />
              </div>
              <div className="order-3 grid lg:col-span-2 xl:col-span-1">
                <FormatPanel format={f} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
