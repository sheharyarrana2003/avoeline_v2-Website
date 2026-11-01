-- Marketing website RLS smoke (docs/19 §5).
-- Run as postgres / service role. Proves public-read policies and deny-default on private tables.

begin;

-- ---------------------------------------------------------------------------
-- RLS enabled on all marketing tables
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'site_settings','site_pages','site_blocks','site_revisions','site_media',
    'site_partners','site_faqs','site_testimonials','site_stats_settings',
    'legal_documents','legal_document_versions','user_consents','marketing_consents',
    'contact_messages','module_catalog'
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
-- Seed minimal rows for policy checks (service role / table owner)
-- ---------------------------------------------------------------------------
insert into public.site_settings (key, value)
values
  ('nav', '{"items":[]}'::jsonb),
  ('secret_internal', '{"x":1}'::jsonb)
on conflict (key) do nothing;

insert into public.site_pages (id, slug, title, status)
values
  ('11111111-1111-4111-8111-111111111111', 'home-rls-smoke', 'Home', 'published'),
  ('22222222-2222-4222-8222-222222222222', 'draft-rls-smoke', 'Draft', 'draft')
on conflict (slug) do update set status = excluded.status, title = excluded.title;

insert into public.site_blocks (id, page_id, type, sort, visible, draft, published)
values
  (
    '33333333-3333-4333-8333-333333333333',
    '11111111-1111-4111-8111-111111111111',
    'hero', 0, true, '{"t":"d"}'::jsonb, '{"t":"p"}'::jsonb
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    '22222222-2222-4222-8222-222222222222',
    'hero', 0, true, '{"t":"d"}'::jsonb, '{"t":"p"}'::jsonb
  )
on conflict (id) do nothing;

insert into public.site_partners (id, name, consent_status, visible, sort)
values
  ('55555555-5555-4555-8555-555555555555', 'Granted Partner', 'granted', true, 0),
  ('66666666-6666-4666-8666-666666666666', 'Pending Partner', 'pending', true, 1)
on conflict (id) do nothing;

insert into public.site_faqs (id, scope, question, answer_md, sort, visible)
values
  ('77777777-7777-4777-8777-777777777777', 'general', 'Visible FAQ?', 'Yes', 0, true),
  ('88888888-8888-4888-8888-888888888888', 'general', 'Hidden FAQ?', 'No', 1, false)
on conflict (id) do nothing;

insert into public.site_testimonials (id, quote, name, consent_confirmed, visible, sort)
values
  ('99999999-9999-4999-8999-999999999999', 'Great', 'A', true, true, 0),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Nope', 'B', false, true, 1)
on conflict (id) do nothing;

insert into public.site_stats_settings (key, label, visible, min_threshold, format)
values ('events_count', 'Events', true, 0, 'number')
on conflict (key) do nothing;

insert into public.legal_documents (id, slug, title)
values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'privacy-rls-smoke', 'Privacy')
on conflict (slug) do nothing;

insert into public.legal_document_versions (id, document_id, version, body_md, change_summary, effective_date)
values (
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  1,
  '# Privacy',
  'initial',
  current_date
)
on conflict (document_id, version) do nothing;

-- Bypass immutable delete trigger only for current_version pointer update via service role:
-- UPDATE on versions is blocked; setting current_version_id on the document is fine.
update public.legal_documents
set current_version_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

insert into public.legal_document_versions (id, document_id, version, body_md)
values (
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  2,
  '# Draft history'
)
on conflict (document_id, version) do nothing;

insert into public.contact_messages (id, name, email, topic, message)
values (
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  'Smoke',
  'smoke@example.com',
  'general',
  'private inbox'
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Anon: public reads allowed; private denied
-- ---------------------------------------------------------------------------
set local role anon;

do $$
declare
  n bigint;
begin
  select count(*) into n from public.site_settings where key = 'nav';
  if n <> 1 then raise exception 'anon should see nav setting'; end if;

  select count(*) into n from public.site_settings where key = 'secret_internal';
  if n <> 0 then raise exception 'anon must not see non-allowlisted settings'; end if;

  select count(*) into n from public.site_pages where slug = 'home-rls-smoke';
  if n <> 1 then raise exception 'anon should see published page'; end if;

  select count(*) into n from public.site_pages where slug = 'draft-rls-smoke';
  if n <> 0 then raise exception 'anon must not see draft page'; end if;

  select count(*) into n from public.site_blocks
  where id = '33333333-3333-4333-8333-333333333333';
  if n <> 1 then raise exception 'anon should see published-page block'; end if;

  select count(*) into n from public.site_blocks
  where id = '44444444-4444-4444-8444-444444444444';
  if n <> 0 then raise exception 'anon must not see draft-page block'; end if;

  select count(*) into n from public.site_partners where name = 'Granted Partner';
  if n <> 1 then raise exception 'anon should see granted visible partner'; end if;

  select count(*) into n from public.site_partners where name = 'Pending Partner';
  if n <> 0 then raise exception 'anon must not see pending partner'; end if;

  select count(*) into n from public.site_faqs where visible;
  if n < 1 then raise exception 'anon should see visible FAQs'; end if;

  select count(*) into n from public.site_faqs where not visible;
  if n <> 0 then raise exception 'anon must not see hidden FAQs'; end if;

  select count(*) into n from public.site_testimonials
  where consent_confirmed and visible;
  if n < 1 then raise exception 'anon should see consented testimonials'; end if;

  select count(*) into n from public.site_testimonials where not consent_confirmed;
  if n <> 0 then raise exception 'anon must not see unconsented testimonials'; end if;

  select count(*) into n from public.site_stats_settings;
  if n < 1 then raise exception 'anon should read site_stats_settings'; end if;

  select count(*) into n from public.module_catalog;
  if n < 1 then raise exception 'anon should read module_catalog'; end if;

  select count(*) into n from public.legal_documents where slug = 'privacy-rls-smoke';
  if n <> 1 then raise exception 'anon should read legal_documents'; end if;

  select count(*) into n from public.legal_document_versions
  where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  if n <> 1 then raise exception 'anon should read current legal version'; end if;

  select count(*) into n from public.legal_document_versions
  where id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  if n <> 0 then raise exception 'anon must not read non-current legal version'; end if;

  begin
    select count(*) into n from public.contact_messages;
    if n > 0 then
      raise exception 'anon must not read contact_messages';
    end if;
  exception
    when insufficient_privilege then
      null;
  end;

  begin
    select count(*) into n from public.marketing_consents;
    if n > 0 then
      raise exception 'anon must not read marketing_consents';
    end if;
  exception
    when insufficient_privilege then
      null;
  end;

  begin
    select count(*) into n from public.user_consents;
    if n > 0 then
      raise exception 'anon must not read user_consents';
    end if;
  exception
    when insufficient_privilege then
      null;
  end;

  begin
    select count(*) into n from public.site_revisions;
    if n > 0 then
      raise exception 'anon must not read site_revisions';
    end if;
  exception
    when insufficient_privilege then
      null;
  end;
end $$;

-- Anon cannot insert into public CMS tables
do $$
begin
  begin
    insert into public.site_pages (slug, title, status)
    values ('anon-write-fail', 'Nope', 'published');
    raise exception 'anon must not insert site_pages';
  exception
    when insufficient_privilege then null;
    when others then
      if sqlerrm like 'anon must not%' then raise; end if;
      -- RLS with check missing / policy violation also OK
      null;
  end;
end $$;

reset role;

-- ---------------------------------------------------------------------------
-- get_public_stats callable and returns one numeric row
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
begin
  select * into r from public.get_public_stats();
  if r.events_count is null
     or r.registrations_count is null
     or r.active_organizers_count is null
     or r.institutions_count is null
     or r.certificates_count is null
  then
    raise exception 'get_public_stats returned null counts';
  end if;
end $$;

-- Cleanup smoke rows (service role)
delete from public.site_blocks
where id in (
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444'
);
delete from public.site_pages
where id in (
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222'
);
delete from public.site_partners
where id in (
  '55555555-5555-4555-8555-555555555555',
  '66666666-6666-4666-8666-666666666666'
);
delete from public.site_faqs
where id in (
  '77777777-7777-4777-8777-777777777777',
  '88888888-8888-4888-8888-888888888888'
);
delete from public.site_testimonials
where id in (
  '99999999-9999-4999-8999-999999999999',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
);
delete from public.contact_messages where id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
update public.legal_documents set current_version_id = null
where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
-- Disable immutable triggers briefly to clean smoke versions
alter table public.legal_document_versions disable trigger legal_document_versions_no_delete;
delete from public.legal_document_versions
where id in (
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
);
alter table public.legal_document_versions enable trigger legal_document_versions_no_delete;
delete from public.legal_documents where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
delete from public.site_settings where key in ('nav', 'secret_internal');
delete from public.site_stats_settings where key = 'events_count';

rollback;
