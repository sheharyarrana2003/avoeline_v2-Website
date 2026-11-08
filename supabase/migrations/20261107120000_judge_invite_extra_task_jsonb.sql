-- Judge invite status lives in hackathon_judges.extra (inviteStatus, inviteRespondedAt).
-- Per-task organizer brief / attachment refs live in hackathon_tasks.extra.

alter table public.hackathon_judges
  add column if not exists extra jsonb not null default '{}'::jsonb;

alter table public.hackathon_tasks
  add column if not exists extra jsonb not null default '{}'::jsonb;
