import phoneLogin from "../../api-lib/phoneLogin.js";
import passwordReset from "../../api-lib/passwordReset.js";
import welcomeEmail from "../../api-lib/welcomeEmail.js";
import stravaRefresh from "../../api-lib/stravaRefresh.js";

// POST /api/auth/account?op=… — one serverless function for the account
// endpoints, because the Vercel Hobby plan allows only 12 functions per
// deployment and api/ is at that limit. Each op keeps its own file in
// api-lib/ and its own request/response shape:
//
//   op=phone-login     { phone, password }                 api-lib/phoneLogin.js
//   op=password-reset  { action: request|verify|complete } api-lib/passwordReset.js
//   op=welcome         Authorization: Bearer <session>     api-lib/welcomeEmail.js
//   op=strava-refresh  Authorization: Bearer <session>     api-lib/stravaRefresh.js
const OPS = {
  "phone-login": phoneLogin,
  "password-reset": passwordReset,
  welcome: welcomeEmail,
  "strava-refresh": stravaRefresh,
};

export default async function handler(req, res) {
  // Own keys only: a plain lookup would resolve ?op=constructor / toString /
  // hasOwnProperty to Object.prototype functions and call them as handlers.
  const name = req.query?.op;
  const op = typeof name === "string" && Object.hasOwn(OPS, name) ? OPS[name] : null;
  if (!op) {
    res.status(404).json({ error: "unknown_op" });
    return;
  }
  return op(req, res);
}
