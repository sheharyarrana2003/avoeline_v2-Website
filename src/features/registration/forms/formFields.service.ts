import "server-only";

import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import type { Database, Json } from "@/src/lib/database.types";
import {
  type EventFormField,
  type FormFieldDraft,
  type FormFieldScope,
  type FormFieldType,
  isFormFieldScope,
  isFormFieldType,
} from "./formFields.types";

type Row = Database["public"]["Tables"]["event_form_fields"]["Row"];
type Insert = Database["public"]["Tables"]["event_form_fields"]["Insert"];

const SYSTEM_DEFAULTS: Array<{
  key: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  orderIndex: number;
  scope: FormFieldScope;
  validation?: Record<string, unknown>;
}> = [
  {
    key: "name",
    label: "Full name",
    type: "text",
    required: true,
    orderIndex: 0,
    scope: "per_member",
  },
  {
    key: "email",
    label: "Email",
    type: "email",
    required: true,
    orderIndex: 1,
    scope: "per_member",
  },
  {
    key: "phone",
    label: "Phone",
    type: "phone",
    required: true,
    orderIndex: 2,
    scope: "per_member",
  },
];

const PAYMENT_FIELD = {
  key: "payment_screenshot",
  label: "Payment screenshot",
  type: "file" as const,
  required: true,
  scope: "per_group" as const,
  validation: { accept: ["image/*"], maxBytes: 5_242_880 },
};

function optionsOf(raw: Json): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((o) => String(o ?? "").trim()).filter(Boolean);
}

function validationOf(raw: Json): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw as Record<string, unknown>;
  return {};
}

export function mapFormFieldRow(row: Row): EventFormField {
  const type = isFormFieldType(row.type) ? row.type : "text";
  const scope = isFormFieldScope(row.scope) ? row.scope : "per_member";
  return {
    id: row.id,
    eventId: row.event_id,
    key: row.key,
    label: row.label,
    type,
    required: !!row.required,
    options: optionsOf(row.options),
    helpText: row.help_text,
    placeholder: row.placeholder,
    validation: validationOf(row.validation),
    orderIndex: row.order_index,
    scope,
    isSystem: !!row.is_system,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Active (non-archived) fields ordered for public registration / display. */
export async function listActiveFields(eventId: string): Promise<EventFormField[]> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.EVENT_FORM_FIELDS)
    .select("*")
    .eq("event_id", eventId)
    .is("archived_at", null)
    .order("order_index", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => mapFormFieldRow(r as Row));
}

/** All fields including archived (organizer answers + export of historical keys). */
export async function listAllFields(eventId: string): Promise<EventFormField[]> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.EVENT_FORM_FIELDS)
    .select("*")
    .eq("event_id", eventId)
    .order("order_index", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => mapFormFieldRow(r as Row));
}

export type UpsertFieldInput = {
  id?: string;
  key: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  options?: string[];
  helpText?: string | null;
  placeholder?: string | null;
  validation?: Record<string, unknown>;
  orderIndex?: number;
  scope?: FormFieldScope;
  isSystem?: boolean;
};

/** Insert or update one field. System keys cannot change key/type; email stays required. */
export async function upsertField(
  eventId: string,
  input: UpsertFieldInput,
): Promise<EventFormField> {
  const key = String(input.key || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
  if (!key) throw new Error("Field key is required.");

  let existing: Row | null = null;
  if (input.id) {
    const { data } = await supabaseAdmin
      .from(TABLES.EVENT_FORM_FIELDS)
      .select("*")
      .eq("id", input.id)
      .eq("event_id", eventId)
      .maybeSingle();
    existing = (data as Row | null) ?? null;
  } else {
    const { data } = await supabaseAdmin
      .from(TABLES.EVENT_FORM_FIELDS)
      .select("*")
      .eq("event_id", eventId)
      .eq("key", key)
      .maybeSingle();
    existing = (data as Row | null) ?? null;
  }

  const isSystem = existing?.is_system || !!input.isSystem;
  const type =
    isSystem && existing
      ? isFormFieldType(existing.type)
        ? existing.type
        : input.type
      : input.type;
  const finalKey = isSystem && existing ? existing.key : key;
  let required = !!input.required;
  if (finalKey === "email") required = true;
  if (isSystem && existing && finalKey === "payment_screenshot") required = true;

  const payload: Insert = {
    event_id: eventId,
    key: finalKey,
    label:
      String(input.label || finalKey)
        .trim()
        .slice(0, 200) || finalKey,
    type,
    required,
    options: (input.options ?? []).map((o) => String(o).trim()).filter(Boolean) as unknown as Json,
    help_text: input.helpText ?? null,
    placeholder: input.placeholder ?? null,
    validation: (input.validation ?? {}) as Json,
    order_index: input.orderIndex ?? existing?.order_index ?? 0,
    scope:
      input.scope ?? (isFormFieldScope(existing?.scope ?? "") ? existing!.scope : "per_member"),
    is_system: isSystem,
    archived_at: null,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    const { data, error } = await supabaseAdmin
      .from(TABLES.EVENT_FORM_FIELDS)
      .update(payload)
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw error;
    return mapFormFieldRow(data as Row);
  }

  const { data, error } = await supabaseAdmin
    .from(TABLES.EVENT_FORM_FIELDS)
    .insert(payload)
    .select("*")
    .single();
  if (error) throw error;
  return mapFormFieldRow(data as Row);
}

export async function reorderFields(eventId: string, orderedIds: string[]): Promise<void> {
  const now = new Date().toISOString();
  await Promise.all(
    orderedIds.map(async (id, index) => {
      const { error } = await supabaseAdmin
        .from(TABLES.EVENT_FORM_FIELDS)
        .update({ order_index: index, updated_at: now })
        .eq("id", id)
        .eq("event_id", eventId);
      if (error) throw error;
    }),
  );
}

/**
 * Never hard-delete when any registration has this key in custom_responses.
 * Soft-archive instead. System fields cannot be archived via this path (except
 * payment_screenshot via syncPaymentField).
 */
export async function archiveField(
  eventId: string,
  fieldId: string,
): Promise<"archived" | "soft_only"> {
  const { data: field, error } = await supabaseAdmin
    .from(TABLES.EVENT_FORM_FIELDS)
    .select("*")
    .eq("id", fieldId)
    .eq("event_id", eventId)
    .maybeSingle();
  if (error) throw error;
  if (!field) throw new Error("Field not found.");
  if (field.is_system && field.key !== "payment_screenshot") {
    throw new Error("System fields cannot be archived.");
  }

  const { data: regs, error: regErr } = await supabaseAdmin
    .from(TABLES.REGISTRATIONS)
    .select("id, custom_responses")
    .eq("event_id", eventId);
  if (regErr) throw regErr;

  const key = field.key;
  const hasResponses = (regs ?? []).some((r) => {
    const answers = r.custom_responses;
    if (!answers || typeof answers !== "object" || Array.isArray(answers)) return false;
    return Object.prototype.hasOwnProperty.call(answers, key);
  });

  const now = new Date().toISOString();
  if (hasResponses) {
    const { error: upErr } = await supabaseAdmin
      .from(TABLES.EVENT_FORM_FIELDS)
      .update({ archived_at: now, updated_at: now })
      .eq("id", fieldId);
    if (upErr) throw upErr;
    return "soft_only";
  }

  // Soft-archive even when unused — never hard-delete (history + audit).
  const { error: upErr } = await supabaseAdmin
    .from(TABLES.EVENT_FORM_FIELDS)
    .update({ archived_at: now, updated_at: now })
    .eq("id", fieldId);
  if (upErr) throw upErr;
  return "archived";
}

export async function seedDefaultsForEvent(
  eventId: string,
  opts: { isFree: boolean },
): Promise<EventFormField[]> {
  const existing = await listAllFields(eventId);
  const byKey = new Set(existing.map((f) => f.key));
  const inserts: Insert[] = [];

  for (const def of SYSTEM_DEFAULTS) {
    if (byKey.has(def.key)) continue;
    inserts.push({
      event_id: eventId,
      key: def.key,
      label: def.label,
      type: def.type,
      required: def.required,
      options: [] as unknown as Json,
      order_index: def.orderIndex,
      scope: def.scope,
      is_system: true,
      validation: {} as Json,
    });
  }

  if (inserts.length) {
    const { error } = await supabaseAdmin.from(TABLES.EVENT_FORM_FIELDS).insert(inserts);
    if (error) throw error;
  }

  await syncPaymentField(eventId, opts.isFree);
  return listActiveFields(eventId);
}

/** Ensure payment_screenshot exists for paid events; archive it when free. */
export async function syncPaymentField(eventId: string, isFree: boolean): Promise<void> {
  const { data: rows } = await supabaseAdmin
    .from(TABLES.EVENT_FORM_FIELDS)
    .select("*")
    .eq("event_id", eventId)
    .eq("key", "payment_screenshot");
  const existing = (rows ?? [])[0] as Row | undefined;
  const now = new Date().toISOString();

  if (isFree) {
    if (existing && !existing.archived_at) {
      await supabaseAdmin
        .from(TABLES.EVENT_FORM_FIELDS)
        .update({ archived_at: now, updated_at: now })
        .eq("id", existing.id);
    }
    return;
  }

  if (existing) {
    const { data: maxRow } = await supabaseAdmin
      .from(TABLES.EVENT_FORM_FIELDS)
      .select("order_index")
      .eq("event_id", eventId)
      .order("order_index", { ascending: false })
      .limit(1)
      .maybeSingle();
    await supabaseAdmin
      .from(TABLES.EVENT_FORM_FIELDS)
      .update({
        archived_at: null,
        required: true,
        is_system: true,
        type: "file",
        scope: "per_group",
        validation: PAYMENT_FIELD.validation as Json,
        order_index: existing.archived_at
          ? (maxRow?.order_index ?? existing.order_index) + 1
          : existing.order_index,
        updated_at: now,
      })
      .eq("id", existing.id);
    return;
  }

  const { data: maxRow } = await supabaseAdmin
    .from(TABLES.EVENT_FORM_FIELDS)
    .select("order_index")
    .eq("event_id", eventId)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  await supabaseAdmin.from(TABLES.EVENT_FORM_FIELDS).insert({
    event_id: eventId,
    key: PAYMENT_FIELD.key,
    label: PAYMENT_FIELD.label,
    type: PAYMENT_FIELD.type,
    required: true,
    options: [] as unknown as Json,
    order_index: (maxRow?.order_index ?? 99) + 1,
    scope: PAYMENT_FIELD.scope,
    is_system: true,
    validation: PAYMENT_FIELD.validation as Json,
  });
}

/**
 * After create_event: seed system defaults, then insert non-system wizard fields.
 */
export async function replaceEventFieldsFromWizard(
  eventId: string,
  drafts: FormFieldDraft[],
  opts: { isFree: boolean },
): Promise<void> {
  await seedDefaultsForEvent(eventId, opts);

  const custom = drafts.filter(
    (d) => !d.isSystem && !["name", "email", "phone", "payment_screenshot"].includes(d.key),
  );
  let order = 10;
  for (const draft of custom) {
    const key = String(draft.key || `field_${order}`)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "_")
      .slice(0, 64);
    if (!key || ["name", "email", "phone", "payment_screenshot"].includes(key)) continue;
    await upsertField(eventId, {
      key,
      label: draft.label,
      type: draft.type,
      required: draft.required,
      options: draft.options,
      helpText: draft.helpText ?? null,
      placeholder: draft.placeholder ?? null,
      scope: draft.scope ?? "per_member",
      orderIndex: order++,
      isSystem: false,
    });
  }

  await syncPaymentField(eventId, opts.isFree);
}

/** Map active fields to legacy CustomFieldOption for backward-compat display. */
export function fieldsToCustomForm(fields: EventFormField[]): Array<{
  fieldId: string;
  label: string;
  type: string;
  options: string[];
  required: boolean;
  askOnce?: "group" | "member";
}> {
  return fields
    .filter((f) => !f.archivedAt)
    .map((f) => ({
      fieldId: f.key,
      label: f.label,
      type:
        f.type === "textarea"
          ? "long_text"
          : f.type === "checkbox" && f.options.length
            ? "checkboxes"
            : f.type,
      options: f.options,
      required: f.required,
      askOnce: f.scope === "per_group" ? ("group" as const) : ("member" as const),
    }));
}

export const FormFieldsService = {
  listActiveFields,
  listAllFields,
  upsertField,
  reorderFields,
  archiveField,
  seedDefaultsForEvent,
  syncPaymentField,
  replaceEventFieldsFromWizard,
  fieldsToCustomForm,
  mapFormFieldRow,
};
