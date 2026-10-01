import { cache } from "react";
import type { QueryDocumentSnapshot } from "@/data/admin_db";
import { adminDb } from "@/data/admin_db";
import { COLLECTIONS } from "@/data/collections";
import { toIsoString } from "@/src/lib/datetime";
import crypto from "crypto";
import type {
    CTFChallenge,
    CTFFlagSubmission,
    HackathonPhase,
    TeamPhaseProgress,
    DockerSandboxInstance,
    AntiCheatAnomaly,
    HackathonDailySchedule,
    TeamDailySubmission,
    TeamAttendanceCheckIn,
    CTFTaskCategory,
} from "./types";

/**
 * Reads and logic for CTF Challenge Engine, Sandboxes, Phases, Schedules, and Anomaly Tracking.
 * Server only.
 */

/* ---------------------------------------------------- Dynamic Flag Calculation */

export function computeDynamicFlag(challengeId: string, teamId: string, salt = "avoeline_ctf_secret"): string {
    const hash = crypto
        .createHmac("sha256", salt)
        .update(`${challengeId}:${teamId}`)
        .digest("hex")
        .slice(0, 16);
    return `FLAG{dyn_${hash}}`;
}

export function checkFlag(
    challenge: Pick<CTFChallenge, "flagType" | "staticFlag" | "dynamicFlagSalt" | "id">,
    teamId: string,
    candidate: string
): boolean {
    const clean = candidate.trim();
    if (!clean) return false;

    if (challenge.flagType === "static") {
        return clean === (challenge.staticFlag || "").trim();
    } else {
        const expected = computeDynamicFlag(challenge.id, teamId, challenge.dynamicFlagSalt || "avoeline_ctf_secret");
        return clean.toLowerCase() === expected.toLowerCase();
    }
}

/* ------------------------------------------------------- CTF Challenges Service */

export function mapToChallenge(raw: Record<string, unknown> | undefined, docId: string): CTFChallenge {
    const rawCategory = typeof raw?.category === "string" ? (raw.category as CTFTaskCategory) : "web";
    const hints = Array.isArray(raw?.hints)
        ? raw.hints.map((h: Record<string, unknown>, i: number) => ({
              id: String(h?.id || `hint-${i}`),
              content: String(h?.content || ""),
              penaltyPoints: Number(h?.penaltyPoints ?? 0) || 0,
          }))
        : [];

    return {
        id: String(raw?.id || docId || ""),
        eventId: String(raw?.eventId || ""),
        trackId: String(raw?.trackId || ""),
        title: String(raw?.title || ""),
        category: rawCategory,
        description: String(raw?.description || ""),
        points: Number(raw?.points ?? 100) || 100,
        flagType: raw?.flagType === "dynamic" ? "dynamic" : "static",
        staticFlag: String(raw?.staticFlag || ""),
        dynamicFlagSalt: String(raw?.dynamicFlagSalt || "avoeline_ctf_secret"),
        hints,
        timeLimitMinutes: raw?.timeLimitMinutes !== null && raw?.timeLimitMinutes !== undefined ? Number(raw.timeLimitMinutes) : null,
        randomPoolTag: raw?.randomPoolTag ? String(raw.randomPoolTag) : null,
        attachmentUrl: raw?.attachmentUrl ? String(raw.attachmentUrl) : null,
        attachmentName: raw?.attachmentName ? String(raw.attachmentName) : null,
        dockerImage: raw?.dockerImage ? String(raw.dockerImage) : null,
        requiresDocker: !!raw?.requiresDocker,
        solveCount: Number(raw?.solveCount ?? 0) || 0,
        createdAt: toIsoString(raw?.createdAt) || "",
        updatedAt: toIsoString(raw?.updatedAt) || "",
    };
}

export const listChallenges = cache(async (eventId: string, trackId?: string): Promise<CTFChallenge[]> => {
    if (!eventId) return [];
    let snap;
    if (trackId) {
        snap = await adminDb.collection(COLLECTIONS.HACKATHON_CTF_CHALLENGES).where("trackId", "==", trackId).get();
    } else {
        snap = await adminDb.collection(COLLECTIONS.HACKATHON_CTF_CHALLENGES).where("eventId", "==", eventId).get();
    }

    return snap.docs
        .map((d: QueryDocumentSnapshot) => mapToChallenge(d.data() as Record<string, unknown>, d.id))
        .sort((a: CTFChallenge, b: CTFChallenge) => a.points - b.points || a.title.localeCompare(b.title));
});

export const getChallenge = cache(async (challengeId: string): Promise<CTFChallenge | null> => {
    if (!challengeId) return null;
    const snap = await adminDb.collection(COLLECTIONS.HACKATHON_CTF_CHALLENGES).doc(challengeId).get();
    return snap.exists ? mapToChallenge(snap.data() as Record<string, unknown>, snap.id) : null;
});

/* ---------------------------------------------------- Flag Submissions & Scoreboard */

export function mapToFlagSubmission(raw: Record<string, unknown> | undefined, docId: string): CTFFlagSubmission {
    return {
        id: String(raw?.id || docId || ""),
        challengeId: String(raw?.challengeId || ""),
        challengeTitle: String(raw?.challengeTitle || ""),
        eventId: String(raw?.eventId || ""),
        trackId: String(raw?.trackId || ""),
        teamId: String(raw?.teamId || ""),
        teamName: String(raw?.teamName || ""),
        submittedByRegistrationId: String(raw?.submittedByRegistrationId || ""),
        flag: String(raw?.flag || ""),
        isCorrect: !!raw?.isCorrect,
        pointsAwarded: Number(raw?.pointsAwarded ?? 0) || 0,
        submittedAt: toIsoString(raw?.submittedAt) || "",
    };
}

export const listFlagSubmissions = cache(
    async (eventId: string, trackId?: string, teamId?: string): Promise<CTFFlagSubmission[]> => {
        if (!eventId) return [];
        const ref = adminDb.collection(COLLECTIONS.HACKATHON_FLAG_SUBMISSIONS);
        let snap;

        if (teamId) {
            snap = await ref.where("teamId", "==", teamId).get();
        } else if (trackId) {
            snap = await ref.where("trackId", "==", trackId).get();
        } else {
            snap = await ref.where("eventId", "==", eventId).get();
        }

        return snap.docs
            .map((d: QueryDocumentSnapshot) => mapToFlagSubmission(d.data() as Record<string, unknown>, d.id))
            .sort((a: CTFFlagSubmission, b: CTFFlagSubmission) => b.submittedAt.localeCompare(a.submittedAt));
    }
);

export interface CTFScoreboardEntry {
    rank: number;
    teamId: string;
    teamName: string;
    totalPoints: number;
    solvesCount: number;
    solvedChallenges: { challengeId: string; title: string; points: number; solvedAt: string }[];
    lastSolveTime: string;
}

export const getCTFScoreboard = cache(async (eventId: string, trackId: string): Promise<CTFScoreboardEntry[]> => {
    const submissions = await listFlagSubmissions(eventId, trackId);
    const correctSubmissions = submissions.filter((s) => s.isCorrect);

    // Group by teamId
    const teamMap = new Map<
        string,
        {
            teamName: string;
            totalPoints: number;
            solves: { challengeId: string; title: string; points: number; solvedAt: string }[];
            lastSolveTime: string;
            solvedChallengeIds: Set<string>;
        }
    >();

    for (const sub of correctSubmissions) {
        if (!teamMap.has(sub.teamId)) {
            teamMap.set(sub.teamId, {
                teamName: sub.teamName || "Team " + sub.teamId.slice(0, 5),
                totalPoints: 0,
                solves: [],
                lastSolveTime: "",
                solvedChallengeIds: new Set<string>(),
            });
        }

        const teamData = teamMap.get(sub.teamId)!;
        // Count each unique challenge solve only once
        if (!teamData.solvedChallengeIds.has(sub.challengeId)) {
            teamData.solvedChallengeIds.add(sub.challengeId);
            teamData.totalPoints += sub.pointsAwarded;
            teamData.solves.push({
                challengeId: sub.challengeId,
                title: sub.challengeTitle,
                points: sub.pointsAwarded,
                solvedAt: sub.submittedAt,
            });

            if (!teamData.lastSolveTime || sub.submittedAt > teamData.lastSolveTime) {
                teamData.lastSolveTime = sub.submittedAt;
            }
        }
    }

    const entries: CTFScoreboardEntry[] = Array.from(teamMap.entries()).map(([teamId, data]) => ({
        rank: 0,
        teamId,
        teamName: data.teamName,
        totalPoints: data.totalPoints,
        solvesCount: data.solves.length,
        solvedChallenges: data.solves,
        lastSolveTime: data.lastSolveTime,
    }));

    // Sort by points descending, tie break: earliest last solve timestamp
    entries.sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
        return a.lastSolveTime.localeCompare(b.lastSolveTime);
    });

    entries.forEach((e, idx) => {
        e.rank = idx + 1;
    });

    return entries;
});

/* ---------------------------------------------------- Phase-Wise Progression */

export function mapToPhase(raw: Record<string, unknown> | undefined, docId: string): HackathonPhase {
    return {
        id: String(raw?.id || docId || ""),
        eventId: String(raw?.eventId || ""),
        trackId: String(raw?.trackId || ""),
        phaseNumber: Number(raw?.phaseNumber ?? 1) || 1,
        title: String(raw?.title || `Phase ${raw?.phaseNumber ?? 1}`),
        description: String(raw?.description || ""),
        deadline: String(raw?.deadline || ""),
        isClosed: !!raw?.isClosed,
        closedAt: toIsoString(raw?.closedAt),
        deliverableRequirements: Array.isArray(raw?.deliverableRequirements) ? raw.deliverableRequirements.map(String) : [],
    };
}

export const listPhases = cache(async (eventId: string, trackId: string): Promise<HackathonPhase[]> => {
    if (!eventId || !trackId) return [];
    const snap = await adminDb
        .collection(COLLECTIONS.HACKATHON_PHASES)
        .where("trackId", "==", trackId)
        .get();

    return snap.docs
        .map((d: QueryDocumentSnapshot) => mapToPhase(d.data() as Record<string, unknown>, d.id))
        .sort((a: HackathonPhase, b: HackathonPhase) => a.phaseNumber - b.phaseNumber);
});

export const getTeamPhaseProgress = cache(async (teamId: string): Promise<TeamPhaseProgress | null> => {
    if (!teamId) return null;
    const snap = await adminDb.collection(COLLECTIONS.HACKATHON_TEAM_PHASES).doc(teamId).get();
    if (!snap.exists) {
        return {
            teamId,
            eventId: "",
            trackId: "",
            completedPhaseNumbers: [],
            currentPhaseNumber: 1,
            phaseSubmissions: {},
        };
    }

    const data = snap.data();
    return {
        teamId,
        eventId: String(data?.eventId || ""),
        trackId: String(data?.trackId || ""),
        completedPhaseNumbers: Array.isArray(data?.completedPhaseNumbers) ? data.completedPhaseNumbers.map(Number) : [],
        currentPhaseNumber: Number(data?.currentPhaseNumber ?? 1) || 1,
        phaseSubmissions: (data?.phaseSubmissions as TeamPhaseProgress["phaseSubmissions"]) || {},
    };
});

/* --------------------------------------------------- Docker Sandbox Orchestration */

export function mapToSandbox(raw: Record<string, unknown> | undefined, docId: string): DockerSandboxInstance {
    const rawStatus = (raw?.status as DockerSandboxInstance["status"]) || "stopped";
    return {
        id: String(raw?.id || docId || ""),
        eventId: String(raw?.eventId || ""),
        trackId: String(raw?.trackId || ""),
        teamId: String(raw?.teamId || ""),
        challengeId: String(raw?.challengeId || ""),
        challengeTitle: String(raw?.challengeTitle || "Target Container"),
        containerImage: String(raw?.containerImage || "ghcr.io/avoeline/ctf-sandbox-base:latest"),
        status: rawStatus,
        hostEndpoint: String(raw?.hostEndpoint || ""),
        portMappings: Array.isArray(raw?.portMappings) ? (raw.portMappings as DockerSandboxInstance["portMappings"]) : [],
        credentials: (raw?.credentials as DockerSandboxInstance["credentials"]) || {},
        startedAt: toIsoString(raw?.startedAt) || "",
        expiresAt: toIsoString(raw?.expiresAt) || "",
        resetCount: Number(raw?.resetCount ?? 0) || 0,
        premiumTier: raw?.premiumTier !== false,
    };
}

export const getSandboxForTeam = cache(
    async (teamId: string, challengeId: string): Promise<DockerSandboxInstance | null> => {
        if (!teamId || !challengeId) return null;
        const snap = await adminDb
            .collection(COLLECTIONS.HACKATHON_SANDBOXES)
            .where("teamId", "==", teamId)
            .get();

        const match = snap.docs.find((d: QueryDocumentSnapshot) => d.data().challengeId === challengeId);
        return match ? mapToSandbox(match.data() as Record<string, unknown>, match.id) : null;
    }
);

export const listSandboxesForEvent = cache(async (eventId: string): Promise<DockerSandboxInstance[]> => {
    if (!eventId) return [];
    const snap = await adminDb.collection(COLLECTIONS.HACKATHON_SANDBOXES).where("eventId", "==", eventId).get();
    return snap.docs
        .map((d: QueryDocumentSnapshot) => mapToSandbox(d.data() as Record<string, unknown>, d.id))
        .sort((a: DockerSandboxInstance, b: DockerSandboxInstance) => b.startedAt.localeCompare(a.startedAt));
});

/* -------------------------------------------------- Anti-Cheat Anomaly Detection */

export function mapToAnomaly(raw: Record<string, unknown> | undefined, docId: string): AntiCheatAnomaly {
    const rawType = (raw?.anomalyType as AntiCheatAnomaly["anomalyType"]) || "tab_switch";
    const rawSeverity = (raw?.severity as AntiCheatAnomaly["severity"]) || "low";
    return {
        id: String(raw?.id || docId || ""),
        eventId: String(raw?.eventId || ""),
        trackId: String(raw?.trackId || ""),
        teamId: String(raw?.teamId || ""),
        teamName: String(raw?.teamName || ""),
        registrationId: String(raw?.registrationId || ""),
        participantName: String(raw?.participantName || ""),
        anomalyType: rawType,
        severity: rawSeverity,
        details: String(raw?.details || ""),
        timestamp: toIsoString(raw?.timestamp) || "",
    };
}

export const listAnomalies = cache(async (eventId: string, limitCount = 50): Promise<AntiCheatAnomaly[]> => {
    if (!eventId) return [];
    const snap = await adminDb
        .collection(COLLECTIONS.HACKATHON_ANOMALIES)
        .where("eventId", "==", eventId)
        .limit(limitCount)
        .get();

    return snap.docs
        .map((d: QueryDocumentSnapshot) => mapToAnomaly(d.data() as Record<string, unknown>, d.id))
        .sort((a: AntiCheatAnomaly, b: AntiCheatAnomaly) => b.timestamp.localeCompare(a.timestamp));
});

/* ------------------------------------------------- Daily Calendar & Day-wise Tasks */

export function mapToSchedule(raw: Record<string, unknown> | undefined, docId: string): HackathonDailySchedule {
    const shifts = Array.isArray(raw?.shifts)
        ? raw.shifts.map((s: Record<string, unknown>, i: number) => ({
              id: String(s?.id || `shift-${i}`),
              title: String(s?.title || ""),
              startTime: String(s?.startTime || "09:00 AM"),
              endTime: String(s?.endTime || "05:00 PM"),
              leadMentorOrJudge: s?.leadMentorOrJudge ? String(s.leadMentorOrJudge) : undefined,
          }))
        : [];

    const tasks = Array.isArray(raw?.tasks)
        ? raw.tasks.map((t: Record<string, unknown>, i: number) => ({
              id: String(t?.id || `task-${i}`),
              title: String(t?.title || ""),
              instructions: String(t?.instructions || ""),
              attachmentUrl: t?.attachmentUrl ? String(t.attachmentUrl) : undefined,
              attachmentName: t?.attachmentName ? String(t.attachmentName) : undefined,
              requireGithub: !!t?.requireGithub,
              requireExternalLink: !!t?.requireExternalLink,
              unlockedAt: toIsoString(t?.unlockedAt) || "",
              isUnlocked: t?.isUnlocked !== false,
          }))
        : [];

    return {
        id: String(raw?.id || docId || ""),
        eventId: String(raw?.eventId || ""),
        dayNumber: Number(raw?.dayNumber ?? 1) || 1,
        date: String(raw?.date || ""),
        title: String(raw?.title || `Day ${raw?.dayNumber ?? 1}`),
        description: String(raw?.description || ""),
        shifts,
        tasks,
    };
}

export const listDailySchedules = cache(async (eventId: string): Promise<HackathonDailySchedule[]> => {
    if (!eventId) return [];
    const snap = await adminDb.collection(COLLECTIONS.HACKATHON_SCHEDULES).where("eventId", "==", eventId).get();
    return snap.docs
        .map((d: QueryDocumentSnapshot) => mapToSchedule(d.data() as Record<string, unknown>, d.id))
        .sort((a: HackathonDailySchedule, b: HackathonDailySchedule) => a.dayNumber - b.dayNumber);
});

export const listTeamDailySubmissions = cache(
    async (teamId: string): Promise<TeamDailySubmission[]> => {
        if (!teamId) return [];
        const snap = await adminDb
            .collection("hackathon_daily_submissions")
            .where("teamId", "==", teamId)
            .get();

        return snap.docs.map((d: QueryDocumentSnapshot) => {
            const data = d.data();
            return {
                id: d.id,
                taskId: String(data.taskId || ""),
                dayNumber: Number(data.dayNumber || 1),
                teamId: String(data.teamId || ""),
                githubUrl: String(data.githubUrl || ""),
                externalLink: String(data.externalLink || ""),
                notes: String(data.notes || ""),
                attachmentUrl: data.attachmentUrl ? String(data.attachmentUrl) : undefined,
                submittedAt: toIsoString(data.submittedAt) || "",
            };
        });
    }
);

/* ---------------------------------------------------- Periodic Attendance */

export function mapToAttendance(raw: Record<string, unknown> | undefined, docId: string): TeamAttendanceCheckIn {
    return {
        id: String(raw?.id || docId || ""),
        eventId: String(raw?.eventId || ""),
        trackId: String(raw?.trackId || ""),
        teamId: String(raw?.teamId || ""),
        teamName: String(raw?.teamName || ""),
        registrationId: String(raw?.registrationId || ""),
        participantName: String(raw?.participantName || ""),
        windowSlot: String(raw?.windowSlot || ""),
        checkedInAt: toIsoString(raw?.checkedInAt) || "",
    };
}

export const listAttendanceCheckIns = cache(
    async (eventId: string, trackId?: string): Promise<TeamAttendanceCheckIn[]> => {
        if (!eventId) return [];
        let snap;
        if (trackId) {
            snap = await adminDb.collection(COLLECTIONS.HACKATHON_ATTENDANCE).where("trackId", "==", trackId).get();
        } else {
            snap = await adminDb.collection(COLLECTIONS.HACKATHON_ATTENDANCE).where("eventId", "==", eventId).get();
        }

        return snap.docs
            .map((d: QueryDocumentSnapshot) => mapToAttendance(d.data() as Record<string, unknown>, d.id))
            .sort((a: TeamAttendanceCheckIn, b: TeamAttendanceCheckIn) => b.checkedInAt.localeCompare(a.checkedInAt));
    }
);
