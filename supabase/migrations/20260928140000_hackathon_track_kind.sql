-- Competition kind + pasteable rules on each hackathon track.

alter table public.hackathon_tracks
  add column if not exists kind text not null default 'other',
  add column if not exists rules_text text;

alter table public.hackathon_tracks
  drop constraint if exists hackathon_tracks_kind_check;

alter table public.hackathon_tracks
  add constraint hackathon_tracks_kind_check
  check (kind in ('ctf', 'business', 'web_dev', 'design', 'data', 'other'));

update public.hackathon_tracks t
set kind = 'ctf'
where coalesce(t.kind, 'other') in ('other', '')
  and exists (
    select 1 from public.hackathon_tasks h
    where h.track_id = t.id and coalesce(h.flag_hash, '') <> ''
  );
