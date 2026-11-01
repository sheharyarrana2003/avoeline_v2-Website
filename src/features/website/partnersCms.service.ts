import "server-only";

import { revalidateTag } from "next/cache";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import type { Database } from "@/src/lib/database.types";
import { SITE_ALL } from "./cacheTags";

type PartnerRow = Database["public"]["Tables"]["site_partners"]["Row"];
type PartnerUpdate = Database["public"]["Tables"]["site_partners"]["Update"];
type PartnerInsert = Database["public"]["Tables"]["site_partners"]["Insert"];

export async function listPartnersAdmin(): Promise<PartnerRow[]> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.SITE_PARTNERS)
    .select("*")
    .order("sort", { ascending: true });
  if (error) {
    console.error("[listPartnersAdmin]", error.message);
    return [];
  }
  return (data as PartnerRow[] | null) ?? [];
}

export async function upsertPartner(
  input: PartnerInsert & { id?: string },
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (input.id) {
    const { id, ...rest } = input;
    const { error } = await supabaseAdmin
      .from(TABLES.SITE_PARTNERS)
      .update(rest as PartnerUpdate)
      .eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidateTag(SITE_ALL, "max");
    return { ok: true, id };
  }
  const { data, error } = await supabaseAdmin
    .from(TABLES.SITE_PARTNERS)
    .insert(input)
    .select("id")
    .maybeSingle();
  if (error || !data) return { ok: false, error: error?.message ?? "Insert failed" };
  revalidateTag(SITE_ALL, "max");
  return { ok: true, id: data.id };
}

export async function setPartnerConsent(opts: {
  id: string;
  status: "pending" | "granted" | "revoked";
  visible?: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const patch: PartnerUpdate = {
    consent_status: opts.status,
  };
  if (opts.status === "granted") {
    patch.consent_at = new Date().toISOString();
    if (typeof opts.visible === "boolean") patch.visible = opts.visible;
    else patch.visible = true;
  }
  if (opts.status === "revoked") {
    patch.visible = false;
    patch.consent_at = new Date().toISOString();
  }
  const { error } = await supabaseAdmin.from(TABLES.SITE_PARTNERS).update(patch).eq("id", opts.id);
  if (error) return { ok: false, error: error.message };
  revalidateTag(SITE_ALL, "max");
  return { ok: true };
}

export async function deletePartner(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabaseAdmin.from(TABLES.SITE_PARTNERS).delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateTag(SITE_ALL, "max");
  return { ok: true };
}

export async function getPartnerByOrganizer(organizerId: string): Promise<PartnerRow | null> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.SITE_PARTNERS)
    .select("*")
    .eq("organizer_id", organizerId)
    .order("sort", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[getPartnerByOrganizer]", error.message);
    return null;
  }
  return (data as PartnerRow | null) ?? null;
}

/** Organizer opt-in → pending row for owner approval. */
export async function organizerPartnerOptIn(opts: {
  organizerId: string;
  name: string;
  url?: string | null;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const existing = await getPartnerByOrganizer(opts.organizerId);
  if (existing) {
    const { error } = await supabaseAdmin
      .from(TABLES.SITE_PARTNERS)
      .update({
        name: opts.name,
        url: opts.url ?? existing.url,
        consent_status: "pending",
        visible: false,
        consent_source: "organizer_settings",
        consent_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
    revalidateTag(SITE_ALL, "max");
    return { ok: true, id: existing.id };
  }

  const { data, error } = await supabaseAdmin
    .from(TABLES.SITE_PARTNERS)
    .insert({
      name: opts.name,
      organizer_id: opts.organizerId,
      url: opts.url ?? null,
      consent_status: "pending",
      consent_source: "organizer_settings",
      consent_at: new Date().toISOString(),
      visible: false,
      featured: false,
      sort: 999,
    })
    .select("id")
    .maybeSingle();
  if (error || !data) return { ok: false, error: error?.message ?? "Insert failed" };
  revalidateTag(SITE_ALL, "max");
  return { ok: true, id: data.id };
}

/** Immediate hide on public logo wall. */
export async function organizerPartnerRevoke(
  organizerId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const existing = await getPartnerByOrganizer(organizerId);
  if (!existing) return { ok: true };
  const { error } = await supabaseAdmin
    .from(TABLES.SITE_PARTNERS)
    .update({
      consent_status: "revoked",
      visible: false,
      consent_at: new Date().toISOString(),
      consent_source: "organizer_settings",
    })
    .eq("id", existing.id);
  if (error) return { ok: false, error: error.message };
  revalidateTag(SITE_ALL, "max");
  return { ok: true };
}
