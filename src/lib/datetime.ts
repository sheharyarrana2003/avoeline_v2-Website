/**
 * Shared date/time formatting for the whole app.
 *
 * Canonical display formats:
 *   - dates  -> DD/MM/YYYY
 *   - times  -> h:mm AM/PM (12-hour)
 *
 * These helpers accept the many shapes dates arrive in across the codebase:
 * JS `Date`, legacy serialized `{ seconds }` / `{ _seconds }` shapes (and any
 * leftover `{ toDate() }` objects), ISO strings (`2026-07-21`,
 * `2026-07-21T10:00:00Z`), slash dates (`DD/MM/YYYY` or legacy `MM/DD/YYYY`),
 * and bare `HH:mm` / `hh:mm AM/PM` time strings.
 *
 * Note on slash dates: new events store DD/MM/YYYY, but some existing rows were
 * saved as MM/DD/YYYY. We disambiguate with a swap heuristic (see toDate) —
 * a value where one part is > 12 is unambiguous; a fully-ambiguous value like
 * `08/10/2026` is interpreted under the DD/MM convention.
 */

const EMPTY = "—";

const MONTH_ABBR = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

type Timestampish = { toDate?: () => Date; seconds?: number; _seconds?: number };

/**
 * Coerce any supported value into a JS Date, or null if unparseable.
 *
 * Exported because comparing and bucketing dates is as common as formatting them,
 * and callers that needed a Date were reaching for `new Date(x)` instead. That
 * silently produces `Invalid Date` for a legacy serialized `{seconds}` shape —
 * which is what every booking carries when a service skips its read-mapper — and
 * the resulting NaN comparison is always false, so revenue totals and "last 7 days"
 * filters came back empty with no error anywhere. Use this for any stored value;
 * never `new Date(x)`.
 */
export function toDate(value: unknown): Date | null {
  if (value == null || value === "") return null;

  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  // Legacy serialized {seconds} / {toDate()} shapes.
  if (typeof value === "object") {
    const ts = value as Timestampish;
    if (typeof ts.toDate === "function") {
      const d = ts.toDate();
      return d instanceof Date && !isNaN(d.getTime()) ? d : null;
    }
    const secs = ts.seconds ?? ts._seconds;
    if (typeof secs === "number") {
      const d = new Date(secs * 1000);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  }

  if (typeof value === "number") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  if (typeof value !== "string") return null;
  const str = value.trim();
  if (!str) return null;

  // Slash date: DD/MM/YYYY or legacy MM/DD/YYYY (optionally with a time part).
  if (str.includes("/")) {
    const [datePart, timePart] = str.split(/[ T]/, 2);
    const parts = datePart.split("/");
    if (parts.length === 3) {
      const a = parseInt(parts[0], 10);
      const b = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      if (!isNaN(a) && !isNaN(b) && !isNaN(year)) {
        // Disambiguate: a part that can't be a month (>12) must be the day.
        // If the first part is >12 it's DD/MM; if the second is >12 it's MM/DD;
        // otherwise treat as DD/MM (the canonical convention).
        let day: number;
        let month: number;
        if (b > 12 && a <= 12) {
          day = b;
          month = a;
        } else {
          day = a;
          month = b;
        }
        const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}${
          timePart ? `T${normalizeTimeToken(timePart)}` : "T00:00"
        }`;
        const d = new Date(iso);
        return isNaN(d.getTime()) ? null : d;
      }
    }
    return null;
  }

  // Date-only ISO (YYYY-MM-DD): parse as LOCAL midnight. `new Date("2026-07-21")`
  // would parse as UTC midnight and shift a day in negative-offset timezones.
  const isoDateOnly = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDateOnly) {
    const d = new Date(
      parseInt(isoDateOnly[1], 10),
      parseInt(isoDateOnly[2], 10) - 1,
      parseInt(isoDateOnly[3], 10),
    );
    return isNaN(d.getTime()) ? null : d;
  }

  // ISO datetime (or anything else Date can parse).
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

/** Turn a loose time token ("5:00 PM", "17:00", "9") into "HH:mm". */
function normalizeTimeToken(token: string): string {
  const m = token.trim().match(/^(\d{1,2})(?::(\d{1,2}))?\s*([AaPp][Mm])?/);
  if (!m) return "00:00";
  let hour = parseInt(m[1], 10);
  const minute = m[2] ? parseInt(m[2], 10) : 0;
  const meridiem = m[3]?.toUpperCase();
  if (meridiem === "PM" && hour < 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;
  if (isNaN(hour) || hour > 23 || minute > 59) return "00:00";
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** Format a Date's clock time as "h:mm AM/PM". */
function formatClock(date: Date): string {
  let hour = date.getHours();
  const minute = date.getMinutes();
  const meridiem = hour >= 12 ? "PM" : "AM";
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${hour}:${String(minute).padStart(2, "0")} ${meridiem}`;
}

/** DD/MM/YYYY. Returns "—" for empty/unparseable input. */
export function formatDate(value: unknown): string {
  const d = toDate(value);
  if (!d) return EMPTY;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getFullYear()}`;
}

/**
 * 12-hour time, "h:mm AM/PM". Accepts bare time strings ("17:00", "5:00 PM")
 * as well as Date or legacy `{seconds}` shapes. Returns "—" for empty/unparseable input.
 */
export function formatTime(value: unknown): string {
  if (value == null || value === "") return EMPTY;

  // Bare time string (no date component).
  if (
    typeof value === "string" &&
    !value.includes("/") &&
    !value.includes("-") &&
    !value.includes("T")
  ) {
    const hhmm = normalizeTimeToken(value);
    const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10));
    const probe = new Date(2000, 0, 1, h, m);
    return formatClock(probe);
  }

  const d = toDate(value);
  return d ? formatClock(d) : EMPTY;
}

/** DD/MM/YYYY, h:mm AM/PM. Returns "—" for empty/unparseable input. */
export function formatDateTime(value: unknown): string {
  const d = toDate(value);
  if (!d) return EMPTY;
  return `${formatDate(d)}, ${formatClock(d)}`;
}

/**
 * Combine a schedule date (DD/MM/YYYY, or any format `toDate` accepts) with a
 * time string (12h "10:00 AM" or 24h "17:00") into a JS Date pinned to PKT
 * (UTC+5), so event timing is unambiguous regardless of server timezone.
 * This replaces the removed stored eventStartTime/eventEndTime timestamps.
 * Returns null when the date is missing/unparseable.
 */
export function parseScheduleDateTime(dateStr: unknown, timeStr: unknown): Date | null {
  const d = toDate(dateStr);
  if (!d) return null;
  const hhmm =
    typeof timeStr === "string" && timeStr.trim() ? normalizeTimeToken(timeStr) : "00:00";
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const iso = `${y}-${mo}-${day}T${hhmm}:00+05:00`;
  const out = new Date(iso);
  return isNaN(out.getTime()) ? null : out;
}

/**
 * Serialize any supported date value (legacy `{seconds}` shape, Date, ISO/slash
 * string, epoch number) to an ISO string, or null if empty/unparseable.
 * Use this in Supabase read-mappers so server-fetched rows stay plain and
 * serializable across the Server→Client Component boundary (a raw class-instance
 * date object cannot be passed to a Client Component).
 */
export function toIsoString(value: unknown): string | null {
  const d = toDate(value);
  return d ? d.toISOString() : null;
}

/**
 * ISO `yyyy-mm-dd` for a form field, from anything `toDate` understands.
 *
 * The inverse of `formatDate`, and NOT `toIsoString(x).slice(0, 10)` -- that
 * goes through `toISOString()`, which is UTC, so a stored `10/12/2026` parsed
 * as local midnight comes back as `2026-12-09` anywhere east of Greenwich. This
 * server runs in PKT, so the naive version is wrong by a day every time.
 *
 * Use this to populate `<DateField value=...>` when editing a stored
 * DD/MM/YYYY date.
 */
export function toIsoDate(value: unknown): string {
  const d = toDate(value);
  if (!d) return "";
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

/** "12 Aug 2026" style medium date, used where a compact label reads better. */
export function formatDateMedium(value: unknown): string {
  const d = toDate(value);
  if (!d) return EMPTY;
  return `${String(d.getDate()).padStart(2, "0")} ${MONTH_ABBR[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Relative label for recent activity: "Just now", "3 minutes ago", "2 hours ago",
 * "4 days ago". Past a week the relative form stops being useful, so it falls back
 * to the canonical DD/MM/YYYY date. A future timestamp (clock skew between the
 * server that wrote it and the one reading it) reads as "Just now" rather than a
 * negative count. Returns "—" for empty/unparseable input.
 *
 * Sentence case on purpose. Screens that want it shouted (the notification feed)
 * already carry a `uppercase` class, so casing is the stylesheet's business and
 * this returns something readable everywhere else.
 */
export function timeAgo(value: unknown): string {
  const d = toDate(value);
  if (!d) return EMPTY;

  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} minute${mins > 1 ? "s" : ""} ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;

  return formatDate(d);
}

/** Parts of an instant as wall-clock numbers in `timeZone`. */
function zonedParts(
  date: Date,
  timeZone: string,
): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const bag: Record<string, string> = {};
  for (const p of dtf.formatToParts(date)) {
    if (p.type !== "literal") bag[p.type] = p.value;
  }
  return {
    year: Number(bag.year),
    month: Number(bag.month),
    day: Number(bag.day),
    hour: Number(bag.hour),
    minute: Number(bag.minute),
    second: Number(bag.second),
  };
}

/** Offset (ms) such that `utcMs + offset` ≈ wall time in `timeZone` as UTC components. */
function tzOffsetMs(utcMs: number, timeZone: string): number {
  const p = zonedParts(new Date(utcMs), timeZone);
  const asIfUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asIfUtc - utcMs;
}

/**
 * Convert a `datetime-local` value (`YYYY-MM-DDTHH:mm`) in the event timezone to a UTC ISO string.
 * Empty / invalid → null. Never returns slash dates.
 */
export function fromEventLocalInput(local: string, timeZone = "UTC"): string | null {
  const raw = String(local || "").trim();
  if (!raw) return null;
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const h = Number(m[4]);
  const mi = Number(m[5]);
  const s = Number(m[6] ?? 0);
  if (![y, mo, d, h, mi, s].every((n) => Number.isFinite(n))) return null;
  const tz = timeZone.trim() || "UTC";
  let utc = Date.UTC(y, mo - 1, d, h, mi, s);
  const off1 = tzOffsetMs(utc, tz);
  utc = Date.UTC(y, mo - 1, d, h, mi, s) - off1;
  const off2 = tzOffsetMs(utc, tz);
  if (off2 !== off1) utc = Date.UTC(y, mo - 1, d, h, mi, s) - off2;
  const out = new Date(utc);
  return Number.isNaN(out.getTime()) ? null : out.toISOString();
}

/**
 * Format a UTC ISO / Date for a `datetime-local` input in the event timezone.
 */
export function toEventLocalInput(value: unknown, timeZone = "UTC"): string {
  const d = toDate(value);
  if (!d) return "";
  const tz = timeZone.trim() || "UTC";
  const p = zonedParts(d, tz);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}T${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
}

/**
 * Exact stamp to the second in the event timezone, e.g. `12/10/2026, 3:05:09 PM PKT`.
 */
export function formatExactSecond(value: unknown, timeZone = "UTC"): string {
  const d = toDate(value);
  if (!d) return EMPTY;
  const tz = timeZone.trim() || "UTC";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
      timeZoneName: "short",
    }).format(d);
  } catch {
    return formatDateTime(d);
  }
}
