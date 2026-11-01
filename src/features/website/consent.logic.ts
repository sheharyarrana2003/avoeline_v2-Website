import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";

export const CONSENT_HASH_FALLBACK_SALT = "avoeline-consent-v1";
export const MARKETING_SCOPES = ["product_updates", "community"] as const;
export type MarketingScope = (typeof MARKETING_SCOPES)[number];

export const COMMUNITY_SEND_CAP = 100;
export const INSIGHTS_MIN_BUCKET = 5;

export function hashConsentMaterial(
  value: string,
  salt: string = CONSENT_HASH_FALLBACK_SALT,
): string {
  return createHash("sha256")
    .update(
      `${String(value || "")
        .trim()
        .toLowerCase()}|${salt}`,
    )
    .digest("hex");
}

export function hashEmail(email: string, salt?: string): string {
  return hashConsentMaterial(email, salt);
}

export function hashIp(ip: string, salt?: string): string {
  return hashConsentMaterial(ip || "anon", salt);
}

export function mintUnsubscribeToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString("base64url");
  return { raw, hash: hashConsentMaterial(raw, "unsub") };
}

export function hashUnsubscribeToken(raw: string): string {
  return hashConsentMaterial(raw, "unsub");
}

/** HMAC payload for unsubscribe URLs: email|scope|nonce */
export function signUnsubscribePayload(
  payload: { email: string; scope: MarketingScope; nonce: string },
  secret: string,
): string {
  const body = `${payload.email.trim().toLowerCase()}|${payload.scope}|${payload.nonce}`;
  return createHmac("sha256", secret).update(body).digest("base64url");
}

export function buildUnsubscribeToken(opts: {
  email: string;
  scope: MarketingScope;
  secret: string;
  nonce?: string;
}): string {
  const nonce = opts.nonce ?? randomBytes(16).toString("base64url");
  const sig = signUnsubscribePayload({ email: opts.email, scope: opts.scope, nonce }, opts.secret);
  const packed = `${opts.email.trim().toLowerCase()}|${opts.scope}|${nonce}|${sig}`;
  return Buffer.from(packed, "utf8").toString("base64url");
}

export type ParsedUnsubscribe =
  { ok: true; email: string; scope: MarketingScope; nonce: string } | { ok: false; error: string };

export function parseAndVerifyUnsubscribeToken(raw: string, secret: string): ParsedUnsubscribe {
  try {
    const packed = Buffer.from(String(raw || ""), "base64url").toString("utf8");
    const [email, scope, nonce, sig] = packed.split("|");
    if (!email || !scope || !nonce || !sig) return { ok: false, error: "Invalid token." };
    if (!(MARKETING_SCOPES as readonly string[]).includes(scope)) {
      return { ok: false, error: "Invalid scope." };
    }
    const expected = signUnsubscribePayload(
      { email, scope: scope as MarketingScope, nonce },
      secret,
    );
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { ok: false, error: "Invalid token." };
    }
    return { ok: true, email, scope: scope as MarketingScope, nonce };
  } catch {
    return { ok: false, error: "Invalid token." };
  }
}

export function isActiveMarketingConsent(row: { withdrawn_at: string | null }): boolean {
  return row.withdrawn_at == null;
}

/** Defense-in-depth: hide aggregate buckets below the suppression floor. */
export function suppressBuckets<T extends { count: number }>(
  rows: T[] | null | undefined,
  min = INSIGHTS_MIN_BUCKET,
): T[] {
  if (!Array.isArray(rows)) return [];
  return rows.filter((r) => Number(r.count) >= min);
}

/** Community list must never be built from registration emails. */
export function filterCommunityListOnly(
  consents: Array<{ email: string; withdrawn_at: string | null }>,
  _registrationEmails?: string[],
): Array<{ email: string; withdrawn_at: string | null }> {
  // Intentionally ignore registration emails — hard rule from docs/19 §0.
  void _registrationEmails;
  return consents.filter(isActiveMarketingConsent);
}

export function assertStaffPiiReason(
  reason: string | null | undefined,
): { ok: true; reason: string } | { ok: false; error: string } {
  const trimmed = String(reason ?? "").trim();
  if (trimmed.length < 8) {
    return { ok: false, error: "A support reason of at least 8 characters is required." };
  }
  if (trimmed.length > 500) {
    return { ok: false, error: "Reason is too long." };
  }
  return { ok: true, reason: trimmed };
}

export const DEFAULT_COMMUNITY_OPT_IN = false;

export function requireLegalAcceptance(
  accepted: boolean,
): { ok: true } | { ok: false; error: string } {
  if (!accepted) {
    return { ok: false, error: "You must accept the Terms and Privacy Policy to continue." };
  }
  return { ok: true };
}
