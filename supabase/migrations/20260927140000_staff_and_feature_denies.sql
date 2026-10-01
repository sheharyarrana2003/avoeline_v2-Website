-- Staff sign-up: handle_new_user may persist platform_admin (not remapped to attendee).
-- Tenant feature control: feature_overrides.denied turns a module off for one organizer/org.

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  chosen_type text;
begin
  chosen_type := lower(coalesce(new.raw_user_meta_data->>'user_type', 'attendee'));
  if chosen_type not in ('attendee', 'organizer', 'vendor', 'platform_admin') then
    chosen_type := 'attendee';
  end if;

  insert into public.users (
    id, email, full_name, user_type, account_status, created_at, updated_at
  ) values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    chosen_type,
    'active',
    now(),
    now()
  )
  on conflict (id) do nothing;

  if chosen_type = 'attendee' then
    insert into public.attendee_profiles (user_id) values (new.id)
    on conflict (user_id) do nothing;
  elsif chosen_type = 'organizer' then
    insert into public.organizer_profiles (user_id, org_name)
    values (new.id, coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), new.email))
    on conflict (user_id) do nothing;
  elsif chosen_type = 'vendor' then
    insert into public.vendor_profiles (user_id, business_name, business_email)
    values (
      new.id,
      coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), new.email),
      new.email
    )
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

alter table public.feature_overrides
  add column if not exists denied boolean not null default false;
