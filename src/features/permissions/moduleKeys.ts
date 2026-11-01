/** Single source of truth for plan gating (docs/04-organizer.md). Client-safe. */

export const FREE_MODULE_KEYS = [
  "events_dashboard",
  "ai_planner",
  "analytics_basic",
  "registrations",
  "access_control",
  "sponsors_basic",
  "teams_basic",
] as const;

export const PAID_MODULE_KEYS = [
  "teams_advanced_roles",
  "vendor_store",
  "certificates",
  "api_access",
  "website_builder",
  "ai_designer",
  "ushers_ops",
  "hackathon_ops",
  "sponsors_invoicing_templates",
] as const;

/** Vendor free modules (marketplace vendor dashboard). */
export const VENDOR_FREE_MODULE_KEYS = [
  "vendor_dashboard",
  "vendor_quotes",
  "vendor_services",
  "vendor_bookings",
] as const;

/**
 * Paid vendor modules.
 * - `vendor_portfolio`: portfolio images/videos (gated on free).
 * - `vendor_event_marketing`: soft-gate for “market event” UI when added; Plans can toggle it.
 * - `vendor_analytics`: vendor analytics.
 */
export const VENDOR_PAID_MODULE_KEYS = [
  "vendor_portfolio",
  "vendor_event_marketing",
  "vendor_analytics",
] as const;

export type FreeModuleKey = (typeof FREE_MODULE_KEYS)[number];
export type PaidModuleKey = (typeof PAID_MODULE_KEYS)[number];
export type VendorFreeModuleKey = (typeof VENDOR_FREE_MODULE_KEYS)[number];
export type VendorPaidModuleKey = (typeof VENDOR_PAID_MODULE_KEYS)[number];
export type VendorModuleKey = VendorFreeModuleKey | VendorPaidModuleKey;
export type ModuleKey = FreeModuleKey | PaidModuleKey | VendorModuleKey;

export const MODULE_LABELS: Record<ModuleKey, string> = {
  events_dashboard: "Event Dashboard",
  ai_planner: "AI Planner",
  analytics_basic: "Analytics",
  registrations: "Registrations",
  access_control: "Access control",
  sponsors_basic: "Sponsors",
  teams_basic: "Teams",
  teams_advanced_roles: "Advanced team roles",
  vendor_store: "Vendor Store",
  certificates: "Certificates",
  api_access: "API access",
  website_builder: "Website Builder",
  ai_designer: "AI Designer",
  ushers_ops: "Ushers / on-ground ops",
  hackathon_ops: "Hackathon",
  sponsors_invoicing_templates: "Sponsor invoicing",
  vendor_dashboard: "Vendor dashboard",
  vendor_quotes: "Quotes",
  vendor_services: "Services",
  vendor_bookings: "Bookings",
  vendor_portfolio: "Portfolio highlights",
  vendor_event_marketing: "Event marketing",
  vendor_analytics: "Vendor analytics",
};

export const ORGANIZER_MODULE_KEYS: ModuleKey[] = [...FREE_MODULE_KEYS, ...PAID_MODULE_KEYS];
export const VENDOR_MODULE_KEYS: ModuleKey[] = [
  ...VENDOR_FREE_MODULE_KEYS,
  ...VENDOR_PAID_MODULE_KEYS,
];
export const ALL_MODULE_KEYS: ModuleKey[] = [...ORGANIZER_MODULE_KEYS, ...VENDOR_MODULE_KEYS];

export function isVendorModule(key: string): key is VendorModuleKey {
  return (VENDOR_MODULE_KEYS as readonly string[]).includes(key);
}

export function isOrganizerModule(key: string): boolean {
  return (ORGANIZER_MODULE_KEYS as readonly string[]).includes(key);
}

export function isFreeModule(key: string): key is FreeModuleKey {
  return (FREE_MODULE_KEYS as readonly string[]).includes(key);
}

export function isModuleKey(key: string): key is ModuleKey {
  return (ALL_MODULE_KEYS as readonly string[]).includes(key);
}
