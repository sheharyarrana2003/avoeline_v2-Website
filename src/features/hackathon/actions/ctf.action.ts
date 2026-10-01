"use server";

import { revalidatePath } from "next/cache";
import { adminDb } from "@/data/admin_db";
import { COLLECTIONS } from "@/data/collections";
import type { QueryDocumentSnapshot } from "@/data/admin_db";
import { checkFlag, getChallenge } from "../ctf.service";
import type { CTFChallenge, CTFTaskCategory, AnomalyType, DockerSandboxInstance } from "../types";
import { assertOwnedEvent } from "@/src/features/events/ownership";

const NOT_OWNER = { success: false, error: "Only this event's organizer can do that." } as const;

/** The caller owns the event and, when an existing row is named, that row belongs to the event. */
async function organizerMayEdit(eventId: string, collection: string, rowId?: string): Promise<boolean> {
    if (!(await assertOwnedEvent(eventId))) return false;
    if (!rowId) return true;
    const snap = await adminDb.collection(collection).doc(rowId).get();
    return !snap.exists || snap.data()?.eventId === eventId;
}

/* ------------------------------------------------ CTF Challenge Management */

export async function saveCTFChallengeAction(
    eventId: string,
    formData: FormData
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
        const timeLimitMinutes = formData.get("timeLimitMinutes") ? Number(formData.get("timeLimitMinutes")) : null;
        const randomPoolTag = String(formData.get("randomPoolTag") || "").trim() || null;
        const requiresDocker = formData.get("requiresDocker") === "true" || formData.get("requiresDocker") === "on";
        const dockerImage = String(formData.get("dockerImage") || "").trim() || null;

        if (!(await organizerMayEdit(eventId, COLLECTIONS.HACKATHON_CTF_CHALLENGES, id || undefined))) return NOT_OWNER;
        if (!title) return { success: false, error: "Title is required" };
        if (flagType === "static" && !staticFlag) return { success: false, error: "Static flag string is required" };

        const ref = adminDb.collection(COLLECTIONS.HACKATHON_CTF_CHALLENGES);
        const docRef = id ? ref.doc(id) : ref.doc();

        const data: Partial<CTFChallenge> = {
            id: docRef.id,
            eventId,
            trackId,
            title,
            category,
            description,
            points,
            flagType,
            staticFlag: flagType === "static" ? staticFlag : "",
            dynamicFlagSalt,
            hints: [],
            timeLimitMinutes,
            randomPoolTag,
            requiresDocker,
            dockerImage: requiresDocker ? (dockerImage || "ghcr.io/avoeline/ctf-sandbox-base:latest") : null,
            updatedAt: new Date().toISOString(),
        };

        if (!id) {
            data.solveCount = 0;
            data.createdAt = new Date().toISOString();
        }

        await docRef.set(data, { merge: true });
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
    eventId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        if (!(await organizerMayEdit(eventId, COLLECTIONS.HACKATHON_CTF_CHALLENGES, challengeId))) return NOT_OWNER;
        await adminDb.collection(COLLECTIONS.HACKATHON_CTF_CHALLENGES).doc(challengeId).delete();
        revalidatePath(`/organizer`, "layout");
        revalidatePath(`/events/${eventId}`, "layout");
        return { success: true };
    } catch (err: unknown) {
        const error = err instanceof Error ? err.message : "Failed to delete challenge";
        return { success: false, error };
    }
}

/* ---------------------------------------------------- Flag Submission Engine */

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
        const { challengeId, eventId, trackId, teamId, teamName, registrationId, flagCandidate } = params;

        if (!flagCandidate.trim()) {
            return { success: false, message: "Please enter a flag." };
        }

        const challenge = await getChallenge(challengeId);
        if (!challenge) {
            return { success: false, message: "Challenge not found." };
        }

        // 1. Anti-Cheat: Rate limiting / rapid fire brute-force detection
        const subCol = adminDb.collection(COLLECTIONS.HACKATHON_FLAG_SUBMISSIONS);
        const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
        const recentSnap = await subCol
            .where("teamId", "==", teamId)
            .get();

        const recentAttempts = recentSnap.docs.filter((d: QueryDocumentSnapshot) => (String(d.data().submittedAt || "")) > oneMinuteAgo);
        if (recentAttempts.length >= 6) {
            // Log anomaly: rapid submissions
            await adminDb.collection(COLLECTIONS.HACKATHON_ANOMALIES).add({
                eventId,
                trackId,
                teamId,
                teamName,
                registrationId,
                participantName: "Team Member",
                anomalyType: "rapid_submissions",
                severity: "medium",
                details: `Team exceeded 6 flag attempts in 60s (${recentAttempts.length} attempts on '${challenge.title}'). Brute-force throttling triggered.`,
                timestamp: new Date().toISOString(),
            });

            return {
                success: false,
                message: "Rate limit exceeded: Too many rapid attempts. Please wait 60 seconds before submitting again.",
            };
        }

        // 2. Check if team already solved this challenge
        const priorSolve = recentSnap.docs.find((d: QueryDocumentSnapshot) => d.data().challengeId === challengeId && d.data().isCorrect);
        if (priorSolve) {
            return {
                success: true,
                isCorrect: true,
                pointsEarned: 0,
                message: "Your team has already captured this flag!",
            };
        }

        // 3. Validate flag
        const isMatch = checkFlag(challenge, teamId, flagCandidate);

        const submissionRef = subCol.doc();
        await submissionRef.set({
            id: submissionRef.id,
            challengeId,
            challengeTitle: challenge.title,
            eventId,
            trackId,
            teamId,
            teamName,
            submittedByRegistrationId: registrationId,
            flag: flagCandidate.slice(0, 80), // store safe preview
            isCorrect: isMatch,
            pointsAwarded: isMatch ? challenge.points : 0,
            submittedAt: new Date().toISOString(),
        });

        if (isMatch) {
            // Increment challenge solve count
            await adminDb
                .collection(COLLECTIONS.HACKATHON_CTF_CHALLENGES)
                .doc(challengeId)
                .update({
                    solveCount: (challenge.solveCount || 0) + 1,
                });

            revalidatePath(`/events/${eventId}`, "layout");
            return {
                success: true,
                isCorrect: true,
                pointsEarned: challenge.points,
                message: `🎉 Correct Flag! +${challenge.points} points awarded to ${teamName}!`,
            };
        } else {
            return {
                success: true,
                isCorrect: false,
                pointsEarned: 0,
                message: "❌ Incorrect flag. Keep digging!",
            };
        }
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to verify flag.";
        console.error("[submitFlagAction] Error:", err);
        return { success: false, message };
    }
}

/* ------------------------------------------------ Phase-Wise Progression */

export async function savePhaseAction(
    eventId: string,
    formData: FormData
): Promise<{ success: boolean; error?: string }> {
    try {
        const id = String(formData.get("id") || "").trim();
        const trackId = String(formData.get("trackId") || "").trim();
        const phaseNumber = Number(formData.get("phaseNumber") || 1);
        const title = String(formData.get("title") || "").trim();
        const description = String(formData.get("description") || "").trim();
        const deadline = String(formData.get("deadline") || "").trim();
        const requirementsRaw = String(formData.get("deliverableRequirements") || "").trim();
        const deliverableRequirements = requirementsRaw.split("\n").map((r) => r.trim()).filter(Boolean);

        if (!(await organizerMayEdit(eventId, COLLECTIONS.HACKATHON_PHASES, id || undefined))) return NOT_OWNER;
        const ref = adminDb.collection(COLLECTIONS.HACKATHON_PHASES);
        const docRef = id ? ref.doc(id) : ref.doc();

        await docRef.set(
            {
                id: docRef.id,
                eventId,
                trackId,
                phaseNumber,
                title,
                description,
                deadline,
                isClosed: false,
                closedAt: null,
                deliverableRequirements,
            },
            { merge: true }
        );

        revalidatePath(`/organizer`, "layout");
        revalidatePath(`/events/${eventId}`, "layout");
        return { success: true };
    } catch (err: unknown) {
        const error = err instanceof Error ? err.message : "Failed to save phase";
        return { success: false, error };
    }
}

/**
 * Permanently close and lock a phase.
 * SPEC: "a phase must be completed before the next unlocks, with no ability to revisit or alter a closed phase."
 */
export async function lockPhaseAction(
    phaseId: string,
    eventId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        if (!(await organizerMayEdit(eventId, COLLECTIONS.HACKATHON_PHASES, phaseId))) return NOT_OWNER;
        await adminDb.collection(COLLECTIONS.HACKATHON_PHASES).doc(phaseId).update({
            isClosed: true,
            closedAt: new Date().toISOString(),
        });

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

        // Verify phase status
        const phaseSnap = await adminDb
            .collection(COLLECTIONS.HACKATHON_PHASES)
            .where("trackId", "==", trackId)
            .get();

        const currentPhaseDoc = phaseSnap.docs.find((d: QueryDocumentSnapshot) => d.data().phaseNumber === phaseNumber);
        if (currentPhaseDoc && currentPhaseDoc.data().isClosed) {
            return {
                success: false,
                message: "Strict Enforcement: This phase is permanently closed. Alterations are locked.",
            };
        }

        const teamProgressRef = adminDb.collection(COLLECTIONS.HACKATHON_TEAM_PHASES).doc(teamId);
        const existing = await teamProgressRef.get();
        const existingData = (existing.data() as { completedPhaseNumbers?: number[]; phaseSubmissions?: Record<string, unknown>; currentPhaseNumber?: number } | undefined) || { completedPhaseNumbers: [], phaseSubmissions: {} };

        const completed = new Set<number>(existingData.completedPhaseNumbers || []);
        completed.add(phaseNumber);

        const submissions = {
            ...(existingData.phaseSubmissions || {}),
            [`phase_${phaseNumber}`]: {
                completedAt: new Date().toISOString(),
                notes,
                githubUrl: githubUrl || "",
                deliverableUrl: deliverableUrl || "",
                isLocked: true,
            },
        };

        await teamProgressRef.set(
            {
                teamId,
                eventId,
                trackId,
                completedPhaseNumbers: Array.from(completed),
                currentPhaseNumber: Math.max(phaseNumber + 1, existingData.currentPhaseNumber || 1),
                phaseSubmissions: submissions,
                updatedAt: new Date().toISOString(),
            },
            { merge: true }
        );

        revalidatePath(`/events/${eventId}`, "layout");
        return { success: true, message: `Phase ${phaseNumber} submitted and locked successfully!` };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to submit phase";
        return { success: false, message };
    }
}

/* -------------------------------------------- Docker Sandboxing (Premium Tier) */

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
        const expiresAt = new Date(startedAt.getTime() + 60 * 60 * 1000); // 60 minutes TTL

        const ref = adminDb.collection(COLLECTIONS.HACKATHON_SANDBOXES).doc(instanceId);
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

        await ref.set(sandboxData);
        revalidatePath(`/events/${eventId}`, "layout");
        return { success: true, sandbox: sandboxData };
    } catch (err: unknown) {
        const error = err instanceof Error ? err.message : "Failed to provision sandbox container";
        return { success: false, error };
    }
}

export async function resetSandboxAction(
    sandboxId: string,
    eventId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const ref = adminDb.collection(COLLECTIONS.HACKATHON_SANDBOXES).doc(sandboxId);
        const snap = await ref.get();
        if (!snap.exists) return { success: false, error: "Sandbox instance not found" };

        const resetCount = (Number(snap.data()?.resetCount) || 0) + 1;
        const startedAt = new Date();
        const expiresAt = new Date(startedAt.getTime() + 60 * 60 * 1000);

        await ref.update({
            status: "running",
            resetCount,
            startedAt: startedAt.toISOString(),
            expiresAt: expiresAt.toISOString(),
        });

        revalidatePath(`/events/${eventId}`, "layout");
        return { success: true };
    } catch (err: unknown) {
        const error = err instanceof Error ? err.message : "Failed to reset sandbox";
        return { success: false, error };
    }
}

/* ------------------------------------------------ Anti-Cheat Anomaly Logging */

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

        await adminDb.collection(COLLECTIONS.HACKATHON_ANOMALIES).add({
            eventId,
            trackId,
            teamId,
            teamName,
            registrationId,
            participantName,
            anomalyType,
            severity,
            details,
            timestamp: new Date().toISOString(),
        });

        return { success: true };
    } catch (err) {
        console.error("[reportAntiCheatAnomalyAction] Failed to log anomaly:", err);
        return { success: false };
    }
}

/* ------------------------------------------------ Attendance Activity Check-in */

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
        const { eventId, trackId, teamId, teamName, registrationId, participantName, windowSlot } = params;

        await adminDb.collection(COLLECTIONS.HACKATHON_ATTENDANCE).add({
            eventId,
            trackId,
            teamId,
            teamName,
            registrationId,
            participantName,
            windowSlot,
            checkedInAt: new Date().toISOString(),
        });

        revalidatePath(`/events/${eventId}`, "layout");
        revalidatePath(`/organizer`, "layout");
        return { success: true, message: `Active check-in confirmed for ${windowSlot}!` };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to record check-in";
        return { success: false, message };
    }
}

/* ------------------------------------------------ Daily Calendar & Shift Tasks */

export async function saveDailyScheduleAction(
    eventId: string,
    formData: FormData
): Promise<{ success: boolean; error?: string }> {
    try {
        const id = String(formData.get("id") || "").trim();
        if (!(await organizerMayEdit(eventId, COLLECTIONS.HACKATHON_SCHEDULES, id || undefined))) return NOT_OWNER;
        const dayNumber = Number(formData.get("dayNumber") || 1);
        const date = String(formData.get("date") || "").trim();
        const title = String(formData.get("title") || `Day ${dayNumber}`).trim();
        const description = String(formData.get("description") || "").trim();

        const taskTitle = String(formData.get("taskTitle") || "").trim();
        const taskInstructions = String(formData.get("taskInstructions") || "").trim();
        const requireGithub = formData.get("requireGithub") === "true" || formData.get("requireGithub") === "on";
        const requireExternalLink = formData.get("requireExternalLink") === "true" || formData.get("requireExternalLink") === "on";

        const ref = adminDb.collection(COLLECTIONS.HACKATHON_SCHEDULES);
        const docRef = id ? ref.doc(id) : ref.doc();

        const shifts = [
            { id: `shift-${dayNumber}-1`, title: "Morning Sprint & Mentor Hours", startTime: "09:00 AM", endTime: "01:00 PM" },
            { id: `shift-${dayNumber}-2`, title: "Afternoon Build & Milestone Sync", startTime: "02:00 PM", endTime: "06:00 PM" },
            { id: `shift-${dayNumber}-3`, title: "Evening Testing & Checkpoint", startTime: "07:00 PM", endTime: "11:00 PM" },
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

        await docRef.set(
            {
                id: docRef.id,
                eventId,
                dayNumber,
                date,
                title,
                description,
                shifts,
                tasks,
                updatedAt: new Date().toISOString(),
            },
            { merge: true }
        );

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

        await adminDb.collection("hackathon_daily_submissions").add({
            taskId,
            dayNumber,
            teamId,
            githubUrl,
            externalLink,
            notes,
            submittedAt: new Date().toISOString(),
        });

        revalidatePath(`/events/${eventId}`, "layout");
        return { success: true, message: "Day task submitted successfully!" };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to submit task";
        return { success: false, message };
    }
}
