import { createHash } from "crypto";
import { rateLimit, type RateLimitResult } from "@/src/lib/rateLimit";
import {
  sanitizeContactHeader,
  isContactHoneypotTripped,
  scoreContactSpam,
  buildContactNotifySubject,
  buildContactNotifyText,
  buildContactAutoReplyText,
  CONTACT_TOPICS,
  CONTACT_TOPIC_LABELS,
  type ContactTopic,
} from "./contact.shared";

export {
  sanitizeContactHeader,
  isContactHoneypotTripped,
  scoreContactSpam,
  buildContactNotifySubject,
  buildContactNotifyText,
  buildContactAutoReplyText,
  CONTACT_TOPICS,
  CONTACT_TOPIC_LABELS,
  type ContactTopic,
};

/** Fallback salt when no env secret is configured (IP hashes stay non-reversible enough for abuse keys). */
export const CONTACT_IP_HASH_FALLBACK_SALT = "avoeline-contact-ip-v1";

/** Max submissions per IP hash inside the window. */
export const CONTACT_RATE_LIMIT = 5;
/** Rate-limit window in seconds (1 hour). */
export const CONTACT_RATE_WINDOW_SEC = 60 * 60;

export function hashContactIp(ip: string, salt: string = CONTACT_IP_HASH_FALLBACK_SALT): string {
  const material = `${String(ip || "anon").trim()}|${salt}`;
  return createHash("sha256").update(material).digest("hex");
}

export function contactRateLimitKey(ipHash: string): string {
  return `contact:${ipHash}`;
}

/** Rate-limit a hashed IP for the contact form. */
export function checkContactRateLimit(ipHash: string): RateLimitResult {
  return rateLimit(contactRateLimitKey(ipHash), CONTACT_RATE_LIMIT, CONTACT_RATE_WINDOW_SEC);
}

/** When a Turnstile secret is configured, a non-empty token is required. */
export function isTurnstileRequired(secret: string | null | undefined): boolean {
  return Boolean(String(secret ?? "").trim());
}

/**
 * Pure gate mirroring contact.action verifyTurnstile early exits:
 * missing secret → pass; secret set without token → fail.
 */
export function assertTurnstileTokenPresent(opts: {
  secret: string | null | undefined;
  token: string | null | undefined;
}): { ok: true } | { ok: false; message: string } {
  if (!isTurnstileRequired(opts.secret)) return { ok: true };
  if (!String(opts.token ?? "").trim()) {
    return { ok: false, message: "Please complete the captcha." };
  }
  return { ok: true };
}
