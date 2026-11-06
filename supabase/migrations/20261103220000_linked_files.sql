-- Connections C4: linked_files (Drive metadata only; never file contents)

create table if not exists public.linked_files (
  id uuid primary key default gen_random_uuid(),
  owner_type text not null
    check (owner_type in ('user', 'org')),
  owner_id uuid not null,
  connection_id uuid not null
    references public.integration_connections(id) on delete cascade,
  provider_file_id text not null,
  mime_type text not null,
  title text not null,
  web_url text,
  icon_url text,
  entity_type text not null
    check (entity_type in ('event', 'team', 'club', 'booking')),
  entity_id text not null,
  added_by uuid,
  added_at timestamptz not null default now(),
  last_checked_at timestamptz,
  status text not null default 'ok'
    check (status in ('ok', 'missing', 'no_access')),
  unique (connection_id, provider_file_id, entity_type, entity_id)
);

create index if not exists linked_files_owner_idx
  on public.linked_files (owner_type, owner_id);
create index if not exists linked_files_entity_idx
  on public.linked_files (entity_type, entity_id);
create index if not exists linked_files_connection_idx
  on public.linked_files (connection_id);
create index if not exists linked_files_status_checked_idx
  on public.linked_files (status, last_checked_at);

alter table public.linked_files enable row level security;
revoke all on table public.linked_files from anon, authenticated;
grant all on table public.linked_files to service_role;
