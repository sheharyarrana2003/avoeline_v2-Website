"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { AuthService } from "@/src/features/auth/authService";
import { slugifyId } from "../types";
import type {
  CategoryFieldDefinition,
  CategoryRequestType,
  ChecklistTemplateItem,
} from "../categoryEngine.types";
import { checklistTemplateId, sanitizeChecklistTemplateItems } from "../categoryEngine.types";
import { sendNotification } from "@/src/lib/notifications";

function categoryTypeFor(type: "superCategory" | "eventFormat"): "super_category" | "event_format" {
  return type === "eventFormat" ? "event_format" : "super_category";
}

/**
 * Add a new SuperCategory or EventFormat
 */
export async function addCategoryItemAction(
  type: "superCategory" | "eventFormat",
  name: string,
  description?: string,
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const admin = await AuthService.requireAdmin("categories");
    if (!admin) return { success: false, error: "Unauthorized. Admin required." };

    const cleanName = String(name || "").trim();
    if (!cleanName) return { success: false, error: "Name is required." };

    const id = slugifyId(cleanName);
    if (!id) return { success: false, error: "Invalid name format." };

    const { data: existing } = await supabaseAdmin
      .from(TABLES.EVENT_CATEGORIES)
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (existing) {
      return { success: false, error: `"${cleanName}" already exists.` };
    }

    const now = new Date().toISOString();
    const { error } = await supabaseAdmin.from(TABLES.EVENT_CATEGORIES).insert({
      id,
      category_type: categoryTypeFor(type),
      name: cleanName,
      active: true,
      description: description ? description.trim() : null,
      created_at: now,
      updated_at: now,
      extra: { status: "approved" },
    });
    if (error) throw error;

    revalidatePath("/admin/categories");
    return { success: true, id };
  } catch (err: any) {
    console.error("[addCategoryItemAction] error:", err);
    return { success: false, error: err?.message || "Failed to add category item." };
  }
}

/**
 * Rename an existing SuperCategory or EventFormat
 */
export async function renameCategoryItemAction(
  type: "superCategory" | "eventFormat",
  id: string,
  newName: string,
  description?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await AuthService.requireAdmin("categories");
    if (!admin) return { success: false, error: "Unauthorized. Admin required." };

    const cleanName = String(newName || "").trim();
    if (!cleanName) return { success: false, error: "Name cannot be empty." };
    if (!id) return { success: false, error: "ID is required." };

    const updateData: Record<string, unknown> = {
      name: cleanName,
      updated_at: new Date().toISOString(),
    };
    if (description !== undefined) {
      updateData.description = description.trim();
    }

    const { error } = await supabaseAdmin
      .from(TABLES.EVENT_CATEGORIES)
      .update(updateData)
      .eq("id", id)
      .eq("category_type", categoryTypeFor(type));
    if (error) throw error;

    revalidatePath("/admin/categories");
    return { success: true };
  } catch (err: any) {
    console.error("[renameCategoryItemAction] error:", err);
    return { success: false, error: err?.message || "Failed to rename category item." };
  }
}

/**
 * Deactivate or activate a SuperCategory or EventFormat
 * (Deactivating hides it from creation dropdowns where active == true, but does NOT break existing events)
 */
export async function toggleCategoryActiveAction(
  type: "superCategory" | "eventFormat",
  id: string,
  active: boolean,
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await AuthService.requireAdmin("categories");
    if (!admin) return { success: false, error: "Unauthorized. Admin required." };
    if (!id) return { success: false, error: "ID is required." };

    const { error } = await supabaseAdmin
      .from(TABLES.EVENT_CATEGORIES)
      .update({
        active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("category_type", categoryTypeFor(type));
    if (error) throw error;

    revalidatePath("/admin/categories");
    return { success: true };
  } catch (err: any) {
    console.error("[toggleCategoryActiveAction] error:", err);
    return { success: false, error: err?.message || "Failed to toggle active status." };
  }
}

/**
 * Attach or update categoryFieldSet for a superCategory
 */
export async function saveCategoryFieldSetAction(
  superCategoryId: string,
  fields: CategoryFieldDefinition[],
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await AuthService.requireAdmin("categories");
    if (!admin) return { success: false, error: "Unauthorized. Admin required." };
    if (!superCategoryId) return { success: false, error: "SuperCategory ID is required." };

    // Format and sanitize fields
    const sanitizedFields = fields.map((f, idx) => ({
      key: f.key
        ? f.key
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, "_")
        : `field_${idx}`,
      label: f.label.trim(),
      type: f.type,
      ...(f.options && f.options.length > 0
        ? { options: f.options.map((o) => o.trim()).filter(Boolean) }
        : {}),
      required: !!f.required,
    }));

    const docId = superCategoryId;
    const { error } = await supabaseAdmin.from(TABLES.CATEGORY_FIELD_SETS).upsert({
      id: docId,
      super_category_id: superCategoryId,
      fields: sanitizedFields,
    });
    if (error) throw error;

    revalidatePath("/admin/categories");
    return { success: true };
  } catch (err: any) {
    console.error("[saveCategoryFieldSetAction] error:", err);
    return { success: false, error: err?.message || "Failed to save category fields." };
  }
}

/**
 * Organizer flow: Request a new category (superCategory or eventFormat)
 */
export async function requestCategoryAction(
  name: string,
  type: CategoryRequestType,
): Promise<{ success: boolean; error?: string; requestId?: string }> {
  try {
    const user = await AuthService.getCurrentUser();
    if (!user?.userId) {
      return { success: false, error: "You must be signed in to request a category." };
    }

    const cleanName = String(name || "").trim();
    if (!cleanName) {
      return { success: false, error: "Please enter a name for the category." };
    }

    const id = randomUUID();
    const { error } = await supabaseAdmin.from(TABLES.CATEGORY_REQUESTS).insert({
      id,
      requested_by: user.userId,
      requested_by_name: user.name || user.email || "Organizer",
      name: cleanName,
      category_type: type === "eventFormat" ? "event_format" : "super_category",
      status: "pending",
      created_at: new Date().toISOString(),
    });
    if (error) throw error;

    revalidatePath("/admin/category-requests");
    revalidatePath("/admin/categories");
    return { success: true, requestId: id };
  } catch (err: any) {
    console.error("[requestCategoryAction] error:", err);
    return { success: false, error: err?.message || "Failed to submit category request." };
  }
}

/**
 * Admin flow: Approve or reject category request
 */
export async function decideCategoryRequestAction(
  requestId: string,
  action: "approve" | "reject",
  adminNote?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await AuthService.requireAdmin("categories");
    if (!admin) return { success: false, error: "Unauthorized. Admin required." };
    if (!requestId) return { success: false, error: "Request ID is required." };

    const { data: reqData, error: readError } = await supabaseAdmin
      .from(TABLES.CATEGORY_REQUESTS)
      .select("*")
      .eq("id", requestId)
      .maybeSingle();
    if (readError) throw readError;
    if (!reqData) {
      return { success: false, error: "Category request not found." };
    }

    const name = String(reqData.name || "").trim();
    const type: CategoryRequestType =
      reqData.category_type === "event_format" ||
      (reqData.extra as Record<string, unknown> | null)?.type === "eventFormat"
        ? "eventFormat"
        : "superCategory";

    if (action === "approve") {
      const id = slugifyId(name);
      if (!id) return { success: false, error: "Could not derive a valid ID from the name." };

      const now = new Date().toISOString();
      const { error: catError } = await supabaseAdmin.from(TABLES.EVENT_CATEGORIES).upsert({
        id,
        name,
        category_type: categoryTypeFor(type),
        active: true,
        created_at: now,
        updated_at: now,
        extra: { status: "approved" },
      });
      if (catError) throw catError;

      const { error: reqError } = await supabaseAdmin
        .from(TABLES.CATEGORY_REQUESTS)
        .update({
          status: "approved",
          admin_note: adminNote ? adminNote.trim() : "",
          decided_at: now,
        })
        .eq("id", requestId);
      if (reqError) throw reqError;
    } else {
      const { error: reqError } = await supabaseAdmin
        .from(TABLES.CATEGORY_REQUESTS)
        .update({
          status: "rejected",
          admin_note: adminNote ? adminNote.trim() : "",
          decided_at: new Date().toISOString(),
        })
        .eq("id", requestId);
      if (reqError) throw reqError;
    }

    // Notifications Engine: notify requester of decision
    if (reqData.requested_by) {
      await sendNotification(
        String(reqData.requested_by),
        action === "approve" ? "category_approved" : "category_rejected",
        {
          categoryName: name,
          categoryType: type === "eventFormat" ? "Event Format" : "Super Category",
          adminNote: adminNote ? adminNote.trim() : "",
        },
      ).catch((err) => console.error("[decideCategoryRequestAction] sendNotification error:", err));
    }

    revalidatePath("/admin/category-requests");
    revalidatePath("/admin/categories");
    return { success: true };
  } catch (err: any) {
    console.error("[decideCategoryRequestAction] error:", err);
    return { success: false, error: err?.message || "Failed to process category request." };
  }
}

/**
 * Save checklist template for a superCategoryId + eventFormatId pair
 */
export async function saveChecklistTemplateAction(
  superCategoryId: string,
  eventFormatId: string,
  items: ChecklistTemplateItem[],
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await AuthService.requireAdmin("categories");
    if (!admin) return { success: false, error: "Unauthorized. Admin required." };
    const superId = String(superCategoryId || "").trim();
    const formatId = String(eventFormatId || "").trim();
    if (!superId || !formatId) {
      return { success: false, error: "Both SuperCategory and EventFormat are required." };
    }

    const templateId = checklistTemplateId(superId, formatId);
    const sanitizedItems = sanitizeChecklistTemplateItems(items);

    const { error } = await supabaseAdmin.from(TABLES.CHECKLIST_TEMPLATES).upsert({
      id: templateId,
      super_category_id: superId,
      event_format_id: formatId,
      items: sanitizedItems,
    });
    if (error) throw error;

    revalidatePath("/admin/categories");
    return { success: true };
  } catch (err: any) {
    console.error("[saveChecklistTemplateAction] error:", err);
    return { success: false, error: err?.message || "Failed to save checklist template." };
  }
}

/**
 * Auto-populate event checklist items from matching checklistTemplate
 */
export async function seedEventTasksFromTemplate(
  eventId: string,
  superCategoryId: string,
  eventFormatId: string,
  startDateInput: Date | string | number | null | undefined,
): Promise<number> {
  if (!eventId || !superCategoryId || !eventFormatId) return 0;
  try {
    const templateId = checklistTemplateId(superCategoryId, eventFormatId);
    let { data: templateData } = await supabaseAdmin
      .from(TABLES.CHECKLIST_TEMPLATES)
      .select("*")
      .eq("id", templateId)
      .maybeSingle();

    if (!templateData) {
      const { data: fallback } = await supabaseAdmin
        .from(TABLES.CHECKLIST_TEMPLATES)
        .select("*")
        .eq("super_category_id", superCategoryId)
        .eq("event_format_id", eventFormatId)
        .limit(1)
        .maybeSingle();
      templateData = fallback;
    }

    if (!templateData) return 0;

    const items: ChecklistTemplateItem[] = Array.isArray(templateData.items)
      ? (templateData.items as ChecklistTemplateItem[])
      : [];

    if (items.length === 0) return 0;

    let baseDate: Date;
    if (startDateInput) {
      baseDate = new Date(startDateInput);
      if (isNaN(baseDate.getTime())) {
        baseDate = new Date();
      }
    } else {
      baseDate = new Date();
    }

    const rows = items.map((item, index) => {
      const dueDate = new Date(baseDate.getTime());
      dueDate.setDate(dueDate.getDate() + Number(item.dueOffsetDays || 0));
      return {
        id: randomUUID(),
        event_id: eventId,
        label: item.title,
        done: false,
        sort_order: index,
        extra: {
          dueOffsetDays: item.dueOffsetDays,
          dueDate: dueDate.toISOString(),
          completed: false,
          status: "pending",
          createdAt: new Date().toISOString(),
          source: "checklistTemplate",
        },
      };
    });

    const { error } = await supabaseAdmin.from(TABLES.EVENT_CHECKLIST_ITEMS).insert(rows);
    if (error) throw error;
    return items.length;
  } catch (err) {
    console.error("[seedEventTasksFromTemplate] error:", err);
    return 0;
  }
}
