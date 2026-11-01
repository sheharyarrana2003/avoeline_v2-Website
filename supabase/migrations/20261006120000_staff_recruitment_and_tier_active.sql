alter table public.applicants add column if not exists email text;
alter table public.applicants add column if not exists position_id uuid references public.team_positions(id) on delete set null;

create unique index if not exists applicants_team_lower_email_uidx
  on public.applicants (team_id, lower(email))
  where email is not null and btrim(email) <> '';

alter table public.recruitment_forms add column if not exists position_id uuid references public.team_positions(id) on delete cascade;

alter table public.ticket_tiers add column if not exists active boolean not null default true;
