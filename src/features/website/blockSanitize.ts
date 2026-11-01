import type { Json } from "@/src/lib/database.types";
import { isBlockType, parseBlockDraft } from "./blocks/schemas";
import { sanitizeLegalMarkdown } from "./legalMarkdown";

function hasUrl(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function hasAlt(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Zod-parse a block draft, strip XSS from markdown fields, and require alt text
 * when media URLs are present.
 */
export function sanitizeDraftPayload(
  type: string,
  draft: unknown,
): { ok: true; draft: Json } | { ok: false; error: string } {
  if (!isBlockType(type)) return { ok: false, error: "Unknown block type" };
  const parsed = parseBlockDraft(type, draft);
  if (!parsed.ok) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid draft" };
  const data = { ...parsed.data } as Record<string, unknown>;

  if (type === "rich_text" && typeof data.markdown === "string") {
    data.markdown = sanitizeLegalMarkdown(data.markdown);
  }

  if (type === "faq" && Array.isArray(data.items)) {
    data.items = data.items.map((item) => {
      if (!item || typeof item !== "object") return item;
      const row = item as Record<string, unknown>;
      if (typeof row.answer === "string") {
        return { ...row, answer: sanitizeLegalMarkdown(row.answer) };
      }
      return row;
    });
  }

  if (type === "hero") {
    if (hasUrl(data.imageUrl) && !hasAlt(data.imageAlt)) {
      return { ok: false, error: "Hero imageAlt is required when imageUrl is set." };
    }
  }

  if (type === "event_showcase" && Array.isArray(data.items)) {
    for (const item of data.items) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      if (hasUrl(row.imageUrl) && !hasAlt(row.imageAlt)) {
        return { ok: false, error: "Event imageAlt is required when imageUrl is set." };
      }
    }
  }

  if (type === "logo_wall" && Array.isArray(data.items)) {
    for (const item of data.items) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      if (hasUrl(row.logoUrl) && !hasAlt(row.alt)) {
        return { ok: false, error: "Logo alt is required when logoUrl is set." };
      }
    }
  }

  return { ok: true, draft: data as Json };
}
