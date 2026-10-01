-- Regular group registration (not hackathon_teams).
create table if not exists public.registration_groups (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  group_name text not null,
  lead_registration_id uuid references public.registrations(id) on delete set null,
  payment_status text default 'pending',
  payment_proof_path text,
  extra jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists registration_groups_event_id_idx
  on public.registration_groups (event_id);

alter table public.registrations
  add column if not exists group_id uuid references public.registration_groups(id) on delete set null;

create index if not exists registrations_group_id_idx
  on public.registrations (group_id)
  where group_id is not null;

alter table public.promo_codes
  add column if not exists track_id uuid references public.hackathon_tracks(id) on delete set null;

create table if not exists public.event_agenda_speakers (
  agenda_item_id uuid not null references public.event_agenda_items(id) on delete cascade,
  speaker_id uuid not null references public.event_speakers(id) on delete cascade,
  primary key (agenda_item_id, speaker_id)
);

alter table public.registration_groups enable row level security;
alter table public.event_agenda_speakers enable row level security;
