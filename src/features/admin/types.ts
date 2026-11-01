/**
 * The admin panel's vocabulary and its one security rule (spec 9.1).
 *
 * Client-safe: the admin nav and the permission editor are Client Components
 * and import from here, so nothing in this file may reach `supabaseAdmin`. Reads live
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
  "website",
] as const;

export type AdminArea = (typeof ADMIN_AREAS)[number];

export const ADMIN_AREA_META: Record<AdminArea, { label: string; description: string }> = {
  orgs: {
    label: "Departments & clubs",
    description: "Create, edit, and manage the university tree.",
  },
  organizers: {
    label: "Organizers",
    description: "See every organizer, and suspend or reactivate one.",
  },
  events: {
    label: "Events",
    description: "Moderate any event, and work the flagged-content queue.",
  },
  vendors: { label: "Vendors", description: "Approve, reject and suspend vendors." },
  support: { label: "Support", description: "Read and answer support tickets." },
  categories: { label: "Categories", description: "Manage event categories and decide requests." },
  tenants: {
    label: "Tenant accounts",
    description: "Create logins, change plans, and grant or deny features.",
  },
  plans: {
    label: "Plans",
    description: "Edit plan prices and every included feature, including the free set.",
  },
  website: {
    label: "Website",
    description: "Edit marketing pages, legal docs, contact inbox, and public site settings.",
  },
};

export function isStoredAdminType(value: unknown): boolean {
  const t = String(value ?? "")
    .trim()
    .toLowerCase();
  return t === "admin" || t === "platform_admin";
}

export function isAdminArea(value: unknown): value is AdminArea {
  return typeof value === "string" && (ADMIN_AREAS as readonly string[]).includes(value);
}

/** Fine-grained write caps on `/admin/tenants` (page still needs `holdsArea('tenants')`). */
export const TENANT_CAPS = [
  "tenants:create",
  "plans:change",
  "grants:manage",
  "pricing:manage",
  "approvals:manage",
] as const;

export type TenantCap = (typeof TENANT_CAPS)[number];

export const TENANT_CAP_META: Record<TenantCap, { label: string; description: string }> = {
  "tenants:create": {
    label: "Create tenants",
    description: "Provision department, organizer, and vendor logins.",
  },
  "plans:change": {
    label: "Change plans",
    description: "Upgrade or downgrade a tenant’s subscription plan.",
  },
  "grants:manage": {
    label: "Grant / deny features",
    description: "Create, edit, and clear feature overrides.",
  },
  "pricing:manage": {
    label: "Custom pricing",
    description: "Create and end custom pricing agreements.",
  },
  "approvals:manage": {
    label: "Approvals",
    description: "Approve or reject pending tenant applications.",
  },
};

export function isTenantCap(value: unknown): value is TenantCap {
  return typeof value === "string" && (TENANT_CAPS as readonly string[]).includes(value);
}

/**
 * Write gate for tenant actions. Owner has all. Legacy `tenants:manage` (or bare
 * `tenants`) implies every cap. Otherwise the specific cap must be present.
 */
export function canTenantCap(
  identity: Pick<AdminIdentity, "isOwner" | "permissions">,
  cap: TenantCap,
): boolean {
  if (identity.isOwner) return true;
  if (canManageArea(identity, "tenants")) return true;
  return identity.permissions.map(String).includes(cap);
}

/** Fine-grained caps on `/admin/website` (page still needs `website:view`). */
export const WEBSITE_CAPS = [
  "website:view",
  "website:edit",
  "website:publish",
  "legal:publish",
  "contact:manage",
  "community:view",
] as const;

export type WebsiteCap = (typeof WEBSITE_CAPS)[number];

export const WEBSITE_CAP_META: Record<WebsiteCap, { label: string; description: string }> = {
  "website:view": { label: "View website CMS", description: "Open the website management area." },
  "website:edit": {
    label: "Edit drafts",
    description: "Change page blocks and site content drafts.",
  },
  "website:publish": {
    label: "Publish pages",
    description: "Publish marketing page drafts to the live site.",
  },
  "legal:publish": {
    label: "Publish legal",
    description: "Publish Privacy, Terms, and Cookies versions.",
  },
  "contact:manage": {
    label: "Contact inbox",
    description: "Triage and reply to contact form messages.",
  },
  "community:view": {
    label: "Community consents",
    description: "View opted-in community / product update lists.",
  },
};

export function isWebsiteCap(value: unknown): value is WebsiteCap {
  return typeof value === "string" && (WEBSITE_CAPS as readonly string[]).includes(value);
}

/**
 * Write/view gate for website CMS actions. Owner has all.
 * Legacy `website:manage` (or bare `website`) implies view+edit only;
 * publish / legal / contact / community still need the explicit cap (or owner).
 */
export function canWebsiteCap(
  identity: Pick<AdminIdentity, "isOwner" | "permissions">,
  cap: WebsiteCap,
): boolean {
  if (identity.isOwner) return true;
  const perms = identity.permissions.map(String);
  if (perms.includes(cap)) return true;
  const legacyManage = perms.includes("website:manage") || perms.includes("website");
  if (legacyManage && (cap === "website:view" || cap === "website:edit")) return true;
  return false;
}

/**
 * Who the caller is, once `requireAdmin` has admitted them.
 *
 * `isOwner` is not one permission among the others: it implies every area AND
 * the right to manage other admins, which is deliberately not an area itself.
 * Making "can create admins" a tickable box would let an admin grant it to
 * themselves the moment they held the box.
 */
export type AdminCapability = "view" | "manage";

export interface AdminIdentity {
  userId: string;
  email: string;
  name: string;
  isOwner: boolean;
  /**
   * Normalized grants (`area:view` / `area:manage`). Ignored when `isOwner`.
   * Legacy bare area strings are expanded on load via `normalizeAdminGrants`.
   */
  permissions: string[];
  /** True when they are here through PLATFORM_ADMIN_EMAILS rather than a stored role. */
  viaBootstrap: boolean;
}

/** Expand legacy bare areas to view+manage; keep explicit view/manage grants. */
export function normalizeAdminGrants(raw: unknown[]): string[] {
  const out = new Set<string>();
  for (const value of raw) {
    const s = String(value ?? "").trim();
    if (!s) continue;
    if (isAdminArea(s)) {
      out.add(`${s}:view`);
      out.add(`${s}:manage`);
      continue;
    }
    const [area, cap] = s.split(":");
    if (isAdminArea(area) && (cap === "view" || cap === "manage")) {
      out.add(`${area}:${cap}`);
      if (cap === "manage") out.add(`${area}:view`);
    }
  }
  return [...out];
}

/**
 * View (or manage) access for a panel area.
 * Owner holds everything. Staff need `area:view` or `area:manage` (or legacy bare area).
 */
export function holdsArea(
  identity: Pick<AdminIdentity, "isOwner" | "permissions">,
  area: AdminArea,
): boolean {
  if (identity.isOwner) return true;
  if (!isAdminArea(area)) return false;
  const grants = normalizeAdminGrants(identity.permissions);
  return (
    grants.includes(`${area}:view`) || grants.includes(`${area}:manage`) || grants.includes(area)
  );
}

/** Manage (status actions / writes) for a panel area. */
export function canManageArea(
  identity: Pick<AdminIdentity, "isOwner" | "permissions">,
  area: AdminArea,
): boolean {
  if (identity.isOwner) return true;
  if (!isAdminArea(area)) return false;
  const grants = normalizeAdminGrants(identity.permissions);
  return grants.includes(`${area}:manage`) || grants.includes(area);
}

/** Every area this admin can actually reach, for the nav. */
export function areasFor(identity: Pick<AdminIdentity, "isOwner" | "permissions">): AdminArea[] {
  return ADMIN_AREAS.filter((area) => holdsArea(identity, area));
}

/**
 * Persist grants from the staff editor.
 * Accepts bare areas, `area:view`, `area:manage`, plus TENANT_CAPS and WEBSITE_CAPS.
 * Manage implies view on write.
 */
export function sanitizeAreas(raw: unknown[]): string[] {
  const areas = normalizeAdminGrants(raw);
  const caps = raw.map(String).filter((v) => isTenantCap(v) || isWebsiteCap(v));
  return [...new Set([...areas, ...caps])];
}

/* ------------------------------------------------- the moderation record */

export type ModerationTarget = "event" | "organizer" | "vendor" | "website";

export const MODERATION_ACTIONS = [
  "unpublished",
  "removed",
  "restored",
  "suspended",
  "reactivated",
  "approved",
  "rejected",
  "report_dismissed",
  "published",
  "updated",
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
  /** From moderation_logs.extra jsonb (e.g. `{ notified: true }`). */
  extra?: Record<string, unknown> | null;
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

/** One row of the owner's platform staff list. */
export interface AdminRecordRow {
  userId: string;
  email: string;
  name: string;
  isOwner: boolean;
  permissions: string[];
  accountStatus: string;
  createdAt: string;
  avatarUrl: string;
}

/** One row of the organizer table (spec 9.3). */
export interface OrganizerRow {
  organizerId: string;
  userId: string;
  name: string;
  email: string;
  /** ISO. `Organizer.createdAt` is the nearest thing to a signup date. */
  signedUpAt: string;
  /** Best available activity: last_active_at → last_login_at → updated_at. */
  lastActiveAt: string;
  eventCount: number;
  liveEventCount: number;
  accountStatus: AccountStatus;
  planType: string;
  /** From `organizer_profiles.review_status` (pending | approved | rejected | flagged). */
  reviewStatus: string;
  /** Linked org when this profile belongs to a department/club tenant. */
  orgId: string | null;
}

/** One row of the vendor table (spec 9.6). Matches Postgres check constraint. */
export interface VendorRow {
  vendorId: string;
  businessName: string;
  email: string;
  phone: string;
  address: string;
  status: VendorStatus;
  averageRating: number;
  totalReviews: number;
  serviceCategories: string[];
  pricingPackages: { name: string; price: string; description: string }[];
  portfolio: { url: string; kind: "image" | "video" }[];
  isVerified: boolean;
  totalBookings: number;
  completedBookings: number;
  createdAt: string;
}

/**
 * Vendor statuses stored in `vendor_profiles.status`
 * (pending | approved | suspended | rejected). Legacy `active` normalizes to `approved`.
 */
export const VENDOR_STATUSES = ["pending", "approved", "rejected", "suspended"] as const;

export type VendorStatus = (typeof VENDOR_STATUSES)[number];

export function normalizeVendorStatus(value: unknown): VendorStatus {
  const s = String(value ?? "pending").toLowerCase();
  if (s === "active") return "approved";
  if (s === "approved" || s === "pending" || s === "rejected" || s === "suspended") return s;
  return "pending";
}

export function isVendorStatus(value: unknown): value is VendorStatus {
  return typeof value === "string" && (VENDOR_STATUSES as readonly string[]).includes(value);
}

/** Only an approved vendor is bookable. */
export function vendorIsBookable(status: unknown): boolean {
  return normalizeVendorStatus(status) === "approved";
}
