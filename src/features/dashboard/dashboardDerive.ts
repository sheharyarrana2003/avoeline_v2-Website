import type { Registration } from "@/src/services/models/reg.type";
import { occupyingRegsForOrganizer } from "@/src/features/registration/occupancy";
import type {
  DashboardStats,
  DailyRegistrationTrend,
  RecentRegistration,
  RecentRegistrationMember,
} from "./types";
import { formatCurrencyCompact } from "@/src/lib/money";
import { eventLifecycle, isActiveLifecycle } from "@/src/lib/eventState";
import { toDate, toIsoDate } from "@/src/lib/datetime";

export type TeamLite = {
  id: string;
  eventId: string;
  name: string;
  trackId?: string;
  members: { registrationId: string; isOwner: boolean; name?: string; email?: string }[];
};

export type GroupLite = {
  id: string;
  eventId: string;
  groupName: string;
  leadRegistrationId: string | null;
  memberIds: string[];
};

export type EventLite = {
  id: string;
  title: string;
  bannerUrl?: string | null;
  status?: string;
  schedule?: unknown;
};

export type EventTally = {
  registrations: number;
  checkedIn: number;
  revenue: number;
  avgRating: number;
};

const STATUS_MAP: Record<string, RecentRegistration["status"]> = {
  confirmed: "CONFIRMED",
  checked_in: "CONFIRMED",
  attended: "CONFIRMED",
  pending: "PENDING",
  cancelled: "CANCELLED",
  no_show: "CANCELLED",
};

const NAME_RESPONSE_KEYS = [
  "name",
  "fullName",
  "full_name",
  "attendeeName",
  "attendee_name",
  "Full Name",
  "full name",
];

/** Prefer attendee contact, then form answers — never invent "Unknown attendee". */
export function resolveRegistrationDisplayName(reg: Registration): string {
  const fromAttendee = reg.attendee?.name?.trim();
  if (fromAttendee) return fromAttendee;

  const cr = reg.customResponses ?? {};
  for (const key of NAME_RESPONSE_KEYS) {
    const v = cr[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  for (const [key, v] of Object.entries(cr)) {
    if (/name/i.test(key) && typeof v === "string" && v.trim()) return v.trim();
  }

  const email = reg.attendee?.email?.trim();
  if (email) {
    const local = email.split("@")[0]?.trim();
    if (local) return local;
  }
  return "";
}

export function resolveRegistrationEmail(reg: Registration): string {
  return reg.attendee?.email?.trim() || "";
}

function fallbackName(reg: Registration, resolved: string): string {
  if (resolved) return resolved;
  const email = resolveRegistrationEmail(reg);
  if (email) {
    const local = email.split("@")[0]?.trim();
    if (local) return local;
  }
  return "Attendee";
}

function paymentOf(reg: Registration): number {
  return Number(reg.payment?.amountPaid ?? reg.finalPrice ?? 0) || 0;
}

function createdAtMs(reg: Registration): number {
  return (toDate(reg.createdAt) ?? new Date(0)).getTime();
}

function mapStatus(reg: Registration): RecentRegistration["status"] {
  const raw = String(reg.status || "pending").toLowerCase();
  return STATUS_MAP[raw] ?? "PENDING";
}

function attendeesHref(organizerId: string, eventId: string, teamId?: string): string {
  const base = `/organizer/${organizerId}/events/${eventId}/attendees`;
  return teamId ? `${base}?team=${encodeURIComponent(teamId)}` : base;
}

function isGrouped(reg: Registration): boolean {
  return Boolean(
    reg.hackathonTeamId ||
    reg.groupId ||
    reg.hackathonRole === "team_lead" ||
    reg.groupRole === "lead",
  );
}

export function computeOccupancyRevenue(occupying: Registration[]): number {
  let total = 0;
  for (const reg of occupying) total += paymentOf(reg);
  return total;
}

export function peopleAndTeamsCounts(
  occupying: Registration[],
  teams: TeamLite[],
  groups: GroupLite[],
): { peopleCount: number; teamsCount: number } {
  const teamByLead = new Map<string, TeamLite>();
  for (const t of teams) {
    const lead = t.members.find((m) => m.isOwner)?.registrationId ?? t.members[0]?.registrationId;
    if (lead) teamByLead.set(lead, t);
  }
  const groupByLead = new Map<string, GroupLite>();
  for (const g of groups) {
    if (g.leadRegistrationId) groupByLead.set(g.leadRegistrationId, g);
  }

  let peopleCount = 0;
  let teamsCount = 0;
  for (const reg of occupying) {
    const team =
      teamByLead.get(reg.registrationId) ?? teams.find((t) => t.id === reg.hackathonTeamId);
    if (team) {
      teamsCount += 1;
      peopleCount += Math.max(team.members.length, 1);
      continue;
    }
    const group = groupByLead.get(reg.registrationId) ?? groups.find((g) => g.id === reg.groupId);
    if (group) {
      teamsCount += 1;
      const ids = group.memberIds.length
        ? group.memberIds
        : ([group.leadRegistrationId].filter(Boolean) as string[]);
      peopleCount += Math.max(ids.length, 1);
      continue;
    }
    peopleCount += 1;
  }
  return { peopleCount, teamsCount };
}

export function deriveDashboardStat(
  eventDocs: EventLite[],
  occupying: Registration[],
  reviewRatings: number[],
  teams: TeamLite[],
  groups: GroupLite[],
): DashboardStats {
  const now = new Date();
  let activeEvents = 0;
  for (const ev of eventDocs) {
    if (isActiveLifecycle(eventLifecycle(ev.status, ev.schedule as any, now))) {
      activeEvents++;
    }
  }

  const occupancyCount = occupying.length;
  const { peopleCount, teamsCount } = peopleAndTeamsCounts(occupying, teams, groups);
  const totalRevenue = computeOccupancyRevenue(occupying);

  let totalRating = 0;
  let ratedCount = 0;
  for (const rating of reviewRatings) {
    if (rating > 0) {
      totalRating += rating;
      ratedCount++;
    }
  }
  const avgRating = ratedCount > 0 ? parseFloat((totalRating / ratedCount).toFixed(1)) : null;

  return {
    activeEvents,
    registrations: occupancyCount.toLocaleString("en-US"),
    occupancyCount,
    peopleCount,
    teamsCount,
    revenue: formatCurrencyCompact(totalRevenue),
    avgRating,
  };
}

export function tallyByEventOccupancy(occupying: Registration[]): Map<string, EventTally> {
  const tallies = new Map<string, EventTally>();
  const ratings = new Map<string, { total: number; count: number }>();

  for (const reg of occupying) {
    const eventId = reg.eventId;
    if (!eventId) continue;
    const status = String(reg.status || "").toLowerCase();
    if (status === "cancelled") continue;

    const t = tallies.get(eventId) ?? { registrations: 0, checkedIn: 0, revenue: 0, avgRating: 0 };
    t.registrations += 1;
    if (status === "checked_in" || status === "attended") t.checkedIn += 1;
    t.revenue += paymentOf(reg);
    tallies.set(eventId, t);

    const rating = reg.rating;
    if (typeof rating === "number" && rating > 0) {
      const agg = ratings.get(eventId) ?? { total: 0, count: 0 };
      agg.total += rating;
      agg.count += 1;
      ratings.set(eventId, agg);
    }
  }

  ratings.forEach((agg, eventId) => {
    const t = tallies.get(eventId);
    if (t && agg.count > 0) t.avgRating = Number((agg.total / agg.count).toFixed(1));
  });
  return tallies;
}

function memberFromReg(
  reg: Registration | undefined,
  stub?: { name?: string; email?: string },
): RecentRegistrationMember {
  if (reg) {
    return {
      name: fallbackName(reg, resolveRegistrationDisplayName(reg)),
      email: resolveRegistrationEmail(reg) || stub?.email || "",
    };
  }
  return {
    name: stub?.name?.trim() || "Attendee",
    email: stub?.email?.trim() || "",
  };
}

export function deriveRecentReg(opts: {
  regs: Registration[];
  occupying: Registration[];
  teams: TeamLite[];
  groups: GroupLite[];
  events: Map<string, EventLite>;
  trackNames?: Map<string, string>;
  organizerId: string;
  limit?: number;
}): (RecentRegistration & { userId: string })[] {
  const { occupying, teams, groups, events, trackNames, organizerId, limit = 8 } = opts;
  const byId = new Map(opts.regs.map((r) => [r.registrationId, r]));

  const teamByLead = new Map<string, TeamLite>();
  for (const t of teams) {
    const lead = t.members.find((m) => m.isOwner)?.registrationId ?? t.members[0]?.registrationId;
    if (lead) teamByLead.set(lead, t);
  }
  const groupByLead = new Map<string, GroupLite>();
  for (const g of groups) {
    if (g.leadRegistrationId) groupByLead.set(g.leadRegistrationId, g);
  }

  const sorted = [...occupying].sort((a, b) => createdAtMs(b) - createdAtMs(a)).slice(0, limit);

  return sorted.map((reg) => {
    const event = events.get(reg.eventId);
    const eventName = event?.title || "—";
    const eventBanner = event?.bannerUrl ?? null;

    const team =
      teamByLead.get(reg.registrationId) ??
      (reg.hackathonTeamId ? teams.find((t) => t.id === reg.hackathonTeamId) : undefined);

    if (team) {
      const members = team.members.map((m) => memberFromReg(byId.get(m.registrationId), m));
      const lead = team.members.find((m) => m.isOwner) ?? team.members[0];
      const leadReg = lead ? byId.get(lead.registrationId) : reg;
      const leadName = leadReg
        ? fallbackName(leadReg, resolveRegistrationDisplayName(leadReg))
        : team.name || "Attendee";
      return {
        id: team.id || reg.registrationId,
        userId: String(leadReg?.userId || reg.userId || ""),
        attendeeName: team.name || leadName,
        attendeeEmail: leadReg ? resolveRegistrationEmail(leadReg) : undefined,
        eventId: reg.eventId,
        eventName,
        eventBanner,
        amountPaid: paymentOf(leadReg ?? reg),
        status: mapStatus(leadReg ?? reg),
        teamName: team.name || undefined,
        competitionName: team.trackId ? trackNames?.get(team.trackId) : undefined,
        memberCount: members.length,
        members,
        isTeam: true,
        href: attendeesHref(organizerId, reg.eventId, team.id),
      };
    }

    const group =
      groupByLead.get(reg.registrationId) ??
      (reg.groupId ? groups.find((g) => g.id === reg.groupId) : undefined);

    if (group) {
      const memberIds = group.memberIds.length
        ? group.memberIds
        : ([group.leadRegistrationId].filter(Boolean) as string[]);
      const members = memberIds.map((id) => memberFromReg(byId.get(id)));
      const leadReg = group.leadRegistrationId ? byId.get(group.leadRegistrationId) : reg;
      const display =
        group.groupName ||
        (leadReg ? fallbackName(leadReg, resolveRegistrationDisplayName(leadReg)) : "Attendee");
      return {
        id: group.id || reg.registrationId,
        userId: String(leadReg?.userId || reg.userId || ""),
        attendeeName: display,
        attendeeEmail: leadReg ? resolveRegistrationEmail(leadReg) : undefined,
        eventId: reg.eventId,
        eventName,
        eventBanner,
        amountPaid: paymentOf(leadReg ?? reg),
        status: mapStatus(leadReg ?? reg),
        teamName: group.groupName || undefined,
        memberCount: members.length,
        members,
        isTeam: true,
        href: attendeesHref(organizerId, reg.eventId),
      };
    }

    const name = fallbackName(reg, resolveRegistrationDisplayName(reg));
    return {
      id: reg.registrationId,
      userId: String(reg.userId || ""),
      attendeeName: name,
      attendeeEmail: resolveRegistrationEmail(reg) || undefined,
      eventId: reg.eventId,
      eventName,
      eventBanner,
      amountPaid: paymentOf(reg),
      status: mapStatus(reg),
      isTeam: isGrouped(reg) ? true : false,
      memberCount: 1,
      href: attendeesHref(organizerId, reg.eventId),
    };
  });
}

/** Fill names still missing after document/form resolution via batched user lookup. */
export function applyAttendeeNames(
  rows: (RecentRegistration & { userId: string })[],
  users: Map<string, { profile?: { fullName?: string }; email?: string }>,
): RecentRegistration[] {
  return rows.map(({ userId, ...row }) => {
    let attendeeName = row.attendeeName;
    if (!attendeeName || attendeeName === "Attendee") {
      const u = userId ? users.get(userId) : undefined;
      const fromUser = u?.profile?.fullName?.trim();
      if (fromUser) attendeeName = fromUser;
      else if (u?.email) {
        const local = u.email.split("@")[0]?.trim();
        if (local) attendeeName = local;
      }
    }
    if (!attendeeName) attendeeName = "Attendee";

    const members = row.members?.map((m) => ({
      name: m.name && m.name !== "Attendee" ? m.name : m.name || "Attendee",
      email: m.email,
    }));

    return {
      ...row,
      attendeeName,
      members,
    };
  });
}

/** Local YYYY-MM-DD bucket keys (not UTC ISO slice). */
export function deriveRegTrend(occupying: Registration[]): DailyRegistrationTrend[] {
  const now = new Date();
  const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const countMap: Record<string, number> = {};
  const dayKeys: string[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = toIsoDate(d);
    countMap[key] = 0;
    dayKeys.push(key);
  }

  for (const reg of occupying) {
    const d = toDate(reg.createdAt);
    if (!d) continue;
    const key = toIsoDate(d);
    if (key in countMap) countMap[key]++;
  }

  return dayKeys.map((key) => {
    const [y, m, day] = key.split("-").map(Number);
    const d = new Date(y, (m || 1) - 1, day || 1);
    return { day: dayNames[d.getDay()], registrations: countMap[key] };
  });
}

export function buildOccupying(
  regs: Registration[],
  teams: TeamLite[],
  groups: GroupLite[],
): Registration[] {
  return occupyingRegsForOrganizer(regs, teams, groups);
}
