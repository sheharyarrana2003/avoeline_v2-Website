alter table public.events
  add column if not exists map_url text,
  add column if not exists requires_registration boolean not null default true;

alter table public.hackathon_tracks
  add column if not exists image_url text,
  add column if not exists policies text,
  add column if not exists instructions text,
  add column if not exists discount_percent numeric default 0,
  add column if not exists discount_note text;
