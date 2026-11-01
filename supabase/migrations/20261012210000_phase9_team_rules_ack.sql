-- Rules ack belongs on the team (participant), not the track.
alter table public.hackathon_teams
  add column if not exists rules_acknowledged_at timestamptz;

-- Drop mistaken track column if present (safe: no app writes to tracks for ack).
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'hackathon_tracks'
      and column_name = 'rules_acknowledged_at'
  ) then
    alter table public.hackathon_tracks drop column rules_acknowledged_at;
  end if;
end $$;
