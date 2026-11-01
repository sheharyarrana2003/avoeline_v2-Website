-- Structured competition prizes, CTF challenge-file storage, per-event
-- attachment cap, and organizer-added staff members (no join code).

create table if not exists public.hackathon_track_prizes (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.hackathon_tracks(id) on delete cascade,
  position_label text not null,
  amount text,
  description text,
  order_index int not null default 0
);

create index if not exists hackathon_track_prizes_track_id_idx
  on public.hackathon_track_prizes (track_id, order_index);

alter table public.hackathon_track_prizes enable row level security;

drop policy if exists hackathon_track_prizes_read on public.hackathon_track_prizes;
create policy hackathon_track_prizes_read
  on public.hackathon_track_prizes
  for select
  to anon, authenticated
  using (true);

alter table public.hackathon_settings
  add column if not exists max_attachment_mb int not null default 10;

alter table public.hackathon_settings
  drop constraint if exists hackathon_settings_max_attachment_mb_check;
alter table public.hackathon_settings
  add constraint hackathon_settings_max_attachment_mb_check
  check (max_attachment_mb between 1 and 50);

alter table public.hackathon_tasks
  add column if not exists challenge_file_path text,
  add column if not exists challenge_file_name text;

alter table public.team_members
  alter column user_id drop not null;

alter table public.team_members
  add column if not exists display_name text,
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists extra jsonb not null default '{}'::jsonb;

insert into storage.buckets (id, name, public, file_size_limit)
values
  ('sponsor-logos', 'sponsor-logos', true, 10485760),
  ('hackathon-challenge-files', 'hackathon-challenge-files', false, 52428800)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

drop policy if exists sponsor_logos_public_read on storage.objects;
create policy sponsor_logos_public_read
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'sponsor-logos');

-- Challenge files stay private (signed URLs / service role).
-- Per-event size is enforced in the upload action using max_attachment_mb;
-- the bucket file_size_limit (50MB) is the hard backstop.
