import { EventService } from "@/src/services/event.service";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import type { Speaker } from "@/src/services/models/event.model";
import { setSpeakerSessions } from "@/src/features/agendas/agendaSpeakers.service";

function mapSpeaker(row: Record<string, unknown>): Speaker {
  return {
    speakerId: String(row.id),
    name: String(row.name || ""),
    designation: String(row.designation || ""),
    bio: String(row.bio || ""),
    profileImage: String(row.profile_image || ""),
    sessionTitle: String(row.session_title || ""),
    purpose: String(row.purpose || ""),
    start_time: String(row.start_time || ""),
    end_time: String(row.end_time || ""),
    email: String(row.email || ""),
    phone: String(row.phone || ""),
    isContactPublic: Boolean(row.is_contact_public),
    linkedin: String(row.linkedin || ""),
    twitter: String(row.twitter || ""),
    website: String(row.website || ""),
    company: String(row.company || ""),
  };
}

export const SpeakerService = {
  async getAllSpeakers(event_id: string): Promise<Speaker[]> {
    const { data, error } = await supabaseAdmin.from(TABLES.EVENT_SPEAKERS).select("*").eq("event_id", event_id);
    if (error) throw error;
    return (data ?? []).map((row) => mapSpeaker(row as Record<string, unknown>));
  },

  async createNewSpeaker(formData: FormData, event_id: string) {
    const Event = await EventService.getEventByID(event_id);
    if (!Event) throw new Error(`Event ${event_id} not found`);

    const { data, error } = await supabaseAdmin.from(TABLES.EVENT_SPEAKERS).insert({
      event_id,
      name: String(formData.get("speakerName") || "").trim(),
      designation: String(formData.get("title") || "").trim(),
      bio: String(formData.get("bio") || "").trim(),
      profile_image: String(formData.get("profileImage") || ""),
      session_title: "Assigned Speaker Session",
      purpose: String(formData.get("purpose") || ""),
      start_time: String(formData.get("start_time") || ""),
      end_time: String(formData.get("end_time") || ""),
      email: String(formData.get("email") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      is_contact_public: formData.get("isPublic") === "on",
      linkedin: String(formData.get("linkedin") || "").trim(),
      twitter: String(formData.get("twitter") || "").trim(),
      website: String(formData.get("website") || "").trim(),
      company: String(formData.get("company") || "").trim(),
    }).select("id").single();
    if (error) throw error;
    const sessionIds = formData.getAll("sessionIds").map(String).filter(Boolean);
    if (data?.id && sessionIds.length) await setSpeakerSessions(String(data.id), sessionIds);
  },
};
