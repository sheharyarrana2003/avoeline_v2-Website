"use server";

import { revalidatePath } from "next/cache";
import { adminDb } from "@/data/admin_db";
import { COLLECTIONS } from "@/data/collections";
import { AuthService } from "@/src/features/auth/authService";
import { slugifyId } from "../types";
import type {
  CategoryFieldDefinition,
  CategoryRequestType,
  ChecklistTemplateItem,
} from "../categoryEngine.types";
import { sendNotification } from "@/src/lib/notifications";

/**
 * Add a new SuperCategory or EventFormat
 */
export async function addCategoryItemAction(
  type: "superCategory" | "eventFormat",
  name: string,
  description?: string
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const admin = await AuthService.requireAdmin("categories");
    if (!admin) return { success: false, error: "Unauthorized. Admin required." };

    const cleanName = String(name || "").trim();
    if (!cleanName) return { success: false, error: "Name is required." };

    const id = slugifyId(cleanName);
    if (!id) return { success: false, error: "Invalid name format." };

    const colName =
      type === "superCategory"
        ? COLLECTIONS.SUPER_CATEGORIES
        : COLLECTIONS.EVENT_FORMATS;

    const docRef = adminDb.collection(colName).doc(id);
    const existing = await docRef.get();
    if (existing.exists) {
      return { success: false, error: `"${cleanName}" already exists.` };
    }

    await docRef.set({
      id,
      categoryType: type === "eventFormat" ? "event_format" : "super_category",
      name: cleanName,
      active: true,
      status: "approved",
      createdAt: new Date().toISOString(),
      ...(description ? { description: description.trim() } : {}),
    });

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
  description?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await AuthService.requireAdmin("categories");
    if (!admin) return { success: false, error: "Unauthorized. Admin required." };

    const cleanName = String(newName || "").trim();
    if (!cleanName) return { success: false, error: "Name cannot be empty." };
    if (!id) return { success: false, error: "ID is required." };

    const colName =
      type === "superCategory"
        ? COLLECTIONS.SUPER_CATEGORIES
        : COLLECTIONS.EVENT_FORMATS;

    const updateData: Record<string, any> = {
      name: cleanName,
      updatedAt: new Date(),
    };
    if (description !== undefined) {
      updateData.description = description.trim();
    }

    await adminDb.collection(colName).doc(id).set(updateData, { merge: true });

    // Sync legacy collection
    if (type === "superCategory" && COLLECTIONS.SUPER_CATEGORIES_LEGACY) {
      await adminDb.collection(COLLECTIONS.SUPER_CATEGORIES_LEGACY).doc(id).set(updateData, { merge: true });
    } else if (type === "eventFormat" && COLLECTIONS.EVENT_FORMATS_LEGACY) {
      await adminDb.collection(COLLECTIONS.EVENT_FORMATS_LEGACY).doc(id).set(updateData, { merge: true });
    }

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
  active: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await AuthService.requireAdmin("categories");
    if (!admin) return { success: false, error: "Unauthorized. Admin required." };
    if (!id) return { success: false, error: "ID is required." };

    const colName =
      type === "superCategory"
        ? COLLECTIONS.SUPER_CATEGORIES
        : COLLECTIONS.EVENT_FORMATS;

    await adminDb.collection(colName).doc(id).set(
      {
        active,
        updatedAt: new Date(),
      },
      { merge: true }
    );

    // Sync legacy
    if (type === "superCategory" && COLLECTIONS.SUPER_CATEGORIES_LEGACY) {
      await adminDb.collection(COLLECTIONS.SUPER_CATEGORIES_LEGACY).doc(id).set({ active, updatedAt: new Date() }, { merge: true });
    } else if (type === "eventFormat" && COLLECTIONS.EVENT_FORMATS_LEGACY) {
      await adminDb.collection(COLLECTIONS.EVENT_FORMATS_LEGACY).doc(id).set({ active, updatedAt: new Date() }, { merge: true });
    }

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
  fields: CategoryFieldDefinition[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await AuthService.requireAdmin("categories");
    if (!admin) return { success: false, error: "Unauthorized. Admin required." };
    if (!superCategoryId) return { success: false, error: "SuperCategory ID is required." };

    // Format and sanitize fields
    const sanitizedFields = fields.map((f, idx) => ({
      key: f.key ? f.key.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_") : `field_${idx}`,
      label: f.label.trim(),
      type: f.type,
      ...(f.options && f.options.length > 0 ? { options: f.options.map((o) => o.trim()).filter(Boolean) } : {}),
      required: !!f.required,
    }));

    const docId = superCategoryId;
    await adminDb
      .collection(COLLECTIONS.CATEGORY_FIELD_SETS)
      .doc(docId)
      .set(
        {
          id: docId,
          superCategoryId,
          fields: sanitizedFields,
          updatedAt: new Date(),
        },
        { merge: true }
      );

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
  type: CategoryRequestType
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

    const reqRef = adminDb.collection(COLLECTIONS.CATEGORY_REQUESTS).doc();
    const docData = {
      id: reqRef.id,
      requestedBy: user.userId,
      requestedByName: user.name || user.email || "Organizer",
      name: cleanName,
      type,
      status: "pending",
      createdAt: new Date(),
    };

    await reqRef.set(docData);

    revalidatePath("/admin/category-requests");
    revalidatePath("/admin/categories");
    return { success: true, requestId: reqRef.id };
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
  adminNote?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await AuthService.requireAdmin("categories");
    if (!admin) return { success: false, error: "Unauthorized. Admin required." };
    if (!requestId) return { success: false, error: "Request ID is required." };

    const reqRef = adminDb.collection(COLLECTIONS.CATEGORY_REQUESTS).doc(requestId);
    const reqSnap = await reqRef.get();
    if (!reqSnap.exists) {
      return { success: false, error: "Category request not found." };
    }

    const reqData = reqSnap.data()!;
    const name = String(reqData.name || "").trim();
    const type: CategoryRequestType = reqData.type === "eventFormat" ? "eventFormat" : "superCategory";

    if (action === "approve") {
      // 1. Create the actual doc in superCategories or eventFormats
      const targetCol =
        type === "superCategory"
          ? COLLECTIONS.SUPER_CATEGORIES
          : COLLECTIONS.EVENT_FORMATS;

      const id = slugifyId(name);
      if (!id) return { success: false, error: "Could not derive a valid ID from the name." };

      const targetDocRef = adminDb.collection(targetCol).doc(id);
      await targetDocRef.set(
        {
          id,
          name,
          active: true,
          createdAt: new Date(),
        },
        { merge: true }
      );

      // Sync to legacy if applicable
      if (type === "superCategory" && COLLECTIONS.SUPER_CATEGORIES_LEGACY) {
        await adminDb.collection(COLLECTIONS.SUPER_CATEGORIES_LEGACY).doc(id).set(
          { id, name, active: true, createdAt: new Date() },
          { merge: true }
        );
      } else if (type === "eventFormat" && COLLECTIONS.EVENT_FORMATS_LEGACY) {
        await adminDb.collection(COLLECTIONS.EVENT_FORMATS_LEGACY).doc(id).set(
          { id, name, active: true, createdAt: new Date() },
          { merge: true }
        );
      }

      // 2. Update the categoryRequests status to "approved"
      await reqRef.set(
        {
          status: "approved",
          adminNote: adminNote ? adminNote.trim() : "",
          reviewedAt: new Date(),
        },
        { merge: true }
      );
    } else {
      // Reject action: update status to "rejected" with optional adminNote
      await reqRef.set(
        {
          status: "rejected",
          adminNote: adminNote ? adminNote.trim() : "",
          reviewedAt: new Date(),
        },
        { merge: true }
      );
    }

    // Notifications Engine: notify requester of decision
    if (reqData.requestedBy) {
      await sendNotification(
        String(reqData.requestedBy),
        action === "approve" ? "category_approved" : "category_rejected",
        {
          categoryName: name,
          categoryType: type === "eventFormat" ? "Event Format" : "Super Category",
          adminNote: adminNote ? adminNote.trim() : "",
        }
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
  items: ChecklistTemplateItem[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await AuthService.requireAdmin("categories");
    if (!admin) return { success: false, error: "Unauthorized. Admin required." };
    if (!superCategoryId || !eventFormatId) {
      return { success: false, error: "Both SuperCategory and EventFormat are required." };
    }

    const templateId = `${superCategoryId}_${eventFormatId}`;
    const sanitizedItems = items
      .map((it) => ({
        title: String(it.title || "").trim(),
        dueOffsetDays: Number(it.dueOffsetDays || 0),
      }))
      .filter((it) => it.title.length > 0);

    await adminDb.collection(COLLECTIONS.CHECKLIST_TEMPLATES).doc(templateId).set({
      id: templateId,
      superCategoryId,
      eventFormatId,
      items: sanitizedItems,
      updatedAt: new Date(),
    });

    revalidatePath("/admin/categories");
    return { success: true };
  } catch (err: any) {
    console.error("[saveChecklistTemplateAction] error:", err);
    return { success: false, error: err?.message || "Failed to save checklist template." };
  }
}

/**
 * Auto-populate `tasks` subcollection under an event from matching checklistTemplate
 */
export async function seedEventTasksFromTemplate(
  eventId: string,
  superCategoryId: string,
  eventFormatId: string,
  startDateInput: Date | string | number | null | undefined
): Promise<number> {
  if (!eventId || !superCategoryId || !eventFormatId) return 0;
  try {
    const templateId = `${superCategoryId}_${eventFormatId}`;
    let templateSnap = await adminDb.collection(COLLECTIONS.CHECKLIST_TEMPLATES).doc(templateId).get();

    if (!templateSnap.exists) {
      // Fallback query by fields
      const querySnap = await adminDb
        .collection(COLLECTIONS.CHECKLIST_TEMPLATES)
        .where("superCategoryId", "==", superCategoryId)
        .where("eventFormatId", "==", eventFormatId)
        .limit(1)
        .get();
      if (!querySnap.empty) {
        templateSnap = querySnap.docs[0];
      } else {
        return 0;
      }
    }

    const templateData = templateSnap.data();
    const items: ChecklistTemplateItem[] = Array.isArray(templateData?.items)
      ? templateData.items
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

    const tasksColRef = adminDb.collection(COLLECTIONS.EVENTS).doc(eventId).collection("tasks");
    const batch = adminDb.batch();

    for (const item of items) {
      const taskDocRef = tasksColRef.doc();
      const dueDate = new Date(baseDate.getTime());
      dueDate.setDate(dueDate.getDate() + Number(item.dueOffsetDays || 0));

      batch.set(taskDocRef, {
        id: taskDocRef.id,
        title: item.title,
        dueOffsetDays: item.dueOffsetDays,
        dueDate: dueDate.toISOString(),
        completed: false,
        status: "pending",
        createdAt: new Date().toISOString(),
        source: "checklistTemplate",
      });
    }

    await batch.commit();
    return items.length;
  } catch (err) {
    console.error("[seedEventTasksFromTemplate] error:", err);
    return 0;
  }
}
