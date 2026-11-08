"use server";

import { revalidatePath } from "next/cache";
import { assertOwnedEvent } from "@/src/features/events/ownership";
import { AgendaService } from "@/src/features/agendas/agenda.service";
import { setAgendaSpeakers } from "@/src/features/agendas/agendaSpeakers.service";
import { SpeakerService } from "@/src/features/event_speakers/types/speakers.service";
import { normalizeAgendaType, isAgendaSessionType } from "@/src/features/agendas/agendaTypes";
import type { AgendaItem } from "@/src/services/models/event.model";

export type AgendaActionResult = {
  success: boolean;
  error?: string;
  itemId?: string;
  warnings?: string[];
};

async function readForm(formData: FormData, eventId: string) {
  const title = String(formData.get("title") ?? "").trim();
  const typeRaw = String(formData.get("sessionType") ?? "Talk");
  const type = normalizeAgendaType(typeRaw);
  const date = String(formData.get("date") ?? "").trim();
  const startTime = String(formData.get("startTime") ?? "").trim();
  const endTime = String(formData.get("endTime") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const room = String(formData.get("room") ?? "").trim();
  const speakerIds = formData.getAll("speakerIds").map(String).filter(Boolean);
  const description = String(formData.get("description") ?? "");
  const status =
    (String(formData.get("status") ?? "confirmed") as AgendaItem["status"]) || "confirmed";
  const trackId = String(formData.get("trackId") ?? "").trim() || null;
  const tiers = formData
    .getAll("tiers")
    .map(String)
    .map((t) => t.trim())
    .filter(Boolean);
  const addToCalendar = String(formData.get("addToCalendar") ?? "") === "true";

  if (!title || !date || !startTime || !endTime) {
    return { error: "Title, date, start time and end time are required." as const };
  }
  if (!isAgendaSessionType(type)) {
    return { error: "Choose a valid session type." as const };
  }

  const allSpeakers = await SpeakerService.getAllSpeakers(eventId);
  const speakerNames = allSpeakers
    .filter((s) => speakerIds.includes(s.speakerId))
    .map((s) => s.name);

  return {
    title,
    type,
    date,
    startTime,
    endTime,
    location,
    room,
    speakerIds,
    speakerNames,
    description,
    status,
    trackId: type === "Competition" ? trackId : null,
    tiers,
    addToCalendar,
  };
}

function revalidate(organizerId: string, eventId: string) {
  revalidatePath(`/organizer/${organizerId}/events/${eventId}/agenda`);
  revalidatePath(`/organizer/${organizerId}/events/${eventId}/speakers`);
  revalidatePath(`/events/${eventId}`);
}

export async function saveAgendaItemAction(
  _prev: AgendaActionResult | null,
  formData: FormData,
): Promise<AgendaActionResult> {
  try {
    const eventId = String(formData.get("eventId") ?? "").trim();
    const organizerId = String(formData.get("organizerId") ?? "").trim();
    const itemId = String(formData.get("itemId") ?? "").trim();
    const owned = await assertOwnedEvent(eventId);
    if (!owned) return { success: false, error: "You cannot edit this agenda." };

    const parsed = await readForm(formData, eventId);
    if ("error" in parsed && parsed.error) return { success: false, error: parsed.error };

    const data = parsed as Exclude<Awaited<ReturnType<typeof readForm>>, { error: string }>;

    let id = itemId;
    if (itemId) {
      await AgendaService.updateAgendaItem(eventId, itemId, data);
    } else {
      id = await AgendaService.addAgendaItem(eventId, data);
    }
    await setAgendaSpeakers(id, data.speakerIds);
    revalidate(organizerId || owned.organizerId, eventId);
    return { success: true, itemId: id };
  } catch (err) {
    console.error("[saveAgendaItemAction]", err);
    return { success: false, error: "Could not save that session." };
  }
}

export async function deleteAgendaItemAction(formData: FormData): Promise<void> {
  try {
    const eventId = String(formData.get("eventId") ?? "").trim();
    const organizerId = String(formData.get("organizerId") ?? "").trim();
    const itemId = String(formData.get("itemId") ?? "").trim();
    if (!itemId) return;
    const owned = await assertOwnedEvent(eventId);
    if (!owned) return;
    await AgendaService.deleteAgendaItem(eventId, itemId);
    revalidate(organizerId || owned.organizerId, eventId);
  } catch (err) {
    console.error("[deleteAgendaItemAction]", err);
  }
}
