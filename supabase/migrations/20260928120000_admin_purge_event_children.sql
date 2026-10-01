-- Expand event purge: child events first, then non-cascade rows, then the event.
-- Remaining child tables cascade from events. Service role only (invoker + revoke).

create or replace function public.admin_purge_event(target uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  child uuid;
begin
  if target is null then
    return;
  end if;

  for child in select id from events where parent_event_id = target loop
    perform public.admin_purge_event(child);
  end loop;

  update events set parent_event_id = null where parent_event_id = target;
  update event_agenda_items set linked_child_event_id = null where linked_child_event_id = target;
  update badge_meetups set linked_event_id = null where linked_event_id = target;

  delete from event_reports where event_id = target;
  delete from bookings where event_id = target;
  delete from certificates where event_id = target;
  delete from certificate_templates where event_id = target;
  delete from payments where reference_id = target;
  delete from reviews where target_type = 'event' and target_id = target;

  delete from events where id = target;
end;
$$;

revoke all on function public.admin_purge_event(uuid) from public, anon, authenticated;
grant execute on function public.admin_purge_event(uuid) to service_role;
