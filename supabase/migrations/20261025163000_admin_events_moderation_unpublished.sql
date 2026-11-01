-- Admin event moderation: reversible unpublish flag + report decision metadata
alter table public.events
  add column if not exists moderation_unpublished boolean not null default false;

comment on column public.events.moderation_unpublished is
  'True when a platform admin unpublished the event; reversible via restore. Typically paired with status=draft.';

alter table public.event_reports
  add column if not exists decided_by uuid references public.users(id) on delete set null,
  add column if not exists admin_note text;

create index if not exists events_moderation_unpublished_idx
  on public.events (moderation_unpublished)
  where moderation_unpublished = true;

create index if not exists events_admin_list_idx
  on public.events (created_at desc, id desc);

create index if not exists events_status_visibility_start_idx
  on public.events (status, visibility, start_date);

create index if not exists event_reports_event_status_idx
  on public.event_reports (event_id, status);

create index if not exists event_reports_open_created_idx
  on public.event_reports (created_at desc)
  where status = 'open';

create index if not exists moderation_logs_created_idx
  on public.moderation_logs (created_at desc, id desc);

create index if not exists moderation_logs_target_idx
  on public.moderation_logs (target_id, created_at desc);
