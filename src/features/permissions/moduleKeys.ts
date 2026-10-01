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

export type FreeModuleKey = (typeof FREE_MODULE_KEYS)[number];
export type PaidModuleKey = (typeof PAID_MODULE_KEYS)[number];
export type ModuleKey = FreeModuleKey | PaidModuleKey;

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
};

export const ALL_MODULE_KEYS: ModuleKey[] = [...FREE_MODULE_KEYS, ...PAID_MODULE_KEYS];

export function isFreeModule(key: string): key is FreeModuleKey {
  return (FREE_MODULE_KEYS as readonly string[]).includes(key);
}

export function isModuleKey(key: string): key is ModuleKey {
  return (ALL_MODULE_KEYS as readonly string[]).includes(key);
}
