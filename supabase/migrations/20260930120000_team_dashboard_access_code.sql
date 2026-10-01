-- One dashboard access code per hackathon team (hash queryable; plaintext in extra).

alter table public.hackathon_teams
  add column if not exists access_code_hash text;

create unique index if not exists hackathon_teams_access_code_hash_uidx
  on public.hackathon_teams (access_code_hash)
  where access_code_hash is not null;
