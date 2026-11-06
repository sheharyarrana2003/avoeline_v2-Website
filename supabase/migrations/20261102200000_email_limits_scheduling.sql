-- docs/18: plan email limits, overrides, batches, outbox/connection columns, suppressions

-- ---------------------------------------------------------------------------
-- Plan limits
-- ---------------------------------------------------------------------------
create table if not exists public.plan_email_limits (
  plan_key text primary key references public.subscription_plans(key) on delete cascade,
  daily_cap int not null check (daily_cap > 0),
  monthly_cap int not null check (monthly_cap > 0),
  max_per_send int not null default 500 check (max_per_send > 0 and max_per_send <= 5000)
);

insert into public.plan_email_limits (plan_key, daily_cap, monthly_cap, max_per_send)
select
  sp.key,
  coalesce(nullif(sp.email_daily_cap, 0), case when sp.key = 'free' then 200 else 1500 end),
  coalesce(nullif(sp.email_monthly_cap, 0), case when sp.key = 'free' then 1000 else 10000 end),
  case when sp.key = 'free' then 100 else 500 end
from public.subscription_plans sp
on conflict (plan_key) do nothing;

update public.subscription_plans sp
set
  email_daily_cap = pel.daily_cap,
  email_monthly_cap = pel.monthly_cap
from public.plan_email_limits pel
where pel.plan_key = sp.key
  and (sp.email_daily_cap is null or sp.email_monthly_cap is null);

create table if not exists public.email_limit_overrides (
  owner_id uuid primary key references public.users(id) on delete cascade,
  daily_cap int check (daily_cap is null or daily_cap > 0),
  monthly_cap int check (monthly_cap is null or monthly_cap > 0),
  max_per_send int check (max_per_send is null or (max_per_send > 0 and max_per_send <= 5000)),
  reason text not null,
  set_by uuid references public.users(id) on delete set null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists email_limit_overrides_expires_idx
  on public.email_limit_overrides (expires_at)
  where expires_at is not null;

-- ---------------------------------------------------------------------------
-- Batches
-- ---------------------------------------------------------------------------
create table if not exists public.email_send_batches (
  id uuid primary key default gen_random_uuid(),
  owner_type text not null check (owner_type in ('user', 'org')),
  owner_id uuid not null,
  connection_id uuid not null
    references public.integration_connections(id) on delete cascade,
  kind text not null,
  created_by uuid references public.users(id) on delete set null,
  total int not null default 0 check (total >= 0),
  sent int not null default 0 check (sent >= 0),
  failed int not null default 0 check (failed >= 0),
  skipped int not null default 0 check (skipped >= 0),
  cancelled int not null default 0 check (cancelled >= 0),
  status text not null default 'scheduled'
    check (status in ('scheduled', 'sending', 'completed', 'paused', 'cancelled')),
  not_before timestamptz,
  spread_days int check (spread_days is null or spread_days > 0),
  subject text,
  event_id uuid references public.events(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists email_send_batches_owner_created_idx
  on public.email_send_batches (owner_type, owner_id, created_at desc);
create index if not exists email_send_batches_connection_idx
  on public.email_send_batches (connection_id);
create index if not exists email_send_batches_status_idx
  on public.email_send_batches (status);

-- ---------------------------------------------------------------------------
-- Outbox extensions
-- ---------------------------------------------------------------------------
alter table public.email_outbox
  add column if not exists batch_id uuid
    references public.email_send_batches(id) on delete set null;

alter table public.email_outbox
  add column if not exists priority int not null default 0;

alter table public.email_outbox
  add column if not exists time_sensitive boolean not null default false;

alter table public.email_outbox
  add column if not exists attempt_at timestamptz;

alter table public.email_outbox
  add column if not exists idempotency_key text;

alter table public.email_outbox
  add column if not exists skip_reason text;

create unique index if not exists email_outbox_idempotency_uidx
  on public.email_outbox (idempotency_key)
  where idempotency_key is not null;

drop index if exists email_outbox_status_idx;
create index if not exists email_outbox_status_not_before_priority_idx
  on public.email_outbox (status, not_before nulls first, priority desc);
create index if not exists email_outbox_batch_idx
  on public.email_outbox (batch_id);

-- ---------------------------------------------------------------------------
-- Connection columns
-- ---------------------------------------------------------------------------
alter table public.integration_connections
  add column if not exists daily_limit int;

alter table public.integration_connections
  add column if not exists per_minute_limit int not null default 30;

alter table public.integration_connections
  add column if not exists quota_exhausted_until timestamptz;

alter table public.integration_connections
  add column if not exists is_workspace boolean not null default false;

alter table public.integration_connections
  add column if not exists sending_paused_until timestamptz;

alter table public.integration_connections
  add column if not exists sending_paused_reason text;

update public.integration_connections
set
  daily_limit = coalesce(daily_limit, case when is_workspace then 1500 else 400 end),
  per_minute_limit = coalesce(per_minute_limit, 30)
where daily_limit is null;

alter table public.integration_connections
  alter column daily_limit set default 400;

alter table public.integration_connections
  alter column daily_limit set not null;

-- ---------------------------------------------------------------------------
-- Organizer timezone + suppressions
-- ---------------------------------------------------------------------------
alter table public.organizer_profiles
  add column if not exists timezone text;

create table if not exists public.email_suppressions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  email_normalized text not null,
  reason text,
  created_at timestamptz not null default now(),
  unique (owner_id, email_normalized)
);

create index if not exists email_suppressions_owner_idx
  on public.email_suppressions (owner_id);

-- ---------------------------------------------------------------------------
-- email_log rolling-window index
-- ---------------------------------------------------------------------------
create index if not exists email_log_connection_sent_at_idx
  on public.email_log (connection_id, sent_at desc)
  where connection_id is not null and sent_at is not null;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.plan_email_limits enable row level security;
alter table public.email_limit_overrides enable row level security;
alter table public.email_send_batches enable row level security;
alter table public.email_suppressions enable row level security;

revoke all on table public.plan_email_limits from anon, authenticated;
revoke all on table public.email_limit_overrides from anon, authenticated;
revoke all on table public.email_send_batches from anon, authenticated;
revoke all on table public.email_suppressions from anon, authenticated;

grant all on table public.plan_email_limits to service_role;
grant all on table public.email_limit_overrides to service_role;
grant all on table public.email_send_batches to service_role;
grant all on table public.email_suppressions to service_role;

-- Owners can read their own batches (service-role still used for writes)
create policy email_send_batches_owner_select on public.email_send_batches
  for select to authenticated
  using (
    (owner_type = 'user' and owner_id = auth.uid())
    or public.is_platform_admin()
  );

grant select on table public.email_send_batches to authenticated;
