import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import type { RegistrationGroup } from "./types";

function mapGroup(row: Record<string, unknown>, memberIds: string[] = []): RegistrationGroup {
  return {
    id: String(row.id),
    eventId: String(row.event_id),
    groupName: String(row.group_name || ""),
    leadRegistrationId: row.lead_registration_id ? String(row.lead_registration_id) : null,
    paymentStatus: String(row.payment_status || "pending"),
    paymentProofPath: row.payment_proof_path ? String(row.payment_proof_path) : null,
    memberIds,
    createdAt: String(row.created_at || ""),
  };
}

export async function listRegistrationGroups(eventId: string): Promise<RegistrationGroup[]> {
  if (!eventId) return [];
  const { data: groups, error } = await supabaseAdmin
    .from(TABLES.REGISTRATION_GROUPS)
    .select("*")
    .eq("event_id", eventId);
  if (error) throw error;
  const ids = (groups ?? []).map((g) => String(g.id));
  if (!ids.length) return [];
  const { data: regs } = await supabaseAdmin
    .from(TABLES.REGISTRATIONS)
    .select("id, group_id")
    .in("group_id", ids);
  const byGroup = new Map<string, string[]>();
  for (const r of regs ?? []) {
    const gid = String(r.group_id || "");
    if (!gid) continue;
    const list = byGroup.get(gid) ?? [];
    list.push(String(r.id));
    byGroup.set(gid, list);
  }
  return (groups ?? []).map((g) => mapGroup(g as Record<string, unknown>, byGroup.get(String(g.id)) ?? []));
}

export async function createRegistrationGroup(input: {
  eventId: string;
  groupName: string;
  leadRegistrationId: string;
  paymentStatus?: string;
  paymentProofPath?: string | null;
}): Promise<RegistrationGroup> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.REGISTRATION_GROUPS)
    .insert({
      event_id: input.eventId,
      group_name: input.groupName.trim() || "Group",
      lead_registration_id: input.leadRegistrationId,
      payment_status: input.paymentStatus || "pending",
      payment_proof_path: input.paymentProofPath ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapGroup(data as Record<string, unknown>, [input.leadRegistrationId]);
}

export async function attachRegistrationsToGroup(groupId: string, registrationIds: string[]): Promise<void> {
  const ids = registrationIds.filter(Boolean);
  if (!ids.length) return;
  const { error } = await supabaseAdmin.from(TABLES.REGISTRATIONS).update({ group_id: groupId }).in("id", ids);
  if (error) throw error;
}
