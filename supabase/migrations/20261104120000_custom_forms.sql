-- Organizer reusable Custom Forms library (surveys / feedback / checklists).
-- Writes go through supabaseAdmin (service_role); public submit uses server actions.

create table if not exists public.custom_forms (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.users (id) on delete cascade,
  title text not null,
  description text not null default '',
  fields jsonb not null default '[]'::jsonb,
  public_token text not null,
  status text not null default 'draft'
    check (status in ('draft', 'open', 'closed')),
  kind text not null default 'other'
    check (kind in ('survey', 'feedback', 'checklist', 'other')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint custom_forms_public_token_key unique (public_token)
);

create index if not exists custom_forms_owner_idx
  on public.custom_forms (owner_user_id, updated_at desc);
create index if not exists custom_forms_status_idx
  on public.custom_forms (owner_user_id, status);

create table if not exists public.custom_form_responses (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.custom_forms (id) on delete cascade,
  respondent_name text,
  respondent_email text,
  answers jsonb not null default '{}'::jsonb,
  meta jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now()
);

create index if not exists custom_form_responses_form_idx
  on public.custom_form_responses (form_id, submitted_at desc);

alter table public.custom_forms enable row level security;
alter table public.custom_form_responses enable row level security;

revoke all on table public.custom_forms from anon, authenticated;
revoke all on table public.custom_form_responses from anon, authenticated;
grant all on table public.custom_forms to service_role;
grant all on table public.custom_form_responses to service_role;
