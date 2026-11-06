import { createHmac, randomBytes, timingSafeEqual } from "crypto";

/** HMAC payload: email|ownerId|nonce — organizer-scoped unsubscribe into email_suppressions. */
export function signOrganizerUnsubPayload(
  payload: { email: string; ownerId: string; nonce: string },
  secret: string,
): string {
  const body = `${payload.email.trim().toLowerCase()}|${payload.ownerId}|${payload.nonce}`;
  return createHmac("sha256", secret).update(body).digest("base64url");
}

export function buildOrganizerUnsubscribeToken(opts: {
  email: string;
  ownerId: string;
  secret: string;
  nonce?: string;
}): string {
  const nonce = opts.nonce ?? randomBytes(16).toString("base64url");
  const sig = signOrganizerUnsubPayload(
    { email: opts.email, ownerId: opts.ownerId, nonce },
    opts.secret,
  );
  const packed = `${opts.email.trim().toLowerCase()}|${opts.ownerId}|${nonce}|${sig}`;
  return Buffer.from(packed, "utf8").toString("base64url");
}

export type ParsedOrganizerUnsub =
  { ok: true; email: string; ownerId: string; nonce: string } | { ok: false; error: string };

export function parseAndVerifyOrganizerUnsubToken(
  raw: string,
  secret: string,
): ParsedOrganizerUnsub {
  try {
    const packed = Buffer.from(String(raw || ""), "base64url").toString("utf8");
    const [email, ownerId, nonce, sig] = packed.split("|");
    if (!email || !ownerId || !nonce || !sig) return { ok: false, error: "Invalid token." };
    const expected = signOrganizerUnsubPayload({ email, ownerId, nonce }, secret);
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { ok: false, error: "Invalid token." };
    }
    return { ok: true, email, ownerId, nonce };
  } catch {
    return { ok: false, error: "Invalid token." };
  }
}

export function normalizeEmail(email: string): string {
  return String(email || "")
    .trim()
    .toLowerCase();
}
