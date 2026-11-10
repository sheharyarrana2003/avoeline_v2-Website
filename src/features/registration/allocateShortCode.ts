import "server-only";

import { generateShortCode } from "@/src/features/registration/shortCode";

const MAX_ATTEMPTS = 8;

/**
 * Call `tryInsert(code)` until it returns ok or throws a non-collision error.
 * `isCollision` detects Postgres unique violations on short_code.
 */
export async function allocateShortCode<T>(
  tryInsert: (shortCode: string) => Promise<{ ok: true; data: T } | { ok: false; collision: true }>,
): Promise<T> {
  let lastCollision = false;
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const code = generateShortCode();
    const result = await tryInsert(code);
    if (result.ok) return result.data;
    lastCollision = true;
  }
  throw new Error(
    lastCollision
      ? `Could not allocate a unique short_code after ${MAX_ATTEMPTS} attempts`
      : "Could not allocate short_code",
  );
}

export function isShortCodeUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; message?: string; details?: string } | null;
  if (!e) return false;
  if (e.code === "23505") {
    const blob = `${e.message || ""} ${e.details || ""}`.toLowerCase();
    return blob.includes("short_code") || blob.includes("registrations_short_code");
  }
  return false;
}
