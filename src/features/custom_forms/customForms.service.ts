import "server-only";

import { randomBytes } from "crypto";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import type { CustomField } from "@/src/services/models/event.model";
import {
  sanitizeLibraryFields,
  type CustomFormKind,
  type CustomFormPublic,
  type CustomFormResponsePublic,
  type CustomFormStatus,
} from "./types";

function mapForm(row: Record<string, unknown>, responseCount?: number): CustomFormPublic {
  return {
    id: String(row.id),
    ownerUserId: String(row.owner_user_id),
    title: String(row.title || ""),
    description: String(row.description || ""),
    fields: Array.isArray(row.fields) ? (row.fields as CustomField[]) : [],
    publicToken: String(row.public_token),
    status: String(row.status) as CustomFormStatus,
    kind: String(row.kind) as CustomFormKind,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    responseCount,
  };
}

export async function listCustomForms(ownerUserId: string): Promise<CustomFormPublic[]> {
  const { data: forms } = await supabaseAdmin
    .from(TABLES.CUSTOM_FORMS)
    .select("*")
    .eq("owner_user_id", ownerUserId)
    .order("updated_at", { ascending: false });
  const ids = (forms || []).map((f) => String(f.id));
  const counts = new Map<string, number>();
  if (ids.length) {
    const { data: responses } = await supabaseAdmin
      .from(TABLES.CUSTOM_FORM_RESPONSES)
      .select("form_id")
      .in("form_id", ids);
    for (const r of responses || []) {
      const id = String(r.form_id);
      counts.set(id, (counts.get(id) || 0) + 1);
    }
  }
  return (forms || []).map((f) =>
    mapForm(f as Record<string, unknown>, counts.get(String(f.id)) || 0),
  );
}

export async function getCustomFormForOwner(
  formId: string,
  ownerUserId: string,
): Promise<CustomFormPublic | null> {
  const { data } = await supabaseAdmin
    .from(TABLES.CUSTOM_FORMS)
    .select("*")
    .eq("id", formId)
    .eq("owner_user_id", ownerUserId)
    .maybeSingle();
  return data ? mapForm(data as Record<string, unknown>) : null;
}

export async function getCustomFormByToken(token: string): Promise<CustomFormPublic | null> {
  const { data } = await supabaseAdmin
    .from(TABLES.CUSTOM_FORMS)
    .select("*")
    .eq("public_token", token)
    .maybeSingle();
  return data ? mapForm(data as Record<string, unknown>) : null;
}

export async function createCustomForm(opts: {
  ownerUserId: string;
  title: string;
  description?: string;
  kind?: CustomFormKind;
}): Promise<CustomFormPublic> {
  const now = new Date().toISOString();
  const token = randomBytes(18).toString("base64url");
  const { data, error } = await supabaseAdmin
    .from(TABLES.CUSTOM_FORMS)
    .insert({
      owner_user_id: opts.ownerUserId,
      title: opts.title.slice(0, 200),
      description: (opts.description || "").slice(0, 2000),
      fields: [],
      public_token: token,
      status: "draft",
      kind: opts.kind || "other",
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message || "Could not create form.");
  return mapForm(data as Record<string, unknown>, 0);
}

export async function updateCustomForm(opts: {
  formId: string;
  ownerUserId: string;
  title?: string;
  description?: string;
  fields?: CustomField[];
  status?: CustomFormStatus;
  kind?: CustomFormKind;
}): Promise<CustomFormPublic | null> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (opts.title != null) patch.title = opts.title.slice(0, 200);
  if (opts.description != null) patch.description = opts.description.slice(0, 2000);
  if (opts.fields != null) patch.fields = sanitizeLibraryFields(opts.fields);
  if (opts.status != null) patch.status = opts.status;
  if (opts.kind != null) patch.kind = opts.kind;
  const { data, error } = await supabaseAdmin
    .from(TABLES.CUSTOM_FORMS)
    .update(patch)
    .eq("id", opts.formId)
    .eq("owner_user_id", opts.ownerUserId)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapForm(data as Record<string, unknown>) : null;
}

export async function deleteCustomForm(formId: string, ownerUserId: string): Promise<boolean> {
  const { error, count } = await supabaseAdmin
    .from(TABLES.CUSTOM_FORMS)
    .delete({ count: "exact" })
    .eq("id", formId)
    .eq("owner_user_id", ownerUserId);
  if (error) throw new Error(error.message);
  return (count || 0) > 0;
}

export async function listFormResponses(
  formId: string,
  ownerUserId: string,
): Promise<CustomFormResponsePublic[]> {
  const form = await getCustomFormForOwner(formId, ownerUserId);
  if (!form) return [];
  const { data } = await supabaseAdmin
    .from(TABLES.CUSTOM_FORM_RESPONSES)
    .select("*")
    .eq("form_id", formId)
    .order("submitted_at", { ascending: false })
    .limit(500);
  return (data || []).map((r) => ({
    id: String(r.id),
    formId: String(r.form_id),
    respondentName: r.respondent_name ? String(r.respondent_name) : null,
    respondentEmail: r.respondent_email ? String(r.respondent_email) : null,
    answers:
      r.answers && typeof r.answers === "object" && !Array.isArray(r.answers)
        ? (r.answers as Record<string, string | number | boolean>)
        : {},
    submittedAt: String(r.submitted_at),
  }));
}

export async function submitPublicFormResponse(opts: {
  token: string;
  respondentName?: string;
  respondentEmail?: string;
  answers: Record<string, string | number | boolean>;
  meta?: Record<string, unknown>;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const form = await getCustomFormByToken(opts.token);
  if (!form) return { ok: false, error: "Form not found." };
  if (form.status !== "open") return { ok: false, error: "This form is not accepting responses." };
  const { error } = await supabaseAdmin.from(TABLES.CUSTOM_FORM_RESPONSES).insert({
    form_id: form.id,
    respondent_name: (opts.respondentName || "").slice(0, 200) || null,
    respondent_email: (opts.respondentEmail || "").trim().toLowerCase().slice(0, 320) || null,
    answers: opts.answers || {},
    meta: opts.meta || {},
    submitted_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
