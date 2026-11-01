-- Organizer-owned staff rosters, assigned onto events (no join-code workflow).
alter table public.teams add column if not exists organizer_id uuid references public.users(id);

update public.teams t
set organizer_id = e.organizer_id
from public.events e
where t.event_id = e.id
  and t.organizer_id is null;

update public.teams
set organizer_id = created_by
where organizer_id is null
  and created_by is not null;

create table if not exists public.event_staff_assignments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  member_ids uuid[] not null default '{}',
  unique (event_id, team_id)
);

create index if not exists event_staff_assignments_event_idx on public.event_staff_assignments (event_id);
create index if not exists event_staff_assignments_team_idx on public.event_staff_assignments (team_id);

alter table public.event_staff_assignments enable row level security;

insert into public.event_staff_assignments (event_id, team_id)
select event_id, id
from public.teams
where context_type = 'event_staff'
  and event_id is not null
on conflict (event_id, team_id) do nothing;

create or replace function public.user_is_event_staff(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_members m
    join public.teams t on t.id = m.team_id
    left join public.event_staff_assignments a
      on a.team_id = t.id and a.event_id = p_event_id
    where m.user_id = auth.uid()
      and t.context_type = 'event_staff'
      and (
        t.event_id = p_event_id
        or a.event_id = p_event_id
      )
      and (
        a.member_ids is null
        or cardinality(a.member_ids) = 0
        or m.id = any (a.member_ids)
      )
  );
$$;
