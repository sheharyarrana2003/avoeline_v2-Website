/**
 * Pure parse/serialize for `/organizer/[id]/analytics` searchParams ↔ filters.
 */

export const ANALYTICS_PRESETS = ["7", "30", "90", "year", "all", "custom"] as const;
export type AnalyticsPreset = (typeof ANALYTICS_PRESETS)[number];

export const PRESET_LABELS: Record<AnalyticsPreset, string> = {
  "7": "Last 7 days",
  "30": "Last 30 days",
  "90": "Last 90 days",
  year: "This year",
  all: "All time",
  custom: "Custom",
};

export type AnalyticsFilters = {
  preset: AnalyticsPreset;
  eventId: string | null;
  from: string | null;
  to: string | null;
};

export type AnalyticsDateRange = {
  from: Date;
  to: Date;
  /** Inclusive local day keys YYYY-MM-DD */
  fromKey: string;
  toKey: string;
  preset: AnalyticsPreset;
  /** Previous window of the same length (null when preset is all / unbounded). */
  previous: { from: Date; to: Date; fromKey: string; toKey: string } | null;
};

function emptyFilters(partial?: Partial<AnalyticsFilters>): AnalyticsFilters {
  return {
    preset: "30",
    eventId: null,
    from: null,
    to: null,
    ...partial,
  };
}

function getParam(
  sp: Record<string, string | string[] | undefined> | URLSearchParams,
  key: string,
): string | undefined {
  if (sp instanceof URLSearchParams) {
    const v = sp.get(key);
    return v ?? undefined;
  }
  const raw = sp[key];
  if (Array.isArray(raw)) return raw[0];
  return raw;
}

function parsePreset(raw: string | null | undefined): AnalyticsPreset {
  if (raw && (ANALYTICS_PRESETS as readonly string[]).includes(raw)) {
    return raw as AnalyticsPreset;
  }
  return "30";
}

/** YYYY-MM-DD only; invalid → null. */
export function parseIsoDay(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = String(raw)
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

export function localDayKey(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

export function startOfLocalDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

export function endOfLocalDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
}

export function parseDayToLocalDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
}

export function parseAnalyticsFilters(
  sp: Record<string, string | string[] | undefined> | URLSearchParams,
): AnalyticsFilters {
  const preset = parsePreset(getParam(sp, "range") ?? getParam(sp, "preset"));
  const eventRaw = getParam(sp, "event")?.trim() || null;
  const eventId = eventRaw && eventRaw !== "all" ? eventRaw : null;
  let from = parseIsoDay(getParam(sp, "from"));
  let to = parseIsoDay(getParam(sp, "to"));
  if (preset !== "custom") {
    from = null;
    to = null;
  }
  return emptyFilters({ preset, eventId, from, to });
}

export function serializeAnalyticsFilters(
  filters: AnalyticsFilters,
  overrides?: Partial<AnalyticsFilters>,
): string {
  const f = { ...filters, ...overrides };
  const params = new URLSearchParams();
  if (f.preset !== "30") params.set("range", f.preset);
  if (f.eventId) params.set("event", f.eventId);
  if (f.preset === "custom") {
    if (f.from) params.set("from", f.from);
    if (f.to) params.set("to", f.to);
  }
  return params.toString();
}

export function analyticsHref(
  basePath: string,
  filters: AnalyticsFilters,
  overrides?: Partial<AnalyticsFilters>,
): string {
  const qs = serializeAnalyticsFilters(filters, overrides);
  return qs ? `${basePath}?${qs}` : basePath;
}

/**
 * Resolve inclusive local date range from filters.
 * Default: last 30 days ending today (includes today).
 */
export function resolveAnalyticsDateRange(
  filters: AnalyticsFilters,
  now = new Date(),
): AnalyticsDateRange {
  const today = startOfLocalDay(now);
  const toKeyToday = localDayKey(today);

  const make = (from: Date, to: Date, withPrevious: boolean): AnalyticsDateRange => {
    const fromD = startOfLocalDay(from);
    const toD = endOfLocalDay(to);
    const fromKey = localDayKey(fromD);
    const toKey = localDayKey(toD);
    let previous: AnalyticsDateRange["previous"] = null;
    if (withPrevious) {
      const days =
        Math.round((startOfLocalDay(toD).getTime() - fromD.getTime()) / (24 * 60 * 60 * 1000)) + 1;
      const prevTo = new Date(fromD);
      prevTo.setDate(prevTo.getDate() - 1);
      const prevFrom = new Date(prevTo);
      prevFrom.setDate(prevFrom.getDate() - (days - 1));
      previous = {
        from: startOfLocalDay(prevFrom),
        to: endOfLocalDay(prevTo),
        fromKey: localDayKey(prevFrom),
        toKey: localDayKey(prevTo),
      };
    }
    return {
      from: fromD,
      to: toD,
      fromKey,
      toKey,
      preset: filters.preset,
      previous,
    };
  };

  if (filters.preset === "custom") {
    const to = filters.to ? parseDayToLocalDate(filters.to) : today;
    const from = filters.from
      ? parseDayToLocalDate(filters.from)
      : (() => {
          const d = new Date(to);
          d.setDate(d.getDate() - 29);
          return d;
        })();
    const a = from <= to ? from : to;
    const b = from <= to ? to : from;
    return make(a, b, true);
  }

  if (filters.preset === "7") {
    const from = new Date(today);
    from.setDate(from.getDate() - 6);
    return make(from, today, true);
  }
  if (filters.preset === "90") {
    const from = new Date(today);
    from.setDate(from.getDate() - 89);
    return make(from, today, true);
  }
  if (filters.preset === "year") {
    const from = new Date(today.getFullYear(), 0, 1);
    return make(from, today, true);
  }
  if (filters.preset === "all") {
    // Unbounded start — use epoch; no previous period comparison.
    return {
      from: new Date(1970, 0, 1),
      to: endOfLocalDay(today),
      fromKey: "1970-01-01",
      toKey: toKeyToday,
      preset: "all",
      previous: null,
    };
  }

  // Default / "30"
  const from = new Date(today);
  from.setDate(from.getDate() - 29);
  return make(from, today, true);
}

export function formatRangeLabel(range: AnalyticsDateRange): string {
  if (range.preset === "all") return "All time";
  const fmt = (key: string) => {
    const d = parseDayToLocalDate(key);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${day}/${month}/${d.getFullYear()}`;
  };
  return `${fmt(range.fromKey)} – ${fmt(range.toKey)}`;
}
