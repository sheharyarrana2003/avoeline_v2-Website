/**
 * Client-safe DTOs and enums for `/admin/events` moderation board.
 * No server imports — safe for Client Components.
 */

export const ADMIN_EVENT_TABS = ["all", "flagged", "log"] as const;
export type AdminEventTab = (typeof ADMIN_EVENT_TABS)[number];

export const PUBLICATION_FILTERS = [
  "draft",
  "published",
  "unpublished",
  "cancelled",
  "archived",
] as const;
export type PublicationFilter = (typeof PUBLICATION_FILTERS)[number];

export const TIMING_FILTERS = ["upcoming", "ongoing", "completed"] as const;
export type TimingFilter = (typeof TIMING_FILTERS)[number];

export const ACCESS_FILTERS = ["public", "private", "invite_only", "hybrid", "tiered"] as const;
export type AccessFilter = (typeof ACCESS_FILTERS)[number];

export const EVENT_SORTS = ["newest", "starts_soon", "most_regs", "recently_reported"] as const;
export type EventSort = (typeof EVENT_SORTS)[number];

export const LOG_ACTIONS = ["unpublished", "restored", "removed", "report_dismissed"] as const;
export type LogActionFilter = (typeof LOG_ACTIONS)[number];

export type AdminEventFilters = {
  tab: AdminEventTab;
  q: string;
  publication: PublicationFilter[];
  timing: TimingFilter[];
  access: AccessFilter[];
  categoryIds: string[];
  from: string;
  to: string;
  org: string;
  dept: string;
  hasRegs: boolean | null;
  sort: EventSort;
  cursor: string | null;
  /** Flagged / log extras */
  logAction: LogActionFilter[];
  logAdmin: string;
  logFrom: string;
  logTo: string;
  logQ: string;
  logCursor: string | null;
  flaggedCursor: string | null;
};

export type AdminEventTabCounts = {
  all: number;
  openReports: number;
  log: number;
};

export type CategoryOption = {
  id: string;
  label: string;
  /** Distinguishing hint when two categories share a display name */
  detail?: string;
};

export type HostParts = {
  organizerName: string;
  departmentName?: string;
  clubName?: string;
};

export type AdminModerationEventRow = {
  id: string;
  title: string;
  bannerImage: string | null;
  categoryId: string;
  categoryLabel: string;
  format: string;
  status: string;
  visibility: string;
  startDate: string | null;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  organizerId: string;
  orgId: string | null;
  totalSeats: number | null;
  registrationsCount: number;
  moderationUnpublished: boolean;
  createdAt: string;
  city: string | null;
  host: HostParts;
  openReportCount: number;
  latestReportAt: string | null;
};

export type FlaggedEventRow = {
  eventId: string;
  title: string;
  bannerImage: string | null;
  categoryLabel: string;
  format: string;
  status: string;
  moderationUnpublished: boolean;
  organizerId: string;
  host: HostParts;
  reportCount: number;
  latestReason: string;
  firstReportedAt: string;
  latestReportedAt: string;
};

export type EventReportRow = {
  id: string;
  eventId: string;
  eventTitle: string;
  reason: string;
  reporterEmail: string;
  status: "open" | "dismissed" | "actioned";
  createdAt: string;
  decidedAt: string | null;
  adminNote: string | null;
};

export type ModerationLogRow = {
  id: string;
  targetType: string;
  targetId: string;
  targetLabel: string;
  action: string;
  reason: string;
  adminId: string;
  adminEmail: string;
  createdAt: string;
  notified: boolean;
  bannerImage?: string | null;
};

export type AdminEventsBundle = {
  filters: AdminEventFilters;
  tabCounts: AdminEventTabCounts;
  events: AdminModerationEventRow[];
  eventsNextCursor: string | null;
  eventsTotalMatching: number;
  flagged: FlaggedEventRow[];
  flaggedNextCursor: string | null;
  log: ModerationLogRow[];
  logNextCursor: string | null;
  categories: CategoryOption[];
  orgOptions: { id: string; label: string }[];
  deptOptions: { id: string; label: string }[];
  canModerate: boolean;
  isOwner: boolean;
};

export const MODERATE_REASON_CHIPS = [
  "Misleading information",
  "Spam",
  "Inappropriate content",
  "Duplicate event",
  "Other",
] as const;

export const PUBLICATION_LABELS: Record<PublicationFilter, string> = {
  draft: "Draft",
  published: "Published",
  unpublished: "Unpublished by moderation",
  cancelled: "Cancelled",
  archived: "Archived",
};

export const TIMING_LABELS: Record<TimingFilter, string> = {
  upcoming: "Upcoming",
  ongoing: "Ongoing",
  completed: "Completed",
};

export const SORT_LABELS: Record<EventSort, string> = {
  newest: "Newest",
  starts_soon: "Starts soon",
  most_regs: "Most registrations",
  recently_reported: "Recently reported",
};
