-- Queryable access-code hash for hackathon participant login (plaintext lives in extra only when revealed).

alter table public.registrations
  add column if not exists hackathon_access_code_hash text;

create unique index if not exists registrations_hackathon_access_code_hash_uidx
  on public.registrations (hackathon_access_code_hash)
  where hackathon_access_code_hash is not null;

alter table public.hackathon_task_completions
  add column if not exists extra jsonb not null default '{}'::jsonb;
