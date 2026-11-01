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
};

/** Only completions whose task_id is in `taskRows` count — proves per-competition isolation. */
export function aggregateScoreboardDetail(input: {
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
}): ScoreboardDetailRow[] {
  const taskIds = new Set(input.taskRows.map((t) => t.id));
  const done = input.completions.filter((c) => c.is_correct && taskIds.has(String(c.task_id)));
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
