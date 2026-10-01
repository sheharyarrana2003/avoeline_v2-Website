-- Real columns for fields the app filters on through the adminDb façade.
-- Until now these only existed inside `extra`, so `.where(...)` on them failed with 42703.

alter table public.reviews add column if not exists booking_id text;
alter table public.reviews add column if not exists event_id text;
update public.reviews
  set booking_id = coalesce(booking_id, nullif(extra->>'bookingId', '')),
      event_id   = coalesce(event_id, nullif(extra->>'eventId', ''))
  where extra is not null;
create index if not exists reviews_booking_id_idx on public.reviews (booking_id);
create index if not exists reviews_target_idx on public.reviews (target_type, target_id);

alter table public.hackathon_teams add column if not exists member_registration_ids text[] default '{}';
update public.hackathon_teams
  set member_registration_ids = array(select jsonb_array_elements_text(extra->'memberRegistrationIds'))
  where extra ? 'memberRegistrationIds' and jsonb_typeof(extra->'memberRegistrationIds') = 'array';
create index if not exists hackathon_teams_member_registration_ids_idx
  on public.hackathon_teams using gin (member_registration_ids);

alter table public.hackathon_sandboxes add column if not exists team_id text;
alter table public.hackathon_sandboxes add column if not exists event_id text;
update public.hackathon_sandboxes
  set team_id  = coalesce(team_id, nullif(extra->>'teamId', '')),
      event_id = coalesce(event_id, nullif(extra->>'eventId', ''))
  where extra is not null;
create index if not exists hackathon_sandboxes_team_id_idx on public.hackathon_sandboxes (team_id);
create index if not exists hackathon_sandboxes_event_id_idx on public.hackathon_sandboxes (event_id);

alter table public.hackathon_attendance add column if not exists track_id text;
update public.hackathon_attendance
  set track_id = coalesce(track_id, nullif(extra->>'trackId', ''))
  where extra is not null;
create index if not exists hackathon_attendance_track_id_idx on public.hackathon_attendance (track_id);

update public.hackathon_phases
  set track_id = coalesce(track_id, nullif(extra->>'trackId', '')::uuid)
  where track_id is null and extra ? 'trackId'
    and (extra->>'trackId') ~* '^[0-9a-f-]{36}$';
