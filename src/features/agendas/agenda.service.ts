import { AgendaItem } from "@/src/services/models/event.model";
import { Session, AgendaDay, AgendaStats, Speaker } from "@/src/services/models/agenda.model";
import { EventService } from "@/src/services/event.service";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { formatDate, formatTime, toIsoDate } from "@/src/lib/datetime";
import { compareAgendaDayKeys, sortSessionsBySchedule } from "@/src/features/agendas/agendaSort";
import { normalizeAgendaType, type AgendaSessionType } from "@/src/features/agendas/agendaTypes";
import { speakersByAgendaItem } from "@/src/features/agendas/agendaSpeakers.service";

function formatDateLabel(dateStr: string): string {
  return formatDate(dateStr);
}

function calcDuration(start: string, end: string): string {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const diffMin = eh * 60 + em - (sh * 60 + sm);
  if (diffMin <= 0) return "—";
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  return h > 0 ? `${h}h ${m > 0 ? m + "m" : ""}`.trim() : `${m}m`;
}

async function loadSpeakerProfiles(speakerIds: string[]): Promise<Map<string, Speaker>> {
  const unique = [...new Set(speakerIds.filter(Boolean))];
  const out = new Map<string, Speaker>();
  if (!unique.length) return out;
  const { data } = await supabaseAdmin
    .from(TABLES.EVENT_SPEAKERS)
    .select("id, name, profile_image, designation, company")
    .in("id", unique);
  for (const row of data ?? []) {
    out.set(String(row.id), {
      id: String(row.id),
      name: String(row.name || ""),
      avatarUrl: String(row.profile_image || ""),
      role: String(row.designation || ""),
      company: String(row.company || ""),
    });
  }
  return out;
}

function agendaItemToSession(
  item: AgendaItem,
  eventId: string,
  speakers: Speaker[] = [],
  speakerIds: string[] = [],
): Session {
  const type = normalizeAgendaType(item.type);
  return {
    id: item.sessionId,
    eventId,
    title: item.title,
    date: toIsoDate(item.date) || item.date,
    startTime: item.startTime,
    endTime: item.endTime,
    type,
    location: item.location || "",
    room: item.room || "",
    description: item.description,
    speakers,
    speaker: speakers[0],
    speakerIds,
    trackId: item.trackId ?? null,
    tiers: Array.isArray(item.tiers) ? item.tiers : [],
  };
}

/**
 * The sessions one attendee may see (spec 2.1, tiered access).
 */
export function sessionsForTier(sessions: Session[], tier: string): Session[] {
  const mine = String(tier ?? "").trim();
  return sessions.filter((s) => {
    const gated = (s.tiers ?? []).filter(Boolean);
    return gated.length === 0 || (!!mine && gated.includes(mine));
  });
}

async function hydrateSessions(eventId: string, items: AgendaItem[]): Promise<Session[]> {
  const join = await speakersByAgendaItem(eventId);
  const allSpeakerIds = [...join.values()].flat();
  const profiles = await loadSpeakerProfiles(allSpeakerIds);
  const trackIds = [...new Set(items.map((i) => i.trackId).filter(Boolean) as string[])];
  const trackNames = new Map<string, string>();
  if (trackIds.length) {
    const { data } = await supabaseAdmin
      .from(TABLES.HACKATHON_TRACKS)
      .select("id, name")
      .in("id", trackIds);
    for (const t of data ?? []) trackNames.set(String(t.id), String(t.name || ""));
  }

  return sortSessionsBySchedule(
    items.map((item) => {
      const ids = join.get(item.sessionId) ?? [];
      const speakers = ids.map((id) => profiles.get(id)).filter(Boolean) as Speaker[];
      // Fallback to denormalized names when join empty
      const fallback =
        !speakers.length && item.speakerNames?.length
          ? item.speakerNames.map((name, i) => ({
              id: `name-${i}`,
              name,
              avatarUrl: "",
            }))
          : speakers;
      const session = agendaItemToSession(item, eventId, fallback, ids);
      if (item.trackId) session.trackName = trackNames.get(item.trackId) ?? null;
      return session;
    }),
  );
}

async function listAgendaItemsFromTable(eventId: string): Promise<AgendaItem[]> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.EVENT_AGENDA_ITEMS)
    .select(
      "id, title, item_type, status, session_date, start_clock, end_clock, duration, timezone, location, room, description, speaker_names, add_to_calendar, track_id, extra",
    )
    .eq("event_id", eventId);
  if (error) throw error;
  return (data ?? []).map((row) => {
    const extra = (row.extra && typeof row.extra === "object" ? row.extra : {}) as {
      tiers?: string[];
    };
    return {
      sessionId: String(row.id),
      title: String(row.title || ""),
      type: normalizeAgendaType(row.item_type) as AgendaItem["type"],
      status: (String(row.status || "confirmed") as AgendaItem["status"]) || "confirmed",
      date: row.session_date ? formatDate(String(row.session_date)) : "",
      startTime: String(row.start_clock || ""),
      endTime: String(row.end_clock || ""),
      duration: String(row.duration || ""),
      timezone: String(row.timezone || "UTC"),
      location: String(row.location || ""),
      room: String(row.room || ""),
      building: "",
      floor: "",
      capacity: 0,
      speakerNames: Array.isArray(row.speaker_names) ? row.speaker_names.map(String) : [],
      description: String(row.description || ""),
      activities: [],
      notes: "",
      recordingUrl: "",
      feedbackFormUrl: "",
      isRecordingAvailable: false,
      isRegistrationRequired: false,
      maxAttendees: 0,
      currentAttendees: 0,
      customFields: {},
      tiers: Array.isArray(extra.tiers) ? extra.tiers.map(String) : [],
      addToCalendar: !!row.add_to_calendar,
      trackId: row.track_id ? String(row.track_id) : null,
    };
  });
}

export const AgendaService = {
  async getSessionsByEventId(eventId: string): Promise<Session[]> {
    const fromTable = await listAgendaItemsFromTable(eventId);
    if (fromTable.length) return hydrateSessions(eventId, fromTable);

    // Legacy fallback: events.extra.agenda
    const event = await EventService.getEventByID(eventId);
    if (!event?.agenda?.length) return [];
    return hydrateSessions(
      eventId,
      event.agenda.map((a) => ({
        ...a,
        type: normalizeAgendaType(a.type) as AgendaItem["type"],
      })),
    );
  },

  async getSessionsByEventAndDate(eventId: string, date: string): Promise<Session[]> {
    const sessions = await AgendaService.getSessionsByEventId(eventId);
    return sessions.filter((s) => s.date === date);
  },

  async getAgendaDays(eventId: string): Promise<AgendaDay[]> {
    const sessions = await AgendaService.getSessionsByEventId(eventId);
    const uniqueDates = [...new Set(sessions.map((s) => s.date))].sort(compareAgendaDayKeys);
    return uniqueDates.map((date, index) => ({
      id: index + 1,
      date,
      label: formatDateLabel(date),
    }));
  },

  async getAgendaStats(eventId: string): Promise<AgendaStats> {
    const sessions = await AgendaService.getSessionsByEventId(eventId);
    const uniqueDates = new Set(sessions.map((s) => s.date));
    return {
      totalSessions: sessions.length,
      daysCount: uniqueDates.size,
    };
  },

  async getSessionsGroupedByDate(eventId: string): Promise<Record<string, Session[]>> {
    const sessions = await AgendaService.getSessionsByEventId(eventId);
    const grouped: Record<string, Session[]> = {};
    for (const session of sessions) {
      if (!grouped[session.date]) grouped[session.date] = [];
      grouped[session.date].push(session);
    }
    for (const k of Object.keys(grouped)) {
      grouped[k] = sortSessionsBySchedule(grouped[k] ?? []);
    }
    return grouped;
  },

  async addAgendaItem(
    eventId: string,
    formData: {
      title: string;
      type: AgendaSessionType | string;
      date: string;
      startTime: string;
      endTime: string;
      location: string;
      room?: string;
      speakerNames: string[];
      description: string;
      status: AgendaItem["status"];
      tiers?: string[];
      addToCalendar?: boolean;
      trackId?: string | null;
    },
  ): Promise<string> {
    const type = normalizeAgendaType(formData.type);
    const { data: eventRow, error: eventError } = await supabaseAdmin
      .from(TABLES.EVENTS)
      .select("id, timezone")
      .eq("id", eventId)
      .maybeSingle();
    if (eventError) throw eventError;
    if (!eventRow) throw new Error(`Event ${eventId} not found`);

    const { data: inserted, error } = await supabaseAdmin
      .from(TABLES.EVENT_AGENDA_ITEMS)
      .insert({
        event_id: eventId,
        title: formData.title,
        item_type: type,
        status: formData.status ?? "confirmed",
        session_date: toIsoDate(formData.date) || null,
        start_clock: formData.startTime,
        end_clock: formData.endTime,
        duration: calcDuration(formData.startTime, formData.endTime),
        timezone: eventRow.timezone ?? "UTC",
        speaker_names: formData.speakerNames ?? [],
        location: formData.location,
        room: formData.room || null,
        description: formData.description ?? "",
        add_to_calendar: !!formData.addToCalendar,
        track_id: type === "Competition" && formData.trackId ? formData.trackId : null,
        extra: { tiers: formData.tiers ?? [] },
      })
      .select("id")
      .single();
    if (error) throw error;
    // Single SoT: table only — do not append to events.extra.agenda
    return String(inserted?.id || "");
  },

  async updateAgendaItem(
    eventId: string,
    itemId: string,
    formData: {
      title: string;
      type: AgendaSessionType | string;
      date: string;
      startTime: string;
      endTime: string;
      location: string;
      room?: string;
      speakerNames: string[];
      description: string;
      status: AgendaItem["status"];
      tiers?: string[];
      addToCalendar?: boolean;
      trackId?: string | null;
    },
  ): Promise<void> {
    const type = normalizeAgendaType(formData.type);
    const { error } = await supabaseAdmin
      .from(TABLES.EVENT_AGENDA_ITEMS)
      .update({
        title: formData.title,
        item_type: type,
        status: formData.status ?? "confirmed",
        session_date: toIsoDate(formData.date) || null,
        start_clock: formData.startTime,
        end_clock: formData.endTime,
        duration: calcDuration(formData.startTime, formData.endTime),
        speaker_names: formData.speakerNames ?? [],
        location: formData.location,
        room: formData.room || null,
        description: formData.description ?? "",
        add_to_calendar: !!formData.addToCalendar,
        track_id: type === "Competition" && formData.trackId ? formData.trackId : null,
        extra: { tiers: formData.tiers ?? [] },
      })
      .eq("id", itemId)
      .eq("event_id", eventId);
    if (error) throw error;
  },

  async deleteAgendaItem(eventId: string, itemId: string): Promise<void> {
    await supabaseAdmin.from(TABLES.EVENT_AGENDA_SPEAKERS).delete().eq("agenda_item_id", itemId);
    const { error } = await supabaseAdmin
      .from(TABLES.EVENT_AGENDA_ITEMS)
      .delete()
      .eq("id", itemId)
      .eq("event_id", eventId);
    if (error) throw error;
  },
};
