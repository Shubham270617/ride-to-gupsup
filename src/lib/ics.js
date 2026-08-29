// Generates a real .ics file client-side and triggers a download — opens
// directly in Google Calendar, Apple Calendar, Outlook, etc. No third-party
// service, no backend call, no ongoing cost.

function pad(n) {
  return String(n).padStart(2, "0");
}

function formatDateTimeUtc(date) {
  return (
    date.getUTCFullYear() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    "T" +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    "Z"
  );
}

function formatDateOnly(date) {
  return date.getFullYear() + pad(date.getMonth() + 1) + pad(date.getDate());
}

function escapeIcsText(text) {
  return String(text).replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
}

// Pass either { allDayDate } for a date-only event (one-off calendar entries
// only ever have a date, no time) or { start, end } Date objects for a
// timed event (weekly sessions, which do have a time-of-day).
export function downloadIcsFile({ title, description, location, allDayDate, start, end }) {
  const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@rideteagupshup.com`;
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Ride Tea GupShup//Calendar//EN", "BEGIN:VEVENT", `UID:${uid}`, `DTSTAMP:${formatDateTimeUtc(new Date())}`];

  if (allDayDate) {
    lines.push(`DTSTART;VALUE=DATE:${formatDateOnly(allDayDate)}`);
    const nextDay = new Date(allDayDate);
    nextDay.setDate(nextDay.getDate() + 1);
    lines.push(`DTEND;VALUE=DATE:${formatDateOnly(nextDay)}`);
  } else {
    lines.push(`DTSTART:${formatDateTimeUtc(start)}`);
    lines.push(`DTEND:${formatDateTimeUtc(end || start)}`);
  }

  lines.push(`SUMMARY:${escapeIcsText(title)}`);
  if (description) lines.push(`DESCRIPTION:${escapeIcsText(description)}`);
  if (location) lines.push(`LOCATION:${escapeIcsText(location)}`);
  lines.push("END:VEVENT", "END:VCALENDAR");

  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
