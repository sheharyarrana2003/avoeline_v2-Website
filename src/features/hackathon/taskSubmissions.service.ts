import "server-only";

import { TABLES } from "@/data/collections";
import { HACKATHON_SUBMISSIONS_BUCKET, getSignedUrl, supabaseAdmin } from "@/data/supabase";
import type { TaskSubmissionRow, TaskSubmissionStatus } from "./taskSubmissions.types";

export type { TaskSubmissionRow, TaskSubmissionStatus } from "./taskSubmissions.types";
export { isSafeInlinePreview } from "./taskSubmissions.types";

export type TaskSubmissionFilters = {
  trackId?: string | null;
  phaseId?: string | null;
  taskId?: string | null;
  status?: TaskSubmissionStatus | "all" | null;
  teamQ?: string | null;
  from?: string | null;
  to?: string | null;
  limit?: number;
  /** Keyset cursor: rows older than this (submitted_at, id). */
  cursor?: { at: string; id: string } | null;
};

const STATUSES = new Set<TaskSubmissionStatus>(["submitted", "accepted", "rejected", "late"]);

function isStatus(v: string): v is TaskSubmissionStatus {
  return STATUSES.has(v as TaskSubmissionStatus);
}

export async function listTaskSubmissionsForEvent(
  eventId: string,
  filters: TaskSubmissionFilters = {},
): Promise<TaskSubmissionRow[]> {
  const { data: tracks } = await supabaseAdmin
    .from(TABLES.HACKATHON_TRACKS)
    .select("id, name")
    .eq("event_id", eventId);
  const trackIds = (tracks ?? []).map((t) => String(t.id));
  if (!trackIds.length) return [];

  const trackName = new Map((tracks ?? []).map((t) => [String(t.id), String(t.name)]));
  let q = supabaseAdmin
    .from(TABLES.HACKATHON_TASK_SUBMISSIONS)
    .select(
      "id, team_id, track_id, phase_id, task_id, submitted_by, text_answer, link_url, file_path, file_name, file_size, mime, submitted_at, status, review_note, points_awarded",
    )
    .in("track_id", filters.trackId ? [filters.trackId] : trackIds)
    .order("submitted_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(Math.min(Math.max(filters.limit ?? 50, 1), 50));

  if (filters.cursor?.at && filters.cursor?.id) {
    q = q.or(
      `submitted_at.lt.${filters.cursor.at},and(submitted_at.eq.${filters.cursor.at},id.lt.${filters.cursor.id})`,
    );
  }
  if (filters.phaseId) q = q.eq("phase_id", filters.phaseId);
  if (filters.taskId) q = q.eq("task_id", filters.taskId);
  if (filters.status && filters.status !== "all" && isStatus(filters.status)) {
    q = q.eq("status", filters.status);
  }
  if (filters.from) q = q.gte("submitted_at", filters.from);
  if (filters.to) q = q.lte("submitted_at", filters.to);

  const { data: rows, error } = await q;
  if (error || !rows?.length) return [];

  const teamIds = [...new Set(rows.map((r) => String(r.team_id)))];
  const taskIds = [...new Set(rows.map((r) => String(r.task_id)))];
  const phaseIds = [
    ...new Set(
      rows
        .map((r) => r.phase_id)
        .filter(Boolean)
        .map(String),
    ),
  ];

  const [teams, tasks, phases] = await Promise.all([
    supabaseAdmin.from(TABLES.HACKATHON_TEAMS).select("id, name").in("id", teamIds),
    supabaseAdmin.from(TABLES.HACKATHON_TASKS).select("id, title").in("id", taskIds),
    phaseIds.length
      ? supabaseAdmin.from(TABLES.HACKATHON_PHASES).select("id, name").in("id", phaseIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  const teamName = new Map((teams.data ?? []).map((t) => [String(t.id), String(t.name)]));
  const taskTitle = new Map((tasks.data ?? []).map((t) => [String(t.id), String(t.title)]));
  const phaseName = new Map((phases.data ?? []).map((p) => [String(p.id), String(p.name)]));

  const teamQ = (filters.teamQ || "").trim().toLowerCase();
  return rows
    .map((r) => {
      const status = isStatus(String(r.status)) ? (r.status as TaskSubmissionStatus) : "submitted";
      return {
        id: String(r.id),
        teamId: String(r.team_id),
        teamName: teamName.get(String(r.team_id)) || "Team",
        trackId: String(r.track_id),
        trackName: trackName.get(String(r.track_id)) || "Competition",
        phaseId: r.phase_id ? String(r.phase_id) : null,
        phaseName: r.phase_id ? phaseName.get(String(r.phase_id)) || null : null,
        taskId: String(r.task_id),
        taskTitle: taskTitle.get(String(r.task_id)) || "Task",
        submittedBy: r.submitted_by ? String(r.submitted_by) : null,
        textAnswer: r.text_answer ? String(r.text_answer) : null,
        linkUrl: r.link_url ? String(r.link_url) : null,
        filePath: r.file_path ? String(r.file_path) : null,
        fileName: r.file_name ? String(r.file_name) : null,
        fileSize: r.file_size != null ? Number(r.file_size) : null,
        mime: r.mime ? String(r.mime) : null,
        submittedAt: String(r.submitted_at),
        status,
        reviewNote: r.review_note ? String(r.review_note) : null,
        pointsAwarded: r.points_awarded != null ? Number(r.points_awarded) : null,
      } satisfies TaskSubmissionRow;
    })
    .filter((r) => !teamQ || r.teamName.toLowerCase().includes(teamQ));
}

export async function getTaskSubmissionForEvent(
  eventId: string,
  id: string,
): Promise<TaskSubmissionRow | null> {
  const rows = await listTaskSubmissionsForEvent(eventId, { limit: 200 });
  return rows.find((r) => r.id === id) ?? null;
}

export async function signedSubmissionDownload(
  path: string,
  fileName?: string | null,
): Promise<string | null> {
  if (!path) return null;
  return getSignedUrl(HACKATHON_SUBMISSIONS_BUCKET, path, 300, fileName || undefined);
}

export async function reviewTaskSubmission(input: {
  id: string;
  status: TaskSubmissionStatus;
  reviewNote?: string | null;
  pointsAwarded?: number | null;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isStatus(input.status)) return { ok: false, message: "Invalid status." };
  const { error } = await supabaseAdmin
    .from(TABLES.HACKATHON_TASK_SUBMISSIONS)
    .update({
      status: input.status,
      review_note: input.reviewNote?.trim() || null,
      points_awarded: input.pointsAwarded ?? null,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", input.id);
  if (error) return { ok: false, message: "Could not update that submission." };
  return { ok: true };
}

export async function insertTaskSubmission(row: {
  teamId: string;
  trackId: string;
  phaseId?: string | null;
  taskId: string;
  submittedBy?: string | null;
  textAnswer?: string | null;
  linkUrl?: string | null;
  filePath?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  mime?: string | null;
  status?: TaskSubmissionStatus;
}): Promise<{ id: string } | null> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.HACKATHON_TASK_SUBMISSIONS)
    .insert({
      team_id: row.teamId,
      track_id: row.trackId,
      phase_id: row.phaseId || null,
      task_id: row.taskId,
      submitted_by: row.submittedBy || null,
      text_answer: row.textAnswer || null,
      link_url: row.linkUrl || null,
      file_path: row.filePath || null,
      file_name: row.fileName || null,
      file_size: row.fileSize ?? null,
      mime: row.mime || null,
      status: row.status || "submitted",
    } as never)
    .select("id")
    .maybeSingle();
  if (error || !data) return null;
  return { id: String(data.id) };
}
