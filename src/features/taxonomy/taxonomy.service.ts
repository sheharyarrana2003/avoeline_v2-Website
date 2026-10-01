import { cache } from "react";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { toIsoString } from "@/src/lib/datetime";
import type { CustomFieldOption } from "@/src/services/models/event.model";
import type { TaxonomyEntry, TaxonomyKind, TaxonomyStatus } from "./types";

export function collectionFor(kind: TaxonomyKind): string {
  return TABLES.EVENT_CATEGORIES;
}

function mapToFields(raw: unknown): CustomFieldOption[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((f) => f && (f.fieldId || f.label || f.key))
    .map((f) => ({
      fieldId: String(f.fieldId || f.key || ""),
      label: String(f.label || ""),
      type: f.type === "dropdown" || f.type === "checkbox" || f.type === "number" ? f.type : "text",
      options: Array.isArray(f.options) ? f.options.map(String) : [],
      required: !!f.required,
    }));
}

export function categoryTypeFor(kind: TaxonomyKind): "event_format" | "super_category" {
  return kind === "format" ? "event_format" : "super_category";
}

function mapToTaxonomyEntry(raw: Record<string, unknown>, kind: TaxonomyKind): TaxonomyEntry {
  const extra = (raw.extra && typeof raw.extra === "object" ? raw.extra : {}) as Record<string, unknown>;
  const rawStatus = String(extra.status || "approved");
  const status: TaxonomyStatus = rawStatus === "pending" || rawStatus === "rejected" ? rawStatus : "approved";
  return {
    id: String(raw.id || ""),
    kind,
    name: String(raw.name || ""),
    description: String(raw.description || ""),
    active: raw.active !== false,
    status,
    checklist: Array.isArray(raw.checklist) ? raw.checklist.map((c: unknown) => (typeof c === "string" ? c : String((c as { title?: string }).title || ""))).filter(Boolean) : [],
    fields: mapToFields(extra.fields),
    requestedBy: extra.requestedBy ? String(extra.requestedBy) : null,
    requestedByName: String(extra.requestedByName || ""),
    adminNote: String(raw.admin_note || ""),
    createdAt: toIsoString(raw.created_at),
    updatedAt: toIsoString(raw.updated_at),
    decidedAt: extra.decidedAt ? toIsoString(extra.decidedAt) : null,
  };
}

export const listTaxonomy = cache(async (): Promise<TaxonomyEntry[]> => {
  try {
    const { data, error } = await supabaseAdmin.from(TABLES.EVENT_CATEGORIES).select("*");
    if (error) throw error;
    return (data ?? [])
      .map((d) =>
        mapToTaxonomyEntry(d, d.category_type === "event_format" ? "format" : "super"),
      )
      .filter((e) => e.name);
  } catch (err) {
    console.error("[listTaxonomy]", err);
    return [];
  }
});
