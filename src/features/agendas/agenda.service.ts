import { AgendaItem } from "@/src/services/models/event.model";
import { Session, AgendaDay, AgendaStats } from "@/src/services/models/agenda.model";
import { EventService } from "@/src/services/event.service";
import { adminDb } from "@/data/admin_db";
import { COLLECTIONS, TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { formatDate, formatTime, toIsoDate } from "@/src/lib/datetime";

// ─── helpers ────────────────────────────────────────────────────────────────

function formatDateLabel(dateStr: string): string {
    return formatDate(dateStr);
}

/**
 * Map an AgendaItem (full schema from event.model) to the lightweight
 * Session shape used by the timeline UI components.
 */
function agendaItemToSession(item: AgendaItem, eventId: string): Session {
    // AgendaItem.type is lowercase; Session.type expects uppercase
    const typeMap: Record<string, Session["type"]> = {
        talk:         "TALK",
        workshop:     "WORKSHOP",
        panel:        "PANEL",
        networking:   "NETWORKING",
        break:        "BREAK",
        keynote:      "TALK",       // map keynote → TALK (closest visual)
        qna:          "PANEL",
        registration: "NETWORKING",
        closing:      "TALK",
    };

    return {
        id:          item.sessionId,
        eventId,
        title:       item.title,
        date:        toIsoDate(item.date) || item.date,
        startTime:   item.startTime,
        endTime:     item.endTime,
        type:        typeMap[item.type] ?? "TALK",
        location:    [item.location, item.room].filter(Boolean).join(" · ") || "TBD",
        description: item.description,
        // Build a lightweight speaker from the first speakerName if present
        speaker:     item.speakerNames?.length
            ? { id: item.speakerNames[0], name: item.speakerNames[0], avatarUrl: "" }
            : undefined,
        tiers:       Array.isArray(item.tiers) ? item.tiers : [],
    };
}

/**
 * The sessions one attendee may see (spec 2.1, tiered access).
 *
 * A session with no tiers is for everyone, which is what every session written
 * before tiers existed reads as -- so this hides nothing retroactively. An
 * attendee with no tier sees only the open sessions, which is the safe direction:
 * a missing tier must not act as a master key.
 */
export function sessionsForTier(sessions: Session[], tier: string): Session[] {
    const mine = String(tier ?? "").trim();
    return sessions.filter((s) => {
        const gated = (s.tiers ?? []).filter(Boolean);
        return gated.length === 0 || (!!mine && gated.includes(mine));
    });
}

// ─── AgendaService ───────────────────────────────────────────────────────────

export const AgendaService = {

    /**
     * Return all sessions for an event by reading event.agenda from Firestore.
     */
    async getSessionsByEventId(eventId: string): Promise<Session[]> {
        const event = await EventService.getEventByID(eventId);
        if (!event || !event.agenda?.length) return [];
        return event.agenda.map((item) => agendaItemToSession(item, eventId));
    },

    /**
     * Return sessions for an event filtered by a specific date.
     */
    async getSessionsByEventAndDate(eventId: string, date: string): Promise<Session[]> {
        const sessions = await AgendaService.getSessionsByEventId(eventId);
        return sessions.filter((s) => s.date === date);
    },

    /**
     * Derive the list of distinct agenda days from the event's agenda,
     * sorted chronologically.
     */
    async getAgendaDays(eventId: string): Promise<AgendaDay[]> {
        const sessions = await AgendaService.getSessionsByEventId(eventId);
        const uniqueDates = [...new Set(sessions.map((s) => s.date))].sort();
        return uniqueDates.map((date, index) => ({
            id: index + 1,
            date,
            label: formatDateLabel(date),
        }));
    },

    /**
     * Compute agenda stats (total sessions + unique days) for an event.
     */
    async getAgendaStats(eventId: string): Promise<AgendaStats> {
        const sessions = await AgendaService.getSessionsByEventId(eventId);
        const uniqueDates = new Set(sessions.map((s) => s.date));
        return {
            totalSessions: sessions.length,
            daysCount: uniqueDates.size,
        };
    },

    /**
     * Group all sessions for an event by date (keyed by YYYY-MM-DD string).
     */
    async getSessionsGroupedByDate(eventId: string): Promise<Record<string, Session[]>> {
        const sessions = await AgendaService.getSessionsByEventId(eventId);
        const grouped: Record<string, Session[]> = {};
        for (const session of sessions) {
            if (!grouped[session.date]) grouped[session.date] = [];
            grouped[session.date].push(session);
        }
        return grouped;
    },

    /**
     * Convert form data into an AgendaItem, append it to the event's agenda
     * array, and persist the update back to Firestore.
     */
    async addAgendaItem(
        eventId: string,
        formData: {
            title: string;
            type: AgendaItem["type"];
            date: string;
            startTime: string;
            endTime: string;
            location: string;
            speakerNames: string[];
            description: string;
            status: AgendaItem["status"];
            /** Attendee tiers this session is for. Empty means everyone. */
            tiers?: string[];
        }
    ): Promise<string> {
        // 1. Read the current event document
        const snap = await adminDb.collection(COLLECTIONS.EVENTS).doc(eventId).get();
        if (!snap.exists) throw new Error(`Event ${eventId} not found`);

        const data = snap.data() as {
            agenda?: AgendaItem[];
            schedule?: { timezone?: string };
            capacity?: { totalSeats?: number };
        };
        const existingAgenda: AgendaItem[] = Array.isArray(data.agenda) ? data.agenda : [];

        // 2. Calculate duration string
        const calcDuration = (start: string, end: string): string => {
            const [sh, sm] = start.split(":").map(Number);
            const [eh, em] = end.split(":").map(Number);
            const diffMin = (eh * 60 + em) - (sh * 60 + sm);
            if (diffMin <= 0) return "—";
            const h = Math.floor(diffMin / 60);
            const m = diffMin % 60;
            return h > 0 ? `${h}h ${m > 0 ? m + "m" : ""}`.trim() : `${m}m`;
        };

        // 3. Build the new AgendaItem
        const newItem: AgendaItem = {
            sessionId:             `session_${Date.now()}`,
            title:                 formData.title,
            type:                  formData.type,
            status:                formData.status ?? "confirmed",
            // Store DD/MM/YYYY date + 12h times; duration is computed from the
            // raw 24h form values first (calcDuration expects 24h "HH:mm").
            date:                  formatDate(formData.date),
            startTime:             formatTime(formData.startTime),
            endTime:               formatTime(formData.endTime),
            duration:              calcDuration(formData.startTime, formData.endTime),
            timezone:              data.schedule?.timezone ?? "UTC",
            location:              formData.location,
            room:                  "",
            building:              "",
            floor:                 "",
            capacity:              data.capacity?.totalSeats ?? 0,
            speakerNames:          formData.speakerNames ?? [],
            description:           formData.description ?? "",
            tiers:                 formData.tiers ?? [],
            activities:            [],
            notes:                 "",
            recordingUrl:          "",
            feedbackFormUrl:       "",
            isRecordingAvailable:  false,
            isRegistrationRequired: false,
            maxAttendees:          data.capacity?.totalSeats ?? 0,
            currentAttendees:      0,
            customFields:          {},
        };

        const { data: inserted, error } = await supabaseAdmin.from(TABLES.EVENT_AGENDA_ITEMS).insert({
            event_id: eventId,
            title: newItem.title,
            item_type: newItem.type,
            status: newItem.status,
            session_date: toIsoDate(formData.date) || null,
            start_clock: formData.startTime,
            end_clock: formData.endTime,
            duration: newItem.duration,
            timezone: newItem.timezone,
            speaker_names: newItem.speakerNames,
            location: newItem.location,
            description: newItem.description,
        }).select("id").single();
        if (error) throw error;

        const updatedAgenda = [...existingAgenda, newItem];
        await adminDb.collection(COLLECTIONS.EVENTS).doc(eventId).update({ agenda: updatedAgenda });
        return String(inserted?.id || "");
    },
};
