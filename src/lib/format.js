// Formats a plain rupee number (e.g. 500000) into a display string
// (e.g. "Prize Pool Worth ₹5,00,000"). Falls back gracefully for old
// free-text values that haven't been migrated to a number yet.
export function formatPrize(value) {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  return `Prize Pool Worth ₹${num.toLocaleString("en-IN")}`;
}


// "RTG MTB Challenge 2026" -> ["RTG MTB", "Challenge 2026"]: two halves of a
// title, for designs that draw the second half differently (accent colour,
// second line). Uses `accent` when it's given and really is the end of the
// title; otherwise splits the words down the middle.
export function splitTitle(title = "", accent) {
  const wanted = (accent || "").trim();
  if (wanted && title.toLowerCase().endsWith(wanted.toLowerCase())) {
    return [title.slice(0, title.length - wanted.length).trim(), title.slice(title.length - wanted.length)];
  }
  const words = title.trim().split(/\s+/);
  if (words.length < 2) return [title, ""];
  const cut = Math.ceil(words.length / 2);
  return [words.slice(0, cut).join(" "), words.slice(cut).join(" ")];
}

// A product with no price yet (blank in Admin -> Store — Products) is shown
// as "to be announced" and can't be checked out.
export const hasPrice = (item) => Number(item?.price) > 0;

// 1799 -> "₹1,799"
export const formatRupees = (n) => `₹${Number(n).toLocaleString("en-IN")}`;
