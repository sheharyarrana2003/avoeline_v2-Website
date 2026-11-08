-- O6: submission extras (multi-link, storedFileId) without breaking link_url / file_* columns
alter table public.hackathon_task_submissions
  add column if not exists extra jsonb not null default '{}'::jsonb;
