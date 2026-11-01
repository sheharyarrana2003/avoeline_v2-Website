/**
 * Thin server logger. Prefer this over console.* so PII/secrets stay out of
 * client bundles and we can swap the sink later (ENGINEERING_RULES C5 / S17).
 */

type Meta = Record<string, unknown>;

function scrub(meta?: Meta): Meta | undefined {
  if (!meta) return undefined;
  const out: Meta = {};
  for (const [key, value] of Object.entries(meta)) {
    const lower = key.toLowerCase();
    if (
      lower.includes("password") ||
      lower.includes("secret") ||
      lower.includes("token") ||
      lower.includes("authorization") ||
      lower.includes("cookie") ||
      lower === "flag" ||
      lower.includes("accesscode") ||
      lower.includes("private_key")
    ) {
      out[key] = "[redacted]";
      continue;
    }
    if (typeof value === "string" && value.includes("@") && value.includes(".")) {
      const [user, domain] = value.split("@");
      out[key] = `${user.slice(0, 1)}…@${domain}`;
      continue;
    }
    out[key] = value;
  }
  return out;
}

export const logger = {
  info(message: string, meta?: Meta): void {
    console.info(message, scrub(meta) ?? "");
  },
  warn(message: string, meta?: Meta): void {
    console.warn(message, scrub(meta) ?? "");
  },
  error(message: string, meta?: Meta): void {
    console.error(message, scrub(meta) ?? "");
  },
};
