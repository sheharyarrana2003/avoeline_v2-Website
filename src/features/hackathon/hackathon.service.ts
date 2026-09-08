import { cache } from "react";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { adminDb } from "@/data/admin_db";
import { COLLECTIONS } from "@/data/collections";
import { toIsoString } from "@/src/lib/datetime";
import type { HackathonJudge } from "./judging";
import {
    EMPTY_SETTINGS,
    type HackathonAnnouncement,
    type HackathonMentor,
    type HackathonSettings,
    type MentorSlot,
} from "./live";
import type { JudgeScore, TeamScores } from "./types";
import {
    normalizeJoinCode,
    type FeeStatus,
    type HackathonTeam,
    type HackathonTrack,
    type RubricCategory,
    type HackathonTeamMember,
    type TeamSubmission,
} from "./types";

/**
 * Reads for the hackathon module. Server only.
 *
 * Every query here filters on exactly ONE field and sorts in memory. That is
 * not a style choice: `firestore.indexes.json` covers only events,
 * registrations and bookings, and `firebase deploy` is forbidden in this repo,
 * so a composite index for these collections can never be created. A second
 * `where` -- or any `where` plus `orderBy` -- would fail in production the first
 * time it ran with real data.
 *
 * Services throw; the actions and pages that call them catch.
 */

const FEE_STATUSES: FeeStatus[] = ["not_required", "fee_pending", "fee_paid"];

function mapToRubric(raw: any): RubricCategory[] {
    if (!Array.isArray(raw)) return [];
    return raw.map((c: any, i: number) => ({
        id: String(c?.id || `c${i}`),
        label: String(c?.label || ""),
        maxScore: Number(c?.maxScore ?? 0) || 0,
    }));
}

export function mapToTrack(raw: any, fallbackId?: string): HackathonTrack {
    return {
        id: String(raw?.id || fallbackId || ""),
        eventId: String(raw?.eventId || ""),
        organizerId: String(raw?.organizerId || ""),
        name: String(raw?.name || ""),
        description: String(raw?.description || ""),
        rulesPath: String(raw?.rulesPath || ""),
        rulesName: String(raw?.rulesName || ""),
        fee: Number(raw?.fee ?? 0) || 0,
        currency: String(raw?.currency || "PKR"),
        // A track with no stated bounds still has to have workable ones, or the
        // join rule compares against NaN and every join is refused.
        minTeamSize: Number(raw?.minTeamSize ?? 1) || 1,
        maxTeamSize: Number(raw?.maxTeamSize ?? 4) || 4,
        submissionDeadline: String(raw?.submissionDeadline || ""),
        rosterLockDate: String(raw?.rosterLockDate || ""),
        prizePool: String(raw?.prizePool || ""),
        rubric: mapToRubric(raw?.rubric),
        currentRound: Number(raw?.currentRound ?? 1) || 1,
        // Real Timestamps, so they must be strings before crossing into a
        // Client Component -- an admin-SDK Timestamp there is a runtime error.
        createdAt: toIsoString(raw?.createdAt) || "",
        updatedAt: toIsoString(raw?.updatedAt) || "",
    };
}

function mapToMembers(raw: any): HackathonTeamMember[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .filter((m: any) => m && m.registrationId)
        .map((m: any) => ({
            registrationId: String(m.registrationId),
            name: String(m.name || ""),
            email: String(m.email || ""),
            skills: Array.isArray(m.skills) ? m.skills.map(String) : [],
            isOwner: !!m.isOwner,
            joinedAt: toIsoString(m.joinedAt) || "",
        }));
}

function mapToSubmission(raw: any): TeamSubmission {
    return {
        repoUrl: String(raw?.repoUrl || ""),
        demoVideoUrl: String(raw?.demoVideoUrl || ""),
        description: String(raw?.description || ""),
        deckPath: String(raw?.deckPath || ""),
        deckName: String(raw?.deckName || ""),
        // Null rather than "" so "has this team submitted" stays a single check.
        submittedAt: toIsoString(raw?.submittedAt),
    };
}

/**
 * Judges' cards, with every timestamp turned into a string.
 *
 * The reason this is not a raw spread: `scoredAt` is written as a real
 * Timestamp, the team is handed to Client Components, and an admin-SDK
 * Timestamp there is a runtime error rather than a warning. A spread looked
 * harmless right up to the first score being submitted.
 */
function mapToScores(raw: any): TeamScores {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    const out: TeamScores = {};
    for (const [judgeId, byRound] of Object.entries(raw)) {
        if (!byRound || typeof byRound !== "object") continue;
        const rounds: Record<string, JudgeScore> = {};
        for (const [round, card] of Object.entries(byRound as Record<string, any>)) {
            if (!card || typeof card !== "object") continue;
            rounds[round] = {
                byCategory:
                    card.byCategory && typeof card.byCategory === "object" && !Array.isArray(card.byCategory)
                        ? Object.fromEntries(
                              Object.entries(card.byCategory).map(([k, v]) => [k, Number(v) || 0]),
                          )
                        : {},
                total: Number(card.total ?? 0) || 0,
                comment: String(card.comment || ""),
                scoredAt: toIsoString(card.scoredAt) || "",
            };
        }
        if (Object.keys(rounds).length) out[judgeId] = rounds;
    }
    return out;
}

export function mapToTeam(raw: any, fallbackId?: string): HackathonTeam {
    const members = mapToMembers(raw?.members);
    return {
        id: String(raw?.id || fallbackId || ""),
        eventId: String(raw?.eventId || ""),
        trackId: String(raw?.trackId || ""),
        organizerId: String(raw?.organizerId || ""),
        name: String(raw?.name || ""),
        joinCode: String(raw?.joinCode || ""),
        members,
        // Derived from members rather than trusted: the two are written together
        // and a divergence would make a participant unfindable, or findable in a
        // team they are not in.
        memberRegistrationIds: members.map((m) => m.registrationId),
        maxTeamSize: Number(raw?.maxTeamSize ?? 4) || 4,
        lookingForMembers: !!raw?.lookingForMembers,
        unlockedByOrganizer: !!raw?.unlockedByOrganizer,
        submission: mapToSubmission(raw?.submission),
        feeStatus: FEE_STATUSES.includes(raw?.feeStatus) ? raw.feeStatus : "not_required",
        feeProofPath: String(raw?.feeProofPath || ""),
        round: Number(raw?.round ?? 1) || 1,
        eliminatedAtRound:
            raw?.eliminatedAtRound === null || raw?.eliminatedAtRound === undefined
                ? null
                : Number(raw.eliminatedAtRound) || null,
        scores: mapToScores(raw?.scores),
        createdAt: toIsoString(raw?.createdAt) || "",
        updatedAt: toIsoString(raw?.updatedAt) || "",
    };
}

/** Tracks of one event, in the order an organizer created them. */
export const listTracks = cache(async (eventId: string): Promise<HackathonTrack[]> => {
    if (!eventId) return [];
    const snap = await adminDb.collection(COLLECTIONS.HACKATHON_TRACKS).where("eventId", "==", eventId).get();
    return snap.docs
        .map((d: QueryDocumentSnapshot) => mapToTrack(d.data(), d.id))
        .sort((a: HackathonTrack, b: HackathonTrack) => a.createdAt.localeCompare(b.createdAt) || a.name.localeCompare(b.name));
});

export const getTrack = cache(async (trackId: string): Promise<HackathonTrack | null> => {
    if (!trackId) return null;
    const snap = await adminDb.collection(COLLECTIONS.HACKATHON_TRACKS).doc(trackId).get();
    return snap.exists ? mapToTrack(snap.data(), snap.id) : null;
});

/** Every team on one event, so a page can group by track without N queries. */
export const listTeamsOfEvent = cache(async (eventId: string): Promise<HackathonTeam[]> => {
    if (!eventId) return [];
    const snap = await adminDb.collection(COLLECTIONS.HACKATHON_TEAMS).where("eventId", "==", eventId).get();
    return snap.docs.map((d: QueryDocumentSnapshot) => mapToTeam(d.data(), d.id)).sort((a: HackathonTeam, b: HackathonTeam) => a.name.localeCompare(b.name));
});

export const listTeams = cache(async (trackId: string): Promise<HackathonTeam[]> => {
    if (!trackId) return [];
    const snap = await adminDb.collection(COLLECTIONS.HACKATHON_TEAMS).where("trackId", "==", trackId).get();
    return snap.docs.map((d: QueryDocumentSnapshot) => mapToTeam(d.data(), d.id)).sort((a: HackathonTeam, b: HackathonTeam) => a.name.localeCompare(b.name));
});

/**
 * Every team this participant belongs to, across all tracks of every event.
 *
 * One `array-contains` on one field, because a registration id is globally
 * unique -- adding `where("eventId","==")` alongside it would need a composite
 * index. The caller narrows by event or track in memory.
 */
export const teamsForRegistration = cache(async (registrationId: string): Promise<HackathonTeam[]> => {
    if (!registrationId) return [];
    const snap = await adminDb
        .collection(COLLECTIONS.HACKATHON_TEAMS)
        .where("memberRegistrationIds", "array-contains", registrationId)
        .get();
    return snap.docs.map((d: QueryDocumentSnapshot) => mapToTeam(d.data(), d.id));
});

/** The team this participant is in for one specific track, if any. */
export async function teamForRegistrationInTrack(
    registrationId: string,
    trackId: string,
): Promise<HackathonTeam | null> {
    const teams = await teamsForRegistration(registrationId);
    return teams.find((t) => t.trackId === trackId) ?? null;
}

/**
 * Resolve a join code. Single-field query, then the caller checks the event.
 *
 * Codes are stored upper-case and normalized on the way in, so a participant
 * typing lower case or adding a dash still lands on their team.
 */
export const findTeamByJoinCode = cache(async (rawCode: string): Promise<HackathonTeam | null> => {
    const code = normalizeJoinCode(rawCode);
    if (!code) return null;
    const snap = await adminDb.collection(COLLECTIONS.HACKATHON_TEAMS).where("joinCode", "==", code).get();
    if (snap.empty) return null;
    if (snap.size > 1) {
        // Codes are checked for uniqueness before a team is created, so this
        // should be unreachable. Refusing beats `.limit(1)` guessing: silently
        // picking one of two teams would put somebody on the wrong team with no
        // sign anything went wrong.
        console.error("[findTeamByJoinCode] duplicate join code, refusing to guess", { code, count: snap.size });
        return null;
    }
    return mapToTeam(snap.docs[0].data(), snap.docs[0].id);
});

/** Whether any team already holds this code. Checked before minting a new one. */
export async function joinCodeTaken(code: string): Promise<boolean> {
    const normalized = normalizeJoinCode(code);
    if (!normalized) return true;
    const snap = await adminDb
        .collection(COLLECTIONS.HACKATHON_TEAMS)
        .where("joinCode", "==", normalized)
        .limit(1)
        .get();
    return !snap.empty;
}

/** True when this event runs on the hackathon format (spec 3.1). */
export function isHackathon(event: { eventFormatId?: string; eventType?: string } | null | undefined): boolean {
    if (!event) return false;
    // The id is authoritative; eventType is the denormalized display name and is
    // only consulted for events created before formats were resolved by id.
    return (
        String(event.eventFormatId || "").toLowerCase() === "hackathon" ||
        String(event.eventType || "").toLowerCase() === "hackathon"
    );
}

/* ------------------------------------------------------- judges (spec 3.3) */

export function mapToJudge(raw: any, fallbackId?: string): HackathonJudge {
    return {
        id: String(raw?.id || fallbackId || ""),
        eventId: String(raw?.eventId || ""),
        organizerId: String(raw?.organizerId || ""),
        name: String(raw?.name || ""),
        email: String(raw?.email || ""),
        trackIds: Array.isArray(raw?.trackIds) ? raw.trackIds.map(String) : [],
        // Null once revoked, which is what closes the link.
        inviteToken: raw?.inviteToken ? String(raw.inviteToken) : null,
        invitedAt: toIsoString(raw?.invitedAt) || "",
        lastScoredAt: toIsoString(raw?.lastScoredAt),
        createdAt: toIsoString(raw?.createdAt) || "",
        updatedAt: toIsoString(raw?.updatedAt) || "",
    };
}

export const listJudges = cache(async (eventId: string): Promise<HackathonJudge[]> => {
    if (!eventId) return [];
    const snap = await adminDb.collection(COLLECTIONS.HACKATHON_JUDGES).where("eventId", "==", eventId).get();
    return snap.docs
        .map((d: QueryDocumentSnapshot) => mapToJudge(d.data(), d.id))
        .sort((a: HackathonJudge, b: HackathonJudge) => a.name.localeCompare(b.name));
});

/** Judges assigned to one track. Filtered in memory: `trackIds` is an array. */
export async function judgesForTrack(eventId: string, trackId: string): Promise<HackathonJudge[]> {
    const judges = await listJudges(eventId);
    return judges.filter((j) => j.trackIds.includes(trackId));
}

/**
 * Resolve a judge's link. The token is the whole credential, so this is looked
 * up by token alone -- one field, no index needed.
 */
export const findJudgeByToken = cache(async (token: string): Promise<HackathonJudge | null> => {
    const value = String(token ?? "").trim();
    if (!value) return null;
    const snap = await adminDb
        .collection(COLLECTIONS.HACKATHON_JUDGES)
        .where("inviteToken", "==", value)
        .limit(1)
        .get();
    return snap.empty ? null : mapToJudge(snap.docs[0].data(), snap.docs[0].id);
});

/* ------------------------------------------------------ mentors (spec 3.4) */

function mapToSlots(raw: any): MentorSlot[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .filter((s: any) => s && s.date)
        .map((s: any) => ({
            id: String(s.id || ""),
            date: String(s.date || ""),
            startTime: String(s.startTime || ""),
            endTime: String(s.endTime || ""),
            bookedByTeamId: String(s.bookedByTeamId || ""),
            bookedTeamName: String(s.bookedTeamName || ""),
            bookedAt: toIsoString(s.bookedAt),
        }));
}

export function mapToMentor(raw: any, fallbackId?: string): HackathonMentor {
    return {
        id: String(raw?.id || fallbackId || ""),
        eventId: String(raw?.eventId || ""),
        name: String(raw?.name || ""),
        email: String(raw?.email || ""),
        expertise: Array.isArray(raw?.expertise) ? raw.expertise.map(String) : [],
        bio: String(raw?.bio || ""),
        slots: mapToSlots(raw?.slots),
        createdAt: toIsoString(raw?.createdAt) || "",
        updatedAt: toIsoString(raw?.updatedAt) || "",
    };
}

export const listMentors = cache(async (eventId: string): Promise<HackathonMentor[]> => {
    if (!eventId) return [];
    const snap = await adminDb.collection(COLLECTIONS.HACKATHON_MENTORS).where("eventId", "==", eventId).get();
    return snap.docs
        .map((d: QueryDocumentSnapshot) => mapToMentor(d.data(), d.id))
        .sort((a: HackathonMentor, b: HackathonMentor) => a.name.localeCompare(b.name));
});

/* ------------------------------------------------ announcements (spec 3.4) */

export function mapToAnnouncement(raw: any, fallbackId?: string): HackathonAnnouncement {
    return {
        id: String(raw?.id || fallbackId || ""),
        eventId: String(raw?.eventId || ""),
        trackId: String(raw?.trackId || ""),
        title: String(raw?.title || ""),
        body: String(raw?.body || ""),
        emailedCount: Number(raw?.emailedCount ?? 0) || 0,
        createdAt: toIsoString(raw?.createdAt) || "",
    };
}

export const listAnnouncements = cache(async (eventId: string): Promise<HackathonAnnouncement[]> => {
    if (!eventId) return [];
    const snap = await adminDb.collection(COLLECTIONS.HACKATHON_ANNOUNCEMENTS).where("eventId", "==", eventId).get();
    return snap.docs
        .map((d: QueryDocumentSnapshot) => mapToAnnouncement(d.data(), d.id))
        .sort((a: HackathonAnnouncement, b: HackathonAnnouncement) => b.createdAt.localeCompare(a.createdAt));
});

/* -------------------------------------------------- online mode (spec 3.5) */

/**
 * One settings document per event, keyed by the event id.
 *
 * Its own document rather than fields on the event, because these apply only to
 * a hackathon and `EventModel` drops any field its constructor does not assign.
 */
export const getHackathonSettings = cache(async (eventId: string): Promise<HackathonSettings> => {
    if (!eventId) return { eventId: "", ...EMPTY_SETTINGS };
    const snap = await adminDb.collection(COLLECTIONS.HACKATHON_SETTINGS).doc(eventId).get();
    const raw = snap.exists ? snap.data() : null;
    return {
        eventId,
        onlineMode: !!raw?.onlineMode,
        livestreamUrl: String(raw?.livestreamUrl || ""),
        updatedAt: toIsoString(raw?.updatedAt) || "",
    };
});
