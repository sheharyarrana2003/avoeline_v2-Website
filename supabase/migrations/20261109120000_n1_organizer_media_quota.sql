-- N1: per-organizer public media usage counter (docs/23 A8 budgets + plan quota).
alter table public.organizer_profiles
  add column if not exists media_bytes_used bigint not null default 0;

comment on column public.organizer_profiles.media_bytes_used is
  'Bytes used by public display images (banner, gallery, logos, speaker/competition photos) in Supabase media buckets.';
