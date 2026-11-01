export type CategoryFieldType = "text" | "number" | "select" | "checkbox";

export interface CategoryFieldDefinition {
  key: string;
  label: string;
  type: CategoryFieldType;
  options?: string[];
  required?: boolean;
}

export interface SuperCategoryDoc {
  id: string;
  name: string;
  active: boolean;
  createdAt: string | null;
  description?: string;
}

export interface EventFormatDoc {
  id: string;
  name: string;
  active: boolean;
  createdAt: string | null;
  description?: string;
}

export interface CategoryFieldSetDoc {
  id: string;
  superCategoryId: string;
  fields: CategoryFieldDefinition[];
}

export type CategoryRequestType = "superCategory" | "eventFormat";
export type CategoryRequestStatus = "pending" | "approved" | "rejected";

export interface CategoryRequestDoc {
  id: string;
  requestedBy: string; // uid
  requestedByName?: string;
  name: string;
  type: CategoryRequestType;
  status: CategoryRequestStatus;
  adminNote?: string;
  createdAt: string | null;
  reviewedAt?: string | null;
}

export interface ChecklistTemplateItem {
  title: string;
  dueOffsetDays: number;
}

export interface ChecklistTemplateDoc {
  id: string;
  superCategoryId: string;
  eventFormatId: string;
  items: ChecklistTemplateItem[];
}

/** Stable id for a category+format checklist template row. */
export function checklistTemplateId(superCategoryId: string, eventFormatId: string): string {
  return `${String(superCategoryId || "").trim()}_${String(eventFormatId || "").trim()}`;
}

/**
 * Normalize checklist template items before persist: trim titles, coerce offsets,
 * drop blank titles. Used by save + unit smoke tests.
 */
export function sanitizeChecklistTemplateItems(
  items: Array<{ title?: unknown; dueOffsetDays?: unknown } | null | undefined>,
): ChecklistTemplateItem[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((it) => {
      const title = String(it?.title ?? "").trim();
      const raw = Number(it?.dueOffsetDays);
      const dueOffsetDays = Number.isFinite(raw) ? Math.trunc(raw) : 0;
      return { title, dueOffsetDays };
    })
    .filter((it) => it.title.length > 0);
}
