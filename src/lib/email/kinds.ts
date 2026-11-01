import type { PlatformEmailLane } from "./lanes";

/**
 * Allowlisted platform email kinds for tenant / SaaS mail (docs/16).
 * Never invent a kind at a call site — extend this catalog instead.
 */
export const PLATFORM_EMAIL_KINDS = [
  "admin_account_setup",
  "billing_notice",
  "owner_notification",
  "legal_update",
  "community_update",
] as const;

export type PlatformEmailKind = (typeof PLATFORM_EMAIL_KINDS)[number];

export function isPlatformEmailKind(value: unknown): value is PlatformEmailKind {
  return typeof value === "string" && (PLATFORM_EMAIL_KINDS as readonly string[]).includes(value);
}

/** Lane mapping for allowlisted kinds. */
export const KIND_LANE: Record<PlatformEmailKind, PlatformEmailLane> = {
  admin_account_setup: "onboarding",
  billing_notice: "billing",
  owner_notification: "notifications",
  legal_update: "notifications",
  community_update: "notifications",
};

/**
 * Essential kinds always attempt send even when the daily cap is near.
 * Others are queued when remaining capacity is at or below the reserve.
 */
export const ESSENTIAL_EMAIL_KINDS: ReadonlySet<PlatformEmailKind> = new Set([
  "admin_account_setup",
]);

/** Default daily send budget and how many slots to reserve for essential kinds. */
export const DEFAULT_PLATFORM_EMAIL_DAILY_CAP = 500;
export const DEFAULT_PLATFORM_EMAIL_ESSENTIAL_RESERVE = 50;

export function coalesceWindowMs(): number {
  return 10 * 60 * 1000;
}
