-- Marketing website foundation (docs/19 §5).
-- Tables, plan/catalog/demo alters, get_public_stats(), public-read RLS.

-- ---------------------------------------------------------------------------
-- Alters: subscription_plans display fields
-- ---------------------------------------------------------------------------
alter table public.subscription_plans
  add column if not exists is_public boolean not null default false,
  add column if not exists is_recommended boolean not null default false,
  add column if not exists badge_text text,
  add column if not exists tagline text,
  add column if not exists cta_label text,
  add column if not exists cta_href text,
  add column if not exists billing_note text,
  add column if not exists highlight_features text[] not null default '{}'::text[];

-- ---------------------------------------------------------------------------
-- Alters: demo flags on events / organizations
-- ---------------------------------------------------------------------------
alter table public.events
  add column if not exists is_demo boolean not null default false;

alter table public.organizations
  add column if not exists is_demo boolean not null default false;

update public.events
set is_demo = true
where coalesce(extra->>'demo_seed', '') = 'avoeline-demo';

update public.organizations
set is_demo = true
where coalesce(extra->>'demo_seed', '') = 'avoeline-demo';

create index if not exists events_is_demo_idx on public.events (is_demo)
  where is_demo = false;
create index if not exists organizations_is_demo_idx on public.organizations (is_demo)
  where is_demo = false;

-- ---------------------------------------------------------------------------
-- module_catalog
-- ---------------------------------------------------------------------------
create table if not exists public.module_catalog (
  key text primary key,
  label text not null,
  description text not null default '',
  category text not null,
  sort int not null default 0
);

insert into public.module_catalog (key, label, description, category, sort) values
  ('events_dashboard', 'Event Dashboard', 'Event Dashboard', 'Events', 10),
  ('registrations', 'Registrations', 'Registrations', 'Events', 20),
  ('access_control', 'Access control', 'Access control', 'Events', 30),
  ('website_builder', 'Website Builder', 'Website Builder', 'Events', 40),
  ('teams_basic', 'Teams', 'Teams', 'Teams', 50),
  ('teams_advanced_roles', 'Advanced team roles', 'Advanced team roles', 'Teams', 60),
  ('ushers_ops', 'Ushers / on-ground ops', 'Ushers / on-ground ops', 'Teams', 70),
  ('hackathon_ops', 'Hackathon', 'Hackathon', 'Hackathons', 80),
  ('sponsors_basic', 'Sponsors', 'Sponsors', 'Sponsors', 90),
  ('sponsors_invoicing_templates', 'Sponsor invoicing', 'Sponsor invoicing', 'Sponsors', 100),
  ('certificates', 'Certificates', 'Certificates', 'Certificates', 110),
  ('vendor_store', 'Vendor Store', 'Vendor Store', 'Vendors', 120),
  ('vendor_dashboard', 'Vendor dashboard', 'Vendor dashboard', 'Vendors', 130),
  ('vendor_quotes', 'Quotes', 'Quotes', 'Vendors', 140),
  ('vendor_services', 'Services', 'Services', 'Vendors', 150),
  ('vendor_bookings', 'Bookings', 'Bookings', 'Vendors', 160),
  ('vendor_portfolio', 'Portfolio highlights', 'Portfolio highlights', 'Vendors', 170),
  ('vendor_event_marketing', 'Event marketing', 'Event marketing', 'Vendors', 180),
  ('analytics_basic', 'Analytics', 'Analytics', 'Analytics', 190),
  ('vendor_analytics', 'Vendor analytics', 'Vendor analytics', 'Analytics', 200),
  ('ai_planner', 'AI Planner', 'AI Planner', 'AI', 210),
  ('ai_designer', 'AI Designer', 'AI Designer', 'AI', 220),
  ('api_access', 'API access', 'API access', 'Other', 230)
on conflict (key) do update set
  label = excluded.label,
  description = excluded.description,
  category = excluded.category,
  sort = excluded.sort;

-- ---------------------------------------------------------------------------
-- CMS / marketing tables
-- ---------------------------------------------------------------------------
create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_by uuid references public.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.site_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  status text not null default 'draft'
    check (status in ('draft', 'published')),
  seo jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  updated_by uuid references public.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.site_blocks (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.site_pages (id) on delete cascade,
  type text not null,
  sort int not null default 0,
  visible boolean not null default true,
  draft jsonb not null default '{}'::jsonb,
  published jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists site_blocks_page_id_sort_idx
  on public.site_blocks (page_id, sort);

create table if not exists public.site_revisions (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  snapshot jsonb not null default '{}'::jsonb,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists site_revisions_entity_idx
  on public.site_revisions (entity_type, entity_id, created_at desc);

create table if not exists public.site_media (
  id uuid primary key default gen_random_uuid(),
  path text not null,
  alt text not null default '',
  width int,
  height int,
  mime text,
  size bigint,
  uploaded_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.site_partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_media_id uuid references public.site_media (id) on delete set null,
  url text,
  category text,
  description text,
  organizer_id uuid references public.users (id) on delete set null,
  consent_status text not null default 'pending'
    check (consent_status in ('pending', 'granted', 'revoked')),
  consent_at timestamptz,
  consent_source text,
  featured boolean not null default false,
  visible boolean not null default false,
  sort int not null default 0
);

create index if not exists site_partners_consent_status_idx
  on public.site_partners (consent_status);
create index if not exists site_partners_visible_sort_idx
  on public.site_partners (visible, sort);

create table if not exists public.site_faqs (
  id uuid primary key default gen_random_uuid(),
  scope text not null default 'general',
  question text not null,
  answer_md text not null default '',
  sort int not null default 0,
  visible boolean not null default false
);

create index if not exists site_faqs_scope_sort_idx
  on public.site_faqs (scope, sort);

create table if not exists public.site_testimonials (
  id uuid primary key default gen_random_uuid(),
  quote text not null,
  name text not null,
  role text,
  organization text,
  avatar_media_id uuid references public.site_media (id) on delete set null,
  consent_confirmed boolean not null default false,
  visible boolean not null default false,
  sort int not null default 0
);

create index if not exists site_testimonials_visible_sort_idx
  on public.site_testimonials (visible, sort);

create table if not exists public.site_stats_settings (
  key text primary key,
  label text not null,
  visible boolean not null default true,
  min_threshold int not null default 0,
  format text not null default 'number'
);

-- Legal documents + immutable versions (circular current_version_id FK)
create table if not exists public.legal_documents (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  current_version_id uuid
);

create table if not exists public.legal_document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.legal_documents (id) on delete cascade,
  version int not null,
  body_md text not null default '',
  change_summary text,
  effective_date date,
  published_by uuid references public.users (id) on delete set null,
  published_at timestamptz not null default now(),
  unique (document_id, version)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'legal_documents_current_version_id_fkey'
  ) then
    alter table public.legal_documents
      add constraint legal_documents_current_version_id_fkey
      foreign key (current_version_id)
      references public.legal_document_versions (id)
      on delete set null;
  end if;
end $$;

create or replace function public.legal_document_versions_immutable()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'legal_document_versions rows are immutable';
end;
$$;

drop trigger if exists legal_document_versions_no_update on public.legal_document_versions;
create trigger legal_document_versions_no_update
  before update on public.legal_document_versions
  for each row execute function public.legal_document_versions_immutable();

drop trigger if exists legal_document_versions_no_delete on public.legal_document_versions;
create trigger legal_document_versions_no_delete
  before delete on public.legal_document_versions
  for each row execute function public.legal_document_versions_immutable();

create table if not exists public.user_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users (id) on delete set null,
  email_hash text not null,
  document_slug text not null,
  version int not null,
  accepted_at timestamptz not null default now(),
  context text,
  ip_hash text
);

create index if not exists user_consents_user_id_idx
  on public.user_consents (user_id);
create index if not exists user_consents_document_slug_idx
  on public.user_consents (document_slug, version);

create table if not exists public.marketing_consents (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  user_id uuid references public.users (id) on delete set null,
  scope text not null
    check (scope in ('product_updates', 'community', 'partner_offers')),
  granted_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  source text,
  unsubscribe_token_hash text
);

create index if not exists marketing_consents_email_idx
  on public.marketing_consents (email);
create index if not exists marketing_consents_scope_idx
  on public.marketing_consents (scope);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  topic text not null default 'general',
  message text not null,
  status text not null default 'new'
    check (status in ('new', 'in_progress', 'done')),
  assigned_to uuid references public.users (id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  ip_hash text,
  spam_score numeric
);

create index if not exists contact_messages_status_created_idx
  on public.contact_messages (status, created_at desc);
create index if not exists site_pages_status_idx on public.site_pages (status);
create index if not exists legal_documents_slug_idx on public.legal_documents (slug);

-- ---------------------------------------------------------------------------
-- get_public_stats() — aggregates only, no PII, excludes demo
-- ---------------------------------------------------------------------------
create or replace function public.get_public_stats()
returns table (
  events_count bigint,
  registrations_count bigint,
  active_organizers_count bigint,
  institutions_count bigint,
  certificates_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    (
      select count(*)::bigint
      from public.events e
      where e.is_demo = false
        and e.status in ('published', 'completed')
    ) as events_count,
    (
      select count(*)::bigint
      from public.registrations r
      join public.events e on e.id = r.event_id
      where e.is_demo = false
    ) as registrations_count,
    (
      select count(*)::bigint
      from public.organizer_profiles op
      join public.users u on u.id = op.user_id
      where op.review_status = 'approved'
        and coalesce(u.extra->>'demo_seed', '') <> 'avoeline-demo'
    ) as active_organizers_count,
    (
      select count(*)::bigint
      from public.organizations o
      where o.is_demo = false
        and o.org_type in ('department', 'club')
    ) as institutions_count,
    (
      select count(*)::bigint
      from public.certificates c
      join public.events e on e.id = c.event_id
      where e.is_demo = false
    ) as certificates_count;
$$;

revoke all on function public.get_public_stats() from public;
grant execute on function public.get_public_stats() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.site_settings enable row level security;
alter table public.site_pages enable row level security;
alter table public.site_blocks enable row level security;
alter table public.site_revisions enable row level security;
alter table public.site_media enable row level security;
alter table public.site_partners enable row level security;
alter table public.site_faqs enable row level security;
alter table public.site_testimonials enable row level security;
alter table public.site_stats_settings enable row level security;
alter table public.legal_documents enable row level security;
alter table public.legal_document_versions enable row level security;
alter table public.user_consents enable row level security;
alter table public.marketing_consents enable row level security;
alter table public.contact_messages enable row level security;
alter table public.module_catalog enable row level security;

grant select on public.site_settings to anon, authenticated;
grant select on public.site_pages to anon, authenticated;
grant select on public.site_blocks to anon, authenticated;
grant select on public.site_partners to anon, authenticated;
grant select on public.site_faqs to anon, authenticated;
grant select on public.site_testimonials to anon, authenticated;
grant select on public.site_stats_settings to anon, authenticated;
grant select on public.legal_documents to anon, authenticated;
grant select on public.legal_document_versions to anon, authenticated;
grant select on public.module_catalog to anon, authenticated;

-- Public SELECT policies (no public write policies)
drop policy if exists site_settings_public_read on public.site_settings;
create policy site_settings_public_read on public.site_settings
  for select to anon, authenticated
  using (key in ('nav', 'footer', 'social', 'contact', 'announcement', 'seo_defaults'));

drop policy if exists site_pages_public_read on public.site_pages;
create policy site_pages_public_read on public.site_pages
  for select to anon, authenticated
  using (status = 'published');

drop policy if exists site_blocks_public_read on public.site_blocks;
create policy site_blocks_public_read on public.site_blocks
  for select to anon, authenticated
  using (
    visible = true
    and published is not null
    and exists (
      select 1 from public.site_pages p
      where p.id = site_blocks.page_id
        and p.status = 'published'
    )
  );

drop policy if exists site_partners_public_read on public.site_partners;
create policy site_partners_public_read on public.site_partners
  for select to anon, authenticated
  using (consent_status = 'granted' and visible = true);

drop policy if exists site_faqs_public_read on public.site_faqs;
create policy site_faqs_public_read on public.site_faqs
  for select to anon, authenticated
  using (visible = true);

drop policy if exists site_testimonials_public_read on public.site_testimonials;
create policy site_testimonials_public_read on public.site_testimonials
  for select to anon, authenticated
  using (visible = true and consent_confirmed = true);

drop policy if exists site_stats_settings_public_read on public.site_stats_settings;
create policy site_stats_settings_public_read on public.site_stats_settings
  for select to anon, authenticated
  using (true);

drop policy if exists legal_documents_public_read on public.legal_documents;
create policy legal_documents_public_read on public.legal_documents
  for select to anon, authenticated
  using (true);

drop policy if exists legal_document_versions_public_read on public.legal_document_versions;
create policy legal_document_versions_public_read on public.legal_document_versions
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.legal_documents d
      where d.current_version_id = legal_document_versions.id
    )
  );

drop policy if exists module_catalog_public_read on public.module_catalog;
create policy module_catalog_public_read on public.module_catalog
  for select to anon, authenticated
  using (true);

-- subscription_plans already has RLS; tighten public read to is_public (+ active)
drop policy if exists subscription_plans_read on public.subscription_plans;
create policy subscription_plans_read on public.subscription_plans
  for select to anon, authenticated
  using (is_public = true and is_active = true);
