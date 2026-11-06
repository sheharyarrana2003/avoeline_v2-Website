/** Pure ICS / Google Calendar TEMPLATE helpers (unit-testable). */

export function sanitizeCalendarText(value: string, max = 500): string {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n")
    .slice(0, max);
}

export function sanitizeHeaderValue(value: string, max = 200): string {
  return String(value || "")
    .replace(/[\r\n\u0000]/g, " ")
    .trim()
    .slice(0, max);
}

export function toUtcStamp(d: Date): string {
  return d
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

export type CalendarFallbackInput = {
  uid: string;
  title: string;
  description?: string;
  location?: string;
  url?: string;
  start: Date;
  end: Date;
};

export function buildIcs(input: CalendarFallbackInput): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Avoeline//Event//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${sanitizeHeaderValue(input.uid, 120)}@avoeline`,
    `DTSTAMP:${toUtcStamp(new Date())}`,
    `DTSTART:${toUtcStamp(input.start)}`,
    `DTEND:${toUtcStamp(input.end)}`,
    `SUMMARY:${sanitizeCalendarText(input.title)}`,
    input.description ? `DESCRIPTION:${sanitizeCalendarText(input.description, 2000)}` : null,
    input.location ? `LOCATION:${sanitizeCalendarText(input.location)}` : null,
    input.url ? `URL:${sanitizeCalendarText(input.url, 1000)}` : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  return lines.join("\r\n");
}

/** Google Calendar “Add to calendar” URL (no OAuth). */
export function googleCalendarTemplateUrl(input: CalendarFallbackInput): string {
  const fmt = (d: Date) => toUtcStamp(d);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: sanitizeHeaderValue(input.title),
    dates: `${fmt(input.start)}/${fmt(input.end)}`,
  });
  if (input.description) params.set("details", sanitizeHeaderValue(input.description, 1000));
  if (input.location) params.set("location", sanitizeHeaderValue(input.location));
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function stableMeetRequestId(
  connectionId: string,
  entityType: string,
  entityId: string,
): string {
  // Google requestId max ~64 chars; keep deterministic for retries.
  const raw = `${connectionId}:${entityType}:${entityId}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) hash = (hash * 31 + raw.charCodeAt(i)) >>> 0;
  return `avl-${hash.toString(16)}-${entityType.slice(0, 8)}`.slice(0, 64);
}

export function displayInTimeZone(iso: string, timeZone: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      timeZone,
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return new Date(iso).toLocaleString();
  }
}
