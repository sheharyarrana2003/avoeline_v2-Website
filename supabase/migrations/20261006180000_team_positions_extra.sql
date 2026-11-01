-- team_positions.extra holds trackIds for competition-scoped staff grants
alter table public.team_positions add column if not exists extra jsonb not null default '{}'::jsonb;
