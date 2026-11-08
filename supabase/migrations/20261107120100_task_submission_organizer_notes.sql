-- Optional notes from participant to organizers (non-CTF task work submissions).
alter table public.hackathon_task_submissions
  add column if not exists organizer_notes text;
