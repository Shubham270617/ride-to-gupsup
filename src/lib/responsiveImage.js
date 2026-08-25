// Admin-uploaded photos (Cloudinary) and the placeholder stock photos
// (Unsplash) both support on-the-fly resizing via URL parameters — no
// separate mobile upload needed. This lets a phone download a phone-sized
// file instead of the same full-resolution photo a desktop gets, for the
// exact same source image an admin uploaded once.
function resizedUrl(url, width) {
  if (!url) return url;
  if (url.includes("res.cloudinary.com")) {
    // .../image/upload/v123/... -> .../image/upload/w_800,q_auto,f_auto,c_limit/v123/...
    // c_limit only shrinks — never upscales a photo smaller than `width`.
    return url.replace(/\/upload\//, `/upload/w_${width},q_auto,f_auto,c_limit/`);
  }
  if (url.includes("images.unsplash.com")) {
    try {
      const u = new URL(url);
      u.searchParams.set("w", String(width));
      u.searchParams.set("q", "75");
      return u.toString();
    } catch {
      return url;
    }
  }
  return url;
}

const isResizable = (url) => Boolean(url) && (url.includes("res.cloudinary.com") || url.includes("images.unsplash.com"));

// A ready-made srcSet for a full-bleed background/hero-style photo — small
// version for phones, large for desktop, browser picks based on viewport.
// Returns undefined for locally-bundled images (nothing to resize), so the
// <img> just falls back to its plain `src`.
export function heroSrcSet(url, { mobile = 800, tablet = 1400, desktop = 2000 } = {}) {
  if (!isResizable(url)) return undefined;
  return `${resizedUrl(url, mobile)} ${mobile}w, ${resizedUrl(url, tablet)} ${tablet}w, ${resizedUrl(url, desktop)} ${desktop}w`;
}

// The `src` to fall back to on browsers that ignore srcSet — sized for
// desktop since that's the safest default.
export function heroFallbackSrc(url, width = 2000) {
  return isResizable(url) ? resizedUrl(url, width) : url;
}
