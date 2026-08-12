import { supabase } from "../lib/supabaseClient";

// Uploads a file straight to Cloudinary from the browser — the file itself
// never passes through our server, only a short-lived signature does (see
// api/cloudinary/sign.js). Works for both images and videos (resource_type
// "auto" lets Cloudinary figure out which).
export async function uploadToCloudinary(file, folder = "uploads") {
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
  formData.append("file", file);
  formData.append("api_key", apiKey);
  formData.append("timestamp", timestamp);
  formData.append("signature", signature);
  formData.append("folder", signedFolder);

  const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
    method: "POST",
    body: formData,
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.json().catch(() => ({}));
    throw new Error(err.error?.message || "Upload to Cloudinary failed.");
  }

  const data = await uploadRes.json();
  return { url: data.secure_url, resourceType: data.resource_type };
}
