-- Organizer Teams rebuild (Phase 1 naming-shell):
-- indexes, access_grants invite columns, applicants.withdrawn, stats RPC.

-- ---------------------------------------------------------------------------
-- team_members: unique email per team (when email present)
-- ---------------------------------------------------------------------------
with ranked as (
  select
    id,
    row_number() over (
      partition by team_id, lower(btrim(email))
      order by joined_at nulls last, id
    ) as rn
  from public.team_members
  where email is not null and btrim(email) <> ''
)
delete from public.team_members m
using ranked r
where m.id = r.id and r.rn > 1;

create unique index if not exists team_members_team_lower_email_uidx
  on public.team_members (team_id, lower(btrim(email)))
  where email is not null and btrim(email) <> '';

-- ---------------------------------------------------------------------------
-- applicants: form_id + status index; allow withdrawn
-- ---------------------------------------------------------------------------
create index if not exists applicants_form_id_status_idx
  on public.applicants (form_id, status);

alter table public.applicants
  drop constraint if exists applicants_status_check;

alter table public.applicants
  add constraint applicants_status_check
  check (
    status = any (
      array[
        'applied'::text,
        'shortlisted'::text,
        'interview_scheduled'::text,
        'accepted'::text,
        'rejected'::text,
        'withdrawn'::text
      ]
    )
  );

-- ---------------------------------------------------------------------------
-- access_grants: invite token hash + sent timestamp; ensure indexes
-- ---------------------------------------------------------------------------
alter table public.access_grants
  add column if not exists invite_token_hash text;

alter table public.access_grants
  add column if not exists invite_sent_at timestamptz;

create index if not exists access_grants_grantee_idx
  on public.access_grants (grantee_user_id);

create index if not exists access_grants_active_idx
  on public.access_grants (grantee_user_id, scope_type, scope_id)
  where revoked_at is null;

create index if not exists access_grants_invite_pending_idx
  on public.access_grants (invite_sent_at)
  where invite_token_hash is not null and revoked_at is null;

-- ---------------------------------------------------------------------------
-- organizer_teams_stats — service_role only (page uses supabaseAdmin)
-- ---------------------------------------------------------------------------
create or replace function public.organizer_teams_stats(p_organizer_id uuid)
returns table (
  teams_count bigint,
  members_count bigint,
  leads_with_access bigint,
  open_forms bigint,
  new_applicants_7d bigint,
  in_interview bigint,
  pending_invites bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with org_teams as (
    select distinct t.id
    from public.teams t
    where t.context_type = 'event_staff'
      and (
        t.organizer_id = p_organizer_id
        or t.created_by = p_organizer_id
        or t.event_id in (
          select e.id from public.events e where e.organizer_id = p_organizer_id
        )
      )
  ),
  org_event_ids as (
    select e.id from public.events e where e.organizer_id = p_organizer_id
  ),
  org_grants as (
    select g.*
    from public.access_grants g
    where g.revoked_at is null
      and (
        (g.scope_type = 'organizer' and g.scope_id = p_organizer_id)
        or (g.scope_type = 'event' and g.scope_id in (select id from org_event_ids))
      )
  )
  select
    (select count(*)::bigint from org_teams) as teams_count,
    (
      select count(*)::bigint
      from public.team_members m
      where m.team_id in (select id from org_teams)
    ) as members_count,
    (
      select count(distinct m.user_id)::bigint
      from public.team_members m
      where m.team_id in (select id from org_teams)
        and m.role = 'lead'
        and m.user_id is not null
        and exists (
          select 1
          from org_grants g
          where g.grantee_user_id = m.user_id
            and (g.expires_at is null or g.expires_at > now())
        )
    ) as leads_with_access,
    (
      select count(*)::bigint
      from public.recruitment_forms f
      where f.team_id in (select id from org_teams)
        and coalesce(f.is_open, true) = true
    ) as open_forms,
    (
      select count(*)::bigint
      from public.applicants a
      where a.team_id in (select id from org_teams)
        and a.applied_at >= (now() - interval '7 days')
    ) as new_applicants_7d,
    (
      select count(*)::bigint
      from public.applicants a
      where a.team_id in (select id from org_teams)
        and a.status = 'interview_scheduled'
    ) as in_interview,
    (
      select count(*)::bigint
      from org_grants g
      where g.invite_token_hash is not null
         or g.invite_sent_at is not null
    ) as pending_invites;
$$;

revoke all on function public.organizer_teams_stats(uuid) from public;
revoke all on function public.organizer_teams_stats(uuid) from anon, authenticated;
grant execute on function public.organizer_teams_stats(uuid) to service_role;
