-- Keep admin_purge_user working after Step 7 scream renames.
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

  if to_regclass('public.zz_unused_badge_meetup_attendees') is not null then
    execute 'delete from zz_unused_badge_meetup_attendees where user_id = $1' using target;
  elsif to_regclass('public.badge_meetup_attendees') is not null then
    execute 'delete from badge_meetup_attendees where user_id = $1' using target;
  end if;

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

  if to_regclass('public.zz_unused_solo_participants') is not null then
    execute 'delete from zz_unused_solo_participants where user_id = $1' using target;
  elsif to_regclass('public.solo_participants') is not null then
    execute 'delete from solo_participants where user_id = $1' using target;
  end if;

  delete from support_tickets where from_user_id = target;
  delete from team_members where user_id = target;
  delete from notifications where user_id = target::text;

  delete from users where id = target;
end;
$$;
