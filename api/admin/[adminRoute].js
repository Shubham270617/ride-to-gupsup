import ridge from "../../api-lib/admin/ridge.js";
import stravaResync from "../../api-lib/admin/strava-resync.js";
import pageLayouts from "../../api-lib/pageLayouts.js";

// A single deployable function, preserving existing public request paths.
// Dispatch from the literal origin-form pathname, NEVER req.query.action:
// a caller-supplied query must not override a dynamic path parameter. Do not
// decode or URL-normalize traversal/encoded separators into accepted routes.
// Keep the dynamic parameter named adminRoute: layout operations already use
// the independent ?action=published|draft query field.
const ROUTES = Object.freeze({
  "/api/admin/ridge": ridge,
  "/api/admin/strava-resync": stravaResync,
  "/api/admin/page-layouts": pageLayouts,
});

export default async function handler(req, res) {
  const pathname = typeof req.url === "string" ? req.url.split("?", 1)[0] : "";
  const route = Object.hasOwn(ROUTES, pathname) ? ROUTES[pathname] : null;
  if (!route) {
    res.status(404).json({ error: "unknown_admin_route" });
    return;
  }
  // The original handler owns method validation, requireAdmin, body validation,
  // idempotency/version checks and all operation-specific policy. No bypass.
  return route(req, res);
}
