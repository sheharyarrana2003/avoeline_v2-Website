"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { rateLimit } from "@/src/lib/rateLimit";
import { logger } from "@/src/lib/logger";
import { submitFlagSchema } from "../compete.schema";
import { checkFlag, getChallenge, mapToPhase } from "../ctf.service";
import type { CTFTaskCategory, AnomalyType, DockerSandboxInstance } from "../types";
import { assertEventActor } from "@/src/features/events/ownership";
import { pickExtra, patchHackathonTeam } from "../teamWrite";

const NOT_OWNER = { success: false, error: "Only this event's organizer can do that." } as const;

async function organizerMayEdit(eventId: string, table: string, rowId?: string): Promise<boolean> {
  if (!(await assertEventActor(eventId, "competitions"))) return false;
  if (!rowId) return true;
  const { data } = await supabaseAdmin
    .from(table as any)
    .select("event_id, extra")
    .eq("id", rowId)
    .maybeSingle();
  if (!data) return true;
  const extra = pickExtra(data as Record<string, unknown>);
  return String((data as any).event_id || extra.eventId || "") === eventId;
}

export async function saveCTFChallengeAction(
  eventId: string,
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const id = String(formData.get("id") || "").trim();
    const trackId = String(formData.get("trackId") || "").trim();
    const title = String(formData.get("title") || "").trim();
    const category = (formData.get("category") as CTFTaskCategory) || "web";
    const description = String(formData.get("description") || "").trim();
    const points = Number(formData.get("points") || 100);
    const flagType = formData.get("flagType") === "dynamic" ? "dynamic" : "static";
    const staticFlag = String(formData.get("staticFlag") || "").trim();
    const dynamicFlagSalt = String(formData.get("dynamicFlagSalt") || "avoeline_ctf_secret").trim();
    const timeLimitMinutes = formData.get("timeLimitMinutes")
      ? Number(formData.get("timeLimitMinutes"))
      : null;
    const randomPoolTag = String(formData.get("randomPoolTag") || "").trim() || null;
    const requiresDocker =
      formData.get("requiresDocker") === "true" || formData.get("requiresDocker") === "on";
    const dockerImage = String(formData.get("dockerImage") || "").trim() || null;

    if (!(await organizerMayEdit(eventId, TABLES.HACKATHON_CTF_CHALLENGES, id || undefined)))
      return NOT_OWNER;
    if (!title) return { success: false, error: "Title is required" };
    if (flagType === "static" && !staticFlag)
      return { success: false, error: "Static flag string is required" };

    const challengeId = id || randomUUID();
    const now = new Date().toISOString();
    const { data: existing } = id
      ? await supabaseAdmin
          .from(TABLES.HACKATHON_CTF_CHALLENGES)
          .select("extra")
          .eq("id", id)
          .maybeSingle()
      : { data: null };
    const extra = {
      ...pickExtra(existing as Record<string, unknown> | null),
      randomPoolTag,
      requiresDocker,
      updatedAt: now,
      ...(id ? {} : { solveCount: 0, createdAt: now }),
    };

    const { error } = await supabaseAdmin.from(TABLES.HACKATHON_CTF_CHALLENGES).upsert({
      id: challengeId,
      event_id: eventId,
      track_id: trackId || null,
      title,
      category,
      description,
      points,
      flag_type: flagType,
      static_flag: flagType === "static" ? staticFlag : "",
      dynamic_flag_salt: dynamicFlagSalt,
      hints: [],
      time_limit_minutes: timeLimitMinutes,
      docker_image: requiresDocker
        ? dockerImage || "ghcr.io/avoeline/ctf-sandbox-base:latest"
        : null,
      extra,
      ...(id ? {} : { created_at: now }),
    } as never);
    if (error) throw error;

    revalidatePath(`/organizer`, "layout");
    revalidatePath(`/events/${eventId}`, "layout");
    return { success: true };
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : "Failed to save challenge";
    console.error("[saveCTFChallengeAction] Error:", err);
    return { success: false, error };
  }
}

export async function deleteCTFChallengeAction(
  challengeId: string,
  eventId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!(await organizerMayEdit(eventId, TABLES.HACKATHON_CTF_CHALLENGES, challengeId)))
      return NOT_OWNER;
    const { error } = await supabaseAdmin
      .from(TABLES.HACKATHON_CTF_CHALLENGES)
      .delete()
      .eq("id", challengeId);
    if (error) throw error;
    revalidatePath(`/organizer`, "layout");
    revalidatePath(`/events/${eventId}`, "layout");
    return { success: true };
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : "Failed to delete challenge";
    return { success: false, error };
  }
}

export async function submitFlagAction(params: {
  challengeId: string;
  eventId: string;
  trackId: string;
  teamId: string;
  teamName: string;
  registrationId: string;
  flagCandidate: string;
}): Promise<{ success: boolean; isCorrect?: boolean; pointsEarned?: number; message?: string }> {
  try {
    const parsed = submitFlagSchema.safeParse(params);
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Invalid flag submission.",
      };
    }
    const { challengeId, eventId, trackId, flagCandidate } = parsed.data;

    const { requireCompeteRegistration } = await import("../competeSession");
    const session = await requireCompeteRegistration(eventId);
    if (!session) {
      return { success: false, message: "Enter with your team access code first." };
    }
    const teamId = session.teamId;
    const registrationId = session.registration.registrationId;
    if (parsed.data.teamId && parsed.data.teamId !== teamId) {
      return { success: false, message: "That team is not active on this session." };
    }
    if (parsed.data.registrationId && parsed.data.registrationId !== registrationId) {
      return { success: false, message: "That registration does not match this session." };
    }
    const teamName = parsed.data.teamName || session.registration.attendee?.name || "Team";

    const challenge = await getChallenge(challengeId);
    if (
      !challenge ||
      challenge.eventId !== eventId ||
      (challenge.trackId && challenge.trackId !== trackId)
    ) {
      return { success: false, message: "Challenge not found." };
    }

    const limited = rateLimit(`flag:${eventId}:${teamId}`, 12, 60);
    if (!limited.ok) {
      return {
        success: false,
        message: `Rate limit exceeded. Please wait ${limited.retryAfterSec} seconds before submitting again.`,
      };
    }

    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
    const { data: recentRows, error: recentErr } = await supabaseAdmin
      .from(TABLES.HACKATHON_FLAG_SUBMISSIONS)
      .select("id, challenge_id, correct, submitted_at")
      .eq("hackathon_team_id", teamId);
    if (recentErr) throw recentErr;

    const recentAttempts = (recentRows ?? []).filter(
      (d) => String(d.submitted_at || "") > oneMinuteAgo,
    );
    if (recentAttempts.length >= 6) {
      await supabaseAdmin.from(TABLES.HACKATHON_ANOMALIES).insert({
        id: randomUUID(),
        event_id: eventId,
        hackathon_team_id: teamId,
        kind: "rapid_submissions",
        detail: `Team exceeded 6 flag attempts in 60s (${recentAttempts.length} attempts on '${challenge.title}'). Brute-force throttling triggered.`,
        created_at: new Date().toISOString(),
        extra: {
          trackId,
          teamName,
          registrationId,
          participantName: "Team Member",
          anomalyType: "rapid_submissions",
          severity: "medium",
        },
      });

      return {
        success: false,
        message:
          "Rate limit exceeded: Too many rapid attempts. Please wait 60 seconds before submitting again.",
      };
    }

    const priorSolve = (recentRows ?? []).find((d) => d.challenge_id === challengeId && d.correct);
    if (priorSolve) {
      return {
        success: true,
        isCorrect: true,
        pointsEarned: 0,
        message: "Your team has already captured this flag!",
      };
    }

    const isMatch = checkFlag(challenge, teamId, flagCandidate);
    const submissionId = randomUUID();
    const { error: subErr } = await supabaseAdmin.from(TABLES.HACKATHON_FLAG_SUBMISSIONS).insert({
      id: submissionId,
      challenge_id: challengeId,
      hackathon_team_id: teamId,
      flag_value: flagCandidate.slice(0, 80),
      correct: isMatch,
      submitted_at: new Date().toISOString(),
      extra: {
        challengeTitle: challenge.title,
        eventId,
        trackId,
        teamName,
        submittedByRegistrationId: registrationId,
        pointsAwarded: isMatch ? challenge.points : 0,
      },
    });
    if (subErr) throw subErr;

    if (isMatch) {
      const { data: ch } = await supabaseAdmin
        .from(TABLES.HACKATHON_CTF_CHALLENGES)
        .select("extra")
        .eq("id", challengeId)
        .maybeSingle();
      const extra = pickExtra(ch as Record<string, unknown> | null);
      extra.solveCount = (Number(extra.solveCount) || 0) + 1;
      await supabaseAdmin
        .from(TABLES.HACKATHON_CTF_CHALLENGES)
        .update({ extra })
        .eq("id", challengeId);

      revalidatePath(`/events/${eventId}`, "layout");
      return {
        success: true,
        isCorrect: true,
        pointsEarned: challenge.points,
        message: `🎉 Correct Flag! +${challenge.points} points awarded to ${teamName}!`,
      };
    }
    return {
      success: true,
      isCorrect: false,
      pointsEarned: 0,
      message: "❌ Incorrect flag. Keep digging!",
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to verify flag.";
    logger.error("[submitFlagAction]", { err: message });
    return { success: false, message: "Failed to verify flag." };
  }
}

export async function savePhaseAction(
  eventId: string,
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const id = String(formData.get("id") || "").trim();
    const trackId = String(formData.get("trackId") || "").trim();
    const phaseNumber = Number(formData.get("phaseNumber") || 1);
    const title = String(formData.get("title") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const deadline = String(formData.get("deadline") || "").trim();
    const requirementsRaw = String(formData.get("deliverableRequirements") || "").trim();
    const deliverableRequirements = requirementsRaw
      .split("\n")
      .map((r) => r.trim())
      .filter(Boolean);

    if (!(await organizerMayEdit(eventId, TABLES.HACKATHON_PHASES, id || undefined)))
      return NOT_OWNER;
    const phaseId = id || randomUUID();
    const { data: existing } = id
      ? await supabaseAdmin.from(TABLES.HACKATHON_PHASES).select("extra").eq("id", id).maybeSingle()
      : { data: null };
    const extra = {
      ...pickExtra(existing as Record<string, unknown> | null),
      phaseNumber,
      title,
      description,
      deadline,
      isClosed: false,
      closedAt: null,
      deliverableRequirements,
    };

    const { error } = await supabaseAdmin.from(TABLES.HACKATHON_PHASES).upsert({
      id: phaseId,
      event_id: eventId,
      track_id: trackId || null,
      name: title || `Phase ${phaseNumber}`,
      sort_order: phaseNumber,
      order_index: phaseNumber,
      closes_at: deadline || null,
      ends_at: deadline || null,
      extra,
    } as never);
    if (error) throw error;

    revalidatePath(`/organizer`, "layout");
    revalidatePath(`/events/${eventId}`, "layout");
    return { success: true };
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : "Failed to save phase";
    return { success: false, error };
  }
}

export async function lockPhaseAction(
  phaseId: string,
  eventId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!(await organizerMayEdit(eventId, TABLES.HACKATHON_PHASES, phaseId))) return NOT_OWNER;
    const { data } = await supabaseAdmin
      .from(TABLES.HACKATHON_PHASES)
      .select("extra")
      .eq("id", phaseId)
      .maybeSingle();
    const extra = {
      ...pickExtra(data as Record<string, unknown> | null),
      isClosed: true,
      closedAt: new Date().toISOString(),
    };
    const { error } = await supabaseAdmin
      .from(TABLES.HACKATHON_PHASES)
      .update({ extra })
      .eq("id", phaseId);
    if (error) throw error;

    revalidatePath(`/organizer`, "layout");
    revalidatePath(`/events/${eventId}`, "layout");
    return { success: true };
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : "Failed to lock phase";
    return { success: false, error };
  }
}

export async function submitTeamPhaseAction(params: {
  teamId: string;
  eventId: string;
  trackId: string;
  phaseNumber: number;
  notes: string;
  githubUrl?: string;
  deliverableUrl?: string;
}): Promise<{ success: boolean; message?: string }> {
  try {
    const { teamId, eventId, trackId, phaseNumber, notes, githubUrl, deliverableUrl } = params;

    const { data: phaseRows } = await supabaseAdmin
      .from(TABLES.HACKATHON_PHASES)
      .select("*")
      .eq("track_id", trackId);
    const currentPhase = (phaseRows ?? [])
      .map((d) => mapToPhase(d as Record<string, unknown>, d.id))
      .find((p) => p.phaseNumber === phaseNumber);
    if (currentPhase?.isClosed) {
      return {
        success: false,
        message: "Strict Enforcement: This phase is permanently closed. Alterations are locked.",
      };
    }

    const { data: teamRow, error: teamErr } = await supabaseAdmin
      .from(TABLES.HACKATHON_TEAMS)
      .select("extra")
      .eq("id", teamId)
      .maybeSingle();
    if (teamErr) throw teamErr;
    const extra = pickExtra(teamRow as Record<string, unknown> | null);
    const completed = new Set<number>((extra.completedPhaseNumbers as number[]) || []);
    completed.add(phaseNumber);
    const submissions = {
      ...((extra.phaseSubmissions as Record<string, unknown>) || {}),
      [`phase_${phaseNumber}`]: {
        completedAt: new Date().toISOString(),
        notes,
        githubUrl: githubUrl || "",
        deliverableUrl: deliverableUrl || "",
        isLocked: true,
      },
    };

    await patchHackathonTeam(teamId, {
      completedPhaseNumbers: Array.from(completed),
      currentPhaseNumber: Math.max(phaseNumber + 1, Number(extra.currentPhaseNumber) || 1),
      phaseSubmissions: submissions,
      eventId,
      trackId,
      updatedAt: new Date(),
    });

    revalidatePath(`/events/${eventId}`, "layout");
    return { success: true, message: `Phase ${phaseNumber} submitted and locked successfully!` };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to submit phase";
    return { success: false, message };
  }
}

export async function provisionSandboxAction(params: {
  teamId: string;
  challengeId: string;
  challengeTitle: string;
  eventId: string;
  trackId: string;
}): Promise<{ success: boolean; sandbox?: DockerSandboxInstance; error?: string }> {
  try {
    const { teamId, challengeId, challengeTitle, eventId, trackId } = params;

    const portOffset = Math.floor(1000 + Math.random() * 8000);
    const hostPort = 20000 + portOffset;
    const webPort = 30000 + portOffset;
    const instanceId = `sbx-${teamId.slice(0, 6)}-${challengeId.slice(0, 6)}`;
    const endpoint = `sandbox-${teamId.slice(0, 4)}.us-east.avoeline-ctf.cloud`;

    const startedAt = new Date();
    const expiresAt = new Date(startedAt.getTime() + 60 * 60 * 1000);

    const sandboxData: DockerSandboxInstance = {
      id: instanceId,
      eventId,
      trackId,
      teamId,
      challengeId,
      challengeTitle,
      containerImage: "ghcr.io/avoeline/ctf-sandbox-base:latest",
      status: "running",
      hostEndpoint: endpoint,
      portMappings: [
        { containerPort: 22, hostPort, protocol: "SSH" },
        { containerPort: 80, hostPort: webPort, protocol: "HTTP" },
      ],
      credentials: {
        username: `team_${teamId.slice(0, 6)}`,
        password: `pwn_${Math.random().toString(36).substring(2, 10)}`,
      },
      startedAt: startedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      resetCount: 0,
      premiumTier: true,
    };

    const { error } = await supabaseAdmin.from(TABLES.HACKATHON_SANDBOXES).upsert({
      id: instanceId,
      challenge_id: challengeId,
      hackathon_team_id: teamId,
      docker_image: sandboxData.containerImage,
      status: "running",
      instance_url: endpoint,
      created_at: startedAt.toISOString(),
      event_id: eventId,
      team_id: teamId,
      extra: {
        trackId,
        challengeTitle,
        hostEndpoint: endpoint,
        portMappings: sandboxData.portMappings,
        credentials: sandboxData.credentials,
        startedAt: sandboxData.startedAt,
        expiresAt: sandboxData.expiresAt,
        resetCount: 0,
        premiumTier: true,
      },
    } as never);
    if (error) throw error;

    revalidatePath(`/events/${eventId}`, "layout");
    return { success: true, sandbox: sandboxData };
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : "Failed to provision sandbox container";
    return { success: false, error };
  }
}

export async function resetSandboxAction(
  sandboxId: string,
  eventId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error: readErr } = await supabaseAdmin
      .from(TABLES.HACKATHON_SANDBOXES)
      .select("*")
      .eq("id", sandboxId)
      .maybeSingle();
    if (readErr) throw readErr;
    if (!data) return { success: false, error: "Sandbox instance not found" };

    const extra = pickExtra(data as Record<string, unknown>);
    const resetCount = (Number(extra.resetCount) || 0) + 1;
    const startedAt = new Date();
    const expiresAt = new Date(startedAt.getTime() + 60 * 60 * 1000);
    extra.resetCount = resetCount;
    extra.startedAt = startedAt.toISOString();
    extra.expiresAt = expiresAt.toISOString();

    const { error } = await supabaseAdmin
      .from(TABLES.HACKATHON_SANDBOXES)
      .update({ status: "running", extra })
      .eq("id", sandboxId);
    if (error) throw error;

    revalidatePath(`/events/${eventId}`, "layout");
    return { success: true };
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : "Failed to reset sandbox";
    return { success: false, error };
  }
}

export async function reportAntiCheatAnomalyAction(params: {
  eventId: string;
  trackId: string;
  teamId: string;
  teamName: string;
  registrationId: string;
  participantName: string;
  anomalyType: AnomalyType;
  severity?: "low" | "medium" | "high";
  details: string;
}): Promise<{ success: boolean }> {
  try {
    const {
      eventId,
      trackId,
      teamId,
      teamName,
      registrationId,
      participantName,
      anomalyType,
      severity = "low",
      details,
    } = params;

    await supabaseAdmin.from(TABLES.HACKATHON_ANOMALIES).insert({
      id: randomUUID(),
      event_id: eventId,
      hackathon_team_id: teamId || null,
      kind: anomalyType,
      detail: details,
      created_at: new Date().toISOString(),
      extra: { trackId, teamName, registrationId, participantName, anomalyType, severity },
    });

    return { success: true };
  } catch (err) {
    console.error("[reportAntiCheatAnomalyAction] Failed to log anomaly:", err);
    return { success: false };
  }
}

export async function recordAttendanceCheckInAction(params: {
  eventId: string;
  trackId: string;
  teamId: string;
  teamName: string;
  registrationId: string;
  participantName: string;
  windowSlot: string;
}): Promise<{ success: boolean; message?: string }> {
  try {
    const { eventId, trackId, teamId, teamName, registrationId, participantName, windowSlot } =
      params;

    const { error } = await supabaseAdmin.from(TABLES.HACKATHON_ATTENDANCE).insert({
      id: randomUUID(),
      event_id: eventId,
      hackathon_team_id: teamId || null,
      checked_in_at: new Date().toISOString(),
      track_id: trackId,
      extra: { teamName, registrationId, participantName, windowSlot, trackId, teamId },
    } as never);
    if (error) throw error;

    revalidatePath(`/events/${eventId}`, "layout");
    revalidatePath(`/organizer`, "layout");
    return { success: true, message: `Active check-in confirmed for ${windowSlot}!` };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to record check-in";
    return { success: false, message };
  }
}

export async function saveDailyScheduleAction(
  eventId: string,
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const id = String(formData.get("id") || "").trim();
    if (!(await organizerMayEdit(eventId, TABLES.HACKATHON_SCHEDULES, id || undefined)))
      return NOT_OWNER;
    const dayNumber = Number(formData.get("dayNumber") || 1);
    const date = String(formData.get("date") || "").trim();
    const title = String(formData.get("title") || `Day ${dayNumber}`).trim();
    const description = String(formData.get("description") || "").trim();

    const taskTitle = String(formData.get("taskTitle") || "").trim();
    const taskInstructions = String(formData.get("taskInstructions") || "").trim();
    const requireGithub =
      formData.get("requireGithub") === "true" || formData.get("requireGithub") === "on";
    const requireExternalLink =
      formData.get("requireExternalLink") === "true" ||
      formData.get("requireExternalLink") === "on";

    const scheduleId = id || randomUUID();
    const shifts = [
      {
        id: `shift-${dayNumber}-1`,
        title: "Morning Sprint & Mentor Hours",
        startTime: "09:00 AM",
        endTime: "01:00 PM",
      },
      {
        id: `shift-${dayNumber}-2`,
        title: "Afternoon Build & Milestone Sync",
        startTime: "02:00 PM",
        endTime: "06:00 PM",
      },
      {
        id: `shift-${dayNumber}-3`,
        title: "Evening Testing & Checkpoint",
        startTime: "07:00 PM",
        endTime: "11:00 PM",
      },
    ];

    const tasks = taskTitle
      ? [
          {
            id: `task-${Date.now()}`,
            title: taskTitle,
            instructions: taskInstructions,
            requireGithub,
            requireExternalLink,
            unlockedAt: new Date().toISOString(),
            isUnlocked: true,
          },
        ]
      : [];

    const { data: existing } = id
      ? await supabaseAdmin
          .from(TABLES.HACKATHON_SCHEDULES)
          .select("extra")
          .eq("id", id)
          .maybeSingle()
      : { data: null };
    const prevExtra = pickExtra(existing as Record<string, unknown> | null);
    const mergedTasks = tasks.length
      ? [...((prevExtra.tasks as unknown[]) || []), ...tasks]
      : prevExtra.tasks || [];

    const { error } = await supabaseAdmin.from(TABLES.HACKATHON_SCHEDULES).upsert({
      id: scheduleId,
      event_id: eventId,
      schedule_date: date || null,
      title,
      body: description,
      extra: {
        ...prevExtra,
        dayNumber,
        description,
        shifts: prevExtra.shifts || shifts,
        tasks: mergedTasks,
        updatedAt: new Date().toISOString(),
      },
    } as never);
    if (error) throw error;

    revalidatePath(`/organizer`, "layout");
    revalidatePath(`/events/${eventId}`, "layout");
    return { success: true };
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : "Failed to save daily schedule";
    return { success: false, error };
  }
}

export async function submitDailyTaskAction(params: {
  taskId: string;
  dayNumber: number;
  teamId: string;
  githubUrl: string;
  externalLink: string;
  notes: string;
  eventId: string;
}): Promise<{ success: boolean; message?: string }> {
  try {
    const { taskId, dayNumber, teamId, githubUrl, externalLink, notes, eventId } = params;

    const { data: teamRow, error: readErr } = await supabaseAdmin
      .from(TABLES.HACKATHON_TEAMS)
      .select("extra")
      .eq("id", teamId)
      .maybeSingle();
    if (readErr) throw readErr;
    const extra = pickExtra(teamRow as Record<string, unknown> | null);
    const dailySubmissions = Array.isArray(extra.dailySubmissions)
      ? [...(extra.dailySubmissions as unknown[])]
      : [];
    dailySubmissions.push({
      id: randomUUID(),
      taskId,
      dayNumber,
      teamId,
      githubUrl,
      externalLink,
      notes,
      submittedAt: new Date().toISOString(),
    });
    await patchHackathonTeam(teamId, { dailySubmissions, updatedAt: new Date() });

    revalidatePath(`/events/${eventId}`, "layout");
    return { success: true, message: "Day task submitted successfully!" };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to submit task";
    return { success: false, message };
  }
}
