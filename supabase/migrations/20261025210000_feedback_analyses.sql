-- Cached Gemini (or fallback) feedback analyses for organizers.
-- Service role writes; organizers may read their own rows.

create table if not exists public.feedback_analyses (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.users(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  scope_key text not null default 'all',
  input_hash text not null,
  result jsonb not null default '{}'::jsonb,
  model text,
  source text not null default 'gemini' check (source in ('gemini', 'fallback')),
  response_count int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists feedback_analyses_organizer_created_idx
  on public.feedback_analyses (organizer_id, created_at desc);

create index if not exists feedback_analyses_lookup_idx
  on public.feedback_analyses (organizer_id, scope_key, input_hash);

comment on table public.feedback_analyses is
  'Cached attendee feedback analysis (Gemini JSON or local fallback). Service-role writes.';

alter table public.feedback_analyses enable row level security;

drop policy if exists feedback_analyses_select_own on public.feedback_analyses;
create policy feedback_analyses_select_own
  on public.feedback_analyses
  for select
  to authenticated
  using (
    organizer_id = (select auth.uid())
    or public.is_platform_admin()
  );

-- No insert/update/delete policies for authenticated — service role only.

grant select on public.feedback_analyses to authenticated;
grant all on public.feedback_analyses to service_role;

-- Ticket feedback may arrive without an auth user on the registration.
alter table public.reviews
  alter column reviewer_id drop not null;

alter table public.reviews
  add column if not exists registration_id uuid references public.registrations(id) on delete set null;

create unique index if not exists reviews_one_per_registration
  on public.reviews (registration_id)
  where registration_id is not null;
