import { isDeepStrictEqual } from "node:util";
import { requireAdmin } from "../requireAdmin.js";
import { applyRidgeCommand } from "../../src/lib/ridge/engine.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!["GET", "POST"].includes(req.method))
    return res.status(405).json({ error: "Method not allowed." });
  const auth = await requireAdmin(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
  const db = auth.supabaseAdmin;
  const { data: workspace, error } = await db
    .from("ridge_workspace")
    .select("state,version")
    .eq("singleton", true)
    .single();
  if (error || !workspace)
    return res
      .status(503)
      .json({
        error:
          "The native Ridge database is not installed yet. No timing or changes have been saved.",
      });
  if (req.method === "GET") {
    const { data: audit, error: auditError } = await db
      .from("ridge_audit")
      .select("id,version,actor_id,action,details,created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (auditError)
      return res
        .status(503)
        .json({ error: "Could not load the Ridge audit log." });
    return res.status(200).json({ ...workspace, audit });
  }
  const body = req.body;
  if (
    !body ||
    typeof body !== "object" ||
    !Number.isSafeInteger(body.version) ||
    !/^[0-9a-f-]{36}$/i.test(body.requestId || "") ||
    JSON.stringify(body).length > 20000
  )
    return res.status(400).json({ error: "Invalid Ridge request." });
  // A successful request can be retried after the response is lost, but its
  // id cannot be reused for a different action or by another administrator.
  const { data: prior, error: priorError } = await db
    .from("ridge_audit")
    .select("version,actor_id,details")
    .eq("request_id", body.requestId)
    .maybeSingle();
  if (priorError)
    return res
      .status(503)
      .json({ error: "Could not check whether this action was saved." });
  if (prior) {
    if (
      prior.actor_id !== auth.user.id ||
      !isDeepStrictEqual(prior.details.command, body.command)
    )
      return res
        .status(409)
        .json({ error: "This request ID was used for a different action." });
    return res
      .status(200)
      .json({ ok: true, version: prior.version, alreadySaved: true });
  }
  if (body.version !== workspace.version)
    return res
      .status(409)
      .json({
        error:
          "Another change was saved. Refresh the records before trying again.",
      });
  let result;
  try {
    result = applyRidgeCommand(workspace.state, body.command);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
  const { data, error: commitError } = await db.rpc("ridge_commit", {
    p_expected: body.version,
    p_request: body.requestId,
    p_actor: auth.user.id,
    p_state: result.state,
    p_feed: result.feed,
    p_audit: result.audit,
  });
  if (commitError) {
    if (commitError.code === "40001" || commitError.code === "23505")
      return res
        .status(409)
        .json({
          error: "Another change was saved. Refresh before trying again.",
        });
    console.error("[ridge] commit failed", commitError.code);
    return res
      .status(503)
      .json({
        error:
          "Could not save this action. Refresh to check its status before retrying.",
      });
  }
  return res.status(200).json({ ok: true, version: data });
}

