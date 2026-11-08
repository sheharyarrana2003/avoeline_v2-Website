import type { Registration } from "@/src/services/models/reg.type";

export function isCheckedIn(reg: Registration | undefined): boolean {
  if (!reg) return false;
  return (
    Boolean(reg.checkIn?.checkedIn) || reg.status === "checked_in" || reg.status === "attended"
  );
}

export function isWithdrawn(reg: Registration | undefined): boolean {
  const status = reg?.status;
  return status === "cancelled" || status === "rejected" || status === "no_show";
}

export function rosterStats(attendees: { register: Registration }[], occupyingCount?: number) {
  let checkedIn = 0;
  let cancelled = 0;
  let pending = 0;
  let people = 0;

  for (const item of attendees) {
    const reg = item.register;
    if (!reg) continue;
    if (isWithdrawn(reg)) {
      cancelled += 1;
      continue;
    }
    people += 1;
    if (isCheckedIn(reg)) checkedIn += 1;
    else pending += 1;
  }

  const total = occupyingCount ?? people;
  const checkedInPercent = people > 0 ? Math.round((checkedIn / people) * 100) : 0;
  return { total, people, checkedIn, pending, cancelled, checkedInPercent };
}

export type RosterFilters = {
  query: string;
  status: string;
  payment: string;
  checkin: string;
  track: string;
};

export function readRosterFilters(
  params: URLSearchParams | { get: (key: string) => string | null },
): RosterFilters {
  return {
    query: (params.get("value") ?? "").trim(),
    status: (params.get("status") ?? "all").trim() || "all",
    payment: (params.get("payment") ?? "all").trim() || "all",
    checkin: (params.get("checkin") ?? "all").trim() || "all",
    track: (params.get("track") ?? "all").trim() || "all",
  };
}

export function filtersAreActive(filters: RosterFilters): boolean {
  return Boolean(
    filters.query ||
    filters.status !== "all" ||
    filters.payment !== "all" ||
    filters.checkin !== "all" ||
    filters.track !== "all",
  );
}

function haystack(parts: Array<string | number | boolean | null | undefined>): string {
  return parts
    .filter((p) => p !== null && p !== undefined && p !== "")
    .map((p) => String(p).toLowerCase())
    .join(" ");
}

export function registrationMatchesSearch(
  row: {
    register: Registration;
    user?: { email?: string; profile?: { fullName?: string; phoneNumber?: string } };
  },
  needle: string,
  extras: string[] = [],
): boolean {
  if (!needle) return true;
  const r = row.register;
  const blob = haystack([
    row.user?.profile?.fullName,
    r.attendee?.name,
    row.user?.email,
    r.attendee?.email,
    row.user?.profile?.phoneNumber,
    r.attendee?.phone,
    r.registrationId,
    r.pricingTier,
    r.tier,
    r.status,
    r.payment?.paymentStatus,
    ...Object.values(r.customResponses ?? {}),
    ...extras,
  ]);
  return blob.includes(needle);
}

export function registrationMatchesFilters(
  row: { register: Registration },
  filters: RosterFilters,
  extras: {
    teamName?: string;
    trackName?: string;
    accessCode?: string | null;
    joinCode?: string | null;
  } = {},
): boolean {
  const r = row.register;
  if (filters.status !== "all" && r.status !== filters.status) return false;
  if (filters.payment !== "all" && (r.payment?.paymentStatus || "") !== filters.payment)
    return false;
  if (filters.checkin === "yes" && !isCheckedIn(r)) return false;
  if (filters.checkin === "no" && isCheckedIn(r)) return false;
  if (filters.track !== "all" && extras.trackName !== filters.track) return false;
  return registrationMatchesSearch(row, filters.query.toLowerCase(), [
    extras.teamName ?? "",
    extras.trackName ?? "",
    extras.accessCode ?? "",
    extras.joinCode ?? "",
  ]);
}

export function teamMetaMatches(
  filters: RosterFilters,
  extras: {
    teamName?: string;
    trackName?: string;
    accessCode?: string | null;
    joinCode?: string | null;
  },
): boolean {
  if (filters.track !== "all" && extras.trackName !== filters.track) return false;
  if (!filters.query) return false;
  return haystack([extras.teamName, extras.trackName, extras.accessCode, extras.joinCode]).includes(
    filters.query.toLowerCase(),
  );
}

/**
 * One badge for a team card: either "no fee" or a payable amount, never both.
 * A stored `not_required` is ignored when the track or lead registration has a
 * real amount — that mismatch is what painted NO FEE next to Rs 1,500.
 */
export function teamFeeDisplay(input: {
  feeStatus?: string | null;
  trackFee?: number | null;
  leadAmount?: number | null;
  leadPayment?: string | null;
}): { payment: string | null; amount?: number } {
  const amount = Number(input.leadAmount ?? 0) || Number(input.trackFee ?? 0) || 0;
  const feeStatus = input.feeStatus || "";
  const hasFee = amount > 0 || feeStatus === "fee_pending" || feeStatus === "fee_paid";
  if (!hasFee) return { payment: "not_required" };
  const payment =
    !feeStatus || feeStatus === "not_required" ? input.leadPayment || "pending" : feeStatus;
  return { payment, amount: amount > 0 ? amount : undefined };
}

/** Show join/enter codes only after fee + registration are in a good state (Phase B / O2). */
export function hackathonTeamCodesVisible(
  team: {
    payment?: string | null;
    feeStatus?: string | null;
    cancelled?: boolean | null;
    eliminated?: boolean | null;
  },
  leadReg: Registration | null | undefined,
): boolean {
  if (!leadReg) return false;
  if (team.cancelled || team.eliminated) return false;
  if (["cancelled", "rejected", "no_show"].includes(leadReg.status)) return false;
  const settled = ["confirmed", "checked_in", "attended"].includes(leadReg.status);
  if (!settled) return false;
  // Free / no-fee teams: do not consult ticket paymentStatus (often still "pending").
  if (team.payment === "not_required" || team.feeStatus === "not_required" || !team.payment) {
    return true;
  }
  const pay = leadReg.payment?.paymentStatus;
  const teamFee = team.feeStatus;
  if (teamFee === "fee_paid") return true;
  if (pay === "completed") return true;
  return false;
}
