-- Club request files + roster details (name, member id, email, phone, designation).
alter table public.org_requests
  add column if not exists attachment_url text,
  add column if not exists attachment_name text,
  add column if not exists attachment_path text;

create table if not exists public.club_roster (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  full_name text not null,
  email text,
  phone text,
  member_code text,
  designation text,
  is_lead boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists club_roster_team_id_idx on public.club_roster (team_id);
create index if not exists club_roster_user_id_idx on public.club_roster (user_id);

alter table public.club_roster enable row level security;

drop policy if exists club_roster_read on public.club_roster;
create policy club_roster_read on public.club_roster
  for select to authenticated
  using (
    public.is_platform_admin()
    or exists (
      select 1
      from public.teams t
      where t.id = club_roster.team_id
        and t.org_id is not null
        and t.org_id in (select public.user_org_ids())
    )
  );

grant select on public.club_roster to authenticated;
