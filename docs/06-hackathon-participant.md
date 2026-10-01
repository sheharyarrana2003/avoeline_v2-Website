# Hackathon Participant Portal

Applies to: participant-facing screens for an event where the hackathon module is active. Builds directly on `hackathon_teams`, `hackathon_submissions`, `hackathon_scores` from the core schema — this doc adds the task layer that was missing.

## New tables

```sql
create table hackathon_tasks (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references hackathon_tracks(id) on delete cascade,
  title text not null,
  description text,
  category text, -- for CTF: e.g. 'web','crypto','forensics','reversing'
  points int default 0,
  hints jsonb default '[]', -- [{ text, pointsPenalty }]
  flag_hash text, -- for CTF flag-checking: store a hash, never the plaintext flag
  time_limit_minutes int, -- per-task timer, null = no limit
  is_random boolean default false, -- if true, this task is drawn from a random pool per team
  phase_id uuid references hackathon_phases(id),
  created_at timestamptz default now()
);

create table hackathon_phases (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references hackathon_tracks(id) on delete cascade,
  name text not null,
  order_index int not null,
  opens_at timestamptz,
  closes_at timestamptz,
  created_at timestamptz default now()
);

create table hackathon_task_completions (
  id uuid primary key default gen_random_uuid(),
  hackathon_team_id uuid not null references hackathon_teams(id) on delete cascade,
  task_id uuid not null references hackathon_tasks(id) on delete cascade,
  submitted_flag text, -- what the team typed, for audit — compare its hash to flag_hash
  is_correct boolean,
  points_awarded int default 0,
  attempted_at timestamptz default now(),
  unique (hackathon_team_id, task_id)
);
```

## Feature checklist

- **Live scoreboard**: query `hackathon_scores` (judged rounds) UNION `hackathon_task_completions` (CTF-style auto-scored tasks) summed per team, real-time via Supabase Realtime subscription on both tables — same shared-hook pattern from the earlier organizer/participant sync fix (`useHackathonTeams`), extend it to also subscribe to score changes.
- **Submissions**: already covered by `hackathon_submissions` — no change needed.
- **Team collaboration**: already covered by `hackathon_teams`/`hackathon_team_members` from the core schema.
- **Team tasks**: participant-facing task list, filtered to `hackathon_tasks` where `phase_id` is in the currently OPEN phase only (`hackathon_phases.opens_at <= now() <= closes_at`) — never show tasks from a future or closed phase. If `is_random = true` on a task, the specific task instance shown to a team should be drawn from a pool at task-list-load time and pinned to that team (store the assignment, don't re-randomize on every page load).
- **Task completions**: flag submission form → hash the submitted value the same way `flag_hash` was generated → write a `hackathon_task_completions` row with `is_correct` and `points_awarded` (0 if wrong, full or hint-reduced points if correct). Never send `flag_hash` to the client — verify server-side only (Supabase Edge Function or RPC, not a client-side comparison).
