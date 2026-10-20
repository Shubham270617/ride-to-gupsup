import { useState } from "react";
import "../../styles/ridge-dashboard.css";

// This is the existing published, read-only dashboard. Its Apps Script bridge
// reads official scores, corrections, photos and Spotlight from the timer app.
// Embedding it also preserves its story creator and future organiser updates.
export const RIDGE_DASHBOARD_URL = "https://script.google.com/a/rideteagupshup.com/macros/s/AKfycbyB4sxvmMM1Q7GercCBz1gYfLw9m_lJxJaG0qoLXsfvQLJ3lZojW3XxwtAYMOCWjYA6/exec?page=ridge";

export default function RidgeDashboard() {
  const [version, setVersion] = useState(0);
  const [opened, setOpened] = useState(false);
  const reload = () => {
    setOpened(false);
    setVersion((n) => n + 1);
  };

  return (
    <section className="ridge-dashboard" aria-label="Official Ridge Repeats dashboard">
      <div className="ridge-dashboard-toolbar">
        <p>Official results from the RTG Ridge Repeats timing system.</p>
        <div className="ridge-dashboard-actions">
          <button type="button" onClick={reload}>Reload dashboard</button>
          <a href={RIDGE_DASHBOARD_URL} target="_blank" rel="noopener noreferrer">
            Open full page <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
      {!opened && <p className="ridge-dashboard-loading" role="status">Opening Ridge dashboard…</p>}
      <iframe
        key={version}
        src={RIDGE_DASHBOARD_URL}
        title="Ridge Repeats leaderboard, rider records and Session Spotlight"
        className="ridge-dashboard-frame"
        allow="web-share; fullscreen"
        allowFullScreen
        onLoad={() => setOpened(true)}
      />
      <p className="ridge-dashboard-help">
        Scroll inside the dashboard for rider records, Spotlight and session stories.
        Use “Open full page” for more room or if your browser cannot display it here.
      </p>
    </section>
  );
}
