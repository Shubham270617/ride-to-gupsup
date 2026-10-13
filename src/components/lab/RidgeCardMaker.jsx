import { useEffect, useMemo, useRef, useState } from "react";
import LabDialog from "./LabDialog";
import { averageProgress, fill, ridgeStandings, riderKey, sessionAwards, sessionProgressRank, trendPoints } from "../../lib/labData";

// ============================================================================
// PHOTO CARD MAKER — turns a rider's result into an image sized for
// Instagram (a 4:5 post or a 9:16 story), drawn on a <canvas> in the
// browser. The rider can put their own photo behind it; that photo never
// leaves their device. Opened from the rider record and from a Spotlight
// award on /lab/ridge.
//
// `request` = { name, session, kind, winners } (null = closed):
//   kind     "session" | "overall" | "spotlight:<award slug>"
//   winners  the riders who can be picked (more than one for a shared award)
// Every word on the card is in Admin -> Site Content -> Ridge Repeats
// ("photo card maker").
// ============================================================================

const POST = { width: 1080, height: 1350 };
const STORY = { width: 1080, height: 1920 };
const MAX_PHOTO_BYTES = 25 * 1024 * 1024;
const MAX_PHOTO_SIDE = 2560;
const START_CROP = { x: 50, y: 50, zoom: 1 };

const isNumber = (n) => n !== null && n !== undefined && Number.isFinite(Number(n));
const fixed = (n) => (isNumber(n) ? Number(n).toFixed(2) : "—");
const signed = (n) => (isNumber(n) ? `${Number(n) > 0 ? "+" : ""}${Number(n).toFixed(2)}` : "—");
const dateLabel = (iso) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
const shortDate = (iso) => dateLabel(iso).replace(/ \d{4}$/, "");

// The cards a rider can make for one session: their session result, their
// overall progress (once they are ranked) and any Spotlight they won.
function cardChoices(feed, name, sessionSlug, copy, loopKm) {
  const profile = feed.riders.find((p) => riderKey(p.name) === riderKey(name));
  if (!profile) return [];
  const max = feed.maxLoops;
  const row = profile.records.find((r) => r.session === sessionSlug);
  const cards = [];
  const loops = row ? Math.min(row.laps, max) : null;
  const stats = row
    ? [
        [`${loops}/${max}`, copy.cardStatLoops],
        [fixed(loops * loopKm), copy.cardStatKm],
        [fixed(row.ridgePoints), copy.cardStatRidge],
      ]
    : [];

  if (row) {
    const place = sessionProgressRank(feed, name, sessionSlug);
    cards.push({
      id: "session",
      label: fill(copy.cardKindSession, { date: dateLabel(row.date) }),
      name: profile.name,
      date: row.date,
      period: dateLabel(row.date),
      heading: copy.cardHeadingSession,
      value: row.progress,
      score: signed(row.progress),
      unit: copy.cardUnitProgress,
      rank: place ? fill(copy.cardRankSession, { rank: place }) : (row.laps < 2 ? copy.captionFirstLoop : copy.captionReview).toUpperCase(),
      note: copy.cardNoteSession,
      stats,
      loops,
    });
  }

  const overall = ridgeStandings(feed, "overall").find((r) => riderKey(r.name) === riderKey(name));
  if (overall && overall.value !== null) {
    const ridden = profile.records.reduce((sum, r) => sum + Math.min(r.laps, max), 0);
    const from = overall.first.stamp;
    const to = overall.latest.stamp;
    cards.push({
      id: "overall",
      label: copy.cardKindOverall,
      name: profile.name,
      date: overall.latest.date,
      period: `${shortDate(overall.first.date)} → ${dateLabel(overall.latest.date)}`,
      heading: copy.cardHeadingOverall,
      value: overall.value,
      score: signed(overall.value),
      unit: copy.cardUnitGain,
      rank: fill(copy.cardRankOverall, { rank: overall.place }),
      note: `${fill(copy.baselineLine, { first: signed(averageProgress(overall.first)), latest: signed(averageProgress(overall.latest)) })}${
        overall.qualifying.length === 2 ? ` · ${copy.footProvisional}` : ""
      }`,
      stats: [
        [String(profile.records.length), copy.cardStatSessions],
        [String(ridden), copy.cardStatLoopsRidden],
        [fixed(ridden * loopKm), copy.cardStatKm],
      ],
      trend: trendPoints(feed, overall).filter((p) => p.stamp >= from && p.stamp <= to),
    });
  }

  if (row) {
    sessionAwards(feed, sessionSlug)
      .filter((award) => award.winners.some((w) => riderKey(w) === riderKey(name)))
      .forEach((award) => {
        cards.push({
          id: `spotlight:${award.slug}`,
          label: fill(copy.cardKindSpotlight, { award: award.name }),
          name: profile.name,
          date: row.date,
          period: dateLabel(row.date),
          heading: copy.cardHeadingSpotlight,
          title: award.name,
          score: award.metric || "—",
          unit: copy.cardUnitAward,
          rank: award.winners.length > 1 ? copy.cardRankShared : copy.cardRankStandout,
          note: award.description,
          stats,
          loops,
        });
      });
  }
  return cards;
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => (image.naturalWidth ? resolve(image) : reject(new Error("empty")));
    image.onerror = () => reject(new Error("failed"));
    if (/^https?:\/\//i.test(source)) image.crossOrigin = "anonymous";
    image.src = source;
  });
}

// A chosen photo, scaled down to a size the canvas handles comfortably.
async function readPhoto(file) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("read"));
    reader.readAsDataURL(file);
  });
  const image = await loadImage(dataUrl);
  const scale = Math.min(1, MAX_PHOTO_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
  if (scale === 1) return image;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.naturalWidth * scale);
  canvas.height = Math.round(image.naturalHeight * scale);
  canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
  return loadImage(canvas.toDataURL("image/jpeg", 0.94));
}

const setFont = (ctx, size, weight = 500) => {
  ctx.font = `${weight} ${size}px "Space Grotesk", Arial, sans-serif`;
};

function wrapText(ctx, text, width) {
  const lines = [];
  let line = "";
  for (const word of String(text || "").trim().split(/\s+/).filter(Boolean)) {
    if (ctx.measureText(word).width > width) {
      if (line) {
        lines.push(line);
        line = "";
      }
      for (const letter of word) {
        if (line && ctx.measureText(line + letter).width > width) {
          lines.push(line);
          line = "";
        }
        line += letter;
      }
    } else {
      const next = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(next).width > width) {
        lines.push(line);
        line = word;
      } else line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Draws the card. The details block shrinks until it fits between the brand
// lines at the top and the footer.
function drawCard(canvas, card, image, { format, crop, position }, copy) {
  const { width, height } = format === "story" ? STORY : POST;
  const left = 76;
  const textWidth = 928;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  const background = ctx.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, "#294ba7");
  background.addColorStop(0.42, "#513293");
  background.addColorStop(1, "#21123f");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  if (image) {
    const iw = image.naturalWidth;
    const ih = image.naturalHeight;
    const scale = Math.max(width / iw, height / ih) * crop.zoom;
    const w = iw * scale;
    const h = ih * scale;
    ctx.drawImage(image, ((width - w) * crop.x) / 100, ((height - h) * crop.y) / 100, w, h);
    ctx.fillStyle = "rgba(0,0,0,.50)";
    ctx.fillRect(0, 0, width, height);
  } else {
    ctx.strokeStyle = "rgba(255,255,255,.08)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo(-100, 210 + i * 30);
      ctx.bezierCurveTo(280, -50 + i * 55, 610, 590 + i * 25, 1190, 120 + i * 38);
      ctx.stroke();
    }
  }
  const shade = ctx.createLinearGradient(0, 0, 0, height);
  shade.addColorStop(0, "rgba(22,12,44,.65)");
  shade.addColorStop(0.34, "rgba(22,12,44,.04)");
  shade.addColorStop(1, "rgba(22,12,44,.83)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, width, height);
  ctx.textBaseline = "top";

  ctx.fillStyle = "#ffffff";
  setFont(ctx, 80);
  ctx.fillText(copy.cardBrand, left, 76);
  setFont(ctx, 39);
  ctx.fillText(copy.cardBrandLine, left, 173);
  ctx.fillStyle = "#ffb17c";
  setFont(ctx, 26);
  ctx.fillText(copy.cardTagline, left, 228);
  ctx.fillStyle = "#fe7b39";
  ctx.fillRect(left, 278, 88, 5);
  ctx.fillStyle = "#82b7ff";
  ctx.fillRect(left + 99, 278, 36, 5);

  const available = height - 540;
  const layout = (scale) => {
    const blocks = [];
    const text = (value, size, color = "#ffffff", weight = 500, maxLines = Infinity) => {
      const actual = size * scale;
      setFont(ctx, actual, weight);
      let lines = wrapText(ctx, value, textWidth);
      if (lines.length > maxLines) {
        lines = lines.slice(0, maxLines);
        let end = lines[maxLines - 1];
        while (end && ctx.measureText(`${end}…`).width > textWidth) end = end.slice(0, -1);
        lines[maxLines - 1] = `${end}…`;
      }
      blocks.push({ type: "text", lines, size: actual, color, weight, height: lines.length * actual * 1.2 + 14 * scale });
    };
    text(`${card.heading} / ${card.period.toUpperCase()}`, 24, "#ffb17c");
    if (card.title) text(card.title.toUpperCase(), 42, "#ffffff", 500, 2);
    let nameSize = 76;
    setFont(ctx, nameSize * scale);
    while (wrapText(ctx, card.name, textWidth).length > 2 && nameSize > 40) {
      nameSize -= 2;
      setFont(ctx, nameSize * scale);
    }
    text(card.name, nameSize);
    let scoreSize = card.title ? 110 : 176;
    setFont(ctx, scoreSize * scale);
    while (ctx.measureText(card.score).width > textWidth && scoreSize > 35) {
      scoreSize -= 2;
      setFont(ctx, scoreSize * scale);
    }
    text(card.score, scoreSize, isNumber(card.value) && card.value < 0 ? "#ffb6c5" : "#ffb17c");
    text(card.unit, 26);
    text(card.rank, 23, "#e2d8f7");
    if (card.note) text(card.note, 24, "#e2d8f7", 400, 3);
    if (card.stats.length) blocks.push({ type: "stats", height: 113 * scale, scale });
    if (card.trend?.length) blocks.push({ type: "trend", height: 151 * scale, scale });
    else if (isNumber(card.loops)) blocks.push({ type: "loops", height: 65 * scale, scale });
    return { blocks, height: blocks.reduce((total, block) => total + block.height, 0) };
  };
  let scale = 1;
  let content = layout(scale);
  while (content.height > available && scale > 0.55) {
    scale -= 0.025;
    content = layout(scale);
  }

  let y = 325 + Math.max(0, available - content.height) * (format === "story" ? position / 100 : 0.75);
  for (const block of content.blocks) {
    const s = block.scale;
    if (block.type === "text") {
      setFont(ctx, block.size, block.weight);
      ctx.fillStyle = block.color;
      block.lines.forEach((line, i) => ctx.fillText(line, left, y + i * block.size * 1.2));
    } else if (block.type === "stats") {
      const gap = 14;
      const cell = (textWidth - gap * 2) / 3;
      card.stats.forEach(([value, label], i) => {
        const x = left + i * (cell + gap);
        ctx.fillStyle = "rgba(255,255,255,.12)";
        ctx.fillRect(x, y, cell, 94 * s);
        let size = 38 * s;
        setFont(ctx, size);
        while (ctx.measureText(value).width > cell - 30 && size > 18) {
          size--;
          setFont(ctx, size);
        }
        ctx.fillStyle = "#ffffff";
        ctx.fillText(value, x + 15, y + 14 * s);
        setFont(ctx, 20 * s, 400);
        ctx.fillStyle = "#e2d8f7";
        ctx.fillText(label, x + 15, y + 61 * s);
      });
    } else if (block.type === "loops") {
      const count = card.stats.length ? Number(String(card.stats[0][0]).split("/")[1]) || card.loops : card.loops;
      const gap = 14;
      const cell = (textWidth - gap * (count - 1)) / count;
      for (let i = 0; i < count; i++) {
        const x = left + i * (cell + gap);
        ctx.fillStyle = i < card.loops ? "#fe7b39" : "rgba(255,255,255,.16)";
        ctx.fillRect(x, y + 7 * s, cell, 10 * s);
        setFont(ctx, 20 * s, 400);
        ctx.fillStyle = i < card.loops ? "#ffffff" : "#e2d8f7";
        ctx.fillText(`L${i + 1}`, x, y + 26 * s);
      }
    } else if (block.type === "trend") {
      const points = card.trend;
      const values = points.map((p) => p.value).filter(isNumber);
      setFont(ctx, 21 * s, 400);
      ctx.fillStyle = "#e2d8f7";
      ctx.fillText(copy.cardTrendLabel, left, y);
      const lo = Math.min(0, ...values);
      const hi = Math.max(0, ...values);
      const padding = Math.max((hi - lo) * 0.15, 0.2);
      const start = points[0].stamp;
      const end = points[points.length - 1].stamp;
      const px = (p) => left + 10 + ((p.stamp - start) / Math.max(1, end - start)) * (textWidth - 20);
      const py = (value) => y + 36 * s + ((hi + padding - value) / (hi - lo + 2 * padding)) * 65 * s;
      ctx.strokeStyle = "rgba(255,255,255,.25)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(left, py(0));
      ctx.lineTo(left + textWidth, py(0));
      ctx.stroke();
      ctx.strokeStyle = "#ffb17c";
      ctx.lineWidth = 4 * s;
      ctx.beginPath();
      let active = false;
      for (const p of points) {
        if (!isNumber(p.value)) {
          active = false;
          continue;
        }
        if (active) ctx.lineTo(px(p), py(p.value));
        else ctx.moveTo(px(p), py(p.value));
        active = true;
      }
      ctx.stroke();
      for (const p of points) {
        if (!isNumber(p.value)) continue;
        ctx.beginPath();
        ctx.arc(px(p), py(p.value), 5 * s, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
      }
      setFont(ctx, 20 * s, 400);
      ctx.fillStyle = "#e2d8f7";
      ctx.fillText(shortDate(points[0].date), left, y + 116 * s);
      ctx.textAlign = "right";
      ctx.fillText(shortDate(points[points.length - 1].date), left + textWidth, y + 116 * s);
      ctx.textAlign = "left";
    }
    y += block.height;
  }

  ctx.fillStyle = "#fe7b39";
  ctx.fillRect(left, height - 179, textWidth, 2);
  setFont(ctx, 25, 400);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(copy.cardFooter, left, height - 147);
  setFont(ctx, 24);
  ctx.fillStyle = "#ffb17c";
  ctx.fillText(copy.cardHandleLeft, left, height - 98);
  ctx.textAlign = "right";
  ctx.fillText(copy.cardHandleRight, left + textWidth, height - 98);
  ctx.textAlign = "left";
  return { width, height };
}

export default function RidgeCardMaker({ request, onClose, feed, copy, loopKm }) {
  const canvasRef = useRef(null);
  const [name, setName] = useState("");
  const [kind, setKind] = useState("");
  const [format, setFormat] = useState("post");
  const [image, setImage] = useState(null);
  const [crop, setCrop] = useState(START_CROP);
  const [position, setPosition] = useState(60);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [output, setOutput] = useState(null); // { url, file, filename }

  const rider = name || request?.name || "";
  const riderPhoto = feed.riders.find((p) => riderKey(p.name) === riderKey(rider))?.photo || "";
  const cards = useMemo(
    () => (request ? cardChoices(feed, rider, request.session, copy, loopKm) : []),
    [request, feed, rider, copy, loopKm]
  );
  const card = cards.find((c) => c.id === kind) || cards[0] || null;

  // A new request: start from its rider and card, with the rider's own
  // photo (when they have one) behind it.
  useEffect(() => {
    if (!request) return;
    setName(request.name);
    setKind(request.kind);
    setFormat("post");
    setCrop(START_CROP);
    setPosition(60);
    setError("");
  }, [request]);

  useEffect(() => {
    if (!request) return;
    let cancelled = false;
    setImage(null);
    if (riderPhoto) {
      loadImage(riderPhoto)
        .then((loaded) => !cancelled && setImage(loaded))
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [request, riderPhoto]);

  // Redraw whenever anything on the card changes, then keep a PNG ready.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!request || !card || !canvas) return;
    let cancelled = false;
    setStatus(copy.cardPreparing);
    (async () => {
      try {
        await document.fonts?.ready;
      } catch {
        /* the card is drawn with the fallback font */
      }
      if (cancelled) return;
      try {
        drawCard(canvas, card, image, { format, crop, position }, copy);
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
        if (cancelled || !blob) return;
        const filename = `RTG-Ridge-${card.date}-${card.name.replace(/[^a-z0-9-]+/gi, "-")}-${card.id.replace(":", "-")}-${format}.png`;
        const url = URL.createObjectURL(blob);
        setOutput((previous) => {
          if (previous?.url) URL.revokeObjectURL(previous.url);
          return { url, filename, file: typeof File === "function" ? new File([blob], filename, { type: "image/png" }) : null };
        });
        setStatus(image ? copy.cardReadyPhoto : copy.cardReadyPlain);
      } catch {
        // A photo from another site can't always be exported — draw without it.
        if (!cancelled && image) setImage(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [request, card, image, format, crop, position, copy]);

  const pickPhoto = async (file) => {
    if (!file) return;
    setError("");
    if (file.size > MAX_PHOTO_BYTES) return setError(copy.cardPhotoTooBig);
    if (file.type && (!file.type.startsWith("image/") || file.type === "image/svg+xml")) return setError(copy.cardPhotoWrongType);
    try {
      setImage(await readPhoto(file));
      setCrop(START_CROP);
    } catch {
      setError(copy.cardPhotoFailed);
    }
  };
  const applyRiderPhoto = () => {
    if (!riderPhoto) return;
    loadImage(riderPhoto)
      .then((loaded) => {
        setImage(loaded);
        setCrop(START_CROP);
      })
      .catch(() => setError(copy.cardPhotoFailed));
  };
  const download = () => {
    if (!output) return;
    const link = document.createElement("a");
    link.href = output.url;
    link.download = output.filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };
  const share = async () => {
    if (!output) return;
    try {
      if (!output.file || !navigator.canShare?.({ files: [output.file] })) throw new Error("unavailable");
      await navigator.share({ files: [output.file], title: `${copy.cardBrand} ${copy.cardBrandLine} · ${rider}` });
    } catch (failure) {
      if (failure.name !== "AbortError") setStatus(copy.cardShareFailed);
    }
  };

  const winners = request?.winners?.length ? request.winners : [rider];
  const size = format === "story" ? STORY : POST;

  return (
    <LabDialog open={Boolean(request)} onClose={onClose} scope="rtg-ridge" className="rr-card-dialog" labelledBy="rr-card-title">
      <div className="rr-dialog-header">
        <p className="rr-eyebrow">{copy.cardEyebrow}</p>
        <button type="button" className="rr-close" onClick={onClose} aria-label={copy.closeLabel}>
          ×
        </button>
      </div>
      <h2 id="rr-card-title">{copy.cardTitle}</h2>
      <p className="rr-card-summary">{card ? `${card.name} · ${card.period}` : ""}</p>

      <div className="rr-card-layout">
        <div className="rr-card-controls">
          {winners.length > 1 && (
            <label className="rr-card-field">
              {copy.cardRiderLabel}
              <select value={rider} onChange={(e) => setName(e.target.value)}>
                {winners.map((winner) => (
                  <option key={winner}>{winner}</option>
                ))}
              </select>
            </label>
          )}
          <label className="rr-card-field">
            {copy.cardKindLabel}
            <select value={card?.id || ""} onChange={(e) => setKind(e.target.value)}>
              {cards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="rr-card-field">
            {copy.cardFormatLabel}
            <select value={format} onChange={(e) => setFormat(e.target.value)}>
              <option value="post">{copy.cardFormatPost}</option>
              <option value="story">{copy.cardFormatStory}</option>
            </select>
          </label>
          <label className="rr-card-field rr-photo-field">
            {copy.cardPhotoLabel}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                pickPhoto(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          <p className="rr-card-hint">{copy.cardPhotoHint}</p>
          {error && (
            <p className="rr-card-error" role="alert">
              {error}
            </p>
          )}
          <div className="rr-card-photo-actions">
            <button type="button" className="rr-text-button" onClick={() => setImage(null)} disabled={!image}>
              {copy.cardRemovePhoto}
            </button>
            {riderPhoto && (
              <button type="button" className="rr-text-button" onClick={applyRiderPhoto}>
                {copy.cardUseRiderPhoto}
              </button>
            )}
          </div>
          {image && (
            <details className="rr-card-adjust">
              <summary>{copy.cardAdjust}</summary>
              <label className="rr-card-range">
                {copy.cardAdjustX} <output>{crop.x}%</output>
                <input type="range" min="0" max="100" value={crop.x} onChange={(e) => setCrop((c) => ({ ...c, x: Number(e.target.value) }))} />
              </label>
              <label className="rr-card-range">
                {copy.cardAdjustY} <output>{crop.y}%</output>
                <input type="range" min="0" max="100" value={crop.y} onChange={(e) => setCrop((c) => ({ ...c, y: Number(e.target.value) }))} />
              </label>
              <label className="rr-card-range">
                {copy.cardAdjustZoom} <output>{crop.zoom.toFixed(1)}×</output>
                <input type="range" min="1" max="2" step="0.05" value={crop.zoom} onChange={(e) => setCrop((c) => ({ ...c, zoom: Number(e.target.value) }))} />
              </label>
            </details>
          )}
          {format === "story" && (
            <label className="rr-card-range">
              {copy.cardStoryPosition} <output>{position}%</output>
              <input type="range" min="0" max="100" value={position} onChange={(e) => setPosition(Number(e.target.value))} />
            </label>
          )}
          <p className="rr-card-hint">{copy.cardShadeHint}</p>
          <div className="rr-card-actions">
            <button type="button" className="rr-save-card" onClick={download} disabled={!output}>
              {copy.cardDownload}
            </button>
            <button type="button" className="rr-card-secondary" onClick={share} disabled={!output}>
              {copy.cardShare}
            </button>
          </div>
          <p className="rr-card-hint" role="status" aria-live="polite">
            {status}
          </p>
          {output && (
            <a className="rr-card-open-image" href={output.url} target="_blank" rel="noopener noreferrer">
              {copy.cardOpenImage}
            </a>
          )}
          <p className="rr-card-hint">{copy.cardSaveHint}</p>
        </div>
        <figure className="rr-card-preview-wrap">
          <canvas ref={canvasRef} id="rr-card-canvas" role="img" aria-label={card ? `${card.name} · ${card.heading} · ${card.score} ${card.unit}` : ""} width={size.width} height={size.height} />
          <figcaption>{`${size.width} × ${size.height} PNG`}</figcaption>
        </figure>
      </div>
    </LabDialog>
  );
}
