import { cache } from "react";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { toIsoString } from "@/src/lib/datetime";
import type {
  SuperCategoryDoc,
  EventFormatDoc,
  CategoryFieldSetDoc,
  CategoryRequestDoc,
  ChecklistTemplateDoc,
} from "./categoryEngine.types";

type CatRow = {
  id: string;
  category_type: string;
  name: string;
  active: boolean | null;
  created_at: string | null;
  description: string | null;
  checklist?: unknown;
};

function mapCat(row: CatRow): SuperCategoryDoc & EventFormatDoc {
  return {
    id: row.id,
    name: String(row.name || ""),
    active: row.active !== false,
    createdAt: toIsoString(row.created_at),
    description: row.description ? String(row.description) : undefined,
  };
}

export class CategoryEngineService {
  static getAllSuperCategories = cache(async (): Promise<SuperCategoryDoc[]> => {
    try {
      const { data, error } = await supabaseAdmin
        .from(TABLES.EVENT_CATEGORIES)
        .select("*")
        .eq("category_type", "super_category");
      if (error) throw error;
      return (data ?? []).map((r) => mapCat(r as CatRow)).sort((a, b) => a.name.localeCompare(b.name));
    } catch (err) {
      console.error("[CategoryEngineService.getAllSuperCategories] error:", err);
      return [];
    }
  });

  static getActiveSuperCategories = cache(async (): Promise<SuperCategoryDoc[]> => {
    const all = await CategoryEngineService.getAllSuperCategories();
    return all.filter((cat) => cat.active);
  });

  static getSuperCategoryById = cache(async (id: string): Promise<SuperCategoryDoc | null> => {
    if (!id) return null;
    const { data, error } = await supabaseAdmin.from(TABLES.EVENT_CATEGORIES).select("*").eq("id", id).maybeSingle();
    if (error || !data) return null;
    return mapCat(data as CatRow);
  });

  static getAllEventFormats = cache(async (): Promise<EventFormatDoc[]> => {
    try {
      const { data, error } = await supabaseAdmin
        .from(TABLES.EVENT_CATEGORIES)
        .select("*")
        .eq("category_type", "event_format");
      if (error) throw error;
      return (data ?? []).map((r) => mapCat(r as CatRow)).sort((a, b) => a.name.localeCompare(b.name));
    } catch (err) {
      console.error("[CategoryEngineService.getAllEventFormats] error:", err);
      return [];
    }
  });

  static getActiveEventFormats = cache(async (): Promise<EventFormatDoc[]> => {
    const all = await CategoryEngineService.getAllEventFormats();
    return all.filter((fmt) => fmt.active);
  });

  static getEventFormatById = cache(async (id: string): Promise<EventFormatDoc | null> => {
    if (!id) return null;
    const { data } = await supabaseAdmin.from(TABLES.EVENT_CATEGORIES).select("*").eq("id", id).maybeSingle();
    if (!data) return null;
    return mapCat(data as CatRow);
  });

  static getFieldSetBySuperCategoryId = cache(async (superCategoryId: string): Promise<CategoryFieldSetDoc | null> => {
    if (!superCategoryId) return null;
    const { data } = await supabaseAdmin
      .from(TABLES.CATEGORY_FIELD_SETS)
      .select("*")
      .eq("super_category_id", superCategoryId)
      .limit(1)
      .maybeSingle();
    if (!data) return null;
    return {
      id: data.id,
      superCategoryId: String(data.super_category_id || superCategoryId),
      fields: Array.isArray(data.fields) ? data.fields : [],
    };
  });

  static getAllFieldSets = cache(async (): Promise<CategoryFieldSetDoc[]> => {
    const { data } = await supabaseAdmin.from(TABLES.CATEGORY_FIELD_SETS).select("*");
    return (data ?? []).map((doc) => ({
      id: doc.id,
      superCategoryId: String(doc.super_category_id || doc.id),
      fields: Array.isArray(doc.fields) ? doc.fields : [],
    }));
  });

  static getCategoryRequests = cache(async (status?: "pending" | "approved" | "rejected"): Promise<CategoryRequestDoc[]> => {
    let q = supabaseAdmin.from(TABLES.CATEGORY_REQUESTS).select("*");
    if (status) q = q.eq("status", status);
    const { data } = await q;
    const items: CategoryRequestDoc[] = (data ?? []).map((row) => ({
      id: row.id,
      requestedBy: String(row.requested_by || ""),
      requestedByName: row.requested_by_name ? String(row.requested_by_name) : undefined,
      name: String(row.name || ""),
      type: row.category_type === "event_format" ? "eventFormat" : "superCategory",
      status: (row.status || "pending") as CategoryRequestDoc["status"],
      adminNote: row.admin_note ? String(row.admin_note) : undefined,
      createdAt: toIsoString(row.created_at),
      reviewedAt: toIsoString(row.decided_at),
    }));
    return items.sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));
  });

  static getAllChecklistTemplates = cache(async (): Promise<ChecklistTemplateDoc[]> => {
    const { data } = await supabaseAdmin.from(TABLES.CHECKLIST_TEMPLATES).select("*");
    return (data ?? []).map((doc) => ({
      id: doc.id,
      superCategoryId: String(doc.super_category_id || ""),
      eventFormatId: String(doc.event_format_id || ""),
      items: Array.isArray(doc.items)
        ? doc.items.map((it: { title?: string; dueOffsetDays?: number }) => ({
            title: String(it.title || ""),
            dueOffsetDays: Number(it.dueOffsetDays || 0),
          }))
        : [],
    }));
  });

  static getChecklistTemplate = cache(async (superCategoryId: string, eventFormatId: string): Promise<ChecklistTemplateDoc | null> => {
    if (!superCategoryId || !eventFormatId) return null;
    const { data } = await supabaseAdmin
      .from(TABLES.CHECKLIST_TEMPLATES)
      .select("*")
      .eq("super_category_id", superCategoryId)
      .eq("event_format_id", eventFormatId)
      .limit(1)
      .maybeSingle();
    if (!data) return null;
    return {
      id: data.id,
      superCategoryId: String(data.super_category_id || ""),
      eventFormatId: String(data.event_format_id || ""),
      items: Array.isArray(data.items)
        ? data.items.map((it: { title?: string; dueOffsetDays?: number }) => ({
            title: String(it.title || ""),
            dueOffsetDays: Number(it.dueOffsetDays || 0),
          }))
        : [],
    };
  });
}
