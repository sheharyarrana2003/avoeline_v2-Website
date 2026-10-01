-- Docs 01–07 tables and columns. FK indexes included in the same migration.

-- ---------------------------------------------------------------------------
-- 01 SaaS owner
-- ---------------------------------------------------------------------------

alter table public.users add column if not exists must_reset_password boolean default false;
alter table public.organizer_profiles add column if not exists review_status text
  default 'approved' check (review_status in ('pending','approved','flagged','rejected'));
alter table public.organizer_profiles add column if not exists specialties text[] default '{}';

create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  name text not null,
  price_monthly numeric,
  included_modules text[] default '{}',
  created_at timestamptz default now()
);

create table if not exists public.plan_changes (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.users(id) on delete cascade,
  from_plan text,
  to_plan text not null,
  changed_by uuid references public.users(id),
  reason text,
  created_at timestamptz default now()
);
create index if not exists plan_changes_organizer_id_idx on public.plan_changes (organizer_id);

create table if not exists public.feature_overrides (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid references public.users(id) on delete cascade,
  target_org_id uuid references public.organizations(id) on delete cascade,
  module_key text not null,
  granted_by uuid references public.users(id),
  reason text,
  expires_at timestamptz,
  created_at timestamptz default now(),
  constraint feature_overrides_target_chk check (organizer_id is not null or target_org_id is not null)
);
create index if not exists feature_overrides_organizer_id_idx on public.feature_overrides (organizer_id);
create index if not exists feature_overrides_target_org_id_idx on public.feature_overrides (target_org_id);
create index if not exists feature_overrides_module_key_idx on public.feature_overrides (module_key);

create table if not exists public.custom_pricing_agreements (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.users(id) on delete cascade,
  discount_pct numeric,
  flat_monthly_override numeric,
  notes text,
  set_by uuid references public.users(id),
  active boolean default true,
  created_at timestamptz default now()
);
create index if not exists custom_pricing_agreements_organizer_id_idx on public.custom_pricing_agreements (organizer_id);

insert into public.subscription_plans (key, name, price_monthly, included_modules) values
  ('free', 'Free', 0, array[
    'events_dashboard','ai_planner','analytics_basic','registrations',
    'access_control','sponsors_basic','teams_basic'
  ]::text[]),
  ('pro', 'Pro', 15000, array[
    'events_dashboard','ai_planner','analytics_basic','registrations',
    'access_control','sponsors_basic','teams_basic',
    'teams_advanced_roles','vendor_store','certificates','sponsors_invoicing_templates'
  ]::text[]),
  ('enterprise', 'Enterprise', 45000, array[
    'events_dashboard','ai_planner','analytics_basic','registrations',
    'access_control','sponsors_basic','teams_basic',
    'teams_advanced_roles','vendor_store','certificates','sponsors_invoicing_templates',
    'api_access','website_builder','ai_designer','ushers_ops'
  ]::text[])
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- 02 Department
-- ---------------------------------------------------------------------------

create table if not exists public.org_tenures (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  label text not null,
  start_date date not null,
  end_date date not null,
  is_current boolean default false,
  created_at timestamptz default now()
);
create index if not exists org_tenures_org_id_idx on public.org_tenures (org_id);

create table if not exists public.org_module_access (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  module_key text not null,
  enabled boolean default true,
  granted_by uuid references public.users(id),
  unique (org_id, module_key)
);
create index if not exists org_module_access_org_id_idx on public.org_module_access (org_id);

create table if not exists public.org_announcements (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  body text not null,
  broadcast_to_all boolean default false,
  created_by uuid references public.users(id),
  created_at timestamptz default now()
);
create index if not exists org_announcements_org_id_idx on public.org_announcements (org_id);

alter table public.teams add column if not exists tenure_id uuid references public.org_tenures(id);
create index if not exists teams_tenure_id_idx on public.teams (tenure_id);

-- ---------------------------------------------------------------------------
-- 03 Club president
-- ---------------------------------------------------------------------------

create table if not exists public.org_requests (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  request_type text not null check (request_type in ('budget','event_approval','other')),
  title text not null,
  details text,
  requested_amount numeric,
  status text default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by uuid references public.users(id),
  review_note text,
  requested_by uuid references public.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists org_requests_org_id_idx on public.org_requests (org_id);
create index if not exists org_requests_status_idx on public.org_requests (status);

-- ---------------------------------------------------------------------------
-- 06 Hackathon participant (align existing phases; add tasks)
-- ---------------------------------------------------------------------------

alter table public.hackathon_phases add column if not exists track_id uuid references public.hackathon_tracks(id) on delete cascade;
alter table public.hackathon_phases add column if not exists opens_at timestamptz;
alter table public.hackathon_phases add column if not exists closes_at timestamptz;
alter table public.hackathon_phases add column if not exists order_index int;
update public.hackathon_phases set opens_at = coalesce(opens_at, starts_at), closes_at = coalesce(closes_at, ends_at), order_index = coalesce(order_index, sort_order);
create index if not exists hackathon_phases_track_id_idx on public.hackathon_phases (track_id);

create table if not exists public.hackathon_tasks (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.hackathon_tracks(id) on delete cascade,
  title text not null,
  description text,
  category text,
  points int default 0,
  hints jsonb default '[]',
  flag_hash text,
  time_limit_minutes int,
  is_random boolean default false,
  phase_id uuid references public.hackathon_phases(id),
  created_at timestamptz default now()
);
create index if not exists hackathon_tasks_track_id_idx on public.hackathon_tasks (track_id);
create index if not exists hackathon_tasks_phase_id_idx on public.hackathon_tasks (phase_id);

create table if not exists public.hackathon_task_completions (
  id uuid primary key default gen_random_uuid(),
  hackathon_team_id uuid not null references public.hackathon_teams(id) on delete cascade,
  task_id uuid not null references public.hackathon_tasks(id) on delete cascade,
  submitted_flag text,
  is_correct boolean,
  points_awarded int default 0,
  attempted_at timestamptz default now(),
  unique (hackathon_team_id, task_id)
);
create index if not exists hackathon_task_completions_team_id_idx on public.hackathon_task_completions (hackathon_team_id);
create index if not exists hackathon_task_completions_task_id_idx on public.hackathon_task_completions (task_id);

create table if not exists public.hackathon_task_assignments (
  id uuid primary key default gen_random_uuid(),
  hackathon_team_id uuid not null references public.hackathon_teams(id) on delete cascade,
  task_id uuid not null references public.hackathon_tasks(id) on delete cascade,
  unique (hackathon_team_id, task_id)
);

-- ---------------------------------------------------------------------------
-- 07 Hackathon organizer config
-- ---------------------------------------------------------------------------

create table if not exists public.hackathon_config (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.hackathon_tracks(id) on delete cascade,
  config_key text not null,
  enabled boolean default false,
  config_value jsonb default '{}',
  unique (track_id, config_key)
);
create index if not exists hackathon_config_track_id_idx on public.hackathon_config (track_id);

-- ---------------------------------------------------------------------------
-- 05 Networking / badges
-- ---------------------------------------------------------------------------

create table if not exists public.badge_tiers (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  label text not null,
  applies_to text[] default '{"attendee","organizer","vendor"}',
  requirement_description text,
  sort_order int,
  default_discount_pct numeric default 0
);

create table if not exists public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  badge_tier_id uuid not null references public.badge_tiers(id),
  earned_at timestamptz default now(),
  unique (user_id, badge_tier_id)
);
create index if not exists user_badges_user_id_idx on public.user_badges (user_id);
create index if not exists user_badges_badge_tier_id_idx on public.user_badges (badge_tier_id);

create table if not exists public.badge_meetups (
  id uuid primary key default gen_random_uuid(),
  badge_tier_id uuid not null references public.badge_tiers(id),
  title text not null,
  description text,
  scheduled_at timestamptz,
  location text,
  linked_event_id uuid references public.events(id),
  created_at timestamptz default now()
);
create index if not exists badge_meetups_badge_tier_id_idx on public.badge_meetups (badge_tier_id);

create table if not exists public.badge_meetup_attendees (
  id uuid primary key default gen_random_uuid(),
  meetup_id uuid not null references public.badge_meetups(id) on delete cascade,
  user_id uuid not null references public.users(id),
  rsvp_status text default 'interested' check (rsvp_status in ('interested','confirmed','attended')),
  unique (meetup_id, user_id)
);
create index if not exists badge_meetup_attendees_meetup_id_idx on public.badge_meetup_attendees (meetup_id);

alter table public.event_speakers add column if not exists visibility_tier text;

insert into public.badge_tiers (key, label, requirement_description, sort_order, default_discount_pct) values
  ('explorer', 'Explorer', 'Join the platform and attend an event', 1, 0),
  ('connector', 'Connector', 'Check in and make connections', 2, 5),
  ('networker', 'Networker', 'Active across events, bookings, or organizing', 3, 10),
  ('ambassador', 'Ambassador', 'High impact on the platform', 4, 15)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  for t in select unnest(array[
    'subscription_plans','plan_changes','feature_overrides','custom_pricing_agreements',
    'org_tenures','org_module_access','org_announcements','org_requests',
    'hackathon_tasks','hackathon_task_completions','hackathon_task_assignments','hackathon_config',
    'badge_tiers','user_badges','badge_meetups','badge_meetup_attendees'
  ])
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

grant select on public.subscription_plans to anon, authenticated;
grant select on public.badge_tiers to anon, authenticated;

drop policy if exists subscription_plans_read on public.subscription_plans;
create policy subscription_plans_read on public.subscription_plans for select to anon, authenticated using (true);

drop policy if exists badge_tiers_read on public.badge_tiers;
create policy badge_tiers_read on public.badge_tiers for select to anon, authenticated using (true);

drop policy if exists saas_admin_all_plan_changes on public.plan_changes;
create policy saas_admin_all_plan_changes on public.plan_changes for all to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());

drop policy if exists saas_admin_all_overrides on public.feature_overrides;
create policy saas_admin_all_overrides on public.feature_overrides for all to authenticated
  using (public.is_platform_admin() or organizer_id = (select auth.uid()))
  with check (public.is_platform_admin());

drop policy if exists saas_admin_pricing on public.custom_pricing_agreements;
create policy saas_admin_pricing on public.custom_pricing_agreements for all to authenticated
  using (public.is_platform_admin() or organizer_id = (select auth.uid()))
  with check (public.is_platform_admin());

drop policy if exists org_tenures_members on public.org_tenures;
create policy org_tenures_members on public.org_tenures for all to authenticated
  using (org_id in (select public.user_org_ids()) or public.is_platform_admin())
  with check (org_id in (select public.user_org_ids()) or public.is_platform_admin());

drop policy if exists org_module_access_members on public.org_module_access;
create policy org_module_access_members on public.org_module_access for all to authenticated
  using (org_id in (select public.user_org_ids()) or public.is_platform_admin())
  with check (org_id in (select public.user_org_ids()) or public.is_platform_admin());

drop policy if exists org_announcements_read on public.org_announcements;
create policy org_announcements_read on public.org_announcements for select to authenticated
  using (org_id in (select public.user_org_ids()) or public.is_platform_admin());
drop policy if exists org_announcements_write on public.org_announcements;
create policy org_announcements_write on public.org_announcements for insert to authenticated
  with check (org_id in (select public.user_org_ids()) or public.is_platform_admin());

drop policy if exists org_requests_members on public.org_requests;
create policy org_requests_members on public.org_requests for all to authenticated
  using (org_id in (select public.user_org_ids()) or public.is_platform_admin())
  with check (org_id in (select public.user_org_ids()) or public.is_platform_admin());

drop policy if exists hackathon_tasks_read on public.hackathon_tasks;
create policy hackathon_tasks_read on public.hackathon_tasks for select to authenticated using (true);
drop policy if exists hackathon_tasks_write on public.hackathon_tasks;
create policy hackathon_tasks_write on public.hackathon_tasks for all to authenticated
  using (public.is_platform_admin() or exists (
    select 1 from public.hackathon_tracks t join public.events e on e.id = t.event_id
    where t.id = track_id and e.organizer_id = (select auth.uid())
  ))
  with check (public.is_platform_admin() or exists (
    select 1 from public.hackathon_tracks t join public.events e on e.id = t.event_id
    where t.id = track_id and e.organizer_id = (select auth.uid())
  ));

drop policy if exists hackathon_task_completions_own on public.hackathon_task_completions;
create policy hackathon_task_completions_own on public.hackathon_task_completions for all to authenticated
  using (exists (
    select 1 from public.hackathon_team_members m
    where m.hackathon_team_id = hackathon_team_id and m.user_id = (select auth.uid())
  ) or public.is_platform_admin())
  with check (exists (
    select 1 from public.hackathon_team_members m
    where m.hackathon_team_id = hackathon_team_id and m.user_id = (select auth.uid())
  ) or public.is_platform_admin());

drop policy if exists hackathon_config_org on public.hackathon_config;
create policy hackathon_config_org on public.hackathon_config for all to authenticated
  using (public.is_platform_admin() or exists (
    select 1 from public.hackathon_tracks t join public.events e on e.id = t.event_id
    where t.id = track_id and e.organizer_id = (select auth.uid())
  ))
  with check (public.is_platform_admin() or exists (
    select 1 from public.hackathon_tracks t join public.events e on e.id = t.event_id
    where t.id = track_id and e.organizer_id = (select auth.uid())
  ));

drop policy if exists user_badges_own on public.user_badges;
create policy user_badges_own on public.user_badges for select to authenticated
  using (user_id = (select auth.uid()) or public.is_platform_admin());
drop policy if exists user_badges_insert_self on public.user_badges;
create policy user_badges_insert_self on public.user_badges for insert to authenticated
  with check (user_id = (select auth.uid()) or public.is_platform_admin());

drop policy if exists badge_meetups_read on public.badge_meetups;
create policy badge_meetups_read on public.badge_meetups for select to anon, authenticated using (true);
drop policy if exists badge_meetups_write on public.badge_meetups;
create policy badge_meetups_write on public.badge_meetups for insert to authenticated
  with check ((select auth.uid()) is not null);

drop policy if exists badge_meetup_attendees_own on public.badge_meetup_attendees;
create policy badge_meetup_attendees_own on public.badge_meetup_attendees for all to authenticated
  using (user_id = (select auth.uid()) or public.is_platform_admin())
  with check (user_id = (select auth.uid()) or public.is_platform_admin());
