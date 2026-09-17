const BUCKET = "rtg-media";
const PUBLIC_URL_MARKER = `/storage/v1/object/public/${BUCKET}/`;

// Extracts the storage path from a public "rtg-media" URL — mirrors
// pathFromUrl() in src/lib/supabaseUpload.js, duplicated rather than shared
// because that file uses browser-only APIs (XMLHttpRequest, canvas) this
// Node serverless function can't import.
function pathFromUrl(url) {
  const idx = String(url || "").indexOf(PUBLIC_URL_MARKER);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + PUBLIC_URL_MARKER.length));
}

// Deletes one file from the "rtg-media" bucket using the service-role
// client (bypasses RLS — this runs from the daily cron, not a user
// session). Resolves quietly if the URL isn't Supabase-Storage-hosted or
// the file's already gone.
export async function destroyStorageAsset(supabaseAdmin, url) {
  const path = pathFromUrl(url);
  if (!path) return;
  const { error } = await supabaseAdmin.storage.from(BUCKET).remove([path]);
  if (error) throw new Error(error.message || "Storage refused the delete.");
}
