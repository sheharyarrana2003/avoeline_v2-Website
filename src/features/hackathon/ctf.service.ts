import { cache } from "react";
import crypto from "crypto";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { toIsoString } from "@/src/lib/datetime";
import { hydrateDoc, pickExtra } from "./teamWrite";
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

const CTF_CHALLENGE_COLS =
  "id, event_id, track_id, title, category, description, points, flag_type, static_flag, dynamic_flag_salt, hints, time_limit_minutes, attachment_url, attachment_name, docker_image, created_at, extra";
const FLAG_SUBMISSION_COLS =
  "id, challenge_id, hackathon_team_id, user_id, flag_value, correct, submitted_at, extra";
const PHASE_COLS =
  "id, event_id, name, sort_order, starts_at, ends_at, extra, track_id, opens_at, closes_at, order_index";
const SANDBOX_COLS =
  "id, challenge_id, hackathon_team_id, docker_image, status, instance_url, created_at, extra, team_id, event_id";
const ANOMALY_COLS = "id, event_id, hackathon_team_id, kind, detail, created_at, extra";
const SCHEDULE_COLS = "id, event_id, schedule_date, title, body, extra";
const ATTENDANCE_COLS = "id, event_id, hackathon_team_id, user_id, checked_in_at, extra, track_id";

/* ---------------------------------------------------- Dynamic Flag Calculation */

export function computeDynamicFlag(
  challengeId: string,
  teamId: string,
  salt = "avoeline_ctf_secret",
): string {
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
  candidate: string,
): boolean {
  const clean = candidate.trim();
  if (!clean) return false;

  if (challenge.flagType === "static") {
    return clean === (challenge.staticFlag || "").trim();
  }
  const expected = computeDynamicFlag(
    challenge.id,
    teamId,
    challenge.dynamicFlagSalt || "avoeline_ctf_secret",
  );
  return clean.toLowerCase() === expected.toLowerCase();
}

/* ------------------------------------------------------- CTF Challenges Service */

export function mapToChallenge(
  raw: Record<string, unknown> | undefined,
  docId: string,
): CTFChallenge {
  const h = hydrateDoc(raw);
  const extra = pickExtra(raw);
  const rawCategory =
    typeof (h.category ?? extra.category) === "string"
      ? (String(h.category ?? extra.category) as CTFTaskCategory)
      : "web";
  const hintsRaw = h.hints ?? extra.hints;
  const hints = Array.isArray(hintsRaw)
    ? hintsRaw.map((hint: Record<string, unknown>, i: number) => ({
        id: String(hint?.id || `hint-${i}`),
        content: String(hint?.content || ""),
        penaltyPoints: Number(hint?.penaltyPoints ?? hint?.penalty_points ?? 0) || 0,
      }))
    : [];

  return {
    id: String(h.id || docId || ""),
    eventId: String(h.eventId || h.event_id || ""),
    trackId: String(h.trackId || h.track_id || ""),
    title: String(h.title || ""),
    category: rawCategory,
    description: String(h.description || ""),
    points: Number(h.points ?? 100) || 100,
    flagType: h.flagType === "dynamic" || h.flag_type === "dynamic" ? "dynamic" : "static",
    staticFlag: String(h.staticFlag || h.static_flag || ""),
    dynamicFlagSalt: String(h.dynamicFlagSalt || h.dynamic_flag_salt || "avoeline_ctf_secret"),
    hints,
    timeLimitMinutes:
      h.timeLimitMinutes !== null && h.timeLimitMinutes !== undefined
        ? Number(h.timeLimitMinutes)
        : h.time_limit_minutes !== null && h.time_limit_minutes !== undefined
          ? Number(h.time_limit_minutes)
          : null,
    randomPoolTag:
      h.randomPoolTag || extra.randomPoolTag
        ? String(h.randomPoolTag || extra.randomPoolTag)
        : null,
    attachmentUrl:
      h.attachmentUrl || h.attachment_url ? String(h.attachmentUrl || h.attachment_url) : null,
    attachmentName:
      h.attachmentName || h.attachment_name ? String(h.attachmentName || h.attachment_name) : null,
    dockerImage: h.dockerImage || h.docker_image ? String(h.dockerImage || h.docker_image) : null,
    requiresDocker: !!(h.requiresDocker ?? extra.requiresDocker),
    solveCount: Number(h.solveCount ?? extra.solveCount ?? 0) || 0,
    createdAt: toIsoString(h.createdAt || h.created_at) || "",
    updatedAt: toIsoString(h.updatedAt || h.updated_at || extra.updatedAt) || "",
  };
}

/** Public participant view — never include static flags, salts, or hint text. */
export function toPublicChallenge(challenge: CTFChallenge): CTFChallenge {
  return {
    ...challenge,
    staticFlag: undefined,
    dynamicFlagSalt: undefined,
    hints: challenge.hints.map((h) => ({
      id: h.id,
      content: "",
      penaltyPoints: h.penaltyPoints,
    })),
  };
}

export const listChallenges = cache(
  async (eventId: string, trackId?: string): Promise<CTFChallenge[]> => {
    if (!eventId) return [];
    let q = supabaseAdmin.from(TABLES.HACKATHON_CTF_CHALLENGES).select(CTF_CHALLENGE_COLS);
    q = trackId ? q.eq("track_id", trackId) : q.eq("event_id", eventId);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? [])
      .map((d) => mapToChallenge(d as Record<string, unknown>, d.id))
      .sort((a, b) => a.points - b.points || a.title.localeCompare(b.title));
  },
);

/** Participant/client-safe challenge list (flags stripped). */
export const listPublicChallenges = cache(
  async (eventId: string, trackId?: string): Promise<CTFChallenge[]> => {
    const rows = await listChallenges(eventId, trackId);
    return rows.map(toPublicChallenge);
  },
);

export const getChallenge = cache(async (challengeId: string): Promise<CTFChallenge | null> => {
  if (!challengeId) return null;
  const { data, error } = await supabaseAdmin
    .from(TABLES.HACKATHON_CTF_CHALLENGES)
    .select(CTF_CHALLENGE_COLS)
    .eq("id", challengeId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapToChallenge(data as Record<string, unknown>, data.id) : null;
});

/* ---------------------------------------------------- Flag Submissions & Scoreboard */

export function mapToFlagSubmission(
  raw: Record<string, unknown> | undefined,
  docId: string,
): CTFFlagSubmission {
  const h = hydrateDoc(raw);
  const extra = pickExtra(raw);
  return {
    id: String(h.id || docId || ""),
    challengeId: String(h.challengeId || h.challenge_id || ""),
    challengeTitle: String(h.challengeTitle || extra.challengeTitle || ""),
    eventId: String(h.eventId || extra.eventId || ""),
    trackId: String(h.trackId || extra.trackId || ""),
    teamId: String(h.teamId || h.hackathon_team_id || ""),
    teamName: String(h.teamName || extra.teamName || ""),
    submittedByRegistrationId: String(
      h.submittedByRegistrationId || extra.submittedByRegistrationId || h.user_id || "",
    ),
    // Never expose attempted flag values to clients.
    flag: "",
    isCorrect: !!(h.isCorrect ?? h.correct),
    pointsAwarded: Number(h.pointsAwarded ?? extra.pointsAwarded ?? 0) || 0,
    submittedAt: toIsoString(h.submittedAt || h.submitted_at) || "",
  };
}

export const listFlagSubmissions = cache(
  async (eventId: string, trackId?: string, teamId?: string): Promise<CTFFlagSubmission[]> => {
    if (!eventId) return [];
    let q = supabaseAdmin.from(TABLES.HACKATHON_FLAG_SUBMISSIONS).select(FLAG_SUBMISSION_COLS);
    if (teamId) q = q.eq("hackathon_team_id", teamId);
    const { data, error } = await q;
    if (error) throw error;
    let rows = (data ?? []).map((d) => mapToFlagSubmission(d as Record<string, unknown>, d.id));
    if (!teamId) {
      rows = rows.filter((r) => r.eventId === eventId || !r.eventId);
      if (trackId) rows = rows.filter((r) => !r.trackId || r.trackId === trackId);
      // When eventId lives only in extra, also keep rows whose challenge belongs to the event
      if (rows.some((r) => !r.eventId)) {
        const { data: challenges } = await supabaseAdmin
          .from(TABLES.HACKATHON_CTF_CHALLENGES)
          .select("id")
          .eq("event_id", eventId);
        const ids = new Set((challenges ?? []).map((c) => c.id));
        rows = rows.filter((r) => r.eventId === eventId || ids.has(r.challengeId));
      }
    }
    return rows.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  },
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

export const getCTFScoreboard = cache(
  async (eventId: string, trackId: string): Promise<CTFScoreboardEntry[]> => {
    const submissions = await listFlagSubmissions(eventId, trackId);
    const correctSubmissions = submissions.filter((s) => s.isCorrect);

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

    entries.sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      return a.lastSolveTime.localeCompare(b.lastSolveTime);
    });

    entries.forEach((e, idx) => {
      e.rank = idx + 1;
    });

    return entries;
  },
);

/* ---------------------------------------------------- Phase-Wise Progression */

export function mapToPhase(
  raw: Record<string, unknown> | undefined,
  docId: string,
): HackathonPhase {
  const h = hydrateDoc(raw);
  const extra = pickExtra(raw);
  return {
    id: String(h.id || docId || ""),
    eventId: String(h.eventId || h.event_id || ""),
    trackId: String(h.trackId || h.track_id || ""),
    phaseNumber:
      Number(h.phaseNumber ?? extra.phaseNumber ?? h.sort_order ?? h.order_index ?? 1) || 1,
    title: String(h.title || h.name || `Phase ${h.phaseNumber ?? 1}`),
    description: String(h.description || extra.description || ""),
    deadline: String(h.deadline || extra.deadline || h.closes_at || h.ends_at || ""),
    isClosed: !!(h.isClosed ?? extra.isClosed),
    closedAt: toIsoString(h.closedAt || extra.closedAt),
    deliverableRequirements: Array.isArray(h.deliverableRequirements)
      ? h.deliverableRequirements.map(String)
      : Array.isArray(extra.deliverableRequirements)
        ? (extra.deliverableRequirements as unknown[]).map(String)
        : [],
  };
}

export const listPhases = cache(
  async (eventId: string, trackId: string): Promise<HackathonPhase[]> => {
    if (!eventId || !trackId) return [];
    const { data, error } = await supabaseAdmin
      .from(TABLES.HACKATHON_PHASES)
      .select(PHASE_COLS)
      .eq("track_id", trackId);
    if (error) throw error;
    return (data ?? [])
      .map((d) => mapToPhase(d as Record<string, unknown>, d.id))
      .sort((a, b) => a.phaseNumber - b.phaseNumber);
  },
);

export const getTeamPhaseProgress = cache(
  async (teamId: string): Promise<TeamPhaseProgress | null> => {
    if (!teamId) return null;
    const { data, error } = await supabaseAdmin
      .from(TABLES.HACKATHON_TEAMS)
      .select("extra, event_id, track_id")
      .eq("id", teamId)
      .maybeSingle();
    if (error) throw error;
    const extra = pickExtra(data as Record<string, unknown> | null);
    if (!data) {
      return {
        teamId,
        eventId: "",
        trackId: "",
        completedPhaseNumbers: [],
        currentPhaseNumber: 1,
        phaseSubmissions: {},
      };
    }
    return {
      teamId,
      eventId: String(extra.eventId || data.event_id || ""),
      trackId: String(extra.trackId || data.track_id || ""),
      completedPhaseNumbers: Array.isArray(extra.completedPhaseNumbers)
        ? (extra.completedPhaseNumbers as unknown[]).map(Number)
        : [],
      currentPhaseNumber: Number(extra.currentPhaseNumber ?? 1) || 1,
      phaseSubmissions: (extra.phaseSubmissions as TeamPhaseProgress["phaseSubmissions"]) || {},
    };
  },
);

/* --------------------------------------------------- Docker Sandbox Orchestration */

export function mapToSandbox(
  raw: Record<string, unknown> | undefined,
  docId: string,
): DockerSandboxInstance {
  const h = hydrateDoc(raw);
  const extra = pickExtra(raw);
  const rawStatus = (h.status as DockerSandboxInstance["status"]) || "stopped";
  return {
    id: String(h.id || docId || ""),
    eventId: String(h.eventId || h.event_id || extra.eventId || ""),
    trackId: String(h.trackId || extra.trackId || ""),
    teamId: String(h.teamId || h.hackathon_team_id || h.team_id || ""),
    challengeId: String(h.challengeId || h.challenge_id || ""),
    challengeTitle: String(h.challengeTitle || extra.challengeTitle || "Target Container"),
    containerImage: String(
      h.containerImage || h.docker_image || "ghcr.io/avoeline/ctf-sandbox-base:latest",
    ),
    status: rawStatus,
    hostEndpoint: String(h.hostEndpoint || h.instance_url || extra.hostEndpoint || ""),
    portMappings: Array.isArray(h.portMappings)
      ? (h.portMappings as DockerSandboxInstance["portMappings"])
      : Array.isArray(extra.portMappings)
        ? (extra.portMappings as DockerSandboxInstance["portMappings"])
        : [],
    credentials:
      (h.credentials as DockerSandboxInstance["credentials"]) ||
      (extra.credentials as DockerSandboxInstance["credentials"]) ||
      {},
    startedAt: toIsoString(h.startedAt || extra.startedAt || h.created_at) || "",
    expiresAt: toIsoString(h.expiresAt || extra.expiresAt) || "",
    resetCount: Number(h.resetCount ?? extra.resetCount ?? 0) || 0,
    premiumTier: h.premiumTier !== false && extra.premiumTier !== false,
  };
}

export const getSandboxForTeam = cache(
  async (teamId: string, challengeId: string): Promise<DockerSandboxInstance | null> => {
    if (!teamId || !challengeId) return null;
    const { data, error } = await supabaseAdmin
      .from(TABLES.HACKATHON_SANDBOXES)
      .select(SANDBOX_COLS)
      .eq("hackathon_team_id", teamId)
      .eq("challenge_id", challengeId)
      .maybeSingle();
    if (error) throw error;
    return data ? mapToSandbox(data as Record<string, unknown>, data.id) : null;
  },
);

export const listSandboxesForEvent = cache(
  async (eventId: string): Promise<DockerSandboxInstance[]> => {
    if (!eventId) return [];
    const { data, error } = await supabaseAdmin
      .from(TABLES.HACKATHON_SANDBOXES)
      .select(SANDBOX_COLS)
      .eq("event_id", eventId);
    if (error) throw error;
    return (data ?? [])
      .map((d) => mapToSandbox(d as Record<string, unknown>, d.id))
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  },
);

/* -------------------------------------------------- Anti-Cheat Anomaly Detection */

export function mapToAnomaly(
  raw: Record<string, unknown> | undefined,
  docId: string,
): AntiCheatAnomaly {
  const h = hydrateDoc(raw);
  const extra = pickExtra(raw);
  const rawType = (h.anomalyType ||
    h.kind ||
    extra.anomalyType ||
    "tab_switch") as AntiCheatAnomaly["anomalyType"];
  const rawSeverity = (h.severity || extra.severity || "low") as AntiCheatAnomaly["severity"];
  return {
    id: String(h.id || docId || ""),
    eventId: String(h.eventId || h.event_id || ""),
    trackId: String(h.trackId || extra.trackId || ""),
    teamId: String(h.teamId || h.hackathon_team_id || ""),
    teamName: String(h.teamName || extra.teamName || ""),
    registrationId: String(h.registrationId || extra.registrationId || ""),
    participantName: String(h.participantName || extra.participantName || ""),
    anomalyType: rawType,
    severity: rawSeverity,
    details: String(h.details || h.detail || ""),
    timestamp: toIsoString(h.timestamp || h.created_at || extra.timestamp) || "",
  };
}

export const listAnomalies = cache(
  async (eventId: string, limitCount = 50): Promise<AntiCheatAnomaly[]> => {
    if (!eventId) return [];
    const { data, error } = await supabaseAdmin
      .from(TABLES.HACKATHON_ANOMALIES)
      .select(ANOMALY_COLS)
      .eq("event_id", eventId)
      .limit(limitCount);
    if (error) throw error;
    return (data ?? [])
      .map((d) => mapToAnomaly(d as Record<string, unknown>, d.id))
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  },
);

/* ------------------------------------------------- Daily Calendar & Day-wise Tasks */

export function mapToSchedule(
  raw: Record<string, unknown> | undefined,
  docId: string,
): HackathonDailySchedule {
  const h = hydrateDoc(raw);
  const extra = pickExtra(raw);
  const shiftsRaw = h.shifts ?? extra.shifts;
  const tasksRaw = h.tasks ?? extra.tasks;
  const shifts = Array.isArray(shiftsRaw)
    ? shiftsRaw.map((s: Record<string, unknown>, i: number) => ({
        id: String(s?.id || `shift-${i}`),
        title: String(s?.title || ""),
        startTime: String(s?.startTime || s?.start_time || "09:00 AM"),
        endTime: String(s?.endTime || s?.end_time || "05:00 PM"),
        leadMentorOrJudge: s?.leadMentorOrJudge ? String(s.leadMentorOrJudge) : undefined,
      }))
    : [];

  const tasks = Array.isArray(tasksRaw)
    ? tasksRaw.map((t: Record<string, unknown>, i: number) => ({
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
    id: String(h.id || docId || ""),
    eventId: String(h.eventId || h.event_id || ""),
    dayNumber: Number(h.dayNumber ?? extra.dayNumber ?? 1) || 1,
    date: String(h.date || h.schedule_date || ""),
    title: String(h.title || `Day ${h.dayNumber ?? 1}`),
    description: String(h.description || h.body || extra.description || ""),
    shifts,
    tasks,
  };
}

export const listDailySchedules = cache(
  async (eventId: string): Promise<HackathonDailySchedule[]> => {
    if (!eventId) return [];
    const { data, error } = await supabaseAdmin
      .from(TABLES.HACKATHON_SCHEDULES)
      .select(SCHEDULE_COLS)
      .eq("event_id", eventId);
    if (error) throw error;
    return (data ?? [])
      .map((d) => mapToSchedule(d as Record<string, unknown>, d.id))
      .sort((a, b) => a.dayNumber - b.dayNumber);
  },
);

export const listTeamDailySubmissions = cache(
  async (teamId: string): Promise<TeamDailySubmission[]> => {
    if (!teamId) return [];
    const { data, error } = await supabaseAdmin
      .from(TABLES.HACKATHON_TEAMS)
      .select("extra")
      .eq("id", teamId)
      .maybeSingle();
    if (error) throw error;
    const extra = pickExtra(data as Record<string, unknown> | null);
    const list = Array.isArray(extra.dailySubmissions)
      ? (extra.dailySubmissions as Record<string, unknown>[])
      : [];
    return list.map((row, i) => ({
      id: String(row.id || `daily-${i}`),
      taskId: String(row.taskId || ""),
      dayNumber: Number(row.dayNumber || 1),
      teamId: String(row.teamId || teamId),
      githubUrl: String(row.githubUrl || ""),
      externalLink: String(row.externalLink || ""),
      notes: String(row.notes || ""),
      attachmentUrl: row.attachmentUrl ? String(row.attachmentUrl) : undefined,
      submittedAt: toIsoString(row.submittedAt) || "",
    }));
  },
);

/* ---------------------------------------------------- Periodic Attendance */

export function mapToAttendance(
  raw: Record<string, unknown> | undefined,
  docId: string,
): TeamAttendanceCheckIn {
  const h = hydrateDoc(raw);
  const extra = pickExtra(raw);
  return {
    id: String(h.id || docId || ""),
    eventId: String(h.eventId || h.event_id || ""),
    trackId: String(h.trackId || h.track_id || extra.trackId || ""),
    teamId: String(h.teamId || h.hackathon_team_id || ""),
    teamName: String(h.teamName || extra.teamName || ""),
    registrationId: String(h.registrationId || extra.registrationId || h.user_id || ""),
    participantName: String(h.participantName || extra.participantName || ""),
    windowSlot: String(h.windowSlot || extra.windowSlot || ""),
    checkedInAt: toIsoString(h.checkedInAt || h.checked_in_at) || "",
  };
}

export const listAttendanceCheckIns = cache(
  async (eventId: string, trackId?: string): Promise<TeamAttendanceCheckIn[]> => {
    if (!eventId) return [];
    let q = supabaseAdmin
      .from(TABLES.HACKATHON_ATTENDANCE)
      .select(ATTENDANCE_COLS)
      .eq("event_id", eventId);
    if (trackId) q = (q as any).eq("track_id", trackId);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? [])
      .map((d) => mapToAttendance(d as Record<string, unknown>, d.id))
      .sort((a, b) => b.checkedInAt.localeCompare(a.checkedInAt));
  },
);
