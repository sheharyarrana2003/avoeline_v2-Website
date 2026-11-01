/** Client-safe types for `/admin/tenants` board. */

export const TENANT_BOARD_TABS = [
  "tenants",
  "approvals",
  "overrides",
  "pricing",
  "activity",
] as const;

export type TenantBoardTab = (typeof TENANT_BOARD_TABS)[number];

export const TENANT_TYPES = ["department", "organizer", "vendor"] as const;
export type TenantType = (typeof TENANT_TYPES)[number];

export const TENANT_STATUS_FILTERS = ["active", "suspended", "pending", "rejected"] as const;
export type TenantStatusFilter = (typeof TENANT_STATUS_FILTERS)[number];

export const TENANT_SORTS = ["name", "newest", "plan"] as const;
export type TenantSort = (typeof TENANT_SORTS)[number];

export const PAGE_SIZE = 24;

export type TenantBoardFilters = {
  tab: TenantBoardTab;
  q: string;
  type: TenantType[];
  plan: string[];
  status: TenantStatusFilter[];
  hasOverrides: boolean | null;
  expiringSoon: boolean | null;
  sort: TenantSort;
  page: number;
  /** Overrides tab filters */
  overrideEffect: ("grant" | "deny")[];
  overrideCursor: string | null;
  /** Activity */
  activityCursor: string | null;
};

export type TenantCardMetrics = {
  events: number;
  clubs: number;
  bookings: number;
};

export type TenantOverrideChip = {
  id: string;
  moduleKey: string;
  denied: boolean;
  expiresAt: string | null;
};

export type TenantBoardCard = {
  id: string;
  kind: TenantType;
  name: string;
  email: string;
  avatarUrl: string | null;
  planKey: string;
  planLabel: string;
  status: string;
  instituteName: string | null;
  orgId: string | null;
  detailHref: string;
  metrics: TenantCardMetrics;
  grants: number;
  denies: number;
  hasCustomPricing: boolean;
  earliestExpiry: string | null;
  createdAt: string;
};

export type PendingApprovalTile = {
  kind: "org" | "organizer" | "vendor";
  id: string;
  name: string;
  email: string | null;
  subtitle: string;
  createdAt: string | null;
};

export type OverrideListRow = {
  id: string;
  moduleKey: string;
  denied: boolean;
  reason: string | null;
  expiresAt: string | null;
  organizerId: string | null;
  targetOrgId: string | null;
  tenantName: string;
  tenantKind: TenantType | "org";
  createdAt: string;
};

export type PricingListRow = {
  id: string;
  organizerId: string;
  tenantName: string;
  discountPct: number | null;
  flatMonthly: number | null;
  notes: string | null;
  active: boolean;
  createdAt: string;
};

export type ActivityRow = {
  id: string;
  source: "moderation" | "email";
  title: string;
  detail: string;
  status: string | null;
  createdAt: string;
  emailLogId?: string;
  canResend?: boolean;
};

export type PlanOption = {
  key: string;
  name: string;
  audience: string | null;
  includedModules: string[];
};

export type InstituteOption = {
  id: string;
  name: string;
};

export type ClubOption = {
  id: string;
  name: string;
  parentId: string | null;
};

export type TenantCapsFlags = {
  create: boolean;
  changePlan: boolean;
  grants: boolean;
  pricing: boolean;
  approvals: boolean;
};

export type TenantBoardBundle = {
  filters: TenantBoardFilters;
  caps: TenantCapsFlags;
  plans: PlanOption[];
  institutes: InstituteOption[];
  clubs: ClubOption[];
  cards: TenantBoardCard[];
  totalCards: number;
  tabCounts: {
    tenants: number;
    approvals: number;
    overrides: number;
    pricing: number;
    activity: number;
  };
  approvals: {
    orgs: PendingApprovalTile[];
    organizers: PendingApprovalTile[];
    vendors: PendingApprovalTile[];
  };
  overrides: OverrideListRow[];
  overridesNextCursor: string | null;
  pricing: PricingListRow[];
  activity: ActivityRow[];
  activityNextCursor: string | null;
};
