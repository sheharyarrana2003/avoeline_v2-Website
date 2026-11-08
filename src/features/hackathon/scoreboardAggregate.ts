/** Pure scoreboard aggregation — safe for unit tests (no Supabase). */

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

export type RankMovement = {
  direction: "up" | "down" | "same" | "new";
  /** Positive = climbed (rank number decreased). */
  delta: number;
  priorRank: number | null;
};

export type ScoreboardDetailRow = {
  teamId: string;
  teamName: string;
  points: number;
  solved: number;
  taskTotal: number;
  phasesDone: number;
  phaseTotal: number;
  lastSolveAt: string | null;
  phases: ScorePhaseCell[];
  tasks: ScoreTaskCell[];
  movement?: RankMovement;
};

export type ScoreboardAggregateInput = {
  teams: { id: string; name: string; extra?: unknown }[];
  taskRows: { id: string; title: string; points: number | null; phase_id: string | null }[];
  phaseRows: { id: string; name: string }[];
  completions: {
    hackathon_team_id: string;
    task_id: string;
    points_awarded: number | null;
    is_correct: boolean | null;
    attempted_at: string | null;
  }[];
};

/** Only completions whose task_id is in `taskRows` count — proves per-competition isolation. */
export function aggregateScoreboardDetail(input: ScoreboardAggregateInput): ScoreboardDetailRow[] {
  return aggregateScoreboardDetailAt(input, Number.POSITIVE_INFINITY);
}

/** Same as aggregateScoreboardDetail but only completions with attempted_at <= atMs. */
export function aggregateScoreboardDetailAt(
  input: ScoreboardAggregateInput,
  atMs: number,
): ScoreboardDetailRow[] {
  const taskIds = new Set(input.taskRows.map((t) => t.id));
  const done = input.completions.filter((c) => {
    if (!c.is_correct || !taskIds.has(String(c.task_id))) return false;
    const at = c.attempted_at ? Date.parse(String(c.attempted_at)) : NaN;
    if (!Number.isFinite(at)) return atMs === Number.POSITIVE_INFINITY;
    return at <= atMs;
  });
  const firstBlood = new Map<string, { teamId: string; at: string }>();
  for (const c of done) {
    const at = String(c.attempted_at || "");
    if (!at) continue;
    const prev = firstBlood.get(String(c.task_id));
    if (!prev || at < prev.at)
      firstBlood.set(String(c.task_id), { teamId: String(c.hackathon_team_id), at });
  }
  const byTeam = new Map<string, typeof done>();
  for (const c of done) {
    const list = byTeam.get(String(c.hackathon_team_id)) ?? [];
    list.push(c);
    byTeam.set(String(c.hackathon_team_id), list);
  }
  const rows: ScoreboardDetailRow[] = input.teams.map((t) => {
    const teamId = String(t.id);
    const extra = (t.extra && typeof t.extra === "object" ? t.extra : {}) as {
      hintsRevealed?: Record<string, boolean>;
    };
    const hints = extra.hintsRevealed ?? {};
    const completes = byTeam.get(teamId) ?? [];
    const byTask = new Map(completes.map((c) => [String(c.task_id), c]));
    const tasks: ScoreTaskCell[] = input.taskRows.map((task) => {
      const hit = byTask.get(task.id);
      return {
        taskId: task.id,
        title: task.title,
        points: task.points ?? 0,
        phaseId: task.phase_id,
        solved: !!hit,
        earned: hit ? Number(hit.points_awarded) || 0 : 0,
        attemptedAt: hit?.attempted_at ? String(hit.attempted_at) : null,
        firstBlood: firstBlood.get(task.id)?.teamId === teamId,
        hintUsed: !!hints[task.id],
      };
    });
    const phases: ScorePhaseCell[] = input.phaseRows.map((p) => {
      const inPhase = tasks.filter((x) => x.phaseId === p.id);
      const complete = inPhase.length > 0 && inPhase.every((x) => x.solved);
      const times = inPhase.map((x) => x.attemptedAt).filter(Boolean) as string[];
      times.sort();
      return {
        phaseId: p.id,
        name: p.name,
        complete,
        completedAt: complete ? (times[times.length - 1] ?? null) : null,
      };
    });
    const solvedCells = tasks.filter((x) => x.solved);
    const lastSolveAt =
      solvedCells
        .map((x) => x.attemptedAt)
        .filter(Boolean)
        .sort()
        .at(-1) ?? null;
    return {
      teamId,
      teamName: String(t.name),
      points: solvedCells.reduce((n, x) => n + x.earned, 0),
      solved: solvedCells.length,
      taskTotal: tasks.length,
      phasesDone: phases.filter((p) => p.complete).length,
      phaseTotal: phases.length,
      lastSolveAt,
      phases,
      tasks,
    };
  });
  return rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.solved !== a.solved) return b.solved - a.solved;
    const aLast = a.lastSolveAt || "\uffff";
    const bLast = b.lastSolveAt || "\uffff";
    return aLast.localeCompare(bLast);
  });
}

/** Compare current ranks vs an earlier board (e.g. hour ago). */
export function computeRankMovement(
  nowRows: ScoreboardDetailRow[],
  hourAgoRows: ScoreboardDetailRow[],
): Map<string, RankMovement> {
  const priorRank = new Map(hourAgoRows.map((r, i) => [r.teamId, i + 1]));
  const out = new Map<string, RankMovement>();
  nowRows.forEach((row, i) => {
    const rank = i + 1;
    const prev = priorRank.get(row.teamId);
    if (prev == null) {
      out.set(row.teamId, { direction: "new", delta: 0, priorRank: null });
      return;
    }
    const delta = prev - rank;
    if (delta > 0) out.set(row.teamId, { direction: "up", delta, priorRank: prev });
    else if (delta < 0) out.set(row.teamId, { direction: "down", delta, priorRank: prev });
    else out.set(row.teamId, { direction: "same", delta: 0, priorRank: prev });
  });
  return out;
}

/** Attach hour-ago movement onto current rows (mutates copies). */
export function withRankMovement(
  input: ScoreboardAggregateInput,
  nowMs = Date.now(),
  lookbackMs = 60 * 60 * 1000,
): ScoreboardDetailRow[] {
  const nowRows = aggregateScoreboardDetailAt(input, nowMs);
  const hourAgoRows = aggregateScoreboardDetailAt(input, nowMs - lookbackMs);
  const move = computeRankMovement(nowRows, hourAgoRows);
  return nowRows.map((r) => ({
    ...r,
    movement: move.get(r.teamId) || { direction: "new" as const, delta: 0, priorRank: null },
  }));
}
