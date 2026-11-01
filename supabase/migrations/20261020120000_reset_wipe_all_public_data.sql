-- Delete-only helper: truncate every ordinary table in public.
-- Does not export or move data. Does not touch auth.* or storage.*.
-- Call via service role only (revoked from anon/authenticated).

create or replace function public.reset_wipe_all_public_data()
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  r record;
begin
  for r in
    select c.relname as tablename
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
    order by c.relname
  loop
    execute format('truncate table public.%I restart identity cascade', r.tablename);
  end loop;
end;
$$;

revoke all on function public.reset_wipe_all_public_data() from public;
revoke all on function public.reset_wipe_all_public_data() from anon;
revoke all on function public.reset_wipe_all_public_data() from authenticated;
grant execute on function public.reset_wipe_all_public_data() to service_role;
grant execute on function public.reset_wipe_all_public_data() to postgres;
