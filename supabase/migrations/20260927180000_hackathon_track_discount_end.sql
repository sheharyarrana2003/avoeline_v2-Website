alter table public.hackathon_tracks
  add column if not exists discount_expires_at date,
  add column if not exists ended_at timestamptz,
  add column if not exists status text not null default 'open';
