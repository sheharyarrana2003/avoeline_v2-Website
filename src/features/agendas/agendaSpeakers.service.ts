import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";

export type AgendaItemOption = { id: string; title: string };

export async function listAgendaItemOptions(eventId: string): Promise<AgendaItemOption[]> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.EVENT_AGENDA_ITEMS)
    .select("id, title")
    .eq("event_id", eventId);
  if (error) throw error;
  return (data ?? []).map((r) => ({ id: String(r.id), title: String(r.title || "Session") }));
}

export async function setAgendaSpeakers(agendaItemId: string, speakerIds: string[]): Promise<void> {
  if (!agendaItemId) return;
  await supabaseAdmin.from(TABLES.EVENT_AGENDA_SPEAKERS).delete().eq("agenda_item_id", agendaItemId);
  const rows = [...new Set(speakerIds.filter(Boolean))].map((speaker_id) => ({
    agenda_item_id: agendaItemId,
    speaker_id,
  }));
  if (rows.length) {
    const { error } = await supabaseAdmin.from(TABLES.EVENT_AGENDA_SPEAKERS).insert(rows);
    if (error) throw error;
  }
}

export async function setSpeakerSessions(speakerId: string, agendaItemIds: string[]): Promise<void> {
  if (!speakerId) return;
  await supabaseAdmin.from(TABLES.EVENT_AGENDA_SPEAKERS).delete().eq("speaker_id", speakerId);
  const rows = [...new Set(agendaItemIds.filter(Boolean))].map((agenda_item_id) => ({
    agenda_item_id,
    speaker_id: speakerId,
  }));
  if (rows.length) {
    const { error } = await supabaseAdmin.from(TABLES.EVENT_AGENDA_SPEAKERS).insert(rows);
    if (error) throw error;
  }
}

export async function sessionsForSpeaker(speakerId: string): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from(TABLES.EVENT_AGENDA_SPEAKERS)
    .select("agenda_item_id")
    .eq("speaker_id", speakerId);
  const ids = (data ?? []).map((r) => String(r.agenda_item_id));
  if (!ids.length) return [];
  const { data: items } = await supabaseAdmin.from(TABLES.EVENT_AGENDA_ITEMS).select("id, title").in("id", ids);
  return (items ?? []).map((i) => String(i.title || "Session"));
}

export async function speakersByAgendaItem(eventId: string): Promise<Map<string, string[]>> {
  const items = await listAgendaItemOptions(eventId);
  const ids = items.map((i) => i.id);
  if (!ids.length) return new Map();
  const { data } = await supabaseAdmin
    .from(TABLES.EVENT_AGENDA_SPEAKERS)
    .select("agenda_item_id, speaker_id")
    .in("agenda_item_id", ids);
  const map = new Map<string, string[]>();
  for (const row of data ?? []) {
    const key = String(row.agenda_item_id);
    const list = map.get(key) ?? [];
    list.push(String(row.speaker_id));
    map.set(key, list);
  }
  return map;
}
