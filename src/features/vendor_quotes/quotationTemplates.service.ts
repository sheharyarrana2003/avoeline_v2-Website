import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import type { QuotationTemplate } from "./types";

type Row = {
  id: string;
  vendor_id: string;
  name: string;
  body_html: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

function mapRow(row: Row): QuotationTemplate {
  return {
    id: row.id,
    vendorId: row.vendor_id,
    name: row.name,
    bodyHtml: row.body_html,
    isDefault: row.is_default,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listTemplates(vendorId: string): Promise<QuotationTemplate[]> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.QUOTATION_TEMPLATES)
    .select("id, vendor_id, name, body_html, is_default, created_at, updated_at")
    .eq("vendor_id", vendorId)
    .order("is_default", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as Row[] | null)?.map(mapRow) ?? [];
}

export async function getDefaultTemplate(vendorId: string): Promise<QuotationTemplate | null> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.QUOTATION_TEMPLATES)
    .select("id, vendor_id, name, body_html, is_default, created_at, updated_at")
    .eq("vendor_id", vendorId)
    .eq("is_default", true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapRow(data as Row) : null;
}

export async function getTemplateById(id: string): Promise<QuotationTemplate | null> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.QUOTATION_TEMPLATES)
    .select("id, vendor_id, name, body_html, is_default, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapRow(data as Row) : null;
}

export async function saveTemplate(input: {
  id?: string;
  vendorId: string;
  name: string;
  bodyHtml: string;
  isDefault?: boolean;
}): Promise<QuotationTemplate> {
  const name = input.name.trim();
  if (!name) throw new Error("Template name is required.");

  if (input.isDefault) {
    await clearDefault(input.vendorId, input.id);
  }

  if (input.id) {
    const { data, error } = await supabaseAdmin
      .from(TABLES.QUOTATION_TEMPLATES)
      .update({
        name,
        body_html: input.bodyHtml ?? "",
        ...(input.isDefault != null ? { is_default: input.isDefault } : {}),
      })
      .eq("id", input.id)
      .eq("vendor_id", input.vendorId)
      .select("id, vendor_id, name, body_html, is_default, created_at, updated_at")
      .single();

    if (error) throw new Error(error.message);
    return mapRow(data as Row);
  }

  const { data, error } = await supabaseAdmin
    .from(TABLES.QUOTATION_TEMPLATES)
    .insert({
      vendor_id: input.vendorId,
      name,
      body_html: input.bodyHtml ?? "",
      is_default: Boolean(input.isDefault),
    })
    .select("id, vendor_id, name, body_html, is_default, created_at, updated_at")
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data as Row);
}

export async function deleteTemplate(vendorId: string, templateId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from(TABLES.QUOTATION_TEMPLATES)
    .delete()
    .eq("id", templateId)
    .eq("vendor_id", vendorId);

  if (error) throw new Error(error.message);
}

export async function setDefaultTemplate(
  vendorId: string,
  templateId: string,
): Promise<QuotationTemplate> {
  await clearDefault(vendorId, templateId);

  const { data, error } = await supabaseAdmin
    .from(TABLES.QUOTATION_TEMPLATES)
    .update({ is_default: true })
    .eq("id", templateId)
    .eq("vendor_id", vendorId)
    .select("id, vendor_id, name, body_html, is_default, created_at, updated_at")
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data as Row);
}

async function clearDefault(vendorId: string, exceptId?: string): Promise<void> {
  let q = supabaseAdmin
    .from(TABLES.QUOTATION_TEMPLATES)
    .update({ is_default: false })
    .eq("vendor_id", vendorId)
    .eq("is_default", true);

  if (exceptId) q = q.neq("id", exceptId);

  const { error } = await q;
  if (error) throw new Error(error.message);
}
