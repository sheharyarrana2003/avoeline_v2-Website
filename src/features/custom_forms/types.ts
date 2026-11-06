import type { CustomField } from "@/src/services/models/event.model";

export type CustomFormStatus = "draft" | "open" | "closed";
export type CustomFormKind = "survey" | "feedback" | "checklist" | "other";

export type CustomFormPublic = {
  id: string;
  ownerUserId: string;
  title: string;
  description: string;
  fields: CustomField[];
  publicToken: string;
  status: CustomFormStatus;
  kind: CustomFormKind;
  createdAt: string;
  updatedAt: string;
  responseCount?: number;
};

export type CustomFormResponsePublic = {
  id: string;
  formId: string;
  respondentName: string | null;
  respondentEmail: string | null;
  answers: Record<string, string | number | boolean>;
  submittedAt: string;
};

/** Field types allowed on public library forms (no file upload path yet). */
export function sanitizeLibraryFields(fields: CustomField[]): CustomField[] {
  return (fields || [])
    .filter((f) => f.type !== "file" && f.type !== "image")
    .map((f) => ({
      ...f,
      id: String(f.id || cryptoRandomId()),
      label: String(f.label || "").slice(0, 200),
      type: f.type,
      required: Boolean(f.required),
      options: Array.isArray(f.options) ? f.options.map(String).slice(0, 40) : [],
    }));
}

function cryptoRandomId(): string {
  return `f_${Math.random().toString(36).slice(2, 10)}`;
}
