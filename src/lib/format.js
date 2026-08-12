// Formats a plain rupee number (e.g. 500000) into a display string
// (e.g. "Prize Pool Worth ₹5,00,000"). Falls back gracefully for old
// free-text values that haven't been migrated to a number yet.
export function formatPrize(value) {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  return `Prize Pool Worth ₹${num.toLocaleString("en-IN")}`;
}
