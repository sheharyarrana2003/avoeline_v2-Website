"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { TABLES } from "@/data/collections";
import { supabaseAdmin, CERTIFICATES_BUCKET } from "@/data/supabase";
import { uploadMedia } from "@/src/features/media/uploadMedia.action";
import { assertOwnedEvent, assertParticipant } from "@/src/features/events/ownership";
import { getTrack, listTracks, teamForRegistrationInTrack } from "../hackathon.service";
import { configKeyMeta } from "../configKeys";
import { CTF_CONFIG_KEYS, hackathonDashPath, hackathonTrackManagePath, isCtfKind, organizerHackathonCachePaths } from "../kinds";
import { finishForm } from "@/src/lib/formRedirect";
import { fail, ok } from "@/src/lib/action";
import {
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

function bounceOrganizer(organizerId: string, eventId: string, trackId: string, error?: string): never {
  const fallback = organizerTasksPath(organizerId, eventId);
  const base = trackId ? organizerTrackPath(organizerId, eventId, trackId) : fallback;
  redirect(error ? `${base}?e=${encodeURIComponent(error)}` : base);
}

async function ownedTrack(eventId: string, trackId: string) {
  const event = await assertOwnedEvent(eventId);
  if (!event) return null;
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
    if (!phases.some((p) => p.id === phaseId)) bounceOrganizer(organizerId, eventId, trackId, "That phase is not on this track.");
  }

  const flagPlain = String(formData.get("flag") ?? "").trim();
  const hint = String(formData.get("hint") ?? "").trim();
  const row: Record<string, unknown> = {
    track_id: trackId,
    title,
    description: String(formData.get("description") ?? "").trim() || null,
    category: String(formData.get("category") ?? "").trim() || null,
    points: Math.max(0, Math.trunc(Number(formData.get("points")) || 0)),
    hints: hint ? [hint] : [],
    time_limit_minutes: Math.trunc(Number(formData.get("timeLimit"))) > 0 ? Math.trunc(Number(formData.get("timeLimit"))) : null,
    is_random: formData.get("isRandom") === "on",
    phase_id: phaseId,
  };
  // Blank on edit keeps the existing flag; there is no way to read it back.
  if (flagPlain || !taskId) row.flag_hash = flagPlain ? hashFlag(flagPlain) : null;

  const { error } = taskId
    ? await supabaseAdmin.from(TABLES.HACKATHON_TASKS).update(row).eq("id", taskId).eq("track_id", trackId)
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
  if (!(await ownedTrack(eventId, trackId))) bounceOrganizer(organizerId, eventId, trackId, "You can't edit tasks on this track.");
  await supabaseAdmin.from(TABLES.HACKATHON_TASKS).delete().eq("id", taskId).eq("track_id", trackId);
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

  const event = await assertOwnedEvent(eventId);
  if (!event) finishForm(formData, settingsPath, fail("You can't change this hackathon's settings."));

  const tracks = await listTracks(event.id);
  const all = formData.get("allTracks") === "on";
  const selected = new Set(formData.getAll("trackIds").map((v) => String(v)));
  const targets = tracks.filter((t) => all || selected.has(t.id));
  if (!targets.length) finishForm(formData, settingsPath, fail("Choose at least one competition."));

  const applyTo = targets.filter((t) => !CTF_CONFIG_KEYS.has(configKey) || isCtfKind(t.kind));
  if (!applyTo.length) finishForm(formData, settingsPath, fail("That setting is only for CTF competitions."));

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
      if (!Number.isFinite(n) || n < 0) finishForm(formData, settingsPath, fail(`${field.label} must be a positive number.`));
      config_value[field.name] = n;
    } else if (field.type === "datetime") {
      if (Number.isNaN(Date.parse(s))) finishForm(formData, settingsPath, fail(`${field.label} is not a valid date.`));
      config_value[field.name] = new Date(s).toISOString();
    } else {
      config_value[field.name] = s.slice(0, 500);
    }
  }

  const enabled = formData.get("enabled") === "on";
  for (const track of applyTo) {
    const { error } = await supabaseAdmin.from(TABLES.HACKATHON_CONFIG).upsert(
      { track_id: track.id, config_key: configKey, enabled, config_value },
      { onConflict: "track_id,config_key" },
    );
    if (error) {
      console.error("[saveHackathonConfigRow]", error);
      finishForm(formData, settingsPath, fail("Could not save that setting."));
    }
  }
  for (const path of organizerHackathonCachePaths(organizerId, event.id)) revalidatePath(path);
  finishForm(formData, settingsPath, ok(), "Setting saved for the selected competitions.");
}

function toIsoOrNull(value: FormDataEntryValue | null): string | null {
  const s = String(value ?? "").trim();
  if (!s) return null;
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

export async function saveHackathonPhase(formData: FormData): Promise<void> {
  const eventId = String(formData.get("eventId") ?? "");
  const organizerId = String(formData.get("organizerId") ?? "");
  const fallback = organizerTasksPath(organizerId, eventId);
  const event = await assertOwnedEvent(eventId);
  if (!event) finishForm(formData, fallback, fail("You can't edit phases for that event."));

  const name = String(formData.get("name") ?? "").trim();
  if (!name) finishForm(formData, fallback, fail("Give the phase a name."));

  const tracks = await listTracks(event.id);
  const all = formData.get("allTracks") === "on";
  const trackId = String(formData.get("trackId") ?? "").trim();
  const targets = all ? tracks : tracks.filter((t) => t.id === trackId);
  if (!targets.length) finishForm(formData, fallback, fail("Choose a competition."));

  const opensAt = toIsoOrNull(formData.get("opensAt"));
  const closesAt = toIsoOrNull(formData.get("closesAt"));
  const phaseId = String(formData.get("phaseId") ?? "").trim();

  if (phaseId) {
    const { error } = await supabaseAdmin
      .from(TABLES.HACKATHON_PHASES)
      .update({
        name,
        opens_at: opensAt,
        closes_at: closesAt,
        starts_at: opensAt,
        ends_at: closesAt,
      })
      .eq("id", phaseId)
      .eq("event_id", event.id);
    if (error) {
      console.error("[saveHackathonPhase]", error);
      finishForm(formData, fallback, fail("Could not update that phase."));
    }
  } else {
    for (const track of targets) {
      const { error } = await supabaseAdmin.from(TABLES.HACKATHON_PHASES).insert({
        event_id: event.id,
        track_id: track.id,
        name,
        opens_at: opensAt,
        closes_at: closesAt,
        starts_at: opensAt,
        ends_at: closesAt,
        sort_order: 0,
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
  const event = await assertOwnedEvent(eventId);
  if (!event || !phaseId) finishForm(formData, fallback, fail("Could not remove that phase."));
  const tracks = await listTracks(event.id);
  const trackIds = new Set(tracks.map((t) => t.id));
  const { data: phase } = await supabaseAdmin.from(TABLES.HACKATHON_PHASES).select("id, track_id, event_id").eq("id", phaseId).maybeSingle();
  if (!phase || (phase.event_id && phase.event_id !== event.id) || !trackIds.has(String(phase.track_id || ""))) {
    finishForm(formData, fallback, fail("Could not remove that phase."));
  }
  await supabaseAdmin.from(TABLES.HACKATHON_TASKS).update({ phase_id: null }).eq("phase_id", phaseId);
  await supabaseAdmin.from(TABLES.HACKATHON_PHASES).delete().eq("id", phaseId);
  for (const path of organizerHackathonCachePaths(organizerId, event.id)) revalidatePath(path);
  finishForm(formData, fallback, ok(), "Phase removed. Its tasks are now independent.");
}

export async function assignTasksToPhase(formData: FormData): Promise<void> {
  const eventId = String(formData.get("eventId") ?? "");
  const organizerId = String(formData.get("organizerId") ?? "");
  const phaseId = String(formData.get("phaseId") ?? "").trim();
  const fallback = organizerTasksPath(organizerId, eventId);
  const event = await assertOwnedEvent(eventId);
  if (!event || !phaseId) finishForm(formData, fallback, fail("Choose a phase."));

  const tracks = await listTracks(event.id);
  const trackIds = new Set(tracks.map((t) => t.id));
  const { data: phase } = await supabaseAdmin.from(TABLES.HACKATHON_PHASES).select("id, track_id, event_id").eq("id", phaseId).maybeSingle();
  if (!phase || (phase.event_id && phase.event_id !== event.id) || !trackIds.has(String(phase.track_id || ""))) {
    finishForm(formData, fallback, fail("That phase is not on this event."));
  }

  const selected = new Set(formData.getAll("taskIds").map((v) => String(v)));
  const { data: tasks } = await supabaseAdmin.from(TABLES.HACKATHON_TASKS).select("id, phase_id").eq("track_id", phase.track_id);
  for (const task of tasks ?? []) {
    const should = selected.has(String(task.id));
    const currently = String(task.phase_id || "") === phaseId;
    if (should && !currently) {
      await supabaseAdmin.from(TABLES.HACKATHON_TASKS).update({ phase_id: phaseId }).eq("id", task.id);
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
  const params = new URLSearchParams();
  if (msg?.e) params.set("e", msg.e);
  if (msg?.ok) params.set("ok", msg.ok);
  const qs = params.toString();
  const returnTo = String(formData?.get("returnTo") ?? "");
  const compete = `/events/${eventId}/compete`;
  const base = returnTo.startsWith(compete) ? compete : participantTasksPath(eventId, registrationId, trackId);
  redirect(`${base}${qs ? `?${qs}` : ""}`);
}

/**
 * Resolves the caller's team and the task from server data only; the form
 * supplies nothing but the task id.
 */
async function participantTask(eventId: string, registrationId: string, taskId: string) {
  const who = await assertParticipant(eventId, registrationId);
  if (!who) return null;
  const { data: task } = await supabaseAdmin.from(TABLES.HACKATHON_TASKS).select("*").eq("id", taskId).maybeSingle();
  if (!task) return null;
  const track = await getTrack(String(task.track_id));
  if (!track || track.eventId !== who.event.id) return null;
  const team = await teamForRegistrationInTrack(registrationId, track.id);
  if (!team) return null;
  const cfg = await trackConfig(track.id);
  const visible = await visibleTasksForTeam(track.id, team.id, cfg);
  if (!visible.some((t) => t.id === task.id)) return null;
  return { who, task: task as TaskRow, track, team, cfg };
}

export async function startTask(eventId: string, registrationId: string, formData: FormData): Promise<void> {
  const taskId = String(formData.get("taskId") ?? "");
  const trackId = String(formData.get("trackId") ?? "");
  const ctx = await participantTask(eventId, registrationId, taskId);
  if (!ctx) bounceParticipant(eventId, registrationId, trackId, formData, { e: "That task isn't available to your team." });
  const state = await readTeamTaskState(ctx.team.id);
  if (!state.taskStarts[taskId]) await patchTeamTaskState(ctx.team.id, { taskStarts: { [taskId]: new Date().toISOString() } });
  bounceParticipant(eventId, registrationId, ctx.track.id, formData);
}

export async function revealHint(eventId: string, registrationId: string, formData: FormData): Promise<void> {
  const taskId = String(formData.get("taskId") ?? "");
  const trackId = String(formData.get("trackId") ?? "");
  const ctx = await participantTask(eventId, registrationId, taskId);
  if (!ctx || !ctx.cfg.on("task_hints") || !taskHints(ctx.task).length) {
    bounceParticipant(eventId, registrationId, trackId, formData, { e: "No hint is available for that task." });
  }
  await patchTeamTaskState(ctx.team.id, { hintsRevealed: { [taskId]: true } });
  bounceParticipant(eventId, registrationId, ctx.track.id, formData);
}

export async function submitTaskFlag(eventId: string, registrationId: string, formData: FormData): Promise<void> {
  const taskId = String(formData.get("taskId") ?? "");
  const trackId = String(formData.get("trackId") ?? "");
  const submitted = String(formData.get("flag") ?? "").trim();
  const ctx = await participantTask(eventId, registrationId, taskId);
  if (!ctx) bounceParticipant(eventId, registrationId, trackId, formData, { e: "That task isn't available to your team." });
  const { task, team, track, cfg } = ctx;

  if (!cfg.on("ctf_flags") || !task.flag_hash) bounceParticipant(eventId, registrationId, track.id, formData, { e: "This task doesn't take flags." });
  if (!submitted) bounceParticipant(eventId, registrationId, track.id, formData, { e: "Type the flag first." });

  const nowIso = new Date().toISOString();
  const cutoff = taskCutoff(cfg, track.submissionDeadline);
  if (cutoff && nowIso > cutoff) bounceParticipant(eventId, registrationId, track.id, formData, { e: "The hackathon countdown has ended." });

  if (task.phase_id && cfg.on("phase_lock_no_revisit")) {
    const phase = (await listPhasesForTrack(track.id)).find((p) => p.id === task.phase_id);
    if (phase && !phaseIsOpen(phase)) bounceParticipant(eventId, registrationId, track.id, formData, { e: "That task's phase is closed." });
  }

  const state = await readTeamTaskState(team.id);
  if (cfg.on("per_task_timer") && task.time_limit_minutes) {
    const started = state.taskStarts[task.id];
    if (!started) bounceParticipant(eventId, registrationId, track.id, formData, { e: "Start the task before submitting." });
    const deadline = Date.parse(started) + task.time_limit_minutes * 60_000;
    if (Date.now() > deadline) bounceParticipant(eventId, registrationId, track.id, formData, { e: "Time is up for that task." });
  }

  const { data: prior } = await supabaseAdmin
    .from(TABLES.HACKATHON_TASK_COMPLETIONS)
    .select("is_correct")
    .eq("hackathon_team_id", team.id)
    .eq("task_id", task.id)
    .maybeSingle();
  if (prior?.is_correct) bounceParticipant(eventId, registrationId, track.id, formData, { ok: "Your team already solved that task." });

  const correct = hashFlag(submitted) === task.flag_hash;
  const penalty = cfg.on("task_hints") && state.hintsRevealed[task.id] ? Math.max(0, cfg.num("task_hints", "penalty", 0)) : 0;
  await supabaseAdmin.from(TABLES.HACKATHON_TASK_COMPLETIONS).upsert(
    {
      hackathon_team_id: team.id,
      task_id: task.id,
      submitted_flag: hashFlag(submitted),
      is_correct: correct,
      points_awarded: correct ? Math.max(0, (task.points ?? 0) - penalty) : 0,
      attempted_at: nowIso,
    },
    { onConflict: "hackathon_team_id,task_id" },
  );

  revalidatePath(participantTasksPath(eventId, registrationId, track.id));
  revalidatePath(`/events/${eventId}/compete`);
  bounceParticipant(eventId, registrationId, track.id, formData, correct ? { ok: `Correct — ${task.title} solved.` } : { e: "That flag is not correct." });
}

const MAX_ARTIFACT_BYTES = 1024 * 1024;

export async function submitTaskWork(eventId: string, registrationId: string, formData: FormData): Promise<void> {
  const taskId = String(formData.get("taskId") ?? "");
  const trackId = String(formData.get("trackId") ?? "");
  const link = String(formData.get("submissionUrl") ?? "").trim();
  const file = formData.get("artifact");
  const ctx = await participantTask(eventId, registrationId, taskId);
  if (!ctx) bounceParticipant(eventId, registrationId, trackId, formData, { e: "That task isn't available to your team." });
  const { task, team, track, cfg } = ctx;
  if (task.flag_hash && cfg.on("ctf_flags")) {
    bounceParticipant(eventId, registrationId, track.id, formData, { e: "This task takes a flag, not a file." });
  }

  const nowIso = new Date().toISOString();
  const cutoff = taskCutoff(cfg, track.submissionDeadline);
  if (cutoff && nowIso > cutoff) bounceParticipant(eventId, registrationId, track.id, formData, { e: "The hackathon countdown has ended." });

  let filePath = "";
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_ARTIFACT_BYTES) bounceParticipant(eventId, registrationId, track.id, formData, { e: "That file must be 1MB or smaller." });
    const upload = new FormData();
    upload.append("file", file);
    upload.append("folder", "hackathon-artifacts");
    upload.append("bucket", CERTIFICATES_BUCKET);
    const uploaded = await uploadMedia(upload);
    if (!uploaded.success) bounceParticipant(eventId, registrationId, track.id, formData, { e: "Could not upload that file." });
    filePath = uploaded.path;
  }
  if (!link && !filePath) bounceParticipant(eventId, registrationId, track.id, formData, { e: "Add a link or a file (1MB max)." });

  const { data: prior } = await supabaseAdmin
    .from(TABLES.HACKATHON_TASK_COMPLETIONS)
    .select("is_correct, extra")
    .eq("hackathon_team_id", team.id)
    .eq("task_id", task.id)
    .maybeSingle();
  if (prior?.is_correct) bounceParticipant(eventId, registrationId, track.id, formData, { ok: "Your team already submitted that task." });

  await supabaseAdmin.from(TABLES.HACKATHON_TASK_COMPLETIONS).upsert(
    {
      hackathon_team_id: team.id,
      task_id: task.id,
      submitted_flag: null,
      is_correct: true,
      points_awarded: task.points ?? 0,
      attempted_at: nowIso,
      extra: { submissionUrl: link, filePath },
    },
    { onConflict: "hackathon_team_id,task_id" },
  );

  revalidatePath(`/events/${eventId}/compete`);
  bounceParticipant(eventId, registrationId, track.id, formData, { ok: `Submitted — ${task.title}.` });
}
