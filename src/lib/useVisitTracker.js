import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "./supabaseClient";

// Visitor statistics (Admin -> Visitors). Tells the database when a public
// page opens, then every 30 seconds while the tab is in view, so the admin
// can see how many people came, how many left straight away and who is on
// the site right now. See supabase/migrations/017_site_visits.sql.
//
// What is sent: a random id for this browser, a random id for this visit
// and the page's path. Nothing else — a logged-in member is recognised by
// the database from their login, not from anything sent here.

const VISITOR_KEY = "rtg-visitor";
const VISIT_KEY = "rtg-visit";
const HEARTBEAT_MS = 30000;
const BOT = /bot|crawl|spider|headless|lighthouse|preview/i;

const newId = () =>
  crypto.randomUUID
    ? crypto.randomUUID()
    : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16));

// The stored id, or a new one saved for next time. Null when the browser
// refuses storage (private mode) — that visit simply isn't counted.
function idFrom(storage, key) {
  try {
    let id = storage.getItem(key);
    if (!id) {
      id = newId();
      storage.setItem(key, id);
    }
    return id;
  } catch {
    return null;
  }
}

function send(path, newPage) {
  const visitor = idFrom(localStorage, VISITOR_KEY);
  const visit = idFrom(sessionStorage, VISIT_KEY);
  if (!visitor || !visit) return;
  // Counting visits must never get in the way of the page, so a failure
  // (offline, or the migration not run yet) is ignored.
  supabase.rpc("track_site_visit", { p_session: visit, p_visitor: visitor, p_path: path, p_new_page: newPage }).then(
    () => {},
    () => {}
  );
}

export default function useVisitTracker() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (!supabase || navigator.webdriver || BOT.test(navigator.userAgent)) return undefined;

    send(pathname, true);
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") send(pathname, false);
    }, HEARTBEAT_MS);
    return () => clearInterval(timer);
  }, [pathname]);
}
