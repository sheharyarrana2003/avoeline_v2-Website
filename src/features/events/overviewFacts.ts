import { formatCurrency } from "@/src/lib/money";
import { formatDate, formatDateTime, formatTime } from "@/src/lib/datetime";
import type { AgendaItem } from "@/src/services/models/event.model";

export type OverviewTrackFee = {
  name: string;
  fee: number;
  currency?: string | null;
  closes?: string | null;
};

/** True when the event tracks a finite seat count (not unlimited / unset). */
export function hasLimitedCapacity(totalSeats: unknown): boolean {
  return Number(totalSeats) > 0;
}

/** Hero value for hackathon admission (range / single / Free). */
export function organizerHackathonAdmissionLabel(
  tracks: OverviewTrackFee[],
  currency?: string | null,
): string {
  const paid = tracks.filter((t) => t.fee > 0);
  if (!tracks.length) return "No competitions yet";
  if (!paid.length) return "Free";
  const amounts = paid.map((t) => t.fee);
  const min = Math.min(...amounts);
  const max = Math.max(...amounts);
  const cur = paid[0]?.currency || currency || undefined;
  if (min === max) return formatCurrency(min, cur);
  return `${formatCurrency(min, cur)} – ${formatCurrency(max, cur)}`;
}

/** Tier min–max or Free for non-hackathon events. */
export function organizerTierAdmissionLabel(opts: {
  isFree?: boolean;
  priceOfTicket?: number | null;
  tiers?: Array<{ price?: number | null }> | null;
  currency?: string | null;
}): string {
  if (opts.isFree) return "Free";
  const prices = (opts.tiers || [])
    .map((t) => Number(t.price))
    .filter((n) => Number.isFinite(n) && n >= 0);
  if (prices.length) {
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    if (min === 0 && max === 0) return "Free";
    const cur = opts.currency || undefined;
    if (min === max) return formatCurrency(min, cur);
    return `${formatCurrency(min, cur)} – ${formatCurrency(max, cur)}`;
  }
  const single = Number(opts.priceOfTicket);
  const cur = opts.currency || undefined;
  if (Number.isFinite(single) && single > 0) return formatCurrency(single, cur);
  if (Number.isFinite(single) && single === 0) return "Free";
  return "Not priced";
}

/** Opens + closes when both exist; otherwise the single end that is set. */
export function overviewRegistrationWindow(opts: {
  opens?: unknown;
  closes?: unknown;
}): string | null {
  const regOpens = formatDate(opts.opens);
  const regCloses = formatDate(opts.closes);
  if (regOpens !== "—" && regCloses !== "—") {
    return `Opens ${regOpens} · closes ${regCloses}`;
  }
  if (regCloses !== "—") return `Registration closes ${regCloses}`;
  if (regOpens !== "—") return `Registration opens ${regOpens}`;
  return null;
}

export function overviewAgendaSummary(agenda: AgendaItem[] | null | undefined): {
  count: number;
  value: string;
  sub?: string;
} | null {
  const sessions = agenda || [];
  if (!sessions.length) return null;
  const sorted = [...sessions].sort((a, b) => {
    const byDate = String(a.date || "").localeCompare(String(b.date || ""));
    if (byDate !== 0) return byDate;
    return String(a.startTime || "").localeCompare(String(b.startTime || ""));
  });
  const first = sorted[0]!;
  const n = sessions.length;
  const value = `${n} session${n === 1 ? "" : "s"}`;
  const timeBit =
    first.startTime && formatTime(first.startTime) !== "—" ? formatTime(first.startTime) : "";
  const dayLabel = first.date ? "Day 1" : "";
  const sub =
    dayLabel || timeBit
      ? [
          dayLabel && timeBit ? `${dayLabel} starts ${timeBit}` : dayLabel || `Starts ${timeBit}`,
          "Open Agenda",
        ]
          .filter(Boolean)
          .join(" · ")
      : "Open Agenda";
  return { count: n, value, sub };
}

export function formatTrackFeeLine(t: OverviewTrackFee): string {
  const fee = t.fee > 0 ? formatCurrency(t.fee, t.currency || undefined) : "Free";
  const closeBit = t.closes ? ` · closes ${formatDateTime(t.closes)}` : "";
  return `${t.name}: ${fee}${closeBit}`;
}
