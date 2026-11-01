-- W4: consent plumbing — unique active marketing consents, unsub token index, insights RPC

create unique index if not exists marketing_consents_active_email_scope_uidx
  on public.marketing_consents (lower(email), scope)
  where withdrawn_at is null;

create index if not exists marketing_consents_unsubscribe_token_hash_idx
  on public.marketing_consents (unsubscribe_token_hash)
  where unsubscribe_token_hash is not null;

-- Aggregate-only insights for owner dashboard. Buckets with count < 5 are omitted.
-- Excludes demo events. Never returns names, emails, or phone numbers.
create or replace function public.get_marketing_insights()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'events_by_month', coalesce((
      select jsonb_agg(jsonb_build_object('bucket', bucket, 'count', cnt) order by bucket)
      from (
        select to_char(date_trunc('month', e.created_at), 'YYYY-MM') as bucket,
               count(*)::int as cnt
        from public.events e
        where coalesce(e.is_demo, false) = false
          and e.deleted_at is null
        group by 1
        having count(*) >= 5
      ) s
    ), '[]'::jsonb),
    'events_by_category', coalesce((
      select jsonb_agg(jsonb_build_object('bucket', bucket, 'count', cnt) order by cnt desc)
      from (
        select coalesce(nullif(trim(e.category), ''), 'uncategorized') as bucket,
               count(*)::int as cnt
        from public.events e
        where coalesce(e.is_demo, false) = false
          and e.deleted_at is null
        group by 1
        having count(*) >= 5
      ) s
    ), '[]'::jsonb),
    'events_by_city', coalesce((
      select jsonb_agg(jsonb_build_object('bucket', bucket, 'count', cnt) order by cnt desc)
      from (
        select coalesce(nullif(trim(e.city), ''), 'unknown') as bucket,
               count(*)::int as cnt
        from public.events e
        where coalesce(e.is_demo, false) = false
          and e.deleted_at is null
        group by 1
        having count(*) >= 5
      ) s
    ), '[]'::jsonb),
    'registrations_total', (
      select count(*)::int
      from public.registrations r
      join public.events e on e.id = r.event_id
      where coalesce(e.is_demo, false) = false
        and e.deleted_at is null
    ),
    'certificates_total', (
      select count(*)::int
      from public.certificates c
      left join public.events e on e.id = c.event_id
      where e.id is null or (coalesce(e.is_demo, false) = false and e.deleted_at is null)
    ),
    'events_total', (
      select count(*)::int
      from public.events e
      where coalesce(e.is_demo, false) = false
        and e.deleted_at is null
    )
  ) into result;

  return result;
end;
$$;

revoke all on function public.get_marketing_insights() from public;
grant execute on function public.get_marketing_insights() to service_role;
