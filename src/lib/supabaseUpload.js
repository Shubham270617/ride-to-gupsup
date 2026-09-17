import { supabase } from "./supabaseClient";

// Supabase Storage's free tier caps a single file at roughly 50MB. Images
// get shrunk in the browser before upload anyway (same as before), so this
// mainly matters for video — lower than Cloudinary's old 100MB ceiling.
const IMAGE_LIMIT = 10 * 1024 * 1024;
const VIDEO_LIMIT = 50 * 1024 * 1024;
const RESIZE_TRIGGER_BYTES = 9 * 1024 * 1024;
const MAX_DIMENSION = 2400;
const BUCKET = "rtg-media";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

function formatMB(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(0)}MB`;
}

// Unchanged from the old Cloudinary uploader — still worth shrinking large
// photos in the browser before they leave the device.
async function resizeImageIfNeeded(file) {
  if (!file.type.startsWith("image/") || file.size <= RESIZE_TRIGGER_BYTES) return file;

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d").drawImage(bitmap, 0, 0, width, height);

  let quality = 0.85;
  let blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  while (blob && blob.size > RESIZE_TRIGGER_BYTES && quality > 0.4) {
    quality -= 0.15;
    blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  }
  if (!blob) return file;

  const newName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], newName, { type: "image/jpeg" });
}

// Raw XHR (not the supabase-js client) so the upload progress bar keeps
// working — supabase-js's storage upload doesn't expose a progress event,
// XHR does. Uploads straight to Supabase's Storage REST endpoint with the
// caller's own access token; Postgres RLS (see supabase/schema.sql) decides
// whether the write is actually allowed — no signing step needed, unlike
// Cloudinary.
function xhrUpload(path, file, token, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", SUPABASE_ANON_KEY);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.setRequestHeader("x-upsert", "false");
    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(e.loaded / e.total);
      };
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        let message = "Upload failed.";
        try {
          message = JSON.parse(xhr.responseText).message || message;
        } catch {
          // ignore — keep the generic message
        }
        reject(new Error(message));
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed — check your connection and try again."));
    xhr.send(file);
  });
}

// Uploads a file to Supabase Storage's "rtg-media" bucket. `folder` groups
// files the same way Cloudinary's folders used to (e.g. "gallery",
// "products", "team"). Pass `ownAvatar: true` for a member uploading their
// own profile photo — this forces the path into "avatars/<their-user-id>/",
// the only place a non-admin is allowed to write (see schema.sql). onProgress
// (0..1) is optional, for a progress bar in the UI.
export async function uploadToSupabaseStorage(file, folder = "uploads", onProgress, { ownAvatar = false } = {}) {
  if (!supabase) throw new Error("Supabase isn't configured.");

  if (file.type.startsWith("video/") && file.size > VIDEO_LIMIT) {
    throw new Error(
      `This video is ${formatMB(file.size)} — the maximum is ${formatMB(VIDEO_LIMIT)}. ` +
        "Compress it first (free tool: HandBrake at handbrake.fr, or your phone's built-in \"share as smaller video\" option), then try uploading again."
    );
  }

  const uploadFile = await resizeImageIfNeeded(file);
  if (uploadFile.type.startsWith("image/") && uploadFile.size > IMAGE_LIMIT) {
    throw new Error("This image is too large even after compression — try a smaller photo.");
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("You're not logged in.");

  const cleanName = uploadFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const cleanFolder = folder.replace(/[^a-zA-Z0-9/_-]/g, "-");
  const path = ownAvatar ? `avatars/${session.user.id}/${unique}-${cleanName}` : `${cleanFolder}/${unique}-${cleanName}`;

  await xhrUpload(path, uploadFile, session.access_token, onProgress);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

// A "rtg-media"-hosted public URL looks like:
//   https://<project-ref>.supabase.co/storage/v1/object/public/rtg-media/<path>
const PUBLIC_URL_MARKER = `/storage/v1/object/public/${BUCKET}/`;

export function isSupabaseStorageUrl(url) {
  return typeof url === "string" && url.includes(PUBLIC_URL_MARKER);
}

function pathFromUrl(url) {
  const idx = String(url || "").indexOf(PUBLIC_URL_MARKER);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + PUBLIC_URL_MARKER.length));
}

// Deletes one file from the "rtg-media" bucket. Resolves quietly if it's
// not actually a Supabase Storage URL (nothing to delete there) or if the
// file's already gone — same "this asset being gone is the goal, and it
// already is" behavior the old Cloudinary delete had.
export async function deleteFromSupabaseStorage(url) {
  if (!supabase) throw new Error("Supabase isn't configured.");
  const path = pathFromUrl(url);
  if (!path) return;
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw new Error(error.message || "Couldn't delete the file.");
}
