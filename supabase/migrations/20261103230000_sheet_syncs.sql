-- Connections C5: one-way Google Sheets sync for event attendees (app-created sheets only)

create table if not exists public.sheet_syncs (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null
    references public.integration_connections(id) on delete cascade,
  event_id uuid not null
    references public.events(id) on delete cascade,
  kind text not null
    check (kind in ('attendees', 'checkin', 'hackathon_teams')),
  spreadsheet_id text not null,
  sheet_title text not null default 'Sheet1',
  linked_file_id uuid
    references public.linked_files(id) on delete set null,
  keep_in_sync boolean not null default false,
  status text not null default 'active'
    check (status in ('active', 'paused', 'error')),
  last_error text,
  last_synced_at timestamptz,
  row_fingerprint text,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (connection_id, event_id, kind)
);

create index if not exists sheet_syncs_event_idx on public.sheet_syncs (event_id);
create index if not exists sheet_syncs_keep_idx
  on public.sheet_syncs (keep_in_sync, status)
  where keep_in_sync = true;

alter table public.sheet_syncs enable row level security;
revoke all on table public.sheet_syncs from anon, authenticated;
grant all on table public.sheet_syncs to service_role;
