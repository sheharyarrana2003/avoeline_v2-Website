-- Organizer-authored registration emails per event.
create table if not exists public.event_email_templates (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  kind text not null check (kind in ('registration_received', 'registration_confirmed', 'custom')),
  subject text not null default '',
  body text not null default '',
  include_blocks text[] not null default '{}',
  extra jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists event_email_templates_event_id_idx
  on public.event_email_templates (event_id);

create unique index if not exists event_email_templates_event_kind_uidx
  on public.event_email_templates (event_id, kind)
  where kind <> 'custom';

alter table public.event_email_templates enable row level security;

alter table public.hackathon_teams
  add column if not exists access_code_hash text;
