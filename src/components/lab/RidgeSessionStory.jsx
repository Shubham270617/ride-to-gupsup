import { useEffect, useMemo, useRef, useState } from "react";
import LabDialog from "./LabDialog";
import { sessionAwards } from "../../lib/labData";

// Native session cards: export all ranked results in pages or all six awards.
export default function RidgeSessionStory({ feed, sessionSlug, onClose }) {
  const canvas = useRef(null);
  const [kind, setKind] = useState("results");
  const [page, setPage] = useState(0);
  const [error, setError] = useState("");
  const session = feed.sessions.find((s) => s.slug === sessionSlug);
  const ranked = useMemo(
    () =>
      (session?.riders || [])
        .slice()
        .sort(
          (a, b) =>
            b.ridgePoints - a.ridgePoints || a.name.localeCompare(b.name),
        ),
    [session],
  );
  const pages = Math.max(1, Math.ceil(ranked.length / 8));
  useEffect(() => {
    if (!canvas.current || !session) return;
    const ctx = canvas.current.getContext("2d");
    ctx.fillStyle = "#f4f0e8";
    ctx.fillRect(0, 0, 1080, 1920);
    ctx.fillStyle = "#2b153f";
    ctx.fillRect(0, 0, 1080, 385);
    const text = (
      value,
      x,
      y,
      size = 32,
      color = "#2b153f",
      weight = 500,
      max = 920,
    ) => {
      ctx.fillStyle = color;
      ctx.font = `${weight} ${size}px Arial, sans-serif`;
      ctx.fillText(String(value), x, y, max);
    };
    text("RTG  /  RIDE TEA GUPSHUP", 72, 100, 26, "#ffb56a", 700);
    text("RIDGE", 65, 205, 96, "#fff", 800);
    text("REPEATS.", 65, 304, 96, "#fff", 800);
    text(
      new Date(session.date + "T00:00:00Z").toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }),
      72,
      443,
      30,
    );
    text(
      kind === "results" ? "SESSION RESULTS" : "SESSION SPOTLIGHT",
      72,
      515,
      42,
      "#2b153f",
      800,
    );
    if (kind === "results") {
      const rows = ranked.slice(page * 8, page * 8 + 8);
      rows.forEach((r, i) => {
        const y = 585 + i * 142;
        ctx.fillStyle = "#fff";
        ctx.fillRect(64, y, 952, 122);
        text(
          String(page * 8 + i + 1).padStart(2, "0"),
          87,
          y + 53,
          30,
          "#ee782d",
          800,
          80,
        );
        text(r.name, 180, y + 48, 34, "#2b153f", 700, 570);
        text(
          `${r.laps} loops · ${r.progress === null ? "—" : r.progress.toFixed(2)} improvement pts`,
          180,
          y + 88,
          23,
          "#6c6475",
          500,
          570,
        );
        text(r.ridgePoints.toFixed(2), 820, y + 55, 36, "#2b153f", 800, 160);
        text("TOTAL PTS", 825, y + 87, 18, "#6c6475");
      });
      text(
        `PAGE ${page + 1} / ${pages}  ·  ${ranked.length} RIDERS`,
        72,
        1800,
        24,
        "#6c6475",
      );
    } else {
      sessionAwards(feed, sessionSlug).forEach((a, i) => {
        const y = 585 + i * 192;
        ctx.fillStyle = "#fff";
        ctx.fillRect(64, y, 952, 169);
        text(a.name.toUpperCase(), 88, y + 41, 23, "#ee782d", 700);
        text(
          a.winners.join(" / ") || "No eligible rider",
          88,
          y + 95,
          38,
          "#2b153f",
          700,
          890,
        );
        text(a.metric, 88, y + 137, 26, "#6c6475");
      });
    }
    text("YOU VS YOU.  EVERY SATURDAY.", 72, 1880, 25, "#2b153f", 800);
  }, [feed, session, sessionSlug, ranked, kind, page, pages]);
  const save = () => {
    setError("");
    try {
      canvas.current.toBlob((blob) => {
        if (!blob) {
          setError("Could not create this image. Please retry.");
          return;
        }
        const url = URL.createObjectURL(blob),
          a = document.createElement("a");
        a.href = url;
        a.download = `RTG-Ridge-${session.date}-${kind}-${page + 1}.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }, "image/png");
    } catch {
      setError("Could not export this image. Please retry.");
    }
  };
  if (!session) return null;
  return (
    <LabDialog
      open
      onClose={onClose}
      scope="rtg-ridge"
      className="rr-card-dialog"
      labelledBy="rr-session-story-title"
    >
      <div className="rr-dialog-header">
        <h2 id="rr-session-story-title">Session story</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close session story"
        >
          Close
        </button>
      </div>
      <p>Download native 1080 × 1920 cards for this session.</p>
      <div className="rr-session-story-controls">
        <label>
          Card{" "}
          <select
            value={kind}
            onChange={(e) => {
              setKind(e.target.value);
              setPage(0);
            }}
          >
            <option value="results">Session results</option>
            <option value="spotlight">Six Spotlight awards</option>
          </select>
        </label>
        {kind === "results" && pages > 1 && (
          <label>
            Page{" "}
            <select
              value={page}
              onChange={(e) => setPage(Number(e.target.value))}
            >
              {Array.from({ length: pages }, (_, i) => (
                <option value={i} key={i}>
                  {i + 1} of {pages}
                </option>
              ))}
            </select>
          </label>
        )}
        <button type="button" className="button purple" onClick={save}>
          Download PNG
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      <canvas
        ref={canvas}
        width={1080}
        height={1920}
        aria-label="Session story preview"
        style={{
          display: "block",
          width: "min(100%, 360px)",
          height: "auto",
          margin: "20px auto",
          borderRadius: 16,
        }}
      />
    </LabDialog>
  );
}
