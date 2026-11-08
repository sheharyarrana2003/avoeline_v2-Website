/** Pure helpers for agenda ↔ speaker join payloads (no DB). */

export function joinRowsForAgendaSpeakers(
  agendaItemId: string,
  speakerIds: string[],
): { agenda_item_id: string; speaker_id: string }[] {
  if (!agendaItemId) return [];
  return [...new Set(speakerIds.filter(Boolean))].map((speaker_id) => ({
    agenda_item_id: agendaItemId,
    speaker_id,
  }));
}

export function joinRowsForSpeakerSessions(
  speakerId: string,
  agendaItemIds: string[],
): { agenda_item_id: string; speaker_id: string }[] {
  if (!speakerId) return [];
  return [...new Set(agendaItemIds.filter(Boolean))].map((agenda_item_id) => ({
    agenda_item_id,
    speaker_id: speakerId,
  }));
}

export function groupSessionTitlesBySpeaker(
  links: { agenda_item_id: string; speaker_id: string }[],
  titlesByAgendaId: Map<string, string>,
  speakerIds: string[],
): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const id of speakerIds) out.set(id, []);
  for (const row of links) {
    const title = titlesByAgendaId.get(row.agenda_item_id);
    if (!title) continue;
    const list = out.get(row.speaker_id) ?? [];
    list.push(title);
    out.set(row.speaker_id, list);
  }
  return out;
}
