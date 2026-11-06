-- Connections C3: calendar_links + agenda add_to_calendar flag

create table if not exists public.calendar_links (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null
    references public.integration_connections(id) on delete cascade,
  entity_type text not null
    check (entity_type in (
      'interview', 'mentor_slot', 'judging_session',
      'hackathon_session', 'agenda_item', 'event'
    )),
  entity_id text not null,
  google_calendar_id text not null,
  google_event_id text,
  meet_url text,
  request_id text not null,
  etag text,
  status text not null default 'pending'
    check (status in ('pending', 'synced', 'deleted', 'error')),
  last_error text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  unique (connection_id, entity_type, entity_id)
);

create index if not exists calendar_links_connection_idx
  on public.calendar_links (connection_id);
create index if not exists calendar_links_entity_idx
  on public.calendar_links (entity_type, entity_id);

alter table public.calendar_links enable row level security;
revoke all on table public.calendar_links from anon, authenticated;
grant all on table public.calendar_links to service_role;

alter table public.event_agenda_items
  add column if not exists add_to_calendar boolean not null default false;
