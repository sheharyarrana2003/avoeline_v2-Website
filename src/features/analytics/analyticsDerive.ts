/**
 * Pure analytics derive helpers (testable; mirrors dashboardDerive).
 */

import type { Registration } from "@/src/services/models/reg.type";
import { formatCurrencyCompact } from "@/src/lib/money";
import { toDate, toIsoDate, formatDate } from "@/src/lib/datetime";
import {
  peopleAndTeamsCounts,
  computeOccupancyRevenue,
  tallyByEventOccupancy,
  type TeamLite,
  type GroupLite,
  type EventTally,
} from "@/src/features/dashboard/dashboardDerive";
import {
  type AnalyticsDateRange,
  localDayKey,
  parseDayToLocalDate,
  startOfLocalDay,
  endOfLocalDay,
} from "./analytics.filters";

export type AnalyticsMetricTile = {
  value: string;
  helper?: string;
  /** Signed % vs previous period; null when no previous or previous was empty. */
  deltaPct: number | null;
  /** Raw numeric for exports / tests. */
  raw: number | null;
};

export type DailySeriesPoint = {
  key: string;
  label: string;
  registrations: number;
  people: number;
  previous: number;
  /** Per-event stacks for top events + other */
  stacks: Record<string, number>;
};

export type AnalyticsEventRow = {
  id: string;
  eventName: string;
  eventType: string;
  bannerUrl: string | null;
  date: string;
  dateMs: number;
  registrations: number;
  checkedIn: number;
  checkInRate: number | null;
  avgSatisfaction: number | null;
  revenue: number;
  vendorSpend: number;
  expenseNet: number;
  totalCosts: number;
  netAfterCosts: number;
};

export type AnalyticsTiles = {
  registrations: AnalyticsMetricTile & { peopleHelper: string };
  revenue: AnalyticsMetricTile;
  netAfterCosts: AnalyticsMetricTile;
  satisfaction: AnalyticsMetricTile;
  events: AnalyticsMetricTile;
  checkInRate: AnalyticsMetricTile;
};

export type ExpenseLite = {
  eventId: string;
  amount: number;
  kind: "expense" | "credit";
};

export type BookingLite = {
  eventId: string;
  status: string;
  amount: number;
};

export type EventDocLite = {
  id: string;
  title: string;
  eventType?: string;
  bannerUrl?: string | null;
  status?: string;
  startMs: number;
};

const COMMITTED_BOOKING = new Set(["quote_accepted", "confirmed", "completed", "in_progress"]);

function inRange(d: Date | null, from: Date, to: Date): boolean {
  if (!d) return false;
  const t = d.getTime();
  return t >= from.getTime() && t <= to.getTime();
}

export function filterOccupyingByCreatedAt(
  occupying: Registration[],
  from: Date,
  to: Date,
): Registration[] {
  return occupying.filter((r) => inRange(toDate(r.createdAt), from, to));
}

export function filterRegsByCreatedAt(regs: Registration[], from: Date, to: Date): Registration[] {
  return regs.filter((r) => {
    const status = String(r.status || "").toLowerCase();
    if (status === "cancelled" || status === "rejected") return false;
    return inRange(toDate(r.createdAt), from, to);
  });
}

export function filterEventsById(events: EventDocLite[], eventId: string | null): EventDocLite[] {
  if (!eventId) return events;
  return events.filter((e) => e.id === eventId);
}

export function filterByEventId<T extends { eventId?: string }>(
  rows: T[],
  eventId: string | null,
): T[] {
  if (!eventId) return rows;
  return rows.filter((r) => r.eventId === eventId);
}

export function vendorSpendByEvent(bookings: BookingLite[]): Map<string, number> {
  const spend = new Map<string, number>();
  for (const b of bookings) {
    if (!COMMITTED_BOOKING.has(String(b.status || "").toLowerCase())) continue;
    const amount = Number(b.amount) || 0;
    if (!amount || !b.eventId) continue;
    spend.set(b.eventId, (spend.get(b.eventId) ?? 0) + amount);
  }
  return spend;
}

/** Expenses minus credits per event. */
export function expenseNetByEvent(expenses: ExpenseLite[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const e of expenses) {
    if (!e.eventId) continue;
    const signed = e.kind === "credit" ? -Number(e.amount || 0) : Number(e.amount || 0);
    map.set(e.eventId, (map.get(e.eventId) ?? 0) + signed);
  }
  return map;
}

function sumMap(m: Map<string, number>, eventIds?: Set<string>): number {
  let total = 0;
  m.forEach((v, id) => {
    if (eventIds && !eventIds.has(id)) return;
    total += v;
  });
  return total;
}

function pctDelta(current: number, previous: number): number | null {
  if (!Number.isFinite(previous) || previous === 0) {
    if (current === 0) return null;
    return null;
  }
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}

function metric(
  current: number,
  previous: number | null,
  format: (n: number) => string,
  helper?: string,
): AnalyticsMetricTile {
  return {
    value: format(current),
    helper,
    deltaPct: previous == null ? null : pctDelta(current, previous),
    raw: current,
  };
}

export function deriveAnalyticsTiles(opts: {
  occupyingInRange: Registration[];
  occupyingPrev: Registration[] | null;
  allRegsInRange: Registration[];
  teams: TeamLite[];
  groups: GroupLite[];
  eventsInScope: EventDocLite[];
  eventsPrevCount: number | null;
  bookings: BookingLite[];
  expenses: ExpenseLite[];
  reviewRatingsInRange: number[];
  reviewRatingsPrev: number[] | null;
}): AnalyticsTiles {
  const {
    occupyingInRange,
    occupyingPrev,
    teams,
    groups,
    eventsInScope,
    eventsPrevCount,
    bookings,
    expenses,
    reviewRatingsInRange,
    reviewRatingsPrev,
  } = opts;

  const eventIds = new Set(eventsInScope.map((e) => e.id));
  const { peopleCount, teamsCount } = peopleAndTeamsCounts(occupyingInRange, teams, groups);

  const occupancy = occupyingInRange.length;
  const prevOcc = occupyingPrev?.length ?? null;

  const revenue = computeOccupancyRevenue(occupyingInRange);
  const prevRevenue = occupyingPrev != null ? computeOccupancyRevenue(occupyingPrev) : null;

  const vendor = sumMap(vendorSpendByEvent(bookings), eventIds);
  const expenseNet = sumMap(expenseNetByEvent(expenses), eventIds);
  const costs = vendor + expenseNet;
  const net = revenue - costs;

  const prevNet = occupyingPrev != null ? computeOccupancyRevenue(occupyingPrev) - costs : null;

  let satSum = 0;
  let satCount = 0;
  for (const r of reviewRatingsInRange) {
    if (r > 0) {
      satSum += r;
      satCount += 1;
    }
  }
  const sat = satCount > 0 ? Math.round((satSum / satCount) * 10) / 10 : null;

  let prevSat: number | null = null;
  if (reviewRatingsPrev) {
    let s = 0;
    let c = 0;
    for (const r of reviewRatingsPrev) {
      if (r > 0) {
        s += r;
        c += 1;
      }
    }
    if (c > 0) prevSat = Math.round((s / c) * 10) / 10;
  }

  const tallies = tallyByEventOccupancy(occupyingInRange);
  let checkedIn = 0;
  tallies.forEach((t) => {
    checkedIn += t.checkedIn;
  });
  const checkInRate = occupancy === 0 ? null : Math.round((checkedIn / occupancy) * 1000) / 10;

  let draft = 0;
  let published = 0;
  let completed = 0;
  for (const e of eventsInScope) {
    const s = String(e.status || "").toLowerCase();
    if (s === "draft") draft += 1;
    else if (["published", "registration_open", "ongoing", "active"].includes(s)) published += 1;
    else if (s === "completed" || s === "archived") completed += 1;
  }

  const peopleHelper =
    teamsCount > 0
      ? `${peopleCount.toLocaleString("en-US")} people · ${teamsCount} teams/groups`
      : `${peopleCount.toLocaleString("en-US")} people`;

  return {
    registrations: {
      ...metric(occupancy, prevOcc, (n) => n.toLocaleString("en-US"), peopleHelper),
      peopleHelper,
    },
    revenue: metric(
      revenue,
      prevRevenue,
      formatCurrencyCompact,
      occupancy > 0
        ? `Avg ${formatCurrencyCompact(Math.round(revenue / Math.max(eventsInScope.length, 1)))}/event`
        : undefined,
    ),
    netAfterCosts: metric(
      net,
      prevNet,
      formatCurrencyCompact,
      costs > 0
        ? `${formatCurrencyCompact(vendor)} vendors · ${formatCurrencyCompact(expenseNet)} expenses`
        : "No vendor or expense costs yet",
    ),
    satisfaction:
      sat == null
        ? { value: "—", helper: "No ratings yet", deltaPct: null, raw: null }
        : metric(sat, prevSat, (n) => n.toFixed(1), `Based on ${satCount} ratings`),
    events: metric(
      eventsInScope.length,
      eventsPrevCount,
      (n) => String(n),
      `${draft} draft, ${published} published, ${completed} completed`,
    ),
    checkInRate:
      checkInRate == null
        ? { value: "—", helper: "No registrations in range", deltaPct: null, raw: null }
        : {
            value: `${checkInRate}%`,
            helper: `${checkedIn.toLocaleString("en-US")} of ${occupancy.toLocaleString("en-US")} checked in`,
            deltaPct: null,
            raw: checkInRate,
          },
  };
}

/**
 * Local YYYY-MM-DD keys; full series zero-filled to `range.to`.
 * ≤90 calendar days → daily; beyond → weekly buckets.
 * No 8-point downsample.
 */
export function deriveDailyRegistrations(opts: {
  /** Full organizer occupying set (not pre-filtered by range) — used for previous-period align. */
  occupying: Registration[];
  allRegs: Registration[];
  range: AnalyticsDateRange;
  eventTitles?: Map<string, string>;
}): DailySeriesPoint[] {
  const { occupying, allRegs, range } = opts;
  const daySpan =
    Math.round(
      (startOfLocalDay(range.to).getTime() - startOfLocalDay(range.from).getTime()) /
        (24 * 60 * 60 * 1000),
    ) + 1;
  const weekly = daySpan > 90;

  const bucketKeys: string[] = [];
  const labels: string[] = [];

  if (!weekly) {
    for (
      let t = startOfLocalDay(range.from).getTime();
      t <= startOfLocalDay(range.to).getTime();
      t += 24 * 60 * 60 * 1000
    ) {
      const d = new Date(t);
      const key = localDayKey(d);
      bucketKeys.push(key);
      labels.push(formatDate(d));
    }
  } else {
    let cursor = startOfLocalDay(range.from);
    while (cursor.getTime() <= startOfLocalDay(range.to).getTime()) {
      const key = localDayKey(cursor);
      bucketKeys.push(key);
      const weekEnd = new Date(cursor);
      weekEnd.setDate(weekEnd.getDate() + 6);
      if (weekEnd > range.to) weekEnd.setTime(startOfLocalDay(range.to).getTime());
      labels.push(`${formatDate(cursor)}–${formatDate(weekEnd)}`);
      cursor = new Date(cursor);
      cursor.setDate(cursor.getDate() + 7);
    }
  }

  const keyIndex = new Map(bucketKeys.map((k, i) => [k, i]));

  function bucketKeyFor(d: Date): string | null {
    const day = localDayKey(d);
    if (!weekly) return keyIndex.has(day) ? day : null;
    // Find weekly bucket whose start ≤ day
    let chosen: string | null = null;
    for (const k of bucketKeys) {
      if (k <= day) chosen = k;
      else break;
    }
    return chosen;
  }

  const regCounts = new Array(bucketKeys.length).fill(0) as number[];
  const peopleCounts = new Array(bucketKeys.length).fill(0) as number[];
  const prevCounts = new Array(bucketKeys.length).fill(0) as number[];
  const stackMaps = bucketKeys.map(() => new Map<string, number>());

  // Top-5 events by occupancy in range (for stack keys)
  const byEvent = new Map<string, number>();
  for (const reg of occupying) {
    const d = toDate(reg.createdAt);
    if (!d || !inRange(d, range.from, range.to)) continue;
    byEvent.set(reg.eventId, (byEvent.get(reg.eventId) ?? 0) + 1);
  }
  const topEvents = [...byEvent.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);
  const topSet = new Set(topEvents);

  for (const reg of occupying) {
    const d = toDate(reg.createdAt);
    if (!d || !inRange(d, range.from, range.to)) continue;
    const bk = bucketKeyFor(d);
    if (!bk) continue;
    const i = keyIndex.get(bk)!;
    regCounts[i] += 1;
    const stackKey = topSet.has(reg.eventId) ? reg.eventId : "__other__";
    stackMaps[i]!.set(stackKey, (stackMaps[i]!.get(stackKey) ?? 0) + 1);
  }

  for (const reg of allRegs) {
    const status = String(reg.status || "").toLowerCase();
    if (status === "cancelled" || status === "rejected") continue;
    const d = toDate(reg.createdAt);
    if (!d || !inRange(d, range.from, range.to)) continue;
    const bk = bucketKeyFor(d);
    if (!bk) continue;
    peopleCounts[keyIndex.get(bk)!] += 1;
  }

  if (range.previous) {
    const prevFrom = range.previous.from;
    const prevTo = range.previous.to;
    for (const reg of occupying) {
      const d = toDate(reg.createdAt);
      if (!d || !inRange(d, prevFrom, prevTo)) continue;
      const offsetMs = d.getTime() - prevFrom.getTime();
      const aligned = new Date(range.from.getTime() + offsetMs);
      const bk = bucketKeyFor(aligned);
      if (!bk) continue;
      prevCounts[keyIndex.get(bk)!] += 1;
    }
  }

  return bucketKeys.map((key, i) => {
    const stacks: Record<string, number> = {};
    for (const id of topEvents) stacks[id] = stackMaps[i]!.get(id) ?? 0;
    stacks.__other__ = stackMaps[i]!.get("__other__") ?? 0;
    return {
      key,
      label: labels[i]!,
      registrations: regCounts[i]!,
      people: peopleCounts[i]!,
      previous: prevCounts[i]!,
      stacks,
    };
  });
}

/** Exported for tests: sum of daily registrations ≈ tile occupancy. */
export function sumSeriesRegistrations(series: DailySeriesPoint[]): number {
  return series.reduce((a, p) => a + p.registrations, 0);
}

export function deriveEventPerformance(opts: {
  events: EventDocLite[];
  occupying: Registration[];
  bookings: BookingLite[];
  expenses: ExpenseLite[];
  reviewByEvent: Map<string, number[]>;
}): AnalyticsEventRow[] {
  const { events, occupying, bookings, expenses, reviewByEvent } = opts;
  const tallies = tallyByEventOccupancy(occupying);
  const vendor = vendorSpendByEvent(bookings);
  const expenseNet = expenseNetByEvent(expenses);

  const rows: AnalyticsEventRow[] = events.map((ev) => {
    const tally: EventTally = tallies.get(ev.id) ?? {
      registrations: 0,
      checkedIn: 0,
      revenue: 0,
      avgRating: 0,
    };
    const ratings = reviewByEvent.get(ev.id) ?? [];
    let sat: number | null = null;
    if (ratings.length) {
      const sum = ratings.reduce((a, b) => a + b, 0);
      sat = Math.round((sum / ratings.length) * 10) / 10;
    } else if (tally.avgRating > 0) {
      sat = tally.avgRating;
    }
    const vSpend = vendor.get(ev.id) ?? 0;
    const eNet = expenseNet.get(ev.id) ?? 0;
    const totalCosts = vSpend + eNet;
    const checkInRate =
      tally.registrations === 0
        ? null
        : Math.round((tally.checkedIn / tally.registrations) * 1000) / 10;

    return {
      id: ev.id,
      eventName: ev.title || "Untitled Event",
      eventType: ev.eventType
        ? ev.eventType.charAt(0).toUpperCase() + ev.eventType.slice(1)
        : "Event",
      bannerUrl: ev.bannerUrl ?? null,
      date: ev.startMs > 0 ? formatDate(new Date(ev.startMs)) : "—",
      dateMs: ev.startMs,
      registrations: tally.registrations,
      checkedIn: tally.checkedIn,
      checkInRate,
      avgSatisfaction: sat,
      revenue: tally.revenue,
      vendorSpend: vSpend,
      expenseNet: eNet,
      totalCosts,
      netAfterCosts: tally.revenue - totalCosts,
    };
  });

  rows.sort((a, b) => b.dateMs - a.dateMs);
  return rows;
}

export function totalsFromEventRows(rows: AnalyticsEventRow[]): {
  registrations: number;
  revenue: number;
  totalCosts: number;
  netAfterCosts: number;
  checkedIn: number;
} {
  return rows.reduce(
    (acc, r) => {
      acc.registrations += r.registrations;
      acc.revenue += r.revenue;
      acc.totalCosts += r.totalCosts;
      acc.netAfterCosts += r.netAfterCosts;
      acc.checkedIn += r.checkedIn;
      return acc;
    },
    { registrations: 0, revenue: 0, totalCosts: 0, netAfterCosts: 0, checkedIn: 0 },
  );
}

export type EventSortKey =
  "date" | "registrations" | "checkIn" | "satisfaction" | "revenue" | "costs" | "net";

export function sortEventRows(
  rows: AnalyticsEventRow[],
  key: EventSortKey,
  dir: "asc" | "desc" = "desc",
): AnalyticsEventRow[] {
  const mul = dir === "asc" ? 1 : -1;
  const copy = [...rows];
  copy.sort((a, b) => {
    const av =
      key === "date"
        ? a.dateMs
        : key === "registrations"
          ? a.registrations
          : key === "checkIn"
            ? (a.checkInRate ?? -1)
            : key === "satisfaction"
              ? (a.avgSatisfaction ?? -1)
              : key === "revenue"
                ? a.revenue
                : key === "costs"
                  ? a.totalCosts
                  : a.netAfterCosts;
    const bv =
      key === "date"
        ? b.dateMs
        : key === "registrations"
          ? b.registrations
          : key === "checkIn"
            ? (b.checkInRate ?? -1)
            : key === "satisfaction"
              ? (b.avgSatisfaction ?? -1)
              : key === "revenue"
                ? b.revenue
                : key === "costs"
                  ? b.totalCosts
                  : b.netAfterCosts;
    if (av === bv) return b.dateMs - a.dateMs;
    return (av < bv ? -1 : 1) * mul;
  });
  return copy;
}

export function topEventStackKeys(
  series: DailySeriesPoint[],
  titles: Map<string, string>,
): { key: string; label: string }[] {
  const totals = new Map<string, number>();
  for (const p of series) {
    for (const [k, v] of Object.entries(p.stacks)) {
      if (k === "__other__") continue;
      totals.set(k, (totals.get(k) ?? 0) + v);
    }
  }
  const keys = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => ({ key: id, label: titles.get(id) || id.slice(0, 8) }));
  keys.push({ key: "__other__", label: "Other" });
  return keys;
}

export { toIsoDate, parseDayToLocalDate, startOfLocalDay, endOfLocalDay, localDayKey };
