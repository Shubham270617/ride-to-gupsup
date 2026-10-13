// The questions of RTG's community registration — asked once on /onboarding
// and editable afterwards on the member dashboard.
export const GENDERS = ["Male", "Female"];
export const RIDER_TYPES = ["Rider", "Runner", "Both"];
export const RIDE_FREQUENCIES = ["Daily", "4-5 times a week", "Weekends only", "Occasionally (1-2 times a week)", "Rarely (just starting)"];

// Completed years between a "yyyy-mm-dd" date of birth and today; "" for a
// date that is missing, in the future or not a real age.
export function ageFromDob(dob) {
  const [y, m, d] = (dob || "").split("-").map(Number);
  if (!y || !m || !d) return "";
  const now = new Date();
  let years = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) years -= 1;
  return years >= 0 && years <= 120 ? String(years) : "";
}
