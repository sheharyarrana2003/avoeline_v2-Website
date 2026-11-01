import { cache } from "react";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { toIsoString } from "@/src/lib/datetime";
import { clampKeysetLimit, decodeKeysetCursor, encodeKeysetCursor } from "@/src/lib/keyset";
import { EventModel } from "@/src/services/models/event.model";
import { UserService } from "@/src/services/user.service";
import { eventLifecycle, isActiveLifecycle } from "@/src/lib/eventState";
import {
  isAccountStatus,
  type AccountStatus,
  type EventReport,
  type ModerationEntry,
  type ModerationTarget,
  type AdminRecordRow,
  type OrganizerRow,
  type ReportStatus,
  type SupportTicket,
  type TicketStatus,
  type VendorRow,
  normalizeVendorStatus,
} from "./types";

/**
 * The panel's reads (spec 9.2-9.7). Server only.
 *
 * Several list endpoints still scan then sort in memory. At current scale
 * that is cheaper than pagination; past a few hundred organizers or a few
 * thousand events, these want a cursor and a filtered Postgres query.
 */

/* ------------------------------------------------- organizers (spec 9.3) */

/**
 * Every organizer, with the three things the spec asks to show: signup date,
 * events run, and account status.
 *
 * Joined across three tables because none of them holds all three:
 * `organizer_profiles` has the org name, `users` has the email and the standing, and
 * the count only exists by counting events. `getUsersByIds` batches the middle
 * one into a single round trip rather than a read per organizer.
 */
function lastActiveOf(
  user: { lastActive?: string; security?: { lastLogin?: string }; updatedAt?: string } | undefined,
): string {
  return (
    toIsoString(user?.lastActive) ||
    toIsoString(user?.security?.lastLogin) ||
    toIsoString(user?.updatedAt) ||
    ""
  );
}

function mapOrganizerRow(
  row: {
    user_id: string;
    org_name?: string | null;
    plan_type?: string | null;
    review_status?: string | null;
    org_id?: string | null;
    extra?: unknown;
  },
  user:
    | {
        email?: string;
        accountStatus?: string;
        createdAt?: string;
        lastActive?: string;
        updatedAt?: string;
        profile?: { fullName?: string };
        security?: { lastLogin?: string };
      }
    | undefined,
  counts: { total: number; live: number },
): OrganizerRow {
  const userId = String(row.user_id);
  const extra =
    row.extra && typeof row.extra === "object" && !Array.isArray(row.extra)
      ? (row.extra as Record<string, unknown>)
      : {};
  const organization = (extra.organization as Record<string, unknown> | undefined) ?? {};
  const status = user?.accountStatus;
  return {
    organizerId: userId,
    userId,
    name: String(
      row.org_name || organization.name || user?.profile?.fullName || "Unnamed organizer",
    ),
    email: String(user?.email || ""),
    signedUpAt: toIsoString(user?.createdAt) || "",
    lastActiveAt: lastActiveOf(user),
    eventCount: counts.total,
    liveEventCount: counts.live,
    accountStatus: (isAccountStatus(status) ? status : "active") as AccountStatus,
    planType: String(row.plan_type || "free"),
    reviewStatus: String(row.review_status || "approved").toLowerCase(),
    orgId: row.org_id ? String(row.org_id) : null,
  };
}

/**
 * Every organizer login that is not a department tenant.
 * Department admins are managed on `/admin/departments/[id]` (identity split).
 */
export const listOrganizers = cache(async (): Promise<OrganizerRow[]> => {
  const [
    { data: orgRows, error: orgErr },
    { data: eventRows, error: eventErr },
    { data: deptMemberships, error: memErr },
  ] = await Promise.all([
    supabaseAdmin.from(TABLES.ORGANIZER_PROFILES).select("*"),
    supabaseAdmin
      .from(TABLES.EVENTS)
      .select("id, organizer_id, status, start_date, end_date, start_time, end_time, extra"),
    supabaseAdmin.from(TABLES.ORG_MEMBERSHIPS).select("user_id").eq("role", "department_admin"),
  ]);
  if (orgErr) throw orgErr;
  if (eventErr) throw eventErr;
  if (memErr) throw memErr;

  const departmentAdminIds = new Set((deptMemberships ?? []).map((m) => String(m.user_id)));

  const eventsByOrganizer = new Map<string, { total: number; live: number }>();
  for (const row of eventRows ?? []) {
    const key = String(row.organizer_id ?? "");
    if (!key) continue;
    const extra =
      row.extra && typeof row.extra === "object" && !Array.isArray(row.extra)
        ? (row.extra as Record<string, unknown>)
        : {};
    const schedule = (extra.schedule as Record<string, unknown> | undefined) ?? {
      startDate: row.start_date,
      endDate: row.end_date,
      startTime: row.start_time,
      endTime: row.end_time,
    };
    const bucket = eventsByOrganizer.get(key) ?? { total: 0, live: 0 };
    bucket.total += 1;
    if (isActiveLifecycle(eventLifecycle(row.status, schedule))) bucket.live += 1;
    eventsByOrganizer.set(key, bucket);
  }

  const filtered = (orgRows ?? []).filter((row) => !departmentAdminIds.has(String(row.user_id)));
  const ids = filtered.map((d) => String(d.user_id));
  const users = await UserService.getUsersByIds(ids);

  return filtered
    .map((row) =>
      mapOrganizerRow(
        row,
        users.get(String(row.user_id))!,
        eventsByOrganizer.get(String(row.user_id)) ?? { total: 0, live: 0 },
      ),
    )
    .sort((a: OrganizerRow, b: OrganizerRow) => a.name.localeCompare(b.name));
});

/** Single organizer/dept account by user id — not filtered by listOrganizers exclusions. */
export const getOrganizerRow = cache(async (organizerId: string): Promise<OrganizerRow | null> => {
  if (!organizerId) return null;
  const [{ data: profile }, { data: eventRows }] = await Promise.all([
    supabaseAdmin
      .from(TABLES.ORGANIZER_PROFILES)
      .select("*")
      .eq("user_id", organizerId)
      .maybeSingle(),
    supabaseAdmin
      .from(TABLES.EVENTS)
      .select("id, organizer_id, status, start_date, end_date, start_time, end_time, extra")
      .eq("organizer_id", organizerId),
  ]);
  if (!profile) return null;

  const users = await UserService.getUsersByIds([organizerId]);
  const counts = { total: 0, live: 0 };
  for (const row of eventRows ?? []) {
    counts.total += 1;
    const extra =
      row.extra && typeof row.extra === "object" && !Array.isArray(row.extra)
        ? (row.extra as Record<string, unknown>)
        : {};
    const schedule = (extra.schedule as Record<string, unknown> | undefined) ?? {
      startDate: row.start_date,
      endDate: row.end_date,
      startTime: row.start_time,
      endTime: row.end_time,
    };
    if (isActiveLifecycle(eventLifecycle(row.status, schedule))) counts.live += 1;
  }

  return mapOrganizerRow(profile, users.get(organizerId)!, counts);
});

/**
 * If this user is a department tenant (membership or profile org_id → department),
 * return that department org id so the organizers dossier can redirect.
 */
export const departmentOrgIdForUser = cache(async (userId: string): Promise<string | null> => {
  if (!userId) return null;
  const [{ data: membership }, { data: profile }] = await Promise.all([
    supabaseAdmin
      .from(TABLES.ORG_MEMBERSHIPS)
      .select("org_id")
      .eq("user_id", userId)
      .eq("role", "department_admin")
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from(TABLES.ORGANIZER_PROFILES)
      .select("org_id")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);
  if (membership?.org_id) return String(membership.org_id);
  const orgId = profile?.org_id ? String(profile.org_id) : "";
  if (!orgId) return null;
  const { data: org } = await supabaseAdmin
    .from(TABLES.ORGANIZATIONS)
    .select("id, org_type")
    .eq("id", orgId)
    .maybeSingle();
  if (org && String(org.org_type) === "department") return String(org.id);
  return null;
});

/* ----------------------------------------------------- events (spec 9.4) */

/**
 * Every event on the platform, including drafts, cancelled and private ones.
 *
 * Deliberately unlike `getBrowsableEvents`, which exists to hide exactly those
 * — an admin moderating content has to be able to see what a stranger cannot.
 */
export const listAllEvents = cache(async (): Promise<EventModel[]> => {
  const { data, error } = await supabaseAdmin.from(TABLES.EVENTS).select("*");
  if (error) throw error;
  return (data ?? [])
    .map((row) => {
      const extra =
        row.extra && typeof row.extra === "object" && !Array.isArray(row.extra)
          ? (row.extra as Record<string, unknown>)
          : {};
      return EventModel.fromJson({ ...extra, ...row, id: row.id, eventId: row.id });
    })
    .sort((a: EventModel, b: EventModel) =>
      String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")),
    );
});

/* ---------------------------------------------------- vendors (spec 9.6) */

export const listVendors = cache(async (): Promise<VendorRow[]> => {
  const { data, error } = await supabaseAdmin.from(TABLES.VENDOR_PROFILES).select("*");
  if (error) throw error;
  return (data ?? [])
    .map((row): VendorRow => {
      const extra =
        row.extra && typeof row.extra === "object" && !Array.isArray(row.extra)
          ? (row.extra as Record<string, unknown>)
          : {};
      const contact = (extra.contact as Record<string, unknown> | undefined) ?? {};
      const ratings = (extra.ratings as Record<string, unknown> | undefined) ?? {};
      const addressObj = (extra.address as Record<string, unknown> | undefined) ?? {};
      const packagesRaw = Array.isArray(extra.pricingPackages)
        ? extra.pricingPackages
        : Array.isArray(extra.packages)
          ? extra.packages
          : [];
      const portfolioRaw = Array.isArray(row.portfolio)
        ? row.portfolio
        : Array.isArray(extra.portfolio)
          ? extra.portfolio
          : [];
      const portfolio = portfolioRaw
        .map((item: unknown) => {
          if (typeof item === "string") {
            const url = item;
            const kind =
              /\.(mp4|webm|mov)(\?|$)/i.test(url) || url.includes("video")
                ? ("video" as const)
                : ("image" as const);
            return { url, kind };
          }
          const obj = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
          const url = String(obj.url || obj.src || "");
          const kind =
            String(obj.kind || obj.type || "").includes("video") ||
            /\.(mp4|webm|mov)(\?|$)/i.test(url)
              ? ("video" as const)
              : ("image" as const);
          return { url, kind };
        })
        .filter((p: { url: string }) => p.url);

      return {
        vendorId: String(row.user_id),
        businessName: String(row.business_name || "Unnamed vendor"),
        email: String(row.business_email || contact.email || extra.email || ""),
        phone: String(contact.phone || extra.phone || ""),
        address: String(
          addressObj.line1 || addressObj.city
            ? [addressObj.line1, addressObj.city, addressObj.country].filter(Boolean).join(", ")
            : extra.address || "",
        ),
        status: normalizeVendorStatus(row.status),
        averageRating: Number(row.average_rating ?? ratings.averageRating ?? 0) || 0,
        totalReviews: Number(row.total_reviews ?? ratings.totalReviews ?? 0) || 0,
        serviceCategories: Array.isArray(row.service_categories)
          ? row.service_categories.map(String)
          : [],
        pricingPackages: packagesRaw.map((p) => {
          const obj = p && typeof p === "object" ? (p as Record<string, unknown>) : {};
          return {
            name: String(obj.name || obj.title || "Package"),
            price: String(obj.price ?? obj.amount ?? ""),
            description: String(obj.description || obj.desc || ""),
          };
        }),
        portfolio,
        isVerified: Boolean(row.is_verified),
        totalBookings: Number(row.total_bookings ?? 0) || 0,
        completedBookings: Number(row.completed_bookings ?? 0) || 0,
        createdAt: toIsoString(row.updated_at) || "",
      };
    })
    .sort((a: VendorRow, b: VendorRow) => a.businessName.localeCompare(b.businessName));
});

/** One review an organizer left about a vendor, as the panel shows it. */
export interface VendorReviewRow {
  id: string;
  vendorId: string;
  rating: number;
  title: string;
  comment: string;
  reviewerName: string;
  createdAt: string;
}

/**
 * Every review organizers have left about vendors (spec 9.6's "ratings and
 * complaints").
 *
 * One equality filter on `target_type`. Sorted in memory. Today reviews are only
 * ever read one vendor at a time by `getVendorReviews`, so this is the first
 * platform-wide view of them.
 *
 * Lowest ratings first, because that is what "complaints" means in practice —
 * there is no separate complaint record in this product, and inventing one the
 * spec does not describe would leave two half-used places to look.
 */
export const listVendorReviews = cache(async (): Promise<VendorReviewRow[]> => {
  const { data, error } = await supabaseAdmin
    .from(TABLES.REVIEWS)
    .select("*")
    .eq("target_type", "vendor");
  if (error) throw error;
  return (data ?? [])
    .map((row): VendorReviewRow => {
      const extra =
        row.extra && typeof row.extra === "object" && !Array.isArray(row.extra)
          ? (row.extra as Record<string, unknown>)
          : {};
      return {
        id: String(row.id),
        vendorId: String(row.target_id || ""),
        rating: Number(row.rating ?? 0) || 0,
        title: String(row.title || ""),
        comment: String(row.comment || ""),
        reviewerName: String(extra.reviewerName || "An organizer"),
        createdAt: toIsoString(row.created_at) || "",
      };
    })
    .sort(
      (a: VendorReviewRow, b: VendorReviewRow) =>
        a.rating - b.rating || b.createdAt.localeCompare(a.createdAt),
    );
});

/* --------------------------------------------- flagged content (spec 9.4) */

function mapToReport(row: Record<string, unknown>): EventReport {
  const status = String(row.status || "open");
  return {
    id: String(row.id || ""),
    eventId: String(row.event_id || row.eventId || ""),
    eventTitle: String(row.event_title || row.eventTitle || "An event"),
    reason: String(row.reason || ""),
    reporterEmail: String(row.reporter_email || row.reporterEmail || ""),
    status: (["open", "dismissed", "actioned"].includes(status) ? status : "open") as ReportStatus,
    createdAt: toIsoString(row.created_at ?? row.createdAt) || "",
    decidedAt: toIsoString(row.decided_at ?? row.decidedAt),
  };
}

/** Open reports first, then newest — an unreviewed flag must not sink. */
export const listEventReports = cache(async (): Promise<EventReport[]> => {
  const { data, error } = await supabaseAdmin.from(TABLES.EVENT_REPORTS).select("*");
  if (error) throw error;
  const rank: Record<ReportStatus, number> = { open: 0, actioned: 1, dismissed: 2 };
  return (data ?? [])
    .map((d) => mapToReport(d as Record<string, unknown>))
    .sort(
      (a: EventReport, b: EventReport) =>
        rank[a.status] - rank[b.status] || b.createdAt.localeCompare(a.createdAt),
    );
});

/* --------------------------------------------- support tickets (spec 9.7) */

function mapToTicket(row: Record<string, unknown>): SupportTicket {
  const status = String(row.status || "open");
  return {
    id: String(row.id || ""),
    fromUserId: String(row.from_user_id || row.fromUserId || ""),
    fromEmail: String(row.from_email || row.fromEmail || ""),
    fromRole: String(row.from_role || row.fromRole || "attendee"),
    subject: String(row.subject || ""),
    body: String(row.body || ""),
    status: (["open", "in_progress", "resolved"].includes(status)
      ? status
      : "open") as TicketStatus,
    adminNote: String(row.admin_note || row.adminNote || ""),
    createdAt: toIsoString(row.created_at ?? row.createdAt) || "",
    updatedAt: toIsoString(row.updated_at ?? row.updatedAt) || "",
  };
}

export const listSupportTickets = cache(async (): Promise<SupportTicket[]> => {
  const { data, error } = await supabaseAdmin.from(TABLES.SUPPORT_TICKETS).select("*");
  if (error) throw error;
  return (data ?? []).map((d) => mapToTicket(d as Record<string, unknown>));
});

export async function getSupportTicketById(ticketId: string): Promise<SupportTicket | null> {
  if (!ticketId) return null;
  const { data, error } = await supabaseAdmin
    .from(TABLES.SUPPORT_TICKETS)
    .select("*")
    .eq("id", ticketId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapToTicket(data as Record<string, unknown>) : null;
}

/** The tickets one person filed, for their own "my requests" list. */
export async function ticketsForUser(userId: string): Promise<SupportTicket[]> {
  if (!userId) return [];
  const { data, error } = await supabaseAdmin
    .from(TABLES.SUPPORT_TICKETS)
    .select("*")
    .eq("from_user_id", userId);
  if (error) throw error;
  return (data ?? [])
    .map((d) => mapToTicket(d as Record<string, unknown>))
    .sort((a: SupportTicket, b: SupportTicket) => b.createdAt.localeCompare(a.createdAt));
}

/* ------------------------------------------- the moderation log (spec 9.4) */

function mapToModeration(row: Record<string, unknown>): ModerationEntry {
  const targetType = String(row.target_type || row.targetType || "");
  const extraRaw = row.extra;
  const extra =
    extraRaw && typeof extraRaw === "object" && !Array.isArray(extraRaw)
      ? (extraRaw as Record<string, unknown>)
      : null;
  return {
    id: String(row.id || ""),
    targetType: (["event", "organizer", "vendor", "website"].includes(targetType)
      ? targetType
      : "event") as ModerationTarget,
    targetId: String(row.target_id || row.targetId || ""),
    targetLabel: String(row.target_label || row.targetLabel || ""),
    action: row.action as ModerationEntry["action"],
    reason: String(row.reason || ""),
    adminId: String(row.admin_id || row.adminId || ""),
    adminEmail: String(row.admin_email || row.adminEmail || ""),
    createdAt: toIsoString(row.created_at ?? row.createdAt) || "",
    extra,
  };
}

const MODERATION_COLS =
  "id, admin_id, admin_email, action, target_type, target_id, target_label, reason, created_at, extra";

/**
 * Keyset page of moderation / audit rows (newest first). Default limit 25–50.
 */
export async function listModerationLogPage(input?: {
  cursor?: string | null;
  limit?: number;
}): Promise<{ rows: ModerationEntry[]; nextCursor: string | null }> {
  const limit = clampKeysetLimit(input?.limit);
  const cursor = decodeKeysetCursor(input?.cursor);

  let q = supabaseAdmin
    .from(TABLES.MODERATION_LOGS)
    .select(MODERATION_COLS)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    q = q.or(`created_at.lt.${cursor.at},and(created_at.eq.${cursor.at},id.lt.${cursor.id})`);
  }

  const { data, error } = await q;
  if (error) throw error;
  const raw = data ?? [];
  const page = raw.slice(0, limit);
  const rows = page.map((d) => mapToModeration(d as Record<string, unknown>));
  let nextCursor: string | null = null;
  if (raw.length > limit && rows.length) {
    const last = rows[rows.length - 1]!;
    nextCursor = encodeKeysetCursor({ at: last.createdAt, id: last.id });
  }
  return { rows, nextCursor };
}

/** First keyset page of the global audit log (backward-compatible unbounded callers). */
export const listModerationLog = cache(async (): Promise<ModerationEntry[]> => {
  const { rows } = await listModerationLogPage({ limit: 50 });
  return rows;
});

/** Everything ever done to one event, organizer or vendor (capped). */
export async function moderationFor(targetId: string): Promise<ModerationEntry[]> {
  if (!targetId) return [];
  const { data, error } = await supabaseAdmin
    .from(TABLES.MODERATION_LOGS)
    .select(MODERATION_COLS)
    .eq("target_id", targetId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map((d) => mapToModeration(d as Record<string, unknown>));
}

export type { AdminRecordRow };

/** Every stored admin, for the owner's admin list. */
export const listAdmins = cache(async (): Promise<AdminRecordRow[]> => {
  const { data } = await supabaseAdmin
    .from(TABLES.USERS)
    .select(
      "id, email, full_name, is_owner, admin_permissions, account_status, created_at, user_type, avatar_url",
    )
    .eq("user_type", "platform_admin");
  return (data ?? [])
    .map((raw): AdminRecordRow => ({
      userId: String(raw.id),
      email: String(raw.email || ""),
      name: String(raw.full_name || ""),
      isOwner: !!raw.is_owner,
      permissions: Array.isArray(raw.admin_permissions) ? raw.admin_permissions.map(String) : [],
      accountStatus: String(raw.account_status || "active"),
      createdAt: toIsoString(raw.created_at) || "",
      avatarUrl: String(raw.avatar_url || ""),
    }))
    .sort((a, b) => a.email.localeCompare(b.email));
});
