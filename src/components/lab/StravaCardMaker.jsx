import { useEffect, useMemo, useRef, useState } from "react";
import LabDialog from "./LabDialog";

// ============================================================================
// WINNER CARD — turns a top-three finish on /lab/strava into a shareable
// image, drawn on a <canvas> in the browser (nothing is uploaded).
//
// Same approach as the Ridge Repeats card maker (RidgeCardMaker.jsx): a
// 1080x1350 post or a 1080x1920 story, download or hand to the OS share
// sheet. Kept separate and much smaller because this one has no photo
// upload and no award variants — the leaderboard already knows everything
// the card needs.
//
// `request` = { athlete, rank, metricName, unit, period, sport, ageGroup }
// (null = closed).
//
// Strava's terms: aggregated totals only, never another member's raw
// activity detail, and their mark stays visible — the card says the data
// came from Strava.
// ============================================================================

const POST = { width: 1080, height: 1350 };
const STORY = { width: 1080, height: 1920 };

const PLACE = {
  1: { label: "1st", accent: "#ffc14d", ribbon: "Champion" },
  2: { label: "2nd", accent: "#d8dbe4", ribbon: "Runner-up" },
  3: { label: "3rd", accent: "#e0975a", ribbon: "Third place" },
};

const font = (ctx, size, weight = 600) => {
  ctx.font = `${weight} ${size}px "Inter", "Helvetica Neue", Arial, sans-serif`;
};

function wrap(ctx, text, maxWidth) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  if (!words.length) return [""];
  const lines = [];
  let line = words[0];
  for (const word of words.slice(1)) {
    const next = `${line} ${word}`;
    if (ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  lines.push(line);
  return lines;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCard(canvas, card, format) {
  const { width, height } = format === "story" ? STORY : POST;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  const left = 80;
  const textWidth = width - left * 2;
  const place = PLACE[card.rank] || PLACE[3];

  // Background — the same purple/orange the lab pages use.
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, "#2a1a52");
  bg.addColorStop(0.55, "#45267f");
  bg.addColorStop(1, "#1a0f33");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Loose contour lines, so an empty card still has some texture.
  ctx.strokeStyle = "rgba(255,255,255,.06)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 9; i++) {
    ctx.beginPath();
    ctx.moveTo(-100, 260 + i * 34);
    ctx.bezierCurveTo(300, -40 + i * 60, 640, 620 + i * 28, 1200, 140 + i * 42);
    ctx.stroke();
  }

  const glow = ctx.createRadialGradient(width * 0.82, height * 0.18, 0, width * 0.82, height * 0.18, width * 0.7);
  glow.addColorStop(0, "rgba(247,107,28,.26)");
  glow.addColorStop(1, "rgba(247,107,28,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  ctx.textBaseline = "top";

  // --- Masthead ---
  ctx.fillStyle = "#ffffff";
  font(ctx, 74, 800);
  ctx.fillText("RTG", left, 80);
  font(ctx, 34, 600);
  ctx.fillStyle = "rgba(255,255,255,.85)";
  ctx.fillText("CLUB LAB", left + 150, 104);
  ctx.fillStyle = "#ffb17c";
  font(ctx, 25, 600);
  ctx.fillText(String(card.sport || "").toUpperCase(), left, 170);
  ctx.fillStyle = "#fe7b39";
  ctx.fillRect(left, 214, 88, 5);
  ctx.fillStyle = "#82b7ff";
  ctx.fillRect(left + 99, 214, 36, 5);

  // --- Place badge ---
  const badgeY = format === "story" ? 420 : 300;
  ctx.fillStyle = place.accent;
  roundRect(ctx, left, badgeY, 250, 86, 43);
  ctx.fill();
  ctx.fillStyle = "#1a0f33";
  font(ctx, 44, 800);
  ctx.fillText(place.label, left + 34, badgeY + 20);
  font(ctx, 24, 700);
  ctx.fillText(place.ribbon.toUpperCase(), left + 118, badgeY + 32);

  // --- Name ---
  let y = badgeY + 140;
  ctx.fillStyle = "#ffffff";
  font(ctx, 92, 800);
  const nameLines = wrap(ctx, card.name, textWidth).slice(0, 2);
  for (const line of nameLines) {
    ctx.fillText(line, left, y);
    y += 104;
  }

  // --- Supporting detail ---
  if (card.detail) {
    ctx.fillStyle = "rgba(255,255,255,.7)";
    font(ctx, 32, 500);
    ctx.fillText(card.detail, left, y + 6);
    y += 60;
  }

  // --- The number ---
  y += 40;
  ctx.fillStyle = "#ffb17c";
  font(ctx, 28, 700);
  ctx.fillText(String(card.metricName || "").toUpperCase(), left, y);
  y += 46;
  ctx.fillStyle = "#ffffff";
  font(ctx, 150, 800);
  ctx.fillText(card.value, left, y);
  const valueWidth = ctx.measureText(card.value).width;
  ctx.fillStyle = "rgba(255,255,255,.75)";
  font(ctx, 48, 600);
  ctx.fillText(card.unit, left + valueWidth + 20, y + 86);

  // --- Footer: period + attribution ---
  const footY = height - 180;
  ctx.fillStyle = "rgba(255,255,255,.14)";
  ctx.fillRect(left, footY - 34, textWidth, 2);
  ctx.fillStyle = "rgba(255,255,255,.82)";
  font(ctx, 30, 600);
  ctx.fillText(card.period, left, footY);
  ctx.fillStyle = "rgba(255,255,255,.55)";
  font(ctx, 24, 500);
  ctx.fillText("Powered by Strava", left, footY + 48);
}

export default function StravaCardMaker({ request, onClose }) {
  const canvasRef = useRef(null);
  const [format, setFormat] = useState("post");
  const [output, setOutput] = useState(null);
  const [status, setStatus] = useState("");

  const card = useMemo(() => {
    if (!request) return null;
    const { athlete, rank, metricName, unit, period, sport, ageGroup } = request;
    return {
      rank,
      name: athlete.name,
      detail: [athlete.city, ageGroup].filter(Boolean).join(" · "),
      metricName,
      unit,
      value: String(athlete.displayValue),
      period,
      sport,
    };
  }, [request]);

  // Redraw whenever the card or the format changes, and keep a blob around
  // so Download and Share both have something ready the instant they're
  // pressed.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!request || !card || !canvas) return;
    let cancelled = false;
    setStatus("");
    drawCard(canvas, card, format);
    canvas.toBlob((blob) => {
      if (cancelled || !blob) return;
      const filename = `rtg-club-lab-${card.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${card.rank}.png`;
      const file = typeof File === "function" ? new File([blob], filename, { type: "image/png" }) : null;
      setOutput((prev) => {
        if (prev?.url) URL.revokeObjectURL(prev.url);
        return { url: URL.createObjectURL(blob), filename, file };
      });
    }, "image/png");
    return () => {
      cancelled = true;
    };
  }, [request, card, format]);

  // Release the last object URL when the dialog closes.
  useEffect(() => {
    if (request) return;
    setOutput((prev) => {
      if (prev?.url) URL.revokeObjectURL(prev.url);
      return null;
    });
  }, [request]);

  const download = () => {
    if (!output) return;
    const link = document.createElement("a");
    link.href = output.url;
    link.download = output.filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Instagram has no web "post this" API, so the honest path is the OS
  // share sheet — which lists Instagram on a phone — and a plain download
  // everywhere else.
  const share = async () => {
    if (!output) return;
    try {
      if (!output.file || !navigator.canShare?.({ files: [output.file] })) throw new Error("unavailable");
      await navigator.share({ files: [output.file], title: `RTG Club Lab · ${card.name}` });
    } catch (failure) {
      if (failure.name !== "AbortError") {
        setStatus("Sharing isn't available on this device — the card has downloaded instead.");
        download();
      }
    }
  };

  const size = format === "story" ? STORY : POST;

  return (
    <LabDialog open={Boolean(request)} onClose={onClose} scope="rtg-lab" className="lab-card-dialog" labelledBy="lab-card-title">
      <button type="button" className="close" onClick={onClose} aria-label="Close">
        ×
      </button>
      <div className="eyebrow">
        <i />
        Winner card
      </div>
      <h2 id="lab-card-title">Share the result</h2>
      <p className="lab-card-summary">{card ? `${card.name} · ${card.period}` : ""}</p>

      <div className="lab-card-layout">
        <div className="lab-card-preview">
          <canvas
            ref={canvasRef}
            role="img"
            aria-label={card ? `${card.name}, ${PLACE[card.rank]?.ribbon}, ${card.value} ${card.unit}` : ""}
            width={size.width}
            height={size.height}
          />
        </div>

        <div className="lab-card-controls">
          <div className="lab-card-formats" role="group" aria-label="Card format">
            <button type="button" className={format === "post" ? "is-on" : ""} onClick={() => setFormat("post")}>
              Post 4:5
            </button>
            <button type="button" className={format === "story" ? "is-on" : ""} onClick={() => setFormat("story")}>
              Story 9:16
            </button>
          </div>

          <div className="modal-actions">
            <button type="button" className="button" onClick={download} disabled={!output}>
              Download card
            </button>
            <button type="button" className="outline" onClick={share} disabled={!output}>
              Share
            </button>
          </div>

          {status && <p className="lab-card-status">{status}</p>}
          <p className="lab-card-note">Made on your device and never uploaded. Totals come from Strava.</p>
        </div>
      </div>
    </LabDialog>
  );
}
