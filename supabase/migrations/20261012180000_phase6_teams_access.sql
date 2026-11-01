-- Phase 6: access_grants, recruitment public tokens, uniques, member source,
-- remap legacy page_* permissions on team_positions.

-- ---------------------------------------------------------------------------
-- access_grants
-- ---------------------------------------------------------------------------
create table if not exists public.access_grants (
  id uuid primary key default gen_random_uuid(),
  grantee_user_id uuid not null references public.users(id) on delete cascade,
  scope_type text not null check (scope_type in ('organizer', 'org', 'event')),
  scope_id uuid not null,
  permissions text[] not null default '{}',
  granted_by uuid references public.users(id) on delete set null,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists access_grants_grantee_idx
  on public.access_grants (grantee_user_id);

create index if not exists access_grants_scope_idx
  on public.access_grants (scope_type, scope_id);

create index if not exists access_grants_active_idx
  on public.access_grants (grantee_user_id, scope_type, scope_id)
  where revoked_at is null;

alter table public.access_grants enable row level security;

-- Deny-by-default for Data API; app uses service role.
revoke all on public.access_grants from anon, authenticated;
grant all on public.access_grants to service_role;

-- ---------------------------------------------------------------------------
-- recruitment_forms.public_token
-- ---------------------------------------------------------------------------
alter table public.recruitment_forms
  add column if not exists public_token text;

update public.recruitment_forms
set public_token = encode(gen_random_bytes(24), 'hex')
where public_token is null or btrim(public_token) = '';

alter table public.recruitment_forms
  alter column public_token set not null;

create unique index if not exists recruitment_forms_public_token_uidx
  on public.recruitment_forms (public_token);

-- ---------------------------------------------------------------------------
-- team_members.source
-- ---------------------------------------------------------------------------
alter table public.team_members
  add column if not exists source text;

update public.team_members
set source = coalesce(nullif(btrim(source), ''), 'manual')
where source is null or btrim(source) = '';

alter table public.team_members
  alter column source set default 'manual';

alter table public.team_members
  alter column source set not null;

alter table public.team_members
  drop constraint if exists team_members_source_check;

alter table public.team_members
  add constraint team_members_source_check
  check (source in ('manual', 'recruited'));

-- ---------------------------------------------------------------------------
-- Deduplicate team_positions by (team_id, lower(title)); keep oldest
-- ---------------------------------------------------------------------------
update public.team_members m
set position_id = k.keeper_id
from public.team_positions old
join lateral (
  select (array_agg(p2.id order by p2.id))[1] as keeper_id
  from public.team_positions p2
  where p2.team_id = old.team_id
    and lower(btrim(p2.title)) = lower(btrim(old.title))
) k on true
where m.position_id = old.id
  and old.id <> k.keeper_id;

update public.recruitment_forms f
set position_id = k.keeper_id
from public.team_positions old
join lateral (
  select (array_agg(p2.id order by p2.id))[1] as keeper_id
  from public.team_positions p2
  where p2.team_id = old.team_id
    and lower(btrim(p2.title)) = lower(btrim(old.title))
) k on true
where f.position_id = old.id
  and old.id <> k.keeper_id;

update public.applicants a
set position_id = k.keeper_id
from public.team_positions old
join lateral (
  select (array_agg(p2.id order by p2.id))[1] as keeper_id
  from public.team_positions p2
  where p2.team_id = old.team_id
    and lower(btrim(p2.title)) = lower(btrim(old.title))
) k on true
where a.position_id = old.id
  and old.id <> k.keeper_id;

delete from public.team_positions old
using (
  select p.id, (array_agg(p2.id order by p2.id))[1] as keeper_id
  from public.team_positions p
  join public.team_positions p2
    on p2.team_id = p.team_id
   and lower(btrim(p2.title)) = lower(btrim(p.title))
  group by p.id
) d
where old.id = d.id
  and d.id <> d.keeper_id;

create unique index if not exists team_positions_team_lower_title_uidx
  on public.team_positions (team_id, lower(btrim(title)));

-- ---------------------------------------------------------------------------
-- Deduplicate applicants by (form_id, lower(email)); keep oldest
-- ---------------------------------------------------------------------------
with ranked as (
  select
    id,
    row_number() over (
      partition by form_id, lower(btrim(email))
      order by applied_at nulls last, id
    ) as rn
  from public.applicants
  where email is not null and btrim(email) <> ''
)
delete from public.applicants a
using ranked r
where a.id = r.id and r.rn > 1;

drop index if exists applicants_team_lower_email_uidx;

create unique index if not exists applicants_form_lower_email_uidx
  on public.applicants (form_id, lower(btrim(email)))
  where email is not null and btrim(email) <> '';

-- ---------------------------------------------------------------------------
-- Remap legacy page_* keys → Phase 6 catalog
-- ---------------------------------------------------------------------------
update public.team_positions
set permissions = (
  select coalesce(array_agg(distinct mapped), '{}')
  from unnest(coalesce(permissions, '{}')) as perm
  cross join lateral (
    select case
      when perm = 'page_attendees' then 'registrations:manage'
      when perm = 'page_access' then 'access:manage'
      when perm = 'page_expenses' then 'expenses:manage'
      when perm in (
        'page_competitions',
        'page_tasks',
        'page_teams',
        'page_submissions',
        'page_scoreboard',
        'page_settings'
      ) then 'hackathon:manage'
      else perm
    end as mapped
  ) m
);
