import { parseScheduleDateTime } from "@/src/lib/datetime";
import type { EventOrganization } from "@/src/features/organizations/types";

/**
 * Tracks, teams and submissions for a hackathon event (spec 3.1-3.3).
 *
 * Client-safe by construction: the team panel, the join form and the skill
 * picker are all Client Components and import from this file, so nothing here
 * may reach `adminDb`. Reads live in `hackathon.service.ts`, writes in
 * `actions/`.
 *
 * The only import is `src/lib/datetime`, which is pure -- it must stay that
 * way. In module 6 a value import from a module that transitively reached
 * `adminDb` typechecked and compiled, then failed at runtime with "the chunking
 * context does not support external modules (request: node:net)", which is
 * firebase-admin being bundled for the browser.
 */

/* ------------------------------------------------------------------ tracks */

/**
 * One rubric category, e.g. { label: "Innovation", maxScore: 10 }.
 *
 * Declared now and written as an empty array: judging arrives in the next
 * slice, and a field that appears later would need every existing track
 * migrated. `maxScore` doubles as the weight -- a category worth 20 counts
 * twice one worth 10, which is what the spec's "max score per category"
 * already expresses without a second number to keep consistent.
 */
export interface RubricCategory {
    id: string;
    label: string;
    maxScore: number;
}

export interface HackathonTrack {
    id: string;
    eventId: string;
    organizerId: string;
    name: string;
    description: string;
    /**
     * Storage key of the rules / problem-statement file in the private bucket,
     * not a URL: a signed URL expires within the hour and would be dead by the
     * time a participant opened it. Signed per request instead.
     */
    rulesPath: string;
    /** The original filename, so a download can be saved under it. */
    rulesName: string;
    /** 0 means the track is free to enter. */
    fee: number;
    currency: string;
    minTeamSize: number;
    maxTeamSize: number;
    /** DD/MM/YYYY, the house format for a business date. */
    submissionDeadline: string;
    /** DD/MM/YYYY. Rosters freeze from the start of this day. */
    rosterLockDate: string;
    prizePool: string;
    /* --- reserved for the judging slice, written empty today --- */
    rubric: RubricCategory[];
    currentRound: number;
    createdAt: string;
    updatedAt: string;
}

/* ------------------------------------------------------------------- teams */

/** The tags a participant picks from for solo matching (spec 3.2). */
export const SKILL_TAGS = [
    "Frontend",
    "Backend",
    "Mobile",
    "ML / AI",
    "Data",
    "DevOps",
    "Design",
    "Product",
    "Hardware",
    "Pitching",
] as const;

export type SkillTag = (typeof SKILL_TAGS)[number];

export function isSkillTag(value: unknown): value is SkillTag {
    return typeof value === "string" && (SKILL_TAGS as readonly string[]).includes(value);
}

/**
 * Renamed off `TeamMember`, which `event.model.tsx:180` already uses for the
 * event's own organizing staff (`event.teamMembers`). Two same-named types for
 * two different things is how this repo grew sixteen `formatCurrency`s.
 */
export interface HackathonTeamMember {
    /** The registration this member is, which is also their identity. */
    registrationId: string;
    name: string;
    email: string;
    skills: string[];
    /** The member who created the team. Only they can submit or rename it. */
    isOwner: boolean;
    joinedAt: string;
}

export interface TeamSubmission {
    repoUrl: string;
    demoVideoUrl: string;
    description: string;
    /** Private-bucket key for the pitch deck; signed on download. */
    deckPath: string;
    deckName: string;
    /** Null until the team submits for the first time. */
    submittedAt: string | null;
}

export type FeeStatus = "not_required" | "fee_pending" | "fee_paid";

export interface HackathonTeam {
    id: string;
    eventId: string;
    trackId: string;
    organizerId: string;
    name: string;
    /** Short, shareable, and unique across the collection. */
    joinCode: string;
    members: HackathonTeamMember[];
    /**
     * Flat mirror of `members[].registrationId`.
     *
     * The queryable membership key: "which team is this participant in" has to
     * be one `array-contains` on a single field, because a second `where` would
     * need a composite index and this project cannot deploy one.
     */
    memberRegistrationIds: string[];
    /**
     * Copied from the track when the team is created, so the join transaction
     * reads exactly one document instead of a team and its track.
     */
    maxTeamSize: number;
    /** Spec 3.2: this team is still looking for members. */
    lookingForMembers: boolean;
    /** The organizer's approval to change a roster after the lock date. */
    unlockedByOrganizer: boolean;
    submission: TeamSubmission;
    feeStatus: FeeStatus;
    /** Private-bucket key of the fee transfer screenshot, or "". */
    feeProofPath: string;
    /* --- reserved for the judging slice --- */
    round: number;
    eliminatedAtRound: number | null;
    /**
     * `scores[judgeId]` once judging lands. Kept opaque here so this slice
     * carries the field without pretending to know its shape.
     */
    scores: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}

/* ---------------------------------------------------------------- the rules */

/**
 * A join code a person can read down a phone.
 *
 * 0/O/1/I/L are left out because the whole point is that it gets shared out
 * loud or copied off a screen, and those are the pairs people get wrong. 32
 * symbols over 6 places is about a billion codes, so a collision is remote --
 * `createTeam` still checks, because "remote" is not "never" and the cost is
 * one indexed read.
 */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/**
 * `crypto.getRandomValues`, not `Math.random`: this code is a shared secret
 * that grants membership of a team, and `Math.random` is a predictable PRNG.
 * Anyone who could guess codes could join teams they were never invited to.
 * Available as a global on both sides and in Node, so no import.
 *
 * Bytes at or above 248 are thrown away rather than folded in with a modulo:
 * 256 is not a multiple of 31, so `byte % 31` would make the first nine letters
 * of the alphabet meaningfully likelier than the rest.
 */
export function makeJoinCode(length = 6): string {
    const limit = 256 - (256 % CODE_ALPHABET.length); // 248
    let out = "";
    while (out.length < length) {
        const bytes = new Uint8Array(length);
        crypto.getRandomValues(bytes);
        for (const b of bytes) {
            if (b >= limit) continue;
            out += CODE_ALPHABET[b % CODE_ALPHABET.length];
            if (out.length === length) break;
        }
    }
    return out;
}

/** Codes are stored and compared upper-case, so typing is forgiving. */
export function normalizeJoinCode(raw: unknown): string {
    return String(raw ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Every skill anybody on the team has. */
export function teamSkills(team: Pick<HackathonTeam, "members">): string[] {
    const seen = new Set<string>();
    for (const member of team.members) {
        for (const skill of member.skills) seen.add(skill);
    }
    return [...seen];
}

/**
 * What `theirs` brings that `mine` does not.
 *
 * The spec asks for "complementary tags", which is the difference and not the
 * overlap: a team of three frontend developers is looking for the person whose
 * tags they do not already have.
 */
export function complementaryTo(mine: string[], theirs: string[]): string[] {
    const have = new Set(mine);
    return theirs.filter((skill) => !have.has(skill));
}

/**
 * Both of these compare a stored DD/MM/YYYY date, and the time half is the
 * whole difficulty.
 *
 * `parseScheduleDateTime` pins +05:00, so the hour has to be chosen on purpose
 * or the rule is out by a day: a roster locks from the *start* of its lock date,
 * and a deadline runs to the *end* of its day. Getting this backwards means a
 * participant loses a day they were promised.
 */
export function rosterLockedAt(rosterLockDate: string): Date | null {
    return parseScheduleDateTime(rosterLockDate, "12:00 AM");
}

export function deadlineAt(submissionDeadline: string): Date | null {
    return parseScheduleDateTime(submissionDeadline, "11:59 PM");
}

/** An unset or unparseable date never locks anything. */
export function rosterLocked(
    track: Pick<HackathonTrack, "rosterLockDate">,
    team: Pick<HackathonTeam, "unlockedByOrganizer">,
    now: Date = new Date(),
): boolean {
    if (team.unlockedByOrganizer) return false;
    const at = rosterLockedAt(track.rosterLockDate);
    return at ? now >= at : false;
}

export function deadlinePassed(
    track: Pick<HackathonTrack, "submissionDeadline">,
    now: Date = new Date(),
): boolean {
    const at = deadlineAt(track.submissionDeadline);
    return at ? now > at : false;
}

export type JoinRefusal =
    | "no_such_code"
    | "wrong_event"
    | "roster_locked"
    | "team_full"
    | "already_in_this_team"
    | "already_in_another_team";

export const JOIN_REFUSAL_MESSAGE: Record<JoinRefusal, string> = {
    no_such_code: "That join code does not match a team.",
    // Deliberately the same wording as an unknown code: telling a stranger the
    // code is real but belongs elsewhere confirms it exists.
    wrong_event: "That join code does not match a team.",
    roster_locked: "This team's roster is locked. Ask the organiser to unlock it.",
    team_full: "That team is already full.",
    already_in_this_team: "You are already in this team.",
    already_in_another_team: "You are already in a team for this track. Leave it first.",
};

/**
 * Everything the join rule needs, read by the caller and handed in.
 *
 * `team` is null when no code matched. `currentTeamTrackId` is the track of the
 * team this participant is already in, if any -- null when they are unattached.
 */
export interface JoinFacts {
    eventId: string;
    registrationId: string;
    team: Pick<HackathonTeam, "eventId" | "trackId" | "members" | "maxTeamSize" | "unlockedByOrganizer"> | null;
    track: Pick<HackathonTrack, "rosterLockDate"> | null;
    currentTeamTrackId: string | null;
    now?: Date;
}

export type JoinDecision = { allowed: true } | { allowed: false; reason: JoinRefusal };

/**
 * May this participant join this team?
 *
 * Pure, and shaped like `decideAccess` in `src/features/access/types.ts`: facts
 * in, a decision out, with the service doing the reads. That is what lets the
 * join transaction re-run the identical rule against freshly read documents
 * instead of restating it inline -- one rule, two callers, so the page that
 * renders a refusal and the write that enforces it cannot disagree.
 *
 * The deadline is deliberately NOT a join condition. Submitting closes at the
 * deadline; the roster closes on the lock date, and conflating them would stop
 * a team fixing its line-up on the final day.
 */
export function canJoin(facts: JoinFacts): JoinDecision {
    const { team, track, registrationId } = facts;
    if (!team) return { allowed: false, reason: "no_such_code" };
    if (team.eventId !== facts.eventId) return { allowed: false, reason: "wrong_event" };

    if (team.members.some((m) => m.registrationId === registrationId)) {
        return { allowed: false, reason: "already_in_this_team" };
    }
    if (facts.currentTeamTrackId === team.trackId) {
        return { allowed: false, reason: "already_in_another_team" };
    }
    if (track && rosterLocked(track, team, facts.now ?? new Date())) {
        return { allowed: false, reason: "roster_locked" };
    }
    if (team.members.length >= team.maxTeamSize) {
        return { allowed: false, reason: "team_full" };
    }
    return { allowed: true };
}

/**
 * The sponsor dedicated to one track (spec 3.1).
 *
 * Read off `EventOrganization.sponsorTrackId`, which module 5 already writes
 * and commented as "carried and unused until tracks exist" -- this is the code
 * that starts using it. Deliberately NOT mirrored onto the track as a
 * `sponsorOrgId`: two pointers at the same relationship is how they end up
 * disagreeing, and the sponsor side is where the organizer already edits it.
 *
 * One sponsor per track, per the spec's "its own dedicated sponsor". If two
 * organizations somehow point at the same track, the first in tier order wins
 * rather than the page rendering both.
 */
export function trackSponsor(orgs: EventOrganization[], trackId: string): EventOrganization | null {
    if (!trackId) return null;
    return orgs.find((o) => o.type === "sponsor" && o.sponsorTrackId === trackId) ?? null;
}

/** "2 of 4 members", and whether there is room. */
export function rosterProgress(team: Pick<HackathonTeam, "members" | "maxTeamSize">): {
    count: number;
    max: number;
    label: string;
    hasRoom: boolean;
} {
    const count = team.members.length;
    const max = team.maxTeamSize;
    return { count, max, label: `${count} of ${max} members`, hasRoom: count < max };
}

/** Whether a team has met its track's minimum. Shown, never enforced on join. */
export function meetsMinimum(
    track: Pick<HackathonTrack, "minTeamSize">,
    team: Pick<HackathonTeam, "members">,
): boolean {
    return team.members.length >= Math.max(1, track.minTeamSize);
}

/**
 * A paid track will not accept a submission until the organizer has verified
 * the fee.
 *
 * This is what makes the fee mean something without building a payment
 * gateway, and it mirrors the gate the ticket page already applies: an
 * `awaiting_payment` registration holds its place but does not get the thing
 * payment unlocks. Forming a team is deliberately NOT gated -- people should be
 * able to organise themselves before money changes hands.
 */
export function feeBlocksSubmission(
    track: Pick<HackathonTrack, "fee">,
    team: Pick<HackathonTeam, "feeStatus">,
): boolean {
    return track.fee > 0 && team.feeStatus !== "fee_paid";
}

/** The badge status for a team's submission, for `statusMeta`. */
export function submissionStatus(team: Pick<HackathonTeam, "submission">): "submitted" | "not_submitted" {
    return team.submission.submittedAt ? "submitted" : "not_submitted";
}
