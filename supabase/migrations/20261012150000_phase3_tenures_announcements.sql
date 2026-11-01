-- Phase 3: tenure constraints, events.tenure_id, start_org_tenure RPC,
-- announcement audience/channels + announcement_deliveries.

create extension if not exists btree_gist with schema extensions;

-- Demo overlap cleanup before exclusion constraint.
delete from public.org_tenures
where id = '0dea8868-e13f-4b4d-b6fb-c2885299032a';

-- One current tenure per club/org.
create unique index if not exists org_tenures_one_current_per_org
  on public.org_tenures (org_id)
  where is_current is true;

-- No overlapping date ranges per org.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'org_tenures_no_overlap'
  ) then
    alter table public.org_tenures
      add constraint org_tenures_no_overlap
      exclude using gist (
        org_id with =,
        daterange(start_date, end_date, '[]') with &&
      );
  end if;
end $$;

alter table public.events
  add column if not exists tenure_id uuid references public.org_tenures(id) on delete set null;

create index if not exists events_tenure_id_idx on public.events (tenure_id);
create index if not exists teams_tenure_id_idx on public.teams (tenure_id);

-- ---------------------------------------------------------------------------
-- start_org_tenure: close current, create new, optionally copy committee
-- ---------------------------------------------------------------------------
create or replace function public.start_org_tenure(
  p_club_id uuid,
  p_label text,
  p_start date,
  p_end date,
  p_copy_roster boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_id uuid;
  v_old_team record;
  v_new_team_id uuid;
  v_pos_map jsonb := '{}'::jsonb;
  v_old_pos record;
  v_new_pos_id uuid;
  v_mem record;
begin
  if p_club_id is null or coalesce(trim(p_label), '') = '' then
    raise exception 'club and label are required';
  end if;
  if p_start is null or p_end is null or p_end < p_start then
    raise exception 'invalid tenure dates';
  end if;
  if not exists (
    select 1 from public.organizations o
    where o.id = p_club_id and o.org_type = 'club'
  ) then
    raise exception 'not a club';
  end if;

  update public.org_tenures
  set is_current = false,
      end_date = least(end_date, greatest(start_date, p_start - 1))
  where org_id = p_club_id
    and is_current is true;

  insert into public.org_tenures (org_id, label, start_date, end_date, is_current)
  values (p_club_id, trim(p_label), p_start, p_end, true)
  returning id into v_new_id;

  if p_copy_roster then
    for v_old_team in
      select t.*
      from public.teams t
      join public.org_tenures ot on ot.id = t.tenure_id
      where t.org_id = p_club_id
        and t.context_type = 'club_committee'
        and ot.is_current is false
      order by t.created_at desc nulls last
      limit 1
    loop
      insert into public.teams (
        context_type, org_id, organizer_id, name, created_by, tenure_id, extra
      )
      values (
        'club_committee',
        v_old_team.org_id,
        v_old_team.organizer_id,
        coalesce(v_old_team.name, 'Committee') || ' (draft)',
        v_old_team.created_by,
        v_new_id,
        coalesce(v_old_team.extra, '{}'::jsonb) || jsonb_build_object('draft_copy', true)
      )
      returning id into v_new_team_id;

      for v_old_pos in
        select * from public.team_positions where team_id = v_old_team.id
      loop
        insert into public.team_positions (team_id, title, permissions, extra)
        values (v_new_team_id, v_old_pos.title, v_old_pos.permissions, v_old_pos.extra)
        returning id into v_new_pos_id;
        v_pos_map := v_pos_map || jsonb_build_object(v_old_pos.id::text, v_new_pos_id::text);
      end loop;

      for v_mem in
        select * from public.team_members where team_id = v_old_team.id
      loop
        insert into public.team_members (
          team_id, user_id, role, position_id, display_name, email, phone, extra
        )
        values (
          v_new_team_id,
          v_mem.user_id,
          v_mem.role,
          case
            when v_mem.position_id is null then null
            else (v_pos_map ->> v_mem.position_id::text)::uuid
          end,
          v_mem.display_name,
          v_mem.email,
          v_mem.phone,
          v_mem.extra
        );
      end loop;
    end loop;

    -- Also copy committee teams that have no tenure_id (legacy).
    if v_new_team_id is null then
      for v_old_team in
        select t.*
        from public.teams t
        where t.org_id = p_club_id
          and t.context_type = 'club_committee'
          and t.tenure_id is null
        order by t.created_at desc nulls last
        limit 1
      loop
        insert into public.teams (
          context_type, org_id, organizer_id, name, created_by, tenure_id, extra
        )
        values (
          'club_committee',
          v_old_team.org_id,
          v_old_team.organizer_id,
          coalesce(v_old_team.name, 'Committee') || ' (draft)',
          v_old_team.created_by,
          v_new_id,
          coalesce(v_old_team.extra, '{}'::jsonb) || jsonb_build_object('draft_copy', true)
        )
        returning id into v_new_team_id;

        for v_old_pos in
          select * from public.team_positions where team_id = v_old_team.id
        loop
          insert into public.team_positions (team_id, title, permissions, extra)
          values (v_new_team_id, v_old_pos.title, v_old_pos.permissions, v_old_pos.extra)
          returning id into v_new_pos_id;
          v_pos_map := v_pos_map || jsonb_build_object(v_old_pos.id::text, v_new_pos_id::text);
        end loop;

        for v_mem in
          select * from public.team_members where team_id = v_old_team.id
        loop
          insert into public.team_members (
            team_id, user_id, role, position_id, display_name, email, phone, extra
          )
          values (
            v_new_team_id,
            v_mem.user_id,
            v_mem.role,
            case
              when v_mem.position_id is null then null
              else (v_pos_map ->> v_mem.position_id::text)::uuid
            end,
            v_mem.display_name,
            v_mem.email,
            v_mem.phone,
            v_mem.extra
          );
        end loop;
      end loop;
    end if;
  end if;

  return v_new_id;
end;
$$;

revoke all on function public.start_org_tenure(uuid, text, date, date, boolean) from public, anon, authenticated;
grant execute on function public.start_org_tenure(uuid, text, date, date, boolean) to service_role;

-- ---------------------------------------------------------------------------
-- Announcements: parent send metadata
-- ---------------------------------------------------------------------------
alter table public.org_announcements
  alter column org_id drop not null;

alter table public.org_announcements
  add column if not exists department_id uuid references public.organizations(id) on delete cascade,
  add column if not exists audience text
    check (audience in ('all_clubs', 'selected_clubs', 'presidents_only', 'all_members')),
  add column if not exists channels text[] not null default array['in_app']::text[],
  add column if not exists club_ids uuid[] not null default '{}'::uuid[];

create index if not exists org_announcements_department_id_idx
  on public.org_announcements (department_id);

create table if not exists public.announcement_deliveries (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.org_announcements(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  email text not null default '',
  display_name text not null default '',
  channel text not null check (channel in ('in_app', 'email')),
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed', 'skipped')),
  error text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists announcement_deliveries_announcement_id_idx
  on public.announcement_deliveries (announcement_id, created_at desc);
create index if not exists announcement_deliveries_user_id_idx
  on public.announcement_deliveries (user_id);

alter table public.announcement_deliveries enable row level security;
revoke all on table public.announcement_deliveries from anon, authenticated;
grant all on table public.announcement_deliveries to service_role;
