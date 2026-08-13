import { supabase } from "../lib/supabaseClient";

// Cloudinary's free plan caps a single image upload at 10MB. Raw camera
// photos routinely blow past that (and would be needlessly slow to load on
// the actual site anyway), so shrink oversized images in the browser before
// they're sent — videos are left untouched (Cloudinary allows up to 100MB
// for those, and re-encoding video in the browser is a much heavier problem
// than this needs to solve).
const CLOUDINARY_IMAGE_LIMIT = 10 * 1024 * 1024;
const CLOUDINARY_VIDEO_LIMIT = 100 * 1024 * 1024;
const RESIZE_TRIGGER_BYTES = 9 * 1024 * 1024;
const MAX_DIMENSION = 2400;

function formatMB(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(0)}MB`;
}

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

// Does the actual browser-to-Cloudinary transfer via XMLHttpRequest instead
// of fetch() — fetch has no upload-progress event, XHR does, and that's what
// powers the live progress bar in the admin UI.
function xhrUpload(url, formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(e.loaded / e.total);
      };
    }
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) resolve(data);
        else reject(new Error(data.error?.message || "Upload to Cloudinary failed."));
      } catch {
        reject(new Error("Upload to Cloudinary failed."));
      }
    };
    // Fires on a genuine network failure (dropped connection, CORS block,
    // DNS error) — this is what a raw "Failed to fetch" was surfacing before
    // with no explanation, usually really a doomed-from-the-start oversized
    // upload rather than an actual connectivity problem.
    xhr.onerror = () => reject(new Error("Upload failed — check your connection and try again."));
    xhr.send(formData);
  });
}

// Uploads a file straight to Cloudinary from the browser — the file itself
// never passes through our server, only a short-lived signature does (see
// api/cloudinary/sign.js). Works for both images and videos (resource_type
// "auto" lets Cloudinary figure out which). onProgress (0..1) is optional,
// for driving a progress bar in the UI.
export async function uploadToCloudinary(file, folder = "uploads", onProgress) {
  if (file.type.startsWith("video/") && file.size > CLOUDINARY_VIDEO_LIMIT) {
    throw new Error(
      `This video is ${formatMB(file.size)} — the maximum is ${formatMB(CLOUDINARY_VIDEO_LIMIT)}. Compress it first, then try again.`
    );
  }

  const uploadFile = await resizeImageIfNeeded(file);
  if (uploadFile.type.startsWith("image/") && uploadFile.size > CLOUDINARY_IMAGE_LIMIT) {
    throw new Error("This image is too large even after compression — try a smaller photo.");
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) throw new Error("You're not logged in.");

  const signRes = await fetch("/api/cloudinary/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ folder }),
  });

  if (!signRes.ok) {
    const err = await signRes.json().catch(() => ({}));
    const messages = {
      not_admin: "Only admins can upload media.",
      cloudinary_not_configured: "Cloudinary isn't set up yet — check api/.env.local.",
      invalid_session: "Your session expired — please log in again.",
    };
    throw new Error(messages[err.error] || "Couldn't start the upload.");
  }

  const { signature, timestamp, apiKey, cloudName, folder: signedFolder } = await signRes.json();

  const formData = new FormData();
  formData.append("file", uploadFile);
  formData.append("api_key", apiKey);
  formData.append("timestamp", timestamp);
  formData.append("signature", signature);
  formData.append("folder", signedFolder);

  const data = await xhrUpload(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, formData, onProgress);
  return { url: data.secure_url, resourceType: data.resource_type };
}
