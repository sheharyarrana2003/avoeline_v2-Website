import { createHash } from "crypto";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";

export function hashFlag(value: string): string {
  return createHash("sha256").update(value.trim()).digest("hex");
}

export type TaskRow = {
  id: string;
  track_id: string;
  title: string;
  description: string | null;
  category: string | null;
  points: number | null;
  hints: unknown;
  flag_hash: string | null;
  time_limit_minutes: number | null;
  is_random: boolean | null;
  phase_id: string | null;
  created_at: string;
};

export type PhaseRow = {
  id: string;
  name: string;
  opens_at: string | null;
  closes_at: string | null;
  starts_at: string | null;
  ends_at: string | null;
  track_id?: string | null;
  sort_order?: number | null;
  event_id?: string | null;
};

export async function listTasksForTrack(trackId: string): Promise<TaskRow[]> {
  const { data } = await supabaseAdmin.from(TABLES.HACKATHON_TASKS).select("*").eq("track_id", trackId).order("created_at");
  return (data ?? []) as TaskRow[];
}

export async function listTasksForEvent(eventId: string, trackIds: string[]): Promise<TaskRow[]> {
  if (!trackIds.length) return [];
  const { data } = await supabaseAdmin.from(TABLES.HACKATHON_TASKS).select("*").in("track_id", trackIds).order("created_at");
  return (data ?? []) as TaskRow[];
}

export async function listPhasesForTrack(trackId: string): Promise<PhaseRow[]> {
  const { data } = await supabaseAdmin
    .from(TABLES.HACKATHON_PHASES)
    .select("id, name, opens_at, closes_at, starts_at, ends_at, track_id, sort_order")
    .eq("track_id", trackId);
  return ((data ?? []) as PhaseRow[]).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name));
}

export async function listPhasesForEvent(eventId: string, trackIds: string[] = []): Promise<PhaseRow[]> {
  const { data } = await supabaseAdmin
    .from(TABLES.HACKATHON_PHASES)
    .select("id, name, opens_at, closes_at, starts_at, ends_at, track_id, sort_order, event_id")
    .eq("event_id", eventId);
  const byId = new Map((data ?? []).map((row) => [String((row as PhaseRow).id), row as PhaseRow]));
  if (trackIds.length) {
    const extra = await supabaseAdmin
      .from(TABLES.HACKATHON_PHASES)
      .select("id, name, opens_at, closes_at, starts_at, ends_at, track_id, sort_order, event_id")
      .in("track_id", trackIds);
    for (const row of (extra.data ?? []) as PhaseRow[]) byId.set(row.id, row);
  }
  return [...byId.values()].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name));
}

export async function getHackathonConfig(trackId: string) {
  const { data } = await supabaseAdmin.from(TABLES.HACKATHON_CONFIG).select("*").eq("track_id", trackId);
  return data ?? [];
}

export type TrackConfig = {
  on: (key: string) => boolean;
  value: (key: string) => Record<string, unknown>;
  num: (key: string, field: string, fallback: number) => number;
};

/** The organizer's per-track switches (docs 05). Missing rows mean "off". */
export async function trackConfig(trackId: string): Promise<TrackConfig> {
  const rows = await getHackathonConfig(trackId);
  const byKey = new Map(rows.map((r) => [String(r.config_key), r]));
  const value = (key: string) => {
    const v = byKey.get(key)?.config_value;
    return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  };
  return {
    on: (key) => byKey.get(key)?.enabled === true,
    value,
    num: (key, field, fallback) => {
      const n = Number(value(key)[field]);
      return Number.isFinite(n) ? n : fallback;
    },
  };
}

export function phaseWindow(p: PhaseRow): { open: string | null; close: string | null } {
  return { open: p.opens_at || p.starts_at, close: p.closes_at || p.ends_at };
}

export function phaseIsOpen(p: PhaseRow, nowIso = new Date().toISOString()): boolean {
  const { open, close } = phaseWindow(p);
  return (!open || open <= nowIso) && (!close || close >= nowIso);
}

export function taskHints(task: Pick<TaskRow, "hints">): string[] {
  if (Array.isArray(task.hints)) return task.hints.map((h) => (typeof h === "string" ? h : String((h as { text?: string })?.text ?? ""))).filter(Boolean);
  if (typeof task.hints === "string" && task.hints.trim()) return [task.hints.trim()];
  return [];
}

/** Per-team task state kept in hackathon_teams.extra so no extra table is needed. */
export type TeamTaskState = { hintsRevealed: Record<string, boolean>; taskStarts: Record<string, string> };

export async function readTeamTaskState(teamId: string): Promise<TeamTaskState> {
  const { data } = await supabaseAdmin.from(TABLES.HACKATHON_TEAMS).select("extra").eq("id", teamId).maybeSingle();
  const extra = (data?.extra && typeof data.extra === "object" ? data.extra : {}) as Record<string, unknown>;
  return {
    hintsRevealed: (extra.hintsRevealed as Record<string, boolean>) ?? {},
    taskStarts: (extra.taskStarts as Record<string, string>) ?? {},
  };
}

export async function patchTeamTaskState(teamId: string, patch: Partial<TeamTaskState>): Promise<void> {
  const { data } = await supabaseAdmin.from(TABLES.HACKATHON_TEAMS).select("extra").eq("id", teamId).maybeSingle();
  const extra = (data?.extra && typeof data.extra === "object" ? data.extra : {}) as Record<string, unknown>;
  const next = { ...extra };
  if (patch.hintsRevealed) next.hintsRevealed = { ...((extra.hintsRevealed as object) ?? {}), ...patch.hintsRevealed };
  if (patch.taskStarts) next.taskStarts = { ...((extra.taskStarts as object) ?? {}), ...patch.taskStarts };
  await supabaseAdmin.from(TABLES.HACKATHON_TEAMS).update({ extra: next, updated_at: new Date().toISOString() }).eq("id", teamId);
}

/**
 * Deal random-pool tasks to a team once, then keep the same hand. Stored in
 * hackathon_task_assignments so the organizer can see who got what.
 */
export async function assignedRandomTaskIds(teamId: string, pool: TaskRow[], count: number): Promise<Set<string>> {
  const { data: existing } = await supabaseAdmin
    .from(TABLES.HACKATHON_TASK_ASSIGNMENTS)
    .select("task_id")
    .eq("hackathon_team_id", teamId);
  const poolIds = new Set(pool.map((t) => t.id));
  const have = (existing ?? []).map((r) => String(r.task_id)).filter((id) => poolIds.has(id));
  if (have.length >= count || have.length >= pool.length) return new Set(have);

  const remaining = pool.filter((t) => !have.includes(t.id));
  for (let i = remaining.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
  }
  const picks = remaining.slice(0, Math.max(0, count - have.length));
  if (picks.length) {
    await supabaseAdmin
      .from(TABLES.HACKATHON_TASK_ASSIGNMENTS)
      .insert(picks.map((t) => ({ hackathon_team_id: teamId, task_id: t.id })));
  }
  return new Set([...have, ...picks.map((t) => t.id)]);
}

/** When task submissions stop: the countdown's end, else the track deadline. */
export function taskCutoff(cfg: TrackConfig, trackDeadline: string | null | undefined): string | null {
  if (!cfg.on("hackathon_timer")) return null;
  const endsAt = String(cfg.value("hackathon_timer").endsAt ?? "").trim();
  const iso = endsAt ? new Date(endsAt).toISOString() : trackDeadline ? new Date(trackDeadline).toISOString() : null;
  return iso && !Number.isNaN(Date.parse(iso)) ? iso : null;
}

/** Tasks this team can see right now, after phases, random dealing and categories. */
export async function visibleTasksForTeam(trackId: string, teamId: string, cfg: TrackConfig): Promise<TaskRow[]> {
  const [tasks, phases] = await Promise.all([listTasksForTrack(trackId), listPhasesForTrack(trackId)]);
  const phasesGate = cfg.on("phased_structure") || cfg.on("day_wise_tasks");
  const openPhaseIds = new Set(phases.filter((p) => phaseIsOpen(p)).map((p) => p.id));

  let visible = tasks.filter((t) => !phasesGate || !t.phase_id || openPhaseIds.has(t.phase_id));

  if (cfg.on("random_tasks")) {
    const pool = visible.filter((t) => t.is_random);
    const dealt = await assignedRandomTaskIds(teamId, pool, Math.max(1, Math.trunc(cfg.num("random_tasks", "count", 1))));
    visible = visible.filter((t) => !t.is_random || dealt.has(t.id));
  }
  return visible;
}

export type ScoreRow = { teamId: string; teamName: string; points: number; solved: number };

export async function trackTaskScoreboard(trackId: string): Promise<ScoreRow[]> {
  const { data: teams } = await supabaseAdmin.from(TABLES.HACKATHON_TEAMS).select("id, name").eq("track_id", trackId);
  const ids = (teams ?? []).map((t) => String(t.id));
  if (!ids.length) return [];
  const { data: trackTasks } = await supabaseAdmin.from(TABLES.HACKATHON_TASKS).select("id").eq("track_id", trackId);
  const taskIds = (trackTasks ?? []).map((t) => String(t.id));
  if (!taskIds.length) {
    return (teams ?? []).map((t) => ({ teamId: String(t.id), teamName: String(t.name), points: 0, solved: 0 }));
  }
  const { data: done } = await supabaseAdmin
    .from(TABLES.HACKATHON_TASK_COMPLETIONS)
    .select("hackathon_team_id, points_awarded, is_correct, task_id")
    .in("hackathon_team_id", ids)
    .in("task_id", taskIds)
    .eq("is_correct", true);
  const rows = new Map<string, ScoreRow>(
    (teams ?? []).map((t) => [String(t.id), { teamId: String(t.id), teamName: String(t.name), points: 0, solved: 0 }]),
  );
  for (const c of done ?? []) {
    const row = rows.get(String(c.hackathon_team_id));
    if (!row) continue;
    row.points += Number(c.points_awarded) || 0;
    row.solved += 1;
  }
  return [...rows.values()].sort((a, b) => b.points - a.points || b.solved - a.solved);
}

export async function teamCompletions(teamId: string): Promise<Map<string, { correct: boolean; points: number }>> {
  const { data } = await supabaseAdmin
    .from(TABLES.HACKATHON_TASK_COMPLETIONS)
    .select("task_id, is_correct, points_awarded")
    .eq("hackathon_team_id", teamId);
  return new Map((data ?? []).map((r) => [String(r.task_id), { correct: !!r.is_correct, points: Number(r.points_awarded) || 0 }]));
}
