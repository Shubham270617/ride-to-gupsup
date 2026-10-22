import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import LabBackdrop from "../components/lab/LabBackdrop";
import LabDialog from "../components/lab/LabDialog";
import RichText, { Lines } from "../components/lab/RichText";
import { StravaLogo } from "../components/lab/StravaBrand";
import { useSiteSettings } from "../lib/publicData";
import {
  buildLabCopy,
  splitList,
  useLabProgrammes,
  useLabPeriods,
  useLabHighlights,
  useLabPrinciples,
} from "../lib/labData";

// ============================================================================
// RTG LAB (/lab) — the performance hub: the hero, the reward periods, one
// card per lab, and the three principles. It replaced the old Leaderboard
// page; /leaderboard now lands here.
//
// Nothing here is written in code:
//   lab_programmes   (Admin -> Lab — Labs)             the lab cards
//   lab_periods      (Admin -> Lab — Reward Periods)   the numbered strip
//   lab_highlights   (Admin -> Lab — Hero Tiles)       the floating tiles
//   lab_principles   (Admin -> Lab — Principles)       "More than a rank"
//   "text.lab.<field>" (Admin -> Site Content -> Lab)  every other wording
// Layout is in styles/lab.css under .rtg-lab.
// ============================================================================

const pad2 = (n) => String(n).padStart(2, "0");
// lab_programmes.slug of the lab whose board is built from Strava data. Its
// card always carries Strava's logo, whatever the lab is renamed to — Strava
// asks for the logo wherever its data is shown. Do not remove it.
const STRAVA_LAB = "strava-challenge";

// The line chart behind a lab card's big word — one drawing per colour.
function CardArt({ tone, word }) {
  return (
    <div className={tone === "purple" ? "card-art ridge-art" : "card-art"} aria-hidden="true">
      {tone === "purple" ? (
        <svg viewBox="0 0 600 125">
          <path className="art-line secondary" d="M0 118 80 90 127 99 207 46 247 74 307 15 351 59 387 37 460 94 528 63 600 112" />
          <path className="art-line" d="M0 122 92 104 172 65 207 85 300 5 393 87 436 69 520 115 600 99" />
        </svg>
      ) : (
        <svg viewBox="0 0 600 125">
          <path className="art-grid" d="M0 30H600M0 70H600M0 110H600M50 0V125M150 0V125M250 0V125M350 0V125M450 0V125M550 0V125" />
          <path className="art-line" d="M0 102 65 84 110 90 175 55 225 70 290 32 340 43 402 17 450 35 510 12 580 4" />
          <path className="art-line secondary" d="M0 118 65 101 110 113 175 78 225 93 290 60 340 71 402 47 450 62 510 32 580 38" />
        </svg>
      )}
      <span className="art-word">{word}</span>
    </div>
  );
}

function LabCard({ lab, onAbout, stravaAlt }) {
  const external = /^https?:\/\//.test(lab.link || "");
  return (
    <article className={lab.tone === "purple" ? "lab-card ridge-card" : "lab-card strava-card"}>
      <div className="card-top">
        <span className="number">{lab.numberLabel}</span>
        {lab.pill && <span className="pill">{lab.pill}</span>}
      </div>
      <CardArt tone={lab.tone} word={lab.artWord} />
      <div className="card-content">
        <div className={lab.tone === "purple" ? "eyebrow" : "eyebrow orange-text"}>{lab.eyebrow}</div>
        <h3>{lab.title}</h3>
        <p>{lab.description}</p>
        {lab.tags.length > 0 && (
          <div className="tags">
            {lab.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        )}
        <div className="card-actions">
          {lab.link &&
            (external ? (
              <a className={lab.tone === "purple" ? "button purple" : "button"} href={lab.link}>
                {lab.buttonLabel}
              </a>
            ) : (
              <Link className={lab.tone === "purple" ? "button purple" : "button"} to={lab.link}>
                {lab.buttonLabel}
              </Link>
            ))}
          {lab.secondaryLabel &&
            (lab.secondaryLink ? (
              <Link className="text-button" to={lab.secondaryLink}>
                {lab.secondaryLabel}
              </Link>
            ) : (
              lab.aboutBody && (
                <button type="button" className="text-button" onClick={() => onAbout(lab)}>
                  {lab.secondaryLabel}
                </button>
              )
            ))}
        </div>
        {lab.note && <small className="availability">{lab.note}</small>}
        {lab.slug === STRAVA_LAB && <StravaLogo alt={stravaAlt} className="card-strava" />}
      </div>
    </article>
  );
}

// These components only mount when the integration is available, so hidden
// Strava totals and reward periods do not trigger background reads.
function StravaHighlights() {
  const highlights = useLabHighlights();
  const tileSpots = ["metric-distance", "metric-speed", "metric-elevation"];
  return <>{highlights.slice(0, tileSpots.length).map((tile, i) => (
            <div key={tile.id} className={`metric-float ${tileSpots[i]}`}>
              <span className="icon">{tile.icon}</span>
              <div>
                <small>{tile.label}</small>
                <strong>{tile.text}</strong>
              </div>
            </div>
          ))}</>;
}

function StravaRewardPeriods({ copy }) {
  const periods = useLabPeriods();
  return <>{periods.length > 0 && (
        <div className="reward-strip">
          <div className="shell reward-inner" style={{ "--periods": periods.length }}>
            <span>
              {copy.stripLine1}
              <br />
              <b>{copy.stripLine2}</b>
            </span>
            {periods.map((period, i) => (
              <div key={period.id}>
                <strong>{pad2(i + 1)}</strong>
                {period.name}
              </div>
            ))}
          </div>
        </div>
      )}</>;
}

export default function Lab({ editor }) {
  const nativeSettings = useSiteSettings();
  const settings = useMemo(()=>({...nativeSettings,...editor?.settings}),[nativeSettings,editor?.settings]);
  const section = (id,child)=>editor?editor.section('lab-'+id,child):child;
  const copy = useMemo(() => buildLabCopy(settings), [settings]);
  const { items: labs } = useLabProgrammes();
  const principles = useLabPrinciples();
  // The information window: null (closed), or { title, body }.
  const [info, setInfo] = useState(null);

  const notes = splitList(copy.heroNotes);

  return (
    <div className="rtg-lab">
      <LabBackdrop />

      {section('hero', <section data-text-section="hero" className="hero shell" aria-labelledby="lab-hero-title">
        <div className="hero-copy">
          <div className="eyebrow">
            <i /> {copy.heroEyebrow}
          </div>
          <h1 id="lab-hero-title">
            {copy.heroTitle} <em>{copy.heroTitleAccent}</em>
          </h1>
          <h2>
            {copy.heroSubtitle}
            <br />
            {copy.heroSubtitleLine2} <span>{copy.heroSubtitleAccent}</span>
          </h2>
          <p className="lead">{copy.heroText}</p>
          <div className="hero-actions">
            <a href="#labs" className="button">
              {copy.heroPrimaryLabel} <span>↗</span>
            </a>
            <button type="button" className="outline" onClick={() => setInfo({ title: copy.aboutTitle, body: copy.aboutBody })}>
              {copy.heroSecondaryLabel} <span>＋</span>
            </button>
          </div>
          {notes.length > 0 && (
            <div className="hero-note">
              {notes.map((note) => (
                <span key={note}>{note}</span>
              ))}
            </div>
          )}
        </div>

        <div className="hero-visual" aria-hidden="true">
          <div className="orbit orbit-a" />
          <div className="orbit orbit-b" />
          <StravaHighlights />
          <div className="core">
            <div className="core-label">{copy.coreLabel}</div>
            <svg className="core-ring" viewBox="0 0 260 260">
              <circle className="track" cx="130" cy="130" r="111" />
              <circle className="ring orange" cx="130" cy="130" r="111" />
              <circle className="track" cx="130" cy="130" r="91" />
              <circle className="ring violet" cx="130" cy="130" r="91" />
              <circle className="track" cx="130" cy="130" r="71" />
              <circle className="ring cyan" cx="130" cy="130" r="71" />
            </svg>
            <div className="core-word">
              {copy.coreWord}
              <br />
              <em>{copy.coreWordAccent}</em>
            </div>
            <div className="core-bottom">{copy.coreBottom}</div>
          </div>
          <div className="visual-label">{copy.visualLabel}</div>
        </div>
      </section>)}

      <StravaRewardPeriods copy={copy} />

      {section('labs', <section data-text-section="labs" className="shell labs-section" id="labs">
        <div className="section-heading">
          <div>
            <div className="eyebrow">{copy.labsEyebrow}</div>
            <h2>
              {copy.labsTitle} <span>{copy.labsTitleAccent}</span>
            </h2>
          </div>
          <p>
            <Lines text={copy.labsText} />
          </p>
        </div>

        <div className="lab-grid">
          {labs.map((lab) => (
            <LabCard key={lab.id} lab={lab} stravaAlt={copy.poweredAlt} onAbout={(l) => setInfo({ title: l.aboutTitle || l.title, body: l.aboutBody })} />
          ))}
        </div>

        <div className="future">
          <span>＋</span>
          <div>
            <strong>{copy.futureTitle}</strong>
            <p>{copy.futureText}</p>
          </div>
          <span className="future-note">{copy.futureNote}</span>
        </div>
      </section>)}

      {section('principles', <section data-text-section="principles" className="shell principles">
        <div>
          <div className="eyebrow">{copy.principlesEyebrow}</div>
          <h2>
            {copy.principlesTitle}
            <br />
            <span>{copy.principlesTitleAccent}</span>
          </h2>
        </div>
        {principles.map((item, i) => (
          <article key={item.id}>
            <span>{pad2(i + 1)}</span>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </article>
        ))}
      </section>)}

      <LabDialog open={Boolean(info)} onClose={() => setInfo(null)} labelledBy="lab-info-title">
        {info && (
          <>
            <button type="button" className="close" onClick={() => setInfo(null)} aria-label={copy.infoCloseLabel}>
              ×
            </button>
            <div className="eyebrow">{copy.infoEyebrow}</div>
            <h2 id="lab-info-title">{info.title}</h2>
            <div>
              <RichText text={info.body} />
            </div>
            <button type="button" className="button" onClick={() => setInfo(null)}>
              {copy.infoCloseLabel}
            </button>
          </>
        )}
      </LabDialog>
    </div>
  );
}


