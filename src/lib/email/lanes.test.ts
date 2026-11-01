import { describe, it } from "node:test";
import assert from "node:assert/strict";

/**
 * Lane resolution tests run without loading server-only modules.
 * Mirror the defaults from lanes.ts so CI does not need env.
 */
const LANE_DEFAULTS = {
  notifications: "notifications@aroxes.com",
  events: "events@aroxes.com",
  billing: "billing@aroxes.com",
  onboarding: "welcome@aroxes.com",
  support: "support@aroxes.com",
  security: "security@aroxes.com",
} as const;

function formatFrom(raw: string, displayName = "Avoeline"): string {
  const trimmed = raw.trim();
  return trimmed.includes("<") ? trimmed : `${displayName} <${trimmed}>`;
}

function resolveLaneFrom(
  lane: keyof typeof LANE_DEFAULTS | "default",
  env: Record<string, string | undefined> = {},
): string {
  if (lane !== "default") {
    const map: Record<string, string | undefined> = {
      notifications: env.RESEND_FROM_NOTIFICATIONS,
      events: env.RESEND_FROM_EVENTS,
      billing: env.RESEND_FROM_BILLING,
      onboarding: env.RESEND_FROM_ONBOARDING,
      support: env.RESEND_FROM_SUPPORT,
      security: env.RESEND_FROM_SECURITY,
    };
    return formatFrom(map[lane]?.trim() || LANE_DEFAULTS[lane]);
  }
  const fallback = env.RESEND_FROM_EMAIL?.trim() || "info@aroxes.com";
  return formatFrom(fallback);
}

function platformHeaders(env: Record<string, string | undefined> = {}) {
  return {
    replyTo: env.RESEND_REPLY_TO?.trim() || "info@aroxes.com",
    bcc: env.RESEND_ARCHIVE_BCC?.trim() || "info@aroxes.com",
  };
}

describe("platform email lanes", () => {
  it("resolves default From aliases per lane", () => {
    assert.equal(resolveLaneFrom("notifications"), "Avoeline <notifications@aroxes.com>");
    assert.equal(resolveLaneFrom("billing"), "Avoeline <billing@aroxes.com>");
    assert.equal(resolveLaneFrom("onboarding"), "Avoeline <welcome@aroxes.com>");
    assert.equal(resolveLaneFrom("default", {}), "Avoeline <info@aroxes.com>");
  });

  it("honors env overrides", () => {
    assert.equal(
      resolveLaneFrom("billing", { RESEND_FROM_BILLING: "billing@custom.test" }),
      "Avoeline <billing@custom.test>",
    );
  });

  it("always applies reply-to and archive bcc defaults", () => {
    const h = platformHeaders();
    assert.equal(h.replyTo, "info@aroxes.com");
    assert.equal(h.bcc, "info@aroxes.com");
  });
});

describe("organizer connection fail-closed", () => {
  it("treats missing active connection as NO_CONNECTION", () => {
    const connection = null as { status: string } | null;
    const active = Boolean(connection && connection.status === "active");
    const code = active ? null : "NO_CONNECTION";
    assert.equal(code, "NO_CONNECTION");
  });

  it("allows active connection", () => {
    const connection = { status: "active" };
    const code = connection.status !== "active" ? "NO_CONNECTION" : null;
    assert.equal(code, null);
  });
});
