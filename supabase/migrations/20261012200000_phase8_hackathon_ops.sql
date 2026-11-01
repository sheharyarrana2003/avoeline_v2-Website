-- Phase 8: competition timestamptz fields, per-task submissions, config all-vs-track,
-- activity/integrity/task-start tables, submissions bucket.

-- ---------------------------------------------------------------------------
-- Track date columns (rename + add)
-- ---------------------------------------------------------------------------
alter table public.hackathon_tracks
  add column if not exists opens_at timestamptz,
  add column if not exists closes_at timestamptz,
  add column if not exists registration_closes_at timestamptz,
  add column if not exists instructions_file_path text,
  add column if not exists instructions_file_name text,
  add column if not exists rules_acknowledged_at timestamptz;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'hackathon_tracks' and column_name = 'roster_lock_date'
  ) then
    alter table public.hackathon_tracks rename column roster_lock_date to roster_locks_at;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'hackathon_tracks' and column_name = 'submission_deadline'
  ) then
    alter table public.hackathon_tracks rename column submission_deadline to submission_deadline_at;
  end if;
end $$;

alter table public.hackathon_tracks
  add column if not exists roster_locks_at timestamptz,
  add column if not exists submission_deadline_at timestamptz;

-- ---------------------------------------------------------------------------
-- hackathon_config: nullable track_id + event_id for "all competitions" rows
-- ---------------------------------------------------------------------------
alter table public.hackathon_config
  add column if not exists event_id uuid references public.events(id) on delete cascade;

update public.hackathon_config c
set event_id = t.event_id
from public.hackathon_tracks t
where c.track_id = t.id and c.event_id is null;

alter table public.hackathon_config alter column track_id drop not null;

alter table public.hackathon_config drop constraint if exists hackathon_config_track_id_config_key_key;
alter table public.hackathon_config drop constraint if exists hackathon_config_track_id_config_key_unique;

create unique index if not exists hackathon_config_track_key_uidx
  on public.hackathon_config (track_id, config_key)
  where track_id is not null;

create unique index if not exists hackathon_config_event_key_uidx
  on public.hackathon_config (event_id, config_key)
  where track_id is null;

create index if not exists hackathon_config_event_id_idx on public.hackathon_config (event_id);

-- ---------------------------------------------------------------------------
-- Per-task submissions
-- ---------------------------------------------------------------------------
create table if not exists public.hackathon_task_submissions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.hackathon_teams(id) on delete cascade,
  track_id uuid not null references public.hackathon_tracks(id) on delete cascade,
  phase_id uuid references public.hackathon_phases(id) on delete set null,
  task_id uuid not null references public.hackathon_tasks(id) on delete cascade,
  submitted_by uuid references public.users(id) on delete set null,
  text_answer text,
  link_url text,
  file_path text,
  file_name text,
  file_size bigint,
  mime text,
  submitted_at timestamptz not null default now(),
  status text not null default 'submitted'
    check (status in ('submitted', 'accepted', 'rejected', 'late')),
  review_note text,
  points_awarded numeric(12, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hackathon_task_submissions_track_submitted_idx
  on public.hackathon_task_submissions (track_id, submitted_at desc);
create index if not exists hackathon_task_submissions_task_idx
  on public.hackathon_task_submissions (task_id);
create index if not exists hackathon_task_submissions_team_idx
  on public.hackathon_task_submissions (team_id);

alter table public.hackathon_task_submissions enable row level security;

-- ---------------------------------------------------------------------------
-- Per-team task timer starts
-- ---------------------------------------------------------------------------
create table if not exists public.hackathon_team_task_starts (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.hackathon_teams(id) on delete cascade,
  task_id uuid not null references public.hackathon_tasks(id) on delete cascade,
  started_at timestamptz not null default now(),
  unique (team_id, task_id)
);

create index if not exists hackathon_team_task_starts_team_idx
  on public.hackathon_team_task_starts (team_id);

alter table public.hackathon_team_task_starts enable row level security;

-- ---------------------------------------------------------------------------
-- Activity pings + integrity events
-- ---------------------------------------------------------------------------
create table if not exists public.team_activity_pings (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  team_id uuid not null references public.hackathon_teams(id) on delete cascade,
  registration_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists team_activity_pings_team_created_idx
  on public.team_activity_pings (team_id, created_at desc);

alter table public.team_activity_pings enable row level security;

create table if not exists public.team_integrity_events (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  team_id uuid not null references public.hackathon_teams(id) on delete cascade,
  registration_id uuid,
  event_type text not null,
  flagged boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists team_integrity_events_team_created_idx
  on public.team_integrity_events (team_id, created_at desc);

alter table public.team_integrity_events enable row level security;

create table if not exists public.compete_access_failures (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  ip_hash text,
  created_at timestamptz not null default now()
);

create index if not exists compete_access_failures_event_created_idx
  on public.compete_access_failures (event_id, created_at desc);

alter table public.compete_access_failures enable row level security;

-- ---------------------------------------------------------------------------
-- Storage bucket for task submissions
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('hackathon-submissions', 'hackathon-submissions', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;
