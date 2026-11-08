-- O5: per-judge submission scores (no rubric); mean feeds task completions / scoreboard

create table if not exists public.hackathon_judge_submission_scores (
  id uuid primary key default gen_random_uuid(),
  judge_id uuid not null references public.hackathon_judges(id) on delete cascade,
  submission_id uuid not null references public.hackathon_task_submissions(id) on delete cascade,
  points numeric(12,2) not null check (points >= 0),
  comment text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (judge_id, submission_id)
);

create index if not exists hackathon_judge_submission_scores_submission_idx
  on public.hackathon_judge_submission_scores (submission_id);
create index if not exists hackathon_judge_submission_scores_judge_idx
  on public.hackathon_judge_submission_scores (judge_id);

alter table public.hackathon_judge_submission_scores enable row level security;

revoke all on public.hackathon_judge_submission_scores from anon, authenticated;
grant select, insert, update, delete on public.hackathon_judge_submission_scores to service_role;
