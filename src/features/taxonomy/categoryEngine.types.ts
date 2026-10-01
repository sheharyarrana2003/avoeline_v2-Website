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
