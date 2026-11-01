import { createHash, createHmac, timingSafeEqual } from "crypto";
import { requireCompeteSecret } from "@/src/env";

/** HMAC-SHA256(server secret, salt|flag). New writes use this; flagsMatch accepts legacy SHA256. */
export function hashFlag(value: string, salt = ""): string {
  const secret = requireCompeteSecret();
  return createHmac("sha256", secret).update(`${salt}|${value.trim()}`).digest("hex");
}

function safeEqualHex(left: string, right: string): boolean {
  try {
    const a = Buffer.from(left, "hex");
    const b = Buffer.from(right, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function flagsMatch(
  submitted: string,
  storedHash: string | null | undefined,
  salt = "",
): boolean {
  if (!storedHash) return false;
  const trimmed = submitted.trim();
  if (safeEqualHex(hashFlag(trimmed, salt), storedHash)) return true;
  if (salt && safeEqualHex(hashFlag(trimmed, ""), storedHash)) return true;
  const legacy = createHash("sha256").update(trimmed).digest("hex");
  return safeEqualHex(legacy, storedHash);
}
