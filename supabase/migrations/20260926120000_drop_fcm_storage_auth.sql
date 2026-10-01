-- Remove leftover FCM table; lock down Storage; create Auth → public.users trigger.
-- Server Actions still upload with the service role (bypasses Storage RLS).
-- Public buckets only need SELECT so Next/Image and <img> public URLs work.

drop table if exists public.fcm_tokens cascade;

insert into storage.buckets (id, name, public)
values
  ('media', 'media', true),
  ('certificates', 'certificates', false),
  ('payment-screenshots', 'payment-screenshots', false)
on conflict (id) do update set public = excluded.public;

drop policy if exists "media_public_read" on storage.objects;
drop policy if exists "payment_screenshots_public_read" on storage.objects;
drop policy if exists "media_select" on storage.objects;
drop policy if exists "certificates_no_anon" on storage.objects;

create policy media_public_read
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'media');

-- certificates + payment-screenshots stay private (signed URLs / service role).

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users u
    where u.id = (select auth.uid())
      and (u.user_type = 'platform_admin' or u.is_owner = true)
  );
$$;

create or replace function public.user_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from public.org_memberships where user_id = (select auth.uid());
$$;

drop policy if exists users_self_update on public.users;
create policy users_self_update
  on public.users
  for update
  to authenticated
  using ((select auth.uid()) = id or public.is_platform_admin())
  with check (
    public.is_platform_admin()
    or (
      (select auth.uid()) = id
      and user_type is distinct from 'platform_admin'
      and coalesce(is_owner, false) = false
    )
  );

create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;

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
  if chosen_type not in ('attendee', 'organizer', 'vendor') then
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

revoke all on function private.handle_new_user() from public;
revoke all on function private.handle_new_user() from anon;
revoke all on function private.handle_new_user() from authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();
