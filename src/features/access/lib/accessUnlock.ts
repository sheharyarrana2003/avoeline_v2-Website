import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_PREFIX = "avo_access_";
const TTL_MS = 12 * 60 * 60 * 1000; // 12h session unlock

function secret(): string {
  return (
    process.env.REGISTRATION_QR_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "dev-access-unlock"
  );
}

export function accessUnlockCookieName(eventId: string): string {
  return `${COOKIE_PREFIX}${eventId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 36)}`;
}

/** Signed payload: eventId.expiryMs.hmac */
export function mintAccessUnlockToken(eventId: string, now = Date.now()): string {
  const exp = String(now + TTL_MS);
  const body = `${eventId}.${exp}`;
  const sig = createHmac("sha256", secret()).update(body).digest("hex");
  return `${body}.${sig}`;
}

export function verifyAccessUnlockToken(
  eventId: string,
  token: string | null | undefined,
  now = Date.now(),
): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [id, expStr, sig] = parts;
  if (id !== eventId) return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || now > exp) return false;
  const body = `${id}.${expStr}`;
  const expected = createHmac("sha256", secret()).update(body).digest("hex");
  try {
    const a = Buffer.from(sig, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
