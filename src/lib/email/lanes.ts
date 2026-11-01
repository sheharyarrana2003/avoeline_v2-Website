import "server-only";

import { getServerEnv } from "@/src/env";

/** Resend sandbox address — works without a verified domain. */
export const RESEND_TEST_FROM = "onboarding@resend.dev";

/** Platform Resend From lanes (aliases on the verified domain). */
export type PlatformEmailLane =
  "notifications" | "events" | "billing" | "onboarding" | "support" | "security" | "default";

const LANE_DEFAULTS: Record<Exclude<PlatformEmailLane, "default">, string> = {
  notifications: "notifications@aroxes.com",
  events: "events@aroxes.com",
  billing: "billing@aroxes.com",
  onboarding: "welcome@aroxes.com",
  support: "support@aroxes.com",
  security: "security@aroxes.com",
};

function formatFrom(raw: string, displayName = "Avoeline"): string {
  const trimmed = raw.trim();
  if (!trimmed) return `Avoeline <${RESEND_TEST_FROM}>`;
  return trimmed.includes("<") ? trimmed : `${displayName} <${trimmed}>`;
}

function envLaneFrom(lane: Exclude<PlatformEmailLane, "default">): string | undefined {
  const env = getServerEnv();
  const map: Record<Exclude<PlatformEmailLane, "default">, string | undefined> = {
    notifications: env.RESEND_FROM_NOTIFICATIONS,
    events: env.RESEND_FROM_EVENTS,
    billing: env.RESEND_FROM_BILLING,
    onboarding: env.RESEND_FROM_ONBOARDING,
    support: env.RESEND_FROM_SUPPORT,
    security: env.RESEND_FROM_SECURITY,
  };
  const value = map[lane]?.trim();
  return value || undefined;
}

/** Resolve the From address for a platform lane (display name included). */
export function resolveLaneFrom(lane: PlatformEmailLane = "default"): string {
  const env = getServerEnv();
  if (lane !== "default") {
    const override = envLaneFrom(lane);
    if (override) return formatFrom(override);
    return formatFrom(LANE_DEFAULTS[lane]);
  }
  const fallback =
    env.RESEND_FROM_EMAIL?.trim() || env.RESEND_FROM?.trim() || env.MAIL_FROM?.trim() || "";
  if (fallback) return formatFrom(fallback);
  if (env.RESEND_API_KEY?.trim()) return formatFrom(RESEND_TEST_FROM);
  return formatFrom("info@aroxes.com");
}

export function platformReplyTo(): string | undefined {
  const raw = getServerEnv().RESEND_REPLY_TO?.trim();
  return raw || "info@aroxes.com";
}

export function platformArchiveBcc(): string | undefined {
  const raw = getServerEnv().RESEND_ARCHIVE_BCC?.trim();
  return raw || "info@aroxes.com";
}

export { LANE_DEFAULTS };
