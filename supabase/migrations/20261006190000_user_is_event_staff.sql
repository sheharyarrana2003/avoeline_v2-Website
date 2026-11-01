-- Authenticated staff can open /organizer/{owner}/events/{id} without the service role in middleware.
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
    where m.user_id = auth.uid()
      and t.event_id = p_event_id
      and t.context_type = 'event_staff'
  );
$$;

revoke all on function public.user_is_event_staff(uuid) from public;
grant execute on function public.user_is_event_staff(uuid) to authenticated;
