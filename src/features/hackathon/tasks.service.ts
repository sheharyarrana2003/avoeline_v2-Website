import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";

export { hashFlag, flagsMatch } from "./flagCrypto";

export type TaskRow = {
  id: string;
  track_id: string;
  title: string;
  description: string | null;
  category: string | null;
  points: number | null;
  hints: unknown;
  flag_hash?: string | null;
  time_limit_minutes: number | null;
  is_random: boolean | null;
  phase_id: string | null;
  challenge_file_path?: string | null;
  challenge_file_name?: string | null;
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
  const { data } = await supabaseAdmin
    .from(TABLES.HACKATHON_TASKS)
    .select("*")
    .eq("track_id", trackId)
    .order("created_at");
  return (data ?? []) as TaskRow[];
}

export async function listTasksForEvent(eventId: string, trackIds: string[]): Promise<TaskRow[]> {
  if (!trackIds.length) return [];
  const { data } = await supabaseAdmin
    .from(TABLES.HACKATHON_TASKS)
    .select("*")
    .in("track_id", trackIds)
    .order("created_at");
  return (data ?? []) as TaskRow[];
}

export async function listPhasesForTrack(trackId: string): Promise<PhaseRow[]> {
  const { data } = await supabaseAdmin
    .from(TABLES.HACKATHON_PHASES)
    .select("id, name, opens_at, closes_at, starts_at, ends_at, track_id, sort_order")
    .eq("track_id", trackId);
  return ((data ?? []) as PhaseRow[]).sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name),
  );
}

export async function listPhasesForEvent(
  eventId: string,
  trackIds: string[] = [],
): Promise<PhaseRow[]> {
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
  return [...byId.values()].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name),
  );
}

/**
 * Effective config rows per track (event-wide `track_id` null first, then
 * track-specific — same merge as getEffectiveConfig). Settings UI uses this so
 * timers / integrity saved "all competitions" still show as enabled.
 */
export async function getHackathonConfigsForTracks(trackIds: string[]) {
  const unique = [...new Set(trackIds.filter(Boolean))];
  const out = new Map<string, Record<string, unknown>[]>();
  for (const id of unique) out.set(id, []);
  if (!unique.length) return out;

  const { data: tracks } = await supabaseAdmin
    .from(TABLES.HACKATHON_TRACKS)
    .select("id, event_id")
    .in("id", unique);
  const eventIds = [...new Set((tracks ?? []).map((t) => String(t.event_id)).filter(Boolean))];
  const trackEvent = new Map((tracks ?? []).map((t) => [String(t.id), String(t.event_id)]));

  const [{ data: perTrack }, { data: globalRows }] = await Promise.all([
    supabaseAdmin.from(TABLES.HACKATHON_CONFIG).select("*").in("track_id", unique),
    eventIds.length
      ? supabaseAdmin
          .from(TABLES.HACKATHON_CONFIG)
          .select("*")
          .in("event_id", eventIds)
          .is("track_id", null)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
  ]);

  const globalByEvent = new Map<string, Record<string, unknown>[]>();
  for (const row of globalRows ?? []) {
    const eid = String((row as { event_id?: string }).event_id ?? "");
    if (!eid) continue;
    const list = globalByEvent.get(eid) ?? [];
    list.push(row as Record<string, unknown>);
    globalByEvent.set(eid, list);
  }

  for (const id of unique) {
    const byKey = new Map<string, Record<string, unknown>>();
    const eid = trackEvent.get(id);
    for (const row of (eid ? globalByEvent.get(eid) : undefined) ?? []) {
      byKey.set(String(row.config_key), row);
    }
    for (const row of (perTrack ?? []).filter((r) => String(r.track_id) === id)) {
      byKey.set(String(row.config_key), row as Record<string, unknown>);
    }
    out.set(id, [...byKey.values()]);
  }
  return out;
}

export async function getHackathonConfig(trackId: string) {
  const byTrack = await getHackathonConfigsForTracks([trackId]);
  return byTrack.get(trackId) ?? [];
}

export type TrackConfig = {
  on: (key: string) => boolean;
  value: (key: string) => Record<string, unknown>;
  num: (key: string, field: string, fallback: number) => number;
  str: (key: string, field: string, fallback?: string) => string;
};

function configFromRows(rows: Record<string, unknown>[]): TrackConfig {
  const byKey = new Map(rows.map((r) => [String(r.config_key), r]));
  const value = (key: string) => {
    const v = byKey.get(key)?.config_value;
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  };
  return {
    on: (key) => byKey.get(key)?.enabled === true,
    value,
    num: (key, field, fallback) => {
      const n = Number(value(key)[field]);
      return Number.isFinite(n) ? n : fallback;
    },
    str: (key, field, fallback = "") => {
      const v = value(key)[field];
      return typeof v === "string" ? v : fallback;
    },
  };
}

/** Merge event-wide (`track_id` null) then track-specific (track wins). */
export async function getEffectiveConfig(trackId: string): Promise<TrackConfig> {
  const { data: track } = await supabaseAdmin
    .from(TABLES.HACKATHON_TRACKS)
    .select("id, event_id")
    .eq("id", trackId)
    .maybeSingle();
  if (!track) return configFromRows([]);

  const eventId = String(track.event_id);
  const [{ data: globalRows }, { data: trackRows }] = await Promise.all([
    supabaseAdmin
      .from(TABLES.HACKATHON_CONFIG)
      .select("*")
      .eq("event_id", eventId)
      .is("track_id", null),
    supabaseAdmin.from(TABLES.HACKATHON_CONFIG).select("*").eq("track_id", trackId),
  ]);

  const byKey = new Map<string, Record<string, unknown>>();
  for (const row of globalRows ?? [])
    byKey.set(String(row.config_key), row as Record<string, unknown>);
  for (const row of trackRows ?? [])
    byKey.set(String(row.config_key), row as Record<string, unknown>);
  return configFromRows([...byKey.values()]);
}

/** @deprecated Prefer getEffectiveConfig — alias kept for call-site compatibility. */
export async function trackConfig(trackId: string): Promise<TrackConfig> {
  return getEffectiveConfig(trackId);
}

export function phaseWindow(p: PhaseRow): { open: string | null; close: string | null } {
  return { open: p.opens_at || p.starts_at, close: p.closes_at || p.ends_at };
}

export function phaseIsOpen(p: PhaseRow, nowIso = new Date().toISOString()): boolean {
  const { open, close } = phaseWindow(p);
  return (!open || open <= nowIso) && (!close || close >= nowIso);
}

export function taskHints(task: Pick<TaskRow, "hints">): string[] {
  if (Array.isArray(task.hints)) {
    return task.hints
      .map((h) => (typeof h === "string" ? h : String((h as { text?: string })?.text ?? "")))
      .filter(Boolean);
  }
  if (typeof task.hints === "string" && task.hints.trim()) return [task.hints.trim()];
  return [];
}

/** Per-team task state kept in hackathon_teams.extra so no extra table is needed. */
export type TeamTaskState = {
  hintsRevealed: Record<string, boolean>;
  taskStarts: Record<string, string>;
};

export async function readTeamTaskState(teamId: string): Promise<TeamTaskState> {
  const { data } = await supabaseAdmin
    .from(TABLES.HACKATHON_TEAMS)
    .select("extra")
    .eq("id", teamId)
    .maybeSingle();
  const extra = (data?.extra && typeof data.extra === "object" ? data.extra : {}) as Record<
    string,
    unknown
  >;
  return {
    hintsRevealed: (extra.hintsRevealed as Record<string, boolean>) ?? {},
    taskStarts: (extra.taskStarts as Record<string, string>) ?? {},
  };
}

export async function patchTeamTaskState(
  teamId: string,
  patch: Partial<TeamTaskState>,
): Promise<void> {
  const { data } = await supabaseAdmin
    .from(TABLES.HACKATHON_TEAMS)
    .select("extra")
    .eq("id", teamId)
    .maybeSingle();
  const extra = (data?.extra && typeof data.extra === "object" ? data.extra : {}) as Record<
    string,
    unknown
  >;
  const next = { ...extra };
  if (patch.hintsRevealed)
    next.hintsRevealed = { ...((extra.hintsRevealed as object) ?? {}), ...patch.hintsRevealed };
  if (patch.taskStarts)
    next.taskStarts = { ...((extra.taskStarts as object) ?? {}), ...patch.taskStarts };
  await supabaseAdmin
    .from(TABLES.HACKATHON_TEAMS)
    .update({ extra: next, updated_at: new Date().toISOString() })
    .eq("id", teamId);
}

/**
 * Deal random-pool tasks to a team once, then keep the same hand. Stored in
 * hackathon_task_assignments so the organizer can see who got what.
 */
export async function assignedRandomTaskIds(
  teamId: string,
  pool: TaskRow[],
  count: number,
): Promise<Set<string>> {
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
export function taskCutoff(
  cfg: TrackConfig,
  trackDeadline: string | null | undefined,
): string | null {
  if (!cfg.on("hackathon_timer")) return null;
  const endsAt = String(cfg.value("hackathon_timer").endsAt ?? "").trim();
  const iso = endsAt
    ? new Date(endsAt).toISOString()
    : trackDeadline
      ? new Date(trackDeadline).toISOString()
      : null;
  return iso && !Number.isNaN(Date.parse(iso)) ? iso : null;
}

/** Tasks this team can see right now, after phases, random dealing and categories. */
export async function visibleTasksForTeam(
  trackId: string,
  teamId: string,
  cfg: TrackConfig,
): Promise<TaskRow[]> {
  const [tasks, phases] = await Promise.all([
    listTasksForTrack(trackId),
    listPhasesForTrack(trackId),
  ]);
  const phasesGate = cfg.on("phased_structure") || cfg.on("day_wise_tasks");
  const openPhaseIds = new Set(phases.filter((p) => phaseIsOpen(p)).map((p) => p.id));

  let visible = tasks.filter((t) => !phasesGate || !t.phase_id || openPhaseIds.has(t.phase_id));

  if (cfg.on("random_tasks")) {
    const pool = visible.filter((t) => t.is_random);
    const dealt = await assignedRandomTaskIds(
      teamId,
      pool,
      Math.max(1, Math.trunc(cfg.num("random_tasks", "count", 1))),
    );
    visible = visible.filter((t) => !t.is_random || dealt.has(t.id));
  }
  return visible;
}

export type ScoreRow = { teamId: string; teamName: string; points: number; solved: number };

export type ScoreTaskCell = {
  taskId: string;
  title: string;
  points: number;
  phaseId: string | null;
  solved: boolean;
  earned: number;
  attemptedAt: string | null;
  firstBlood: boolean;
  hintUsed: boolean;
};

export type ScorePhaseCell = {
  phaseId: string;
  name: string;
  complete: boolean;
  completedAt: string | null;
};

export type ScoreboardDetailRow = ScoreRow & {
  taskTotal: number;
  phasesDone: number;
  phaseTotal: number;
  lastSolveAt: string | null;
  phases: ScorePhaseCell[];
  tasks: ScoreTaskCell[];
};

export async function trackTaskScoreboard(trackId: string): Promise<ScoreRow[]> {
  const detail = await trackTaskScoreboardDetail(trackId);
  return detail.map(({ teamId, teamName, points, solved }) => ({
    teamId,
    teamName,
    points,
    solved,
  }));
}

export async function trackTaskScoreboardDetail(trackId: string): Promise<ScoreboardDetailRow[]> {
  const { data: teams } = await supabaseAdmin
    .from(TABLES.HACKATHON_TEAMS)
    .select("id, name, extra")
    .eq("track_id", trackId);
  const ids = (teams ?? []).map((t) => String(t.id));
  const [taskRows, phaseRows] = await Promise.all([
    listTasksForTrack(trackId),
    listPhasesForTrack(trackId),
  ]);
  const taskIds = taskRows.map((t) => t.id);
  const { data: done } =
    ids.length && taskIds.length
      ? await supabaseAdmin
          .from(TABLES.HACKATHON_TASK_COMPLETIONS)
          .select("hackathon_team_id, points_awarded, is_correct, task_id, attempted_at")
          .in("hackathon_team_id", ids)
          .in("task_id", taskIds)
          .eq("is_correct", true)
      : {
          data: [] as {
            hackathon_team_id: string;
            points_awarded: number;
            is_correct: boolean;
            task_id: string;
            attempted_at: string | null;
          }[],
        };

  const { aggregateScoreboardDetail } = await import("./scoreboardAggregate");
  return aggregateScoreboardDetail({
    teams: (teams ?? []).map((t) => ({ id: String(t.id), name: String(t.name), extra: t.extra })),
    taskRows,
    phaseRows,
    completions: (done ?? []).map((c) => ({
      hackathon_team_id: String(c.hackathon_team_id),
      task_id: String(c.task_id),
      points_awarded: c.points_awarded,
      is_correct: c.is_correct,
      attempted_at: c.attempted_at,
    })),
  });
}

export { aggregateScoreboardDetail } from "./scoreboardAggregate";

export async function teamCompletions(
  teamId: string,
): Promise<Map<string, { correct: boolean; points: number }>> {
  const { data } = await supabaseAdmin
    .from(TABLES.HACKATHON_TASK_COMPLETIONS)
    .select("task_id, is_correct, points_awarded")
    .eq("hackathon_team_id", teamId);
  return new Map(
    (data ?? []).map((r) => [
      String(r.task_id),
      { correct: !!r.is_correct, points: Number(r.points_awarded) || 0 },
    ]),
  );
}
