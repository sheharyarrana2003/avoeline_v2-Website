/** Build a minimal .ics calendar invite for interview scheduling. */

function icsEscape(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function toIcsUtc(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T` +
    `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

export function buildInterviewIcs(input: {
  title: string;
  description?: string;
  startsAt: string;
  durationMinutes?: number;
  location?: string;
  url?: string;
}): string {
  const start = toIcsUtc(input.startsAt);
  const endMs = new Date(input.startsAt).getTime() + (input.durationMinutes ?? 45) * 60_000;
  const end = toIcsUtc(new Date(endMs).toISOString());
  const uid = `interview-${start}@avoeline`;
  const desc = [input.description, input.url].filter(Boolean).join("\\n");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Avoeline//Recruitment//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${toIcsUtc(new Date().toISOString())}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${icsEscape(input.title)}`,
  ];
  if (desc) lines.push(`DESCRIPTION:${icsEscape(desc.replace(/\\n/g, "\n"))}`);
  if (input.location) lines.push(`LOCATION:${icsEscape(input.location)}`);
  if (input.url) lines.push(`URL:${input.url}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}

export function interviewIcsDataUrl(ics: string): string {
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}
