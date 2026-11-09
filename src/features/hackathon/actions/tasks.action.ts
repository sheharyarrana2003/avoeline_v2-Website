"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { TABLES } from "@/data/collections";
import { supabaseAdmin, HACKATHON_SUBMISSIONS_BUCKET } from "@/data/supabase";
import { assertEventActor, assertParticipant } from "@/src/features/events/ownership";
import { staffCanAct } from "@/src/features/hackathon/staffEventAccess";
import {
  getHackathonSettings,
  getTrack,
  listTracks,
  teamForRegistrationInTrack,
} from "../hackathon.service";
import { configKeyMeta } from "../configKeys";
import {
  CTF_CONFIG_KEYS,
  hackathonDashPath,
  hackathonTrackManagePath,
  isCtfKind,
  organizerHackathonCachePaths,
} from "../kinds";
import { finishForm } from "@/src/lib/formRedirect";
import { fail, ok } from "@/src/lib/action";
import { fromEventLocalInput } from "@/src/lib/datetime";
import { validatePhaseWindow } from "../competitionDates";
import {
  flagsMatch,
  hashFlag,
  listPhasesForTrack,
  phaseIsOpen,
  patchTeamTaskState,
  readTeamTaskState,
  taskCutoff,
  taskHints,
  trackConfig,
  visibleTasksForTeam,
  type TaskRow,
} from "../tasks.service";

/* --------------------------------------------------------------- organizer */

function organizerTrackPath(organizerId: string, eventId: string, trackId: string) {
  return hackathonTrackManagePath(organizerId, eventId, trackId);
}

function organizerTasksPath(organizerId: string, eventId: string) {
  return hackathonDashPath(organizerId, eventId, "tasks");
}

function bounceOrganizer(
  organizerId: string,
  eventId: string,
  trackId: string,
  error?: string,
): never {
  const fallback = organizerTasksPath(organizerId, eventId);
  const base = trackId ? organizerTrackPath(organizerId, eventId, trackId) : fallback;
  redirect(error ? `${base}?e=${encodeURIComponent(error)}` : base);
}

async function ownedTrack(eventId: string, trackId: string) {
  const event = await assertEventActor(eventId, "tasks");
  if (!event) return null;
  if (!(await staffCanAct(eventId, "tasks", trackId))) return null;
  const track = await getTrack(trackId);
  if (!track || track.eventId !== event.id) return null;
  return { event, track };
}

export async function saveHackathonTask(formData: FormData): Promise<void> {
  const trackId = String(formData.get("trackId") ?? "");
  const eventId = String(formData.get("eventId") ?? "");
  const organizerId = String(formData.get("organizerId") ?? "");
  const owned = await ownedTrack(eventId, trackId);
  if (!owned) bounceOrganizer(organizerId, eventId, trackId, "You can't edit tasks on this track.");

  const taskId = String(formData.get("taskId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) bounceOrganizer(organizerId, eventId, trackId, "A task needs a title.");

  const phaseId = String(formData.get("phaseId") ?? "").trim() || null;
  if (phaseId) {
    const phases = await listPhasesForTrack(trackId);
    if (!phases.some((p) => p.id === phaseId))
      bounceOrganizer(organizerId, eventId, trackId, "That phase is not on this track.");
  }

  const flagPlain = String(formData.get("flag") ?? "").trim();
  const settings = await getHackathonSettings(eventId);
  const maxBytes = Math.max(1, settings.maxAttachmentMb || 10) * 1024 * 1024;
  const newId = taskId || crypto.randomUUID();

  const { uploadEventAssetToOrganizerDrive } =
    await import("@/src/features/connections/server/eventDriveUpload.service");

  const uploadTaskFile = async (file: File, category: "hackathon_task", entityId: string) => {
    if (file.size > maxBytes) {
      bounceOrganizer(
        organizerId,
        eventId,
        trackId,
        `That file is larger than ${settings.maxAttachmentMb}MB.`,
      );
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    try {
      return await uploadEventAssetToOrganizerDrive({
        organizerId: owned.event.organizerId,
        eventId,
        kind: "media",
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        bytes,
        category,
        entityType: "hackathon_task",
        entityId,
        allowFallback: true,
        linkLibrary: false,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "File upload failed.";
      bounceOrganizer(organizerId, eventId, trackId, message);
      throw e;
    }
  };

  const hintTexts = formData.getAll("hintText").map((v) => String(v).trim());
  const hintFiles = formData.getAll("hintFile");
  const legacyHint = String(formData.get("hint") ?? "").trim();
  const hints: { text: string; filePath?: string; fileName?: string }[] = [];
  if (legacyHint) hints.push({ text: legacyHint });
  for (let i = 0; i < Math.max(hintTexts.length, hintFiles.length); i++) {
    const text = hintTexts[i] || "";
    const file = hintFiles[i];
    const item: { text: string; filePath?: string; fileName?: string } = { text };
    if (file instanceof File && file.size > 0) {
      const uploaded = await uploadTaskFile(file, "hackathon_task", newId);
      item.filePath = uploaded.storageRef;
      item.fileName = file.name;
    }
    if (item.text || item.filePath) hints.push(item);
  }

  const challenge = formData.get("challengeFile");
  let challenge_file_path: string | undefined;
  let challenge_file_name: string | undefined;
  if (challenge instanceof File && challenge.size > 0) {
    const uploaded = await uploadTaskFile(challenge, "hackathon_task", newId);
    challenge_file_path = uploaded.storageRef;
    challenge_file_name = challenge.name;
  }

  let existingExtra: Record<string, unknown> = {};
  if (taskId) {
    const { data: prior } = await supabaseAdmin
      .from(TABLES.HACKATHON_TASKS)
      .select("extra")
      .eq("id", taskId)
      .eq("track_id", trackId)
      .maybeSingle();
    const ex = prior?.extra;
    if (ex && typeof ex === "object" && !Array.isArray(ex)) {
      existingExtra = { ...(ex as Record<string, unknown>) };
    }
  }

  const organizerBrief = String(formData.get("organizerBrief") ?? "")
    .trim()
    .slice(0, 2000);
  const organizerBriefFile = formData.get("organizerBriefFile");
  let organizerAttachment = existingExtra.organizerAttachment as
    Record<string, unknown> | undefined | null;
  if (organizerBriefFile instanceof File && organizerBriefFile.size > 0) {
    const uploaded = await uploadTaskFile(organizerBriefFile, "hackathon_task", newId);
    organizerAttachment = {
      webUrl: uploaded.webUrl,
      storageRef: uploaded.storageRef,
      fileName: organizerBriefFile.name,
      storedFileId: uploaded.fileId,
    };
  }

  const extraPayload: Record<string, unknown> = { ...existingExtra };
  if (organizerBrief) extraPayload.organizerBrief = organizerBrief;
  else delete extraPayload.organizerBrief;
  if (organizerAttachment) extraPayload.organizerAttachment = organizerAttachment;

  const row: Record<string, unknown> = {
    track_id: trackId,
    title,
    description: String(formData.get("description") ?? "").trim() || null,
    category: String(formData.get("category") ?? "").trim() || null,
    points: Math.max(0, Math.trunc(Number(formData.get("points")) || 0)),
    hints,
    time_limit_minutes:
      Math.trunc(Number(formData.get("timeLimit"))) > 0
        ? Math.trunc(Number(formData.get("timeLimit")))
        : null,
    is_random: formData.get("isRandom") === "on",
    phase_id: phaseId,
    extra: extraPayload,
  };
  if (challenge_file_path) {
    row.challenge_file_path = challenge_file_path;
    row.challenge_file_name = challenge_file_name;
  }
  // Blank on edit keeps the existing flag; there is no way to read it back.
  if (!taskId) row.id = newId;
  if (flagPlain || !taskId) row.flag_hash = flagPlain ? hashFlag(flagPlain, newId) : null;

  const { error } = taskId
    ? await supabaseAdmin
        .from(TABLES.HACKATHON_TASKS)
        .update(row)
        .eq("id", taskId)
        .eq("track_id", trackId)
    : await supabaseAdmin.from(TABLES.HACKATHON_TASKS).insert(row);
  if (error) {
    console.error("[saveHackathonTask]", error);
    bounceOrganizer(organizerId, eventId, trackId, "Could not save the task.");
  }
  revalidatePath(organizerTrackPath(organizerId, eventId, trackId));
  revalidatePath(organizerTasksPath(organizerId, eventId));
  finishForm(formData, organizerTasksPath(organizerId, eventId), ok(), "Task saved.");
}

export async function deleteHackathonTask(formData: FormData): Promise<void> {
  const trackId = String(formData.get("trackId") ?? "");
  const eventId = String(formData.get("eventId") ?? "");
  const organizerId = String(formData.get("organizerId") ?? "");
  const taskId = String(formData.get("taskId") ?? "");
  if (!(await ownedTrack(eventId, trackId)))
    bounceOrganizer(organizerId, eventId, trackId, "You can't edit tasks on this track.");
  await supabaseAdmin
    .from(TABLES.HACKATHON_TASKS)
    .delete()
    .eq("id", taskId)
    .eq("track_id", trackId);
  revalidatePath(organizerTrackPath(organizerId, eventId, trackId));
  revalidatePath(organizerTasksPath(organizerId, eventId));
  finishForm(formData, organizerTasksPath(organizerId, eventId), ok(), "Task removed.");
}

export async function saveHackathonConfigRow(formData: FormData): Promise<void> {
  const eventId = String(formData.get("eventId") ?? "");
  const organizerId = String(formData.get("organizerId") ?? "");
  const configKey = String(formData.get("configKey") ?? "");
  const meta = configKeyMeta(configKey);
  const settingsPath = hackathonDashPath(organizerId, eventId, "settings");
  if (!meta) finishForm(formData, settingsPath, fail("Unknown setting."));

  const event = await assertEventActor(eventId, "tasks");
  if (!event)
    finishForm(formData, settingsPath, fail("You can't change this hackathon's settings."));
  if (!(await staffCanAct(eventId, "settings")))
    finishForm(formData, settingsPath, fail("You can't change this hackathon's settings."));

  const tracks = await listTracks(event.id);
  const all = formData.get("allTracks") === "on";
  const selected = new Set(formData.getAll("trackIds").map((v) => String(v)));
  const targets = tracks.filter((t) => all || selected.has(t.id));
  if (!targets.length) finishForm(formData, settingsPath, fail("Choose at least one competition."));

  const applyTo = targets.filter((t) => !CTF_CONFIG_KEYS.has(configKey) || isCtfKind(t.kind));
  const scoped: typeof applyTo = [];
  for (const t of applyTo) {
    if (await staffCanAct(eventId, "settings", t.id)) scoped.push(t);
  }
  if (!scoped.length)
    finishForm(formData, settingsPath, fail("That setting is only for CTF competitions."));

  const config_value: Record<string, unknown> = {};
  for (const field of meta.fields ?? []) {
    const raw = formData.get(`cfg_${field.name}`);
    if (field.type === "boolean") {
      config_value[field.name] = raw === "on";
      continue;
    }
    const s = String(raw ?? "").trim();
    if (!s) continue;
    if (field.type === "number") {
      const n = Number(s);
      if (!Number.isFinite(n) || n < 0)
        finishForm(formData, settingsPath, fail(`${field.label} must be a positive number.`));
      config_value[field.name] = n;
    } else if (field.type === "datetime") {
      if (Number.isNaN(Date.parse(s)))
        finishForm(formData, settingsPath, fail(`${field.label} is not a valid date.`));
      config_value[field.name] = new Date(s).toISOString();
    } else {
      config_value[field.name] = s.slice(0, 500);
    }
  }

  const enabled = formData.get("enabled") === "on";
  if (all) {
    // One event-wide row (track_id null); remove prior per-track duplicates for this key among scoped tracks.
    await supabaseAdmin
      .from(TABLES.HACKATHON_CONFIG)
      .delete()
      .eq("config_key", configKey)
      .in(
        "track_id",
        scoped.map((t) => t.id),
      );
    await supabaseAdmin
      .from(TABLES.HACKATHON_CONFIG)
      .delete()
      .eq("event_id", event.id)
      .eq("config_key", configKey)
      .is("track_id", null);
    const { error } = await supabaseAdmin.from(TABLES.HACKATHON_CONFIG).insert({
      event_id: event.id,
      track_id: null,
      config_key: configKey,
      enabled,
      config_value,
    } as never);
    if (error) {
      console.error("[saveHackathonConfigRow]", error);
      finishForm(formData, settingsPath, fail("Could not save that setting."));
    }
  } else {
    for (const track of scoped) {
      const { error } = await supabaseAdmin.from(TABLES.HACKATHON_CONFIG).upsert(
        {
          event_id: event.id,
          track_id: track.id,
          config_key: configKey,
          enabled,
          config_value,
        } as never,
        { onConflict: "track_id,config_key" },
      );
      if (error) {
        console.error("[saveHackathonConfigRow]", error);
        finishForm(formData, settingsPath, fail("Could not save that setting."));
      }
    }
  }
  for (const path of organizerHackathonCachePaths(organizerId, event.id)) revalidatePath(path);
  finishForm(formData, settingsPath, ok(), "Setting saved for the selected competitions.");
}

function phaseLocalToIso(value: FormDataEntryValue | null, timeZone: string): string | null {
  const s = String(value ?? "").trim();
  if (!s) return null;
  // datetime-local without Z → interpret in event TZ
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s) && !/[zZ]|[+-]\d{2}:\d{2}$/.test(s)) {
    return fromEventLocalInput(s.slice(0, 16), timeZone);
  }
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

export async function saveHackathonPhase(formData: FormData): Promise<void> {
  const eventId = String(formData.get("eventId") ?? "");
  const organizerId = String(formData.get("organizerId") ?? "");
  const fallback = organizerTasksPath(organizerId, eventId);
  const eventActor = await assertEventActor(eventId, "tasks");
  if (!eventActor) {
    finishForm(formData, fallback, fail("You can't edit phases for that event."));
  }
  // Narrow for nested closures (TS does not carry `never` into inner functions).
  const event = eventActor!;
  if (!(await staffCanAct(eventId, "tasks"))) {
    finishForm(formData, fallback, fail("You can't edit phases for that competition."));
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) finishForm(formData, fallback, fail("Give the phase a name."));

  const tracks = await listTracks(event.id);
  const all = formData.get("allTracks") === "on";
  const trackId = String(formData.get("trackId") ?? "").trim();
  const chosen = all ? tracks : tracks.filter((t) => t.id === trackId);
  const targets: typeof chosen = [];
  for (const t of chosen) {
    if (await staffCanAct(eventId, "tasks", t.id)) targets.push(t);
  }
  if (!targets.length) finishForm(formData, fallback, fail("Choose a competition."));

  const timeZone = event.schedule?.timezone || "UTC";
  const opensAt = phaseLocalToIso(formData.get("opensAt"), timeZone);
  const closesAt = phaseLocalToIso(formData.get("closesAt"), timeZone);
  const windowErr = validatePhaseWindow(opensAt, closesAt);
  if (windowErr) finishForm(formData, fallback, fail(windowErr));
  const phaseId = String(formData.get("phaseId") ?? "").trim();

  const settings = await getHackathonSettings(eventId);
  const maxBytes = Math.max(1, settings.maxAttachmentMb || 10) * 1024 * 1024;
  const attachmentFile = formData.get("phaseAttachment");
  let phaseAttachment: Record<string, unknown> | null | undefined;
  const uploadOrganizerId = event.organizerId;
  const uploadEventId = event.id;

  async function uploadPhaseAttachment(entityId: string) {
    if (!(attachmentFile instanceof File) || attachmentFile.size <= 0) return null;
    if (attachmentFile.size > maxBytes) {
      finishForm(
        formData,
        fallback,
        fail(`Phase attachment is larger than ${settings.maxAttachmentMb}MB.`),
      );
    }
    const bytes = Buffer.from(await attachmentFile.arrayBuffer());
    const { uploadEventAssetToOrganizerDrive } =
      await import("@/src/features/connections/server/eventDriveUpload.service");
    try {
      const uploaded = await uploadEventAssetToOrganizerDrive({
        organizerId: uploadOrganizerId,
        eventId: uploadEventId,
        kind: "media",
        fileName: attachmentFile.name,
        mimeType: attachmentFile.type || "application/octet-stream",
        bytes,
        category: "hackathon_phase",
        entityType: "hackathon_phase",
        entityId,
        allowFallback: true,
        linkLibrary: false,
      });
      return {
        storedFileId: uploaded.fileId,
        webUrl: uploaded.webUrl,
        storageRef: uploaded.storageRef,
        fileName: attachmentFile.name,
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : "File upload failed.";
      finishForm(formData, fallback, fail(message));
      return null;
    }
  }

  if (phaseId) {
    const { data: existingPhase } = await supabaseAdmin
      .from(TABLES.HACKATHON_PHASES)
      .select("id, track_id, event_id, extra")
      .eq("id", phaseId)
      .maybeSingle();
    if (
      !existingPhase ||
      (existingPhase.event_id && existingPhase.event_id !== event.id) ||
      !(await staffCanAct(eventId, "tasks", String(existingPhase.track_id || "")))
    ) {
      finishForm(formData, fallback, fail("Could not update that phase."));
    }
    const priorExtra =
      existingPhase?.extra &&
      typeof existingPhase.extra === "object" &&
      !Array.isArray(existingPhase.extra)
        ? { ...(existingPhase.extra as Record<string, unknown>) }
        : {};
    phaseAttachment = (await uploadPhaseAttachment(phaseId)) || undefined;
    const nextExtra = { ...priorExtra };
    if (phaseAttachment) nextExtra.phaseAttachment = phaseAttachment;
    const { error } = await supabaseAdmin
      .from(TABLES.HACKATHON_PHASES)
      .update({
        name,
        opens_at: opensAt,
        closes_at: closesAt,
        starts_at: opensAt,
        ends_at: closesAt,
        extra: nextExtra,
      })
      .eq("id", phaseId)
      .eq("event_id", event.id);
    if (error) {
      console.error("[saveHackathonPhase]", error);
      finishForm(formData, fallback, fail("Could not update that phase."));
    }
  } else {
    for (const track of targets) {
      const id = crypto.randomUUID();
      phaseAttachment = (await uploadPhaseAttachment(id)) || undefined;
      const extra = phaseAttachment ? { phaseAttachment } : {};
      const { error } = await supabaseAdmin.from(TABLES.HACKATHON_PHASES).insert({
        id,
        event_id: event.id,
        track_id: track.id,
        name,
        opens_at: opensAt,
        closes_at: closesAt,
        starts_at: opensAt,
        ends_at: closesAt,
        sort_order: 0,
        extra,
      });
      if (error) {
        console.error("[saveHackathonPhase]", error);
        finishForm(formData, fallback, fail("Could not create that phase."));
      }
    }
  }
  for (const path of organizerHackathonCachePaths(organizerId, event.id)) revalidatePath(path);
  finishForm(formData, fallback, ok(), "Phase saved.");
}

export async function deleteHackathonPhase(formData: FormData): Promise<void> {
  const eventId = String(formData.get("eventId") ?? "");
  const organizerId = String(formData.get("organizerId") ?? "");
  const phaseId = String(formData.get("phaseId") ?? "").trim();
  const fallback = organizerTasksPath(organizerId, eventId);
  const event = await assertEventActor(eventId, "tasks");
  if (!event || !phaseId) finishForm(formData, fallback, fail("Could not remove that phase."));
  const tracks = await listTracks(event.id);
  const trackIds = new Set(tracks.map((t) => t.id));
  const { data: phase } = await supabaseAdmin
    .from(TABLES.HACKATHON_PHASES)
    .select("id, track_id, event_id")
    .eq("id", phaseId)
    .maybeSingle();
  if (
    !phase ||
    (phase.event_id && phase.event_id !== event.id) ||
    !trackIds.has(String(phase.track_id || ""))
  ) {
    finishForm(formData, fallback, fail("Could not remove that phase."));
  }
  if (!(await staffCanAct(eventId, "tasks", String(phase.track_id || "")))) {
    finishForm(formData, fallback, fail("Could not remove that phase."));
  }
  await supabaseAdmin
    .from(TABLES.HACKATHON_TASKS)
    .update({ phase_id: null })
    .eq("phase_id", phaseId);
  await supabaseAdmin.from(TABLES.HACKATHON_PHASES).delete().eq("id", phaseId);
  for (const path of organizerHackathonCachePaths(organizerId, event.id)) revalidatePath(path);
  finishForm(formData, fallback, ok(), "Phase removed. Its tasks are now independent.");
}

export async function assignTasksToPhase(formData: FormData): Promise<void> {
  const eventId = String(formData.get("eventId") ?? "");
  const organizerId = String(formData.get("organizerId") ?? "");
  const phaseId = String(formData.get("phaseId") ?? "").trim();
  const fallback = organizerTasksPath(organizerId, eventId);
  const event = await assertEventActor(eventId, "tasks");
  if (!event || !phaseId) finishForm(formData, fallback, fail("Choose a phase."));

  const tracks = await listTracks(event.id);
  const trackIds = new Set(tracks.map((t) => t.id));
  const { data: phase } = await supabaseAdmin
    .from(TABLES.HACKATHON_PHASES)
    .select("id, track_id, event_id")
    .eq("id", phaseId)
    .maybeSingle();
  if (
    !phase ||
    (phase.event_id && phase.event_id !== event.id) ||
    !trackIds.has(String(phase.track_id || ""))
  ) {
    finishForm(formData, fallback, fail("That phase is not on this event."));
  }
  if (!(await staffCanAct(eventId, "tasks", String(phase.track_id || "")))) {
    finishForm(formData, fallback, fail("That phase is not on this event."));
  }

  const selected = new Set(formData.getAll("taskIds").map((v) => String(v)));
  const { data: tasks } = await supabaseAdmin
    .from(TABLES.HACKATHON_TASKS)
    .select("id, phase_id")
    .eq("track_id", phase.track_id);
  for (const task of tasks ?? []) {
    const should = selected.has(String(task.id));
    const currently = String(task.phase_id || "") === phaseId;
    if (should && !currently) {
      await supabaseAdmin
        .from(TABLES.HACKATHON_TASKS)
        .update({ phase_id: phaseId })
        .eq("id", task.id);
    } else if (!should && currently) {
      await supabaseAdmin.from(TABLES.HACKATHON_TASKS).update({ phase_id: null }).eq("id", task.id);
    }
  }
  for (const path of organizerHackathonCachePaths(organizerId, event.id)) revalidatePath(path);
  finishForm(formData, fallback, ok(), "Phase tasks updated.");
}

/* ------------------------------------------------------------- participant */

function participantTasksPath(eventId: string, registrationId: string, trackId: string) {
  return `/events/${eventId}/ticket/${registrationId}/tracks/${trackId}/tasks`;
}

function bounceParticipant(
  eventId: string,
  registrationId: string,
  trackId: string,
  formData: FormData | null,
  msg?: { e?: string; ok?: string },
): never {
  const returnTo = String(formData?.get("returnTo") ?? "");
  const compete = `/events/${eventId}/compete`;
  let path = participantTasksPath(eventId, registrationId, trackId);
  const params = new URLSearchParams();
  if (returnTo.startsWith(compete)) {
    path = compete;
    try {
      const u = new URL(returnTo, "https://avoeline.local");
      u.searchParams.forEach((v, k) => {
        if (k !== "e" && k !== "ok") params.set(k, v);
      });
    } catch {
      /* ignore */
    }
  }
  if (msg?.e) params.set("e", msg.e);
  if (msg?.ok) params.set("ok", msg.ok);
  const qs = params.toString();
  redirect(`${path}${qs ? `?${qs}` : ""}`);
}

/**
 * Resolves the caller's team and the task from server data only; the form
 * supplies nothing but the task id.
 */
async function participantTask(eventId: string, registrationId: string, taskId: string) {
  const who = await assertParticipant(eventId, registrationId);
  if (!who) return null;
  const { requireCompeteRegistration } = await import("../competeSession");
  const cookie = await requireCompeteRegistration(eventId);
  if (!cookie || cookie.registration.registrationId !== registrationId) return null;
  const { data: task } = await supabaseAdmin
    .from(TABLES.HACKATHON_TASKS)
    .select("*")
    .eq("id", taskId)
    .maybeSingle();
  if (!task) return null;
  const track = await getTrack(String(task.track_id));
  if (!track || track.eventId !== who.event.id) return null;
  const team = await teamForRegistrationInTrack(registrationId, track.id);
  if (!team || team.id !== cookie.teamId) return null;
  const cfg = await trackConfig(track.id);
  const visible = await visibleTasksForTeam(track.id, team.id, cfg);
  if (!visible.some((t) => t.id === task.id)) return null;
  return { who, task: task as TaskRow, track, team, cfg };
}

export async function startTask(
  eventId: string,
  registrationId: string,
  formData: FormData,
): Promise<void> {
  const taskId = String(formData.get("taskId") ?? "");
  const trackId = String(formData.get("trackId") ?? "");
  const ctx = await participantTask(eventId, registrationId, taskId);
  if (!ctx)
    bounceParticipant(eventId, registrationId, trackId, formData, {
      e: "That task isn't available to your team.",
    });
  if (!ctx.cfg.on("per_task_timer")) {
    bounceParticipant(eventId, registrationId, ctx.track.id, formData, {
      e: "Per-task timer is not enabled.",
    });
  }
  const state = await readTeamTaskState(ctx.team.id);
  const startedAt = new Date().toISOString();
  if (!state.taskStarts[taskId])
    await patchTeamTaskState(ctx.team.id, { taskStarts: { [taskId]: startedAt } });
  await supabaseAdmin
    .from(TABLES.HACKATHON_TEAM_TASK_STARTS)
    .upsert({ team_id: ctx.team.id, task_id: taskId, started_at: startedAt } as never, {
      onConflict: "team_id,task_id",
    });
  bounceParticipant(eventId, registrationId, ctx.track.id, formData);
}

export async function revealHint(
  eventId: string,
  registrationId: string,
  formData: FormData,
): Promise<void> {
  const taskId = String(formData.get("taskId") ?? "");
  const trackId = String(formData.get("trackId") ?? "");
  const ctx = await participantTask(eventId, registrationId, taskId);
  if (!ctx || !ctx.cfg.on("task_hints") || !taskHints(ctx.task).length) {
    bounceParticipant(eventId, registrationId, trackId, formData, {
      e: "No hint is available for that task.",
    });
  }
  await patchTeamTaskState(ctx.team.id, { hintsRevealed: { [taskId]: true } });
  bounceParticipant(eventId, registrationId, ctx.track.id, formData);
}

export async function submitTaskFlag(
  eventId: string,
  registrationId: string,
  formData: FormData,
): Promise<void> {
  const taskId = String(formData.get("taskId") ?? "");
  const trackId = String(formData.get("trackId") ?? "");
  const submitted = String(formData.get("flag") ?? "").trim();
  const ctx = await participantTask(eventId, registrationId, taskId);
  if (!ctx)
    bounceParticipant(eventId, registrationId, trackId, formData, {
      e: "That task isn't available to your team.",
    });
  const { task, team, track, cfg } = ctx;

  if (!cfg.on("ctf_flags") || !task.flag_hash)
    bounceParticipant(eventId, registrationId, track.id, formData, {
      e: "This task doesn't take flags.",
    });
  if (!submitted)
    bounceParticipant(eventId, registrationId, track.id, formData, { e: "Type the flag first." });

  const nowIso = new Date().toISOString();
  const cutoff = taskCutoff(cfg, track.submissionDeadline);
  if (cutoff && nowIso > cutoff)
    bounceParticipant(eventId, registrationId, track.id, formData, {
      e: "The hackathon countdown has ended.",
    });

  // Phase open/close always gates work for phased tasks (phase_lock_no_revisit is UI/messaging).
  if (task.phase_id) {
    const phase = (await listPhasesForTrack(track.id)).find((p) => p.id === task.phase_id);
    if (phase && !phaseIsOpen(phase))
      bounceParticipant(eventId, registrationId, track.id, formData, {
        e: "That task's phase is closed.",
      });
  }

  const state = await readTeamTaskState(team.id);
  if (cfg.on("per_task_timer") && task.time_limit_minutes) {
    const started = state.taskStarts[task.id];
    if (!started)
      bounceParticipant(eventId, registrationId, track.id, formData, {
        e: "Start the task before submitting.",
      });
    const deadline = Date.parse(started) + task.time_limit_minutes * 60_000;
    if (Date.now() > deadline)
      bounceParticipant(eventId, registrationId, track.id, formData, {
        e: "Time is up for that task.",
      });
  }

  const { data: prior } = await supabaseAdmin
    .from(TABLES.HACKATHON_TASK_COMPLETIONS)
    .select("is_correct")
    .eq("hackathon_team_id", team.id)
    .eq("task_id", task.id)
    .maybeSingle();
  if (prior?.is_correct)
    bounceParticipant(eventId, registrationId, track.id, formData, {
      ok: "Your team already solved that task.",
    });

  const correct = flagsMatch(submitted, task.flag_hash, task.id);
  const penalty =
    cfg.on("task_hints") && state.hintsRevealed[task.id]
      ? Math.max(0, cfg.num("task_hints", "penalty", 0))
      : 0;
  await supabaseAdmin.from(TABLES.HACKATHON_TASK_COMPLETIONS).upsert(
    {
      hackathon_team_id: team.id,
      task_id: task.id,
      submitted_flag: hashFlag(submitted, task.id),
      is_correct: correct,
      points_awarded: correct ? Math.max(0, (task.points ?? 0) - penalty) : 0,
      attempted_at: nowIso,
    },
    { onConflict: "hackathon_team_id,task_id" },
  );

  revalidatePath(participantTasksPath(eventId, registrationId, track.id));
  revalidatePath(`/events/${eventId}/compete`);
  bounceParticipant(
    eventId,
    registrationId,
    track.id,
    formData,
    correct ? { ok: `Correct — ${task.title} solved.` } : { e: "That flag is not correct." },
  );
}

function linkAllowed(url: string, cfg: Awaited<ReturnType<typeof trackConfig>>): boolean {
  if (!/^https:\/\//i.test(url)) return false;
  const raw = cfg.str("link_submissions", "allowedDomains", "").trim();
  if (!raw) return true;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return raw
      .split(",")
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean)
      .some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

function collectSubmissionLinks(formData: FormData): string[] {
  const fromMulti = formData
    .getAll("linkUrls")
    .map((v) => String(v).trim())
    .filter(Boolean);
  const primary = String(formData.get("linkUrl") ?? formData.get("submissionUrl") ?? "").trim();
  const all = [...(primary ? [primary] : []), ...fromMulti];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of all) {
    const key = u.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(u);
    if (out.length >= 5) break;
  }
  return out;
}

export async function submitTaskWork(
  eventId: string,
  registrationId: string,
  formData: FormData,
): Promise<void> {
  const taskId = String(formData.get("taskId") ?? "");
  const trackId = String(formData.get("trackId") ?? "");
  const links = collectSubmissionLinks(formData);
  const link = links[0] || "";
  const extraLinks = links.slice(1);
  const textAnswer = String(formData.get("textAnswer") ?? "")
    .trim()
    .slice(0, 10000);
  const organizerNotes = String(formData.get("organizerNotes") ?? "")
    .trim()
    .slice(0, 2000);
  const uploadedPath = String(formData.get("filePath") ?? "").trim();
  const storedFileIdField = String(formData.get("storedFileId") ?? "").trim();
  const file = formData.get("artifact");
  const ctx = await participantTask(eventId, registrationId, taskId);
  if (!ctx)
    bounceParticipant(eventId, registrationId, trackId, formData, {
      e: "That task isn't available to your team.",
    });
  const { task, team, track, cfg } = ctx;
  if (task.flag_hash && cfg.on("ctf_flags")) {
    bounceParticipant(eventId, registrationId, track.id, formData, {
      e: "This task takes a flag, not a file.",
    });
  }

  const nowIso = new Date().toISOString();
  const cutoff = taskCutoff(cfg, track.submissionDeadlineAt || track.submissionDeadline);
  if (cutoff && nowIso > cutoff)
    bounceParticipant(eventId, registrationId, track.id, formData, {
      e: "The hackathon countdown has ended.",
    });

  // Phase open/close always gates work for phased tasks (phase_lock_no_revisit is UI/messaging).
  if (task.phase_id) {
    const phase = (await listPhasesForTrack(track.id)).find((p) => p.id === task.phase_id);
    if (phase && !phaseIsOpen(phase)) {
      bounceParticipant(eventId, registrationId, track.id, formData, {
        e: "That task's phase is closed.",
      });
    }
  }

  const { countTeamTaskSubmissions, insertTaskSubmission } =
    await import("../taskSubmissions.service");
  if (!cfg.on("allow_resubmission", true)) {
    const priorCount = await countTeamTaskSubmissions(team.id, task.id);
    if (priorCount > 0) {
      bounceParticipant(eventId, registrationId, track.id, formData, {
        e: "Resubmission is disabled for this competition.",
      });
    }
  }

  let late = false;
  if (cfg.on("per_task_timer") && task.time_limit_minutes) {
    const state = await readTeamTaskState(team.id);
    const started = state.taskStarts[task.id];
    if (!started)
      bounceParticipant(eventId, registrationId, track.id, formData, {
        e: "Start the task before submitting.",
      });
    const deadline = Date.parse(started) + task.time_limit_minutes * 60_000;
    if (Date.now() > deadline) {
      const policy = cfg.str("per_task_timer", "latePolicy", "flag").toLowerCase();
      if (policy === "reject") {
        bounceParticipant(eventId, registrationId, track.id, formData, {
          e: "Time is up for that task.",
        });
      }
      late = true;
    }
  }

  if (cfg.on("link_submissions")) {
    if (!link)
      bounceParticipant(eventId, registrationId, track.id, formData, {
        e: "A submission link is required.",
      });
    for (const u of links) {
      if (!linkAllowed(u, cfg)) {
        bounceParticipant(eventId, registrationId, track.id, formData, {
          e: "That link's domain is not allowed.",
        });
      }
    }
  } else {
    for (const u of links) {
      if (!/^https:\/\//i.test(u)) {
        bounceParticipant(eventId, registrationId, track.id, formData, {
          e: "Links must start with https://.",
        });
      }
    }
  }

  const settings = await getHackathonSettings(eventId);
  const maxBytes = Math.max(1, settings.maxAttachmentMb || 10) * 1024 * 1024;
  let filePath = "";
  let fileName: string | null = null;
  let fileSize: number | null = null;
  let mime: string | null = null;
  let storedFileId: string | null = storedFileIdField || null;

  if (file instanceof File && file.size > 0) {
    if (file.size > maxBytes) {
      bounceParticipant(eventId, registrationId, track.id, formData, {
        e: `Keep files under ${settings.maxAttachmentMb || 10}MB.`,
      });
    }
    const { data: eventRow } = await supabaseAdmin
      .from(TABLES.EVENTS)
      .select("organizer_id")
      .eq("id", eventId)
      .maybeSingle();
    const organizerId = String(eventRow?.organizer_id || "");
    if (!organizerId) {
      bounceParticipant(eventId, registrationId, track.id, formData, {
        e: "Could not upload that file.",
      });
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const { uploadEventAssetToOrganizerDrive } =
      await import("@/src/features/connections/server/eventDriveUpload.service");
    try {
      const uploaded = await uploadEventAssetToOrganizerDrive({
        organizerId,
        eventId,
        kind: "submissions",
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        bytes,
        category: "hackathon_submission",
        entityType: "hackathon_submission",
        entityId: task.id,
        submissionPath: {
          competition: track.name || track.id,
          team: team.name || team.id,
        },
        allowFallback: true,
        linkLibrary: false,
      });
      storedFileId = uploaded.fileId;
      filePath = uploaded.storageRef;
      fileName = file.name;
      fileSize = file.size;
      mime = file.type || null;
    } catch {
      bounceParticipant(eventId, registrationId, track.id, formData, {
        e: "Could not upload that file.",
      });
    }
  } else if (storedFileId && /^[0-9a-f-]{36}$/i.test(storedFileId)) {
    const { fileStore } = await import("@/src/features/files/fileStore");
    const meta = await fileStore.get(storedFileId);
    if (!meta || meta.eventId !== eventId || meta.category !== "hackathon_submission") {
      bounceParticipant(eventId, registrationId, track.id, formData, {
        e: "That upload is not valid.",
      });
    } else {
      if (meta.size > maxBytes) {
        bounceParticipant(eventId, registrationId, track.id, formData, {
          e: `Keep files under ${settings.maxAttachmentMb || 10}MB.`,
        });
      }
      filePath = `file:${meta.id}`;
      fileName = meta.name;
      fileSize = meta.size;
      mime = meta.mime;
    }
  } else if (uploadedPath.startsWith(`tasks/${eventId}/`)) {
    // Legacy signed-upload path (pre-FileStore rows).
    filePath = uploadedPath;
    const { data: meta } = await supabaseAdmin.storage
      .from(HACKATHON_SUBMISSIONS_BUCKET)
      .list(filePath.split("/").slice(0, -1).join("/"), { search: filePath.split("/").pop() });
    const hit = (meta ?? []).find((m) => filePath.endsWith(m.name));
    fileName = hit?.name ?? filePath.split("/").pop() ?? "file";
    fileSize = typeof hit?.metadata?.size === "number" ? hit.metadata.size : null;
    mime = typeof hit?.metadata?.mimetype === "string" ? hit.metadata.mimetype : null;
    if (fileSize != null && fileSize > maxBytes) {
      bounceParticipant(eventId, registrationId, track.id, formData, {
        e: `Keep files under ${settings.maxAttachmentMb || 10}MB.`,
      });
    }
  }

  if (!link && !filePath && !textAnswer) {
    bounceParticipant(eventId, registrationId, track.id, formData, {
      e: "Add text, a link, or a file.",
    });
  }

  const extra: Record<string, unknown> = {};
  if (extraLinks.length) extra.links = extraLinks;
  if (storedFileId) extra.storedFileId = storedFileId;

  await insertTaskSubmission({
    teamId: team.id,
    trackId: track.id,
    phaseId: task.phase_id,
    taskId: task.id,
    submittedBy: null,
    textAnswer: textAnswer || null,
    linkUrl: link || null,
    filePath: filePath || null,
    fileName,
    fileSize,
    mime,
    organizerNotes: organizerNotes || null,
    status: late ? "late" : "submitted",
    extra: Object.keys(extra).length ? extra : null,
  });

  await supabaseAdmin.from(TABLES.HACKATHON_TASK_COMPLETIONS).upsert(
    {
      hackathon_team_id: team.id,
      task_id: task.id,
      submitted_flag: null,
      is_correct: !late,
      points_awarded: late ? 0 : (task.points ?? 0),
      attempted_at: nowIso,
      extra: { submissionUrl: link, links, filePath, storedFileId, textAnswer },
    },
    { onConflict: "hackathon_team_id,task_id" },
  );

  revalidatePath(`/events/${eventId}/compete`);
  bounceParticipant(eventId, registrationId, track.id, formData, {
    ok: late ? `Submitted late — ${task.title}.` : `Submitted — ${task.title}.`,
  });
}
