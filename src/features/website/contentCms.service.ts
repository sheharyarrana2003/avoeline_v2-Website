import "server-only";

import { revalidateTag } from "next/cache";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import type { Database } from "@/src/lib/database.types";
import { SITE_ALL } from "./cacheTags";
import { assertTestimonialVisibility } from "./cms.logic";
import { sanitizeLegalMarkdown } from "./legalMarkdown";

type FaqRow = Database["public"]["Tables"]["site_faqs"]["Row"];
type TestimonialRow = Database["public"]["Tables"]["site_testimonials"]["Row"];
type ContactRow = Database["public"]["Tables"]["contact_messages"]["Row"];

export async function listFaqsAdmin(): Promise<FaqRow[]> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.SITE_FAQS)
    .select("*")
    .order("scope", { ascending: true })
    .order("sort", { ascending: true });
  if (error) {
    console.error("[listFaqsAdmin]", error.message);
    return [];
  }
  return (data as FaqRow[] | null) ?? [];
}

export async function upsertFaq(
  input: Partial<FaqRow> & { question: string; answer_md: string },
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const payload = {
    scope: input.scope ?? "general",
    question: input.question.trim(),
    answer_md: sanitizeLegalMarkdown(input.answer_md),
    sort: input.sort ?? 0,
    visible: input.visible ?? false,
  };
  if (input.id) {
    const { error } = await supabaseAdmin.from(TABLES.SITE_FAQS).update(payload).eq("id", input.id);
    if (error) return { ok: false, error: error.message };
    revalidateTag(SITE_ALL, "max");
    return { ok: true, id: input.id };
  }
  const { data, error } = await supabaseAdmin
    .from(TABLES.SITE_FAQS)
    .insert(payload)
    .select("id")
    .maybeSingle();
  if (error || !data) return { ok: false, error: error?.message ?? "Insert failed" };
  revalidateTag(SITE_ALL, "max");
  return { ok: true, id: data.id };
}

export async function deleteFaq(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabaseAdmin.from(TABLES.SITE_FAQS).delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateTag(SITE_ALL, "max");
  return { ok: true };
}

export async function listTestimonialsAdmin(): Promise<TestimonialRow[]> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.SITE_TESTIMONIALS)
    .select("*")
    .order("sort", { ascending: true });
  if (error) {
    console.error("[listTestimonialsAdmin]", error.message);
    return [];
  }
  return (data as TestimonialRow[] | null) ?? [];
}

export async function upsertTestimonial(
  input: Partial<TestimonialRow> & { quote: string; name: string },
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const consent = input.consent_confirmed ?? false;
  const visible = input.visible ?? false;
  const gate = assertTestimonialVisibility(consent, visible);
  if (!gate.ok) return gate;

  const payload = {
    quote: input.quote.trim(),
    name: input.name.trim(),
    role: input.role ?? null,
    organization: input.organization ?? null,
    avatar_media_id: input.avatar_media_id ?? null,
    consent_confirmed: consent,
    visible,
    sort: input.sort ?? 0,
  };

  if (input.id) {
    const { error } = await supabaseAdmin
      .from(TABLES.SITE_TESTIMONIALS)
      .update(payload)
      .eq("id", input.id);
    if (error) return { ok: false, error: error.message };
    revalidateTag(SITE_ALL, "max");
    return { ok: true, id: input.id };
  }
  const { data, error } = await supabaseAdmin
    .from(TABLES.SITE_TESTIMONIALS)
    .insert(payload)
    .select("id")
    .maybeSingle();
  if (error || !data) return { ok: false, error: error?.message ?? "Insert failed" };
  revalidateTag(SITE_ALL, "max");
  return { ok: true, id: data.id };
}

export async function deleteTestimonial(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabaseAdmin.from(TABLES.SITE_TESTIMONIALS).delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateTag(SITE_ALL, "max");
  return { ok: true };
}

export async function listContactMessages(opts?: {
  status?: string;
  q?: string;
}): Promise<ContactRow[]> {
  let query = supabaseAdmin
    .from(TABLES.CONTACT_MESSAGES)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (opts?.status && opts.status !== "all") {
    query = query.eq("status", opts.status);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[listContactMessages]", error.message);
    return [];
  }
  let rows = (data as ContactRow[] | null) ?? [];
  const q = opts?.q?.trim().toLowerCase();
  if (q) {
    rows = rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.message.toLowerCase().includes(q) ||
        r.topic.toLowerCase().includes(q),
    );
  }
  return rows;
}

export async function updateContactMessage(opts: {
  id: string;
  status?: string;
  notes?: string | null;
  assigned_to?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const patch: Database["public"]["Tables"]["contact_messages"]["Update"] = {};
  if (opts.status != null) patch.status = opts.status;
  if (opts.notes !== undefined) patch.notes = opts.notes;
  if (opts.assigned_to !== undefined) patch.assigned_to = opts.assigned_to;
  const { error } = await supabaseAdmin
    .from(TABLES.CONTACT_MESSAGES)
    .update(patch)
    .eq("id", opts.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
