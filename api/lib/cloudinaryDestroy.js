import { createHash } from "node:crypto";

// Cloudinary asset URLs look like:
//   https://res.cloudinary.com/<cloud>/<resourceType>/upload/v169.../<folder>/<publicId>.<ext>
// The destroy API needs the public_id (folder + filename, no extension, no
// version) and the resource type — both are recoverable straight from the
// URL we already store, so nothing extra needs to be saved alongside it.
export function parseCloudinaryUrl(url) {
  const m = String(url || "").match(
    /res\.cloudinary\.com\/[^/]+\/(image|video|raw)\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-zA-Z0-9]+)?$/
  );
  if (!m) return null;
  return { resourceType: m[1], publicId: m[2] };
}

// Deletes one asset from Cloudinary. Resolves quietly if Cloudinary already
// doesn't have it (treated as success, not an error) — the goal is "this
// asset is gone," which is already true either way.
export async function destroyCloudinaryAsset(url) {
  const parsed = parseCloudinaryUrl(url);
  if (!parsed) {
    throw new Error("Not a Cloudinary-hosted URL — nothing to delete there.");
  }
  const { resourceType, publicId } = parsed;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary isn't configured.");
  }

  const timestamp = Math.round(Date.now() / 1000);
  const paramsToSign = { public_id: publicId, timestamp };
  const toSign = Object.keys(paramsToSign)
    .sort()
    .map((k) => `${k}=${paramsToSign[k]}`)
    .join("&");
  const signature = createHash("sha1").update(toSign + apiSecret).digest("hex");

  const body = new URLSearchParams({
    public_id: publicId,
    timestamp: String(timestamp),
    api_key: apiKey,
    signature,
  });

  const resp = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/destroy`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await resp.json().catch(() => ({}));
  if (data.result !== "ok" && data.result !== "not found") {
    throw new Error(data.result || "Cloudinary refused the delete.");
  }
  return data;
}
