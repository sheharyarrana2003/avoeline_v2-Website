/** Client-safe types for `event_form_fields` (Phase 7). */

export const FORM_FIELD_TYPES = [
  "text",
  "textarea",
  "number",
  "email",
  "phone",
  "url",
  "date",
  "dropdown",
  "radio",
  "checkbox",
  "file",
] as const;

export type FormFieldType = (typeof FORM_FIELD_TYPES)[number];

export const FORM_FIELD_SCOPES = ["per_member", "per_group"] as const;
export type FormFieldScope = (typeof FORM_FIELD_SCOPES)[number];

/** Reserved system keys seeded per event. */
export const SYSTEM_FIELD_KEYS = ["name", "email", "phone", "payment_screenshot"] as const;
export type SystemFieldKey = (typeof SYSTEM_FIELD_KEYS)[number];

export type EventFormField = {
  id: string;
  eventId: string;
  key: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  options: string[];
  helpText: string | null;
  placeholder: string | null;
  validation: Record<string, unknown>;
  orderIndex: number;
  scope: FormFieldScope;
  isSystem: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Wizard draft before an event id exists (no id / timestamps). */
export type FormFieldDraft = {
  key: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  options: string[];
  helpText?: string;
  placeholder?: string;
  scope: FormFieldScope;
  isSystem?: boolean;
  /** Local-only id for React keys while drafting. */
  localId?: string;
};

export function isFormFieldType(value: string): value is FormFieldType {
  return (FORM_FIELD_TYPES as readonly string[]).includes(value);
}

export function isFormFieldScope(value: string): value is FormFieldScope {
  return (FORM_FIELD_SCOPES as readonly string[]).includes(value);
}

export function isSystemFieldKey(key: string): key is SystemFieldKey {
  return (SYSTEM_FIELD_KEYS as readonly string[]).includes(key);
}
