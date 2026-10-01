-- Owner CRUD delete: wipe tenant-owned rows, then the public.users row.
-- Auth.users is deleted from the app via the Admin API after this returns.
-- SECURITY INVOKER so only the service role (which bypasses RLS) can run it.
-- Not granted to anon/authenticated.

create or replace function public.admin_purge_event(target uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if target is null then
    return;
  end if;

  update events set parent_event_id = null where parent_event_id = target;
  update event_agenda_items set linked_child_event_id = null where linked_child_event_id = target;
  update badge_meetups set linked_event_id = null where linked_event_id = target;

  delete from event_reports where event_id = target;
  delete from bookings where event_id = target;
  delete from certificates where event_id = target;
  delete from certificate_templates where event_id = target;

  delete from events where id = target;
end;
$$;

create or replace function public.admin_purge_user(target uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  ev uuid;
begin
  if target is null then
    raise exception 'missing user';
  end if;
  if exists (select 1 from users where id = target and coalesce(is_owner, false)) then
    raise exception 'cannot delete a platform owner';
  end if;

  for ev in select id from events where organizer_id = target loop
    perform public.admin_purge_event(ev);
  end loop;

  update organizations set owner_user_id = null where owner_user_id = target;
  update custom_pricing_agreements set set_by = null where set_by = target;
  update feature_overrides set granted_by = null where granted_by = target;
  update org_module_access set granted_by = null where granted_by = target;
  update org_requests set requested_by = null where requested_by = target;
  update org_requests set reviewed_by = null where reviewed_by = target;
  update org_announcements set created_by = null where created_by = target;
  update pending_invites set invited_by = null where invited_by = target;
  update plan_changes set changed_by = null where changed_by = target;
  update registrations set checked_in_by = null where checked_in_by = target;
  update teams set created_by = null where created_by = target;
  update moderation_logs set admin_id = null where admin_id = target;

  delete from badge_meetup_attendees where user_id = target;
  delete from bookings where organizer_id = target or vendor_id = target;
  delete from category_requests where requested_by = target;
  delete from certificate_templates where organizer_id = target;
  delete from certificates where organizer_id = target or user_id = target;
  delete from event_sponsors_partners where user_id = target;
  delete from hackathon_attendance where user_id = target;
  delete from hackathon_flag_submissions where user_id = target;
  delete from hackathon_team_members where user_id = target;
  delete from hackathon_tracks where organizer_id = target;
  delete from payments where payer_id = target or receiver_id = target;
  delete from registrations where user_id = target;
  delete from reviews where reviewer_id = target;
  delete from solo_participants where user_id = target;
  delete from support_tickets where from_user_id = target;
  delete from team_members where user_id = target;
  delete from notifications where user_id = target;

  delete from users where id = target;
end;
$$;

create or replace function public.admin_purge_org(target uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  child uuid;
  lead uuid;
  leads uuid[] := '{}';
begin
  if target is null then
    raise exception 'missing organization';
  end if;

  for child in select id from organizations where parent_org_id = target loop
    perform public.admin_purge_org(child);
  end loop;

  select array_agg(distinct uid)
    into leads
  from (
    select owner_user_id as uid from organizations where id = target and owner_user_id is not null
    union
    select user_id from org_memberships
      where org_id = target and role in ('department_admin', 'president')
  ) owners;

  update events set org_id = null where org_id = target;
  update organizer_profiles set org_id = null where org_id = target;
  update vendor_profiles set org_id = null where org_id = target;
  update pending_invites set parent_org_id = null where parent_org_id = target;

  delete from organizations where id = target;

  if leads is not null then
    foreach lead in array leads loop
      if lead is null then
        continue;
      end if;
      if exists (
        select 1 from users
        where id = lead and coalesce(is_owner, false) = false
          and coalesce(user_type, '') <> 'platform_admin'
      ) then
        perform public.admin_purge_user(lead);
      end if;
    end loop;
  end if;
end;
$$;

revoke all on function public.admin_purge_event(uuid) from public, anon, authenticated;
revoke all on function public.admin_purge_user(uuid) from public, anon, authenticated;
revoke all on function public.admin_purge_org(uuid) from public, anon, authenticated;
grant execute on function public.admin_purge_event(uuid) to service_role;
grant execute on function public.admin_purge_user(uuid) to service_role;
grant execute on function public.admin_purge_org(uuid) to service_role;
