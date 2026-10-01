/**
 * The admin panel's vocabulary and its one security rule (spec 9.1).
 *
 * Client-safe: the admin nav and the permission editor are Client Components
 * and import from here, so nothing in this file may reach `adminDb`. Reads live
 * in `admin.service.ts`, writes in `actions/`.
 */

/* ----------------------------------------------------------- permissions */

/**
 * The areas of the panel an admin can hold.
 *
 * One per section of spec 9, so a permission maps onto something a person can
 * point at rather than onto an internal verb. `categories` is 9.5, which
 * already existed before this module and is now gated like the rest.
 */
export const ADMIN_AREAS = [
    "orgs",
    "organizers",
    "events",
    "vendors",
    "support",
    "categories",
    "tenants",
    "plans",
] as const;

export type AdminArea = (typeof ADMIN_AREAS)[number];

export const ADMIN_AREA_META: Record<AdminArea, { label: string; description: string }> = {
    orgs: { label: "Departments & clubs", description: "Create, edit, and manage the university tree." },
    organizers: { label: "Organizers", description: "See every organizer, and suspend or reactivate one." },
    events: { label: "Events", description: "Moderate any event, and work the flagged-content queue." },
    vendors: { label: "Vendors", description: "Approve, reject and suspend vendors." },
    support: { label: "Support", description: "Read and answer support tickets." },
    categories: { label: "Categories", description: "Manage event categories and decide requests." },
    tenants: { label: "Tenant accounts", description: "Create logins, change plans, and grant or deny features." },
    plans: { label: "Plans", description: "Edit plan prices and every included feature, including the free set." },
};

export function isStoredAdminType(value: unknown): boolean {
    const t = String(value ?? "").trim().toLowerCase();
    return t === "admin" || t === "platform_admin";
}

export function isAdminArea(value: unknown): value is AdminArea {
    return typeof value === "string" && (ADMIN_AREAS as readonly string[]).includes(value);
}

/**
 * Who the caller is, once `requireAdmin` has admitted them.
 *
 * `isOwner` is not one permission among the others: it implies every area AND
 * the right to manage other admins, which is deliberately not an area itself.
 * Making "can create admins" a tickable box would let an admin grant it to
 * themselves the moment they held the box.
 */
export interface AdminIdentity {
    userId: string;
    email: string;
    name: string;
    isOwner: boolean;
    /** Areas explicitly granted. Ignored entirely when `isOwner`. */
    permissions: AdminArea[];
    /** True when they are here through PLATFORM_ADMIN_EMAILS rather than a stored role. */
    viaBootstrap: boolean;
}

/**
 * The whole authorization rule, as a pure function.
 *
 * Pure so it can be asserted directly, which matters more here than anywhere
 * else in the app: this is the only thing standing between a support admin and
 * suspending an organizer. The service does the reads and hands the answers in.
 *
 * An owner holds everything. Anyone else holds exactly what is listed, and an
 * unrecognised entry in that list grants nothing rather than being treated as a
 * wildcard.
 */
export function holdsArea(identity: Pick<AdminIdentity, "isOwner" | "permissions">, area: AdminArea): boolean {
    if (identity.isOwner) return true;
    if (!isAdminArea(area)) return false;
    return identity.permissions.some((held) => held === area);
}

/** Every area this admin can actually reach, for the nav. */
export function areasFor(identity: Pick<AdminIdentity, "isOwner" | "permissions">): AdminArea[] {
    return ADMIN_AREAS.filter((area) => holdsArea(identity, area));
}

/** Keep only recognised areas, deduplicated, for a write. */
export function sanitizeAreas(raw: unknown[]): AdminArea[] {
    const seen = new Set<AdminArea>();
    for (const value of raw) if (isAdminArea(value)) seen.add(value);
    return ADMIN_AREAS.filter((area) => seen.has(area));
}

/* ------------------------------------------------- the moderation record */

export type ModerationTarget = "event" | "organizer" | "vendor";

export const MODERATION_ACTIONS = [
    "unpublished",
    "removed",
    "restored",
    "suspended",
    "reactivated",
    "approved",
    "rejected",
    "report_dismissed",
] as const;

export type ModerationAction = (typeof MODERATION_ACTIONS)[number];

/**
 * One line in the panel's audit trail (spec 9.4's "reason field logged for
 * records").
 *
 * Its own collection rather than a field on the thing it describes, for two
 * reasons. `EventModel`'s constructor only exposes fields it explicitly
 * assigns, so a `moderation` field written onto an event document would be
 * invisible on read. And the same log has to cover organizer suspensions and
 * vendor decisions, which live on different documents entirely.
 *
 * `targetLabel` is denormalized so the log reads without joining back to
 * something that may since have been renamed or removed.
 */
export interface ModerationEntry {
    id: string;
    targetType: ModerationTarget;
    targetId: string;
    targetLabel: string;
    action: ModerationAction;
    reason: string;
    adminId: string;
    adminEmail: string;
    createdAt: string;
}

/* ------------------------------------------------- flagged content (9.4) */

export type ReportStatus = "open" | "dismissed" | "actioned";

export interface EventReport {
    id: string;
    eventId: string;
    /** Denormalized, so the queue reads even if the event is later removed. */
    eventTitle: string;
    reason: string;
    /** Optional: a reporter need not identify themselves. */
    reporterEmail: string;
    status: ReportStatus;
    createdAt: string;
    decidedAt: string | null;
}

/** The reasons offered, so the queue groups rather than reading free text. */
export const REPORT_REASONS = [
    "Misleading or false information",
    "Not a real event",
    "Offensive or inappropriate content",
    "Spam",
    "Something else",
] as const;

/* ------------------------------------------------ support tickets (9.7) */

export type TicketStatus = "open" | "in_progress" | "resolved";

export const TICKET_STATUSES: TicketStatus[] = ["open", "in_progress", "resolved"];

export function isTicketStatus(value: unknown): value is TicketStatus {
    return typeof value === "string" && (TICKET_STATUSES as string[]).includes(value);
}

export interface SupportTicket {
    id: string;
    fromUserId: string;
    fromEmail: string;
    /** The role they filed it as, taken from their session and not the form. */
    fromRole: string;
    subject: string;
    body: string;
    status: TicketStatus;
    adminNote: string;
    createdAt: string;
    updatedAt: string;
}

/**
 * Open tickets first, then in progress, then resolved, newest within each.
 *
 * A support queue sorted purely by date buries the thing nobody has looked at
 * yet under everything already dealt with.
 */
export function queueOrder(tickets: SupportTicket[]): SupportTicket[] {
    const rank: Record<TicketStatus, number> = { open: 0, in_progress: 1, resolved: 2 };
    return [...tickets].sort(
        (a, b) => rank[a.status] - rank[b.status] || b.createdAt.localeCompare(a.createdAt),
    );
}

/** "3 open · 1 in progress", for the nav badge and the page header. */
export function queueSummary(tickets: SupportTicket[]): string {
    const open = tickets.filter((t) => t.status === "open").length;
    const doing = tickets.filter((t) => t.status === "in_progress").length;
    if (!tickets.length) return "No tickets yet";
    const parts = [];
    if (open) parts.push(`${open} open`);
    if (doing) parts.push(`${doing} in progress`);
    return parts.length ? parts.join(" · ") : "Nothing outstanding";
}

/* ----------------------------------------------- organizer standing (9.3) */

export type AccountStatus = "active" | "suspended" | "deactivated";

export function isAccountStatus(value: unknown): value is AccountStatus {
    return value === "active" || value === "suspended" || value === "deactivated";
}

/** An account that may sign in and whose public events are visible. */
export function accountIsLive(status: unknown): boolean {
    // Anything unrecognised reads as live, because this defaults across every
    // account created before the field was enforced -- treating an unknown
    // value as suspended would lock the platform out of itself.
    return status !== "suspended" && status !== "deactivated";
}

/** One row of the organizer table (spec 9.3). */
export interface OrganizerRow {
    organizerId: string;
    userId: string;
    name: string;
    email: string;
    /** ISO. `Organizer.createdAt` is the nearest thing to a signup date. */
    signedUpAt: string;
    eventCount: number;
    liveEventCount: number;
    accountStatus: AccountStatus;
    planType: string;
}

/** One row of the vendor table (spec 9.6). */
export interface VendorRow {
    vendorId: string;
    businessName: string;
    email: string;
    status: string;
    averageRating: number;
    totalReviews: number;
    serviceCategories: string[];
    createdAt: string;
}

/**
 * Vendor states the panel writes.
 *
 * `Vendor`'s constructor hardcodes `'active'` and the read-mapper defaults a
 * missing status to `'inactive'`, so these are the four values that actually
 * occur once this module is in play.
 */
export const VENDOR_STATUSES = ["pending", "active", "rejected", "suspended"] as const;

export type VendorStatus = (typeof VENDOR_STATUSES)[number];

export function isVendorStatus(value: unknown): value is VendorStatus {
    return typeof value === "string" && (VENDOR_STATUSES as readonly string[]).includes(value);
}

/** Only an active vendor is bookable, which is what approval is for. */
export function vendorIsBookable(status: unknown): boolean {
    return String(status ?? "") === "active";
}
