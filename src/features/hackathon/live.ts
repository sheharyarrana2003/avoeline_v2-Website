import { parseScheduleDateTime } from "@/src/lib/datetime";

/**
 * Live-event tools and online mode (spec 3.4 and 3.5). Pure, client-safe.
 *
 * Announcements, mentor slot booking and the online-mode switches. Kept apart
 * from `types.ts` (tracks and teams) and `judging.ts` (scoring) so each file is
 * one subject.
 */

/* --------------------------------------------------------- announcements */

export interface HackathonAnnouncement {
    id: string;
    eventId: string;
    /** A single track, or "" for the whole hackathon. */
    trackId: string;
    title: string;
    body: string;
    /** How many participants were emailed, and whether any were. */
    emailedCount: number;
    createdAt: string;
}

/** Newest first, and only what this reader should see. */
export function announcementsFor(
    all: HackathonAnnouncement[],
    trackIds: string[],
): HackathonAnnouncement[] {
    const mine = new Set(trackIds);
    return all
        .filter((a) => !a.trackId || mine.has(a.trackId))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/* -------------------------------------------------------------- mentors */

export const MENTOR_EXPERTISE = [
    "Frontend",
    "Backend",
    "ML / AI",
    "Data",
    "Mobile",
    "DevOps",
    "Design",
    "Product",
    "Pitching",
    "Business",
] as const;

export function isExpertise(value: unknown): boolean {
    return typeof value === "string" && (MENTOR_EXPERTISE as readonly string[]).includes(value);
}

export interface MentorSlot {
    id: string;
    /** DD/MM/YYYY, the house format. */
    date: string;
    /** 12-hour strings, as everywhere else in this app. */
    startTime: string;
    endTime: string;
    /** The team holding this slot, or "". */
    bookedByTeamId: string;
    /** Denormalized so the mentor's own page needs no team lookup. */
    bookedTeamName: string;
    bookedAt: string | null;
}

export interface HackathonMentor {
    id: string;
    eventId: string;
    name: string;
    email: string;
    expertise: string[];
    bio: string;
    slots: MentorSlot[];
    createdAt: string;
    updatedAt: string;
}

/** A slot nobody holds yet, and that has not already gone by. */
export function slotIsOpen(slot: MentorSlot, now: Date = new Date()): boolean {
    if (slot.bookedByTeamId) return false;
    const at = parseScheduleDateTime(slot.date, slot.startTime);
    return at ? at > now : true;
}

export function openSlots(mentor: Pick<HackathonMentor, "slots">, now?: Date): MentorSlot[] {
    return mentor.slots.filter((s) => slotIsOpen(s, now));
}

/** Chronological, so a mentor's day reads top to bottom. */
export function sortSlots(slots: MentorSlot[]): MentorSlot[] {
    return [...slots].sort((a, b) => {
        const at = parseScheduleDateTime(a.date, a.startTime);
        const bt = parseScheduleDateTime(b.date, b.startTime);
        if (!at || !bt) return 0;
        return at.getTime() - bt.getTime();
    });
}

/** What a team already holds with any mentor. */
export function slotsBookedBy(mentors: HackathonMentor[], teamId: string): { mentor: HackathonMentor; slot: MentorSlot }[] {
    if (!teamId) return [];
    const out: { mentor: HackathonMentor; slot: MentorSlot }[] = [];
    for (const mentor of mentors) {
        for (const slot of mentor.slots) {
            if (slot.bookedByTeamId === teamId) out.push({ mentor, slot });
        }
    }
    return out;
}

/**
 * One slot per line: `20/12/2026 | 10:00 AM | 11:00 AM`.
 *
 * A textarea rather than a repeating row editor, for the same reason the rubric
 * uses one: a mentor adding six slots should not need six add-button clicks,
 * and it needs no client state.
 */
export function parseSlotLines(text: unknown, existing: MentorSlot[] = []): MentorSlot[] {
    // A slot that is already booked must survive an edit of the list, or a
    // mentor tidying their hours would silently cancel a team's booking.
    const booked = new Map(existing.filter((s) => s.bookedByTeamId).map((s) => [slotKey(s), s]));
    const seen = new Set<string>();
    const out: MentorSlot[] = [];

    for (const line of String(text ?? "").split("\n")) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const [datePart, startPart, endPart] = trimmed.split("|").map((p) => (p ?? "").trim());
        if (!datePart || !startPart) continue;
        const slot: MentorSlot = {
            id: "",
            date: datePart,
            startTime: startPart,
            endTime: endPart || "",
            bookedByTeamId: "",
            bookedTeamName: "",
            bookedAt: null,
        };
        if (!parseScheduleDateTime(slot.date, slot.startTime)) continue;
        const key = slotKey(slot);
        if (seen.has(key)) continue;
        seen.add(key);
        const kept = booked.get(key);
        out.push(kept ? { ...kept } : { ...slot, id: key });
    }

    // Anything already booked stays, even if the mentor deleted its line.
    for (const [key, slot] of booked) {
        if (!seen.has(key)) out.push(slot);
    }
    return sortSlots(out).slice(0, 40);
}

/** Stable per date and time, so an edited list re-matches its bookings. */
export function slotKey(slot: Pick<MentorSlot, "date" | "startTime">): string {
    return `${slot.date}-${slot.startTime}`.replace(/[^0-9A-Za-z]+/g, "-").toLowerCase();
}

export function formatSlotLines(slots: MentorSlot[]): string {
    return sortSlots(slots)
        .map((s) => [s.date, s.startTime, s.endTime].filter(Boolean).join(" | "))
        .join("\n");
}

/* ---------------------------------------------------------- online mode */

export interface HackathonSettings {
    eventId: string;
    /** Spec 3.5: run the whole thing virtually. */
    onlineMode: boolean;
    /** A YouTube or Zoom link, embedded on the spectator page. */
    livestreamUrl: string;
    updatedAt: string;
}

export const EMPTY_SETTINGS: Omit<HackathonSettings, "eventId"> = {
    onlineMode: false,
    livestreamUrl: "",
    updatedAt: "",
};

/**
 * A URL that can safely go in an iframe, or "".
 *
 * Only the two platforms the spec names, and only their embed forms: a raw
 * `watch?v=` page refuses to frame, and letting an arbitrary URL into an iframe
 * on a public page is somebody else's script running in our origin's frame.
 */
export function embedUrl(raw: string): string {
    const value = String(raw ?? "").trim();
    if (!value) return "";

    const youtube = value.match(
        /^https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{6,20})/,
    );
    if (youtube) return `https://www.youtube.com/embed/${youtube[1]}`;

    const zoom = value.match(/^https?:\/\/([a-z0-9-]+\.)?zoom\.us\/(?:wc\/)?(?:j\/)?(\d{9,12})/i);
    if (zoom) return `https://zoom.us/wc/${zoom[2]}/join`;

    return "";
}

/** True when a link was given but is not one we will embed. */
export function livestreamUnsupported(raw: string): boolean {
    return !!String(raw ?? "").trim() && !embedUrl(raw);
}
