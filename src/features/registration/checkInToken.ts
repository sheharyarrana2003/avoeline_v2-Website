import { createHmac, timingSafeEqual } from "crypto";
import { requireRegistrationQrSecret } from "@/src/env";

export type CheckInTokenPayload = {
  v: 1;
  rid: string;
  eid: string;
};

function secret(): string {
  return requireRegistrationQrSecret();
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

/** Opaque door token encoded into the QR (not a URL, not PII JSON). */
export function signCheckInToken(input: { registrationId: string; eventId: string }): string {
  const body: CheckInTokenPayload = {
    v: 1,
    rid: String(input.registrationId),
    eid: String(input.eventId),
  };
  const payload = Buffer.from(JSON.stringify(body), "utf8").toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyCheckInToken(raw: string | undefined | null): CheckInTokenPayload | null {
  if (!raw) return null;
  const token = String(raw).trim();
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;
  const payload = token.slice(0, dot);
  const mac = token.slice(dot + 1);
  if (!/^[0-9a-f]+$/i.test(mac)) return null;
  const expected = sign(payload);
  try {
    const a = Buffer.from(mac, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as CheckInTokenPayload;
    if (parsed?.v !== 1 || !parsed.rid || !parsed.eid) return null;
    return { v: 1, rid: String(parsed.rid), eid: String(parsed.eid) };
  } catch {
    return null;
  }
}

/** Public PNG path for on-demand QR (token is URL-encoded). */
export function checkInQrImagePath(token: string): string {
  return `/api/qr/${encodeURIComponent(token)}.png`;
}
