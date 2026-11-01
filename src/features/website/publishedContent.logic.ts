import type { Json } from "@/src/lib/database.types";

/** Public marketing loaders must only surface published pages. */
export function isPublicPageEligible(status: string | null | undefined): boolean {
  return status === "published";
}

/**
 * Contract for public block payloads: only `published` jsonb is rendered.
 * Draft jsonb must never be selected for anonymous marketing views.
 */
export function selectPublicBlockPayload(block: {
  published: Json | null;
  draft?: Json | null;
}): Json | null {
  return block.published ?? null;
}

export function isPublicBlockRenderable(block: {
  visible: boolean;
  published: Json | null;
  draft?: Json | null;
}): boolean {
  return block.visible === true && selectPublicBlockPayload(block) != null;
}
