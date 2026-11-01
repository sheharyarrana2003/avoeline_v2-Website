-- Phase 10 RLS isolation smoke (run as postgres / service role for setup,
-- then set role to anon / authenticated via set_config for JWT simulation).
-- Proves deny-default: anon cannot read tenant tables without policies.
-- Cross-tenant: two organizers' events are not mutually readable via JWT.

begin;

-- ---------------------------------------------------------------------------
-- Anon cannot select sensitive tables (deny-default / no policy)
-- ---------------------------------------------------------------------------
set local role anon;

do $$
declare
  tables text[] := array[
    'events',
    'registrations',
    'hackathon_teams',
    'hackathon_team_members',
    'hackathon_task_submissions',
    'hackathon_task_completions',
    'teams',
    'team_members',
    'support_tickets',
    'support_ticket_messages',
    'certificates',
    'event_expenses',
    'access_grants',
    'moderation_logs'
  ];
  t text;
  n bigint;
begin
  foreach t in array tables loop
    begin
      execute format('select count(*) from public.%I', t) into n;
      -- events may allow public published rows; others must be 0 or raise
      if t <> 'events' and n > 0 then
        raise exception 'anon saw rows on % (count=%)', t, n;
      end if;
    exception
      when insufficient_privilege then
        null; -- expected when grants revoked
    end;
  end loop;
end $$;

reset role;

-- ---------------------------------------------------------------------------
-- Deny-default tables must have RLS enabled
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'registrations','hackathon_teams','hackathon_task_submissions',
    'support_tickets','certificates','event_expenses','access_grants','teams'
  ]
  loop
    if not exists (
      select 1 from pg_tables
      where schemaname = 'public' and tablename = t and rowsecurity
    ) then
      raise exception 'RLS not enabled on %', t;
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- certificates: no open public SELECT policy
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'certificates'
      and cmd = 'SELECT'
      and coalesce(qual, '') in ('true', '(true)')
  ) then
    raise exception 'certificates still has open SELECT policy';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- notifications: no with_check = true INSERT for public
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'notifications'
      and cmd = 'INSERT'
      and coalesce(with_check, '') in ('true', '(true)')
  ) then
    raise exception 'notifications still has open INSERT policy';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Matview not grant-readable by anon (schema opt Step 6)
-- ---------------------------------------------------------------------------
do $$
begin
  if has_table_privilege('anon', 'public.mv_event_registration_counts', 'select') then
    raise exception 'anon can still SELECT mv_event_registration_counts';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Storage: private buckets must not have public SELECT policies
-- ---------------------------------------------------------------------------
do $$
declare
  private_buckets text[] := array[
    'certificates','payment-screenshots','hackathon-challenge-files',
    'hackathon-submissions','support-attachments','expense-receipts'
  ];
  b text;
begin
  foreach b in array private_buckets loop
    if exists (
      select 1
      from storage.buckets sb
      where sb.id = b and sb.public = true
    ) then
      raise exception 'storage bucket % is public but must be private', b;
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- anon cannot execute SECURITY DEFINER helpers
-- ---------------------------------------------------------------------------
set local role anon;
do $$
begin
  begin
    perform public.is_platform_admin();
    raise exception 'anon should not execute is_platform_admin';
  exception
    when insufficient_privilege then null;
  end;
end $$;
reset role;

select 'rls_smoke_ok' as status;

rollback;

-- Manual JWT cross-tenant checklist (requires two seeded organizers):
-- 1. Authenticate as organizer A; select * from events where organizer_id = B → 0 rows
--    (unless public published — then only public columns path).
-- 2. select * from registrations where event_id in (B's events) → 0 as A.
-- 3. select * from hackathon_teams / event_expenses / access_grants for B → 0.
-- 4. Storage: signed URL for A's payment-screenshots object must 403 for B's session.
