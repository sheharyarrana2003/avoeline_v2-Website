-- Allow authenticated users to read their own organizer_profiles row
-- (needed for proxy/layout review_status gates). Admins keep full access via is_platform_admin().

create policy organizer_profiles_read_own
  on public.organizer_profiles
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_platform_admin()
  );
