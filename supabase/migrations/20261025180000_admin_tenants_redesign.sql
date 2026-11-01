-- Admin tenants redesign: institutes, email_log, override uniqueness, indexes.

create extension if not exists citext;

create table if not exists public.institutes (
  id uuid primary key default gen_random_uuid(),
  name citext not null,
  created_at timestamptz not null default now(),
  constraint institutes_name_unique unique (name)
);

alter table public.organizations
  add column if not exists institute_id uuid references public.institutes(id) on delete set null;

create index if not exists organizations_institute_id_idx
  on public.organizations (institute_id);

alter table public.institutes enable row level security;

create table if not exists public.email_log (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  lane text not null default 'notifications',
  recipient text not null,
  user_id uuid references public.users(id) on delete set null,
  subject text not null default '',
  status text not null default 'queued'
    check (status in ('not_sent','queued','sent','delivered','bounced','failed')),
  provider_id text,
  error text,
  payload jsonb not null default '{}'::jsonb,
  idempotency_key text,
  batch_key text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  constraint email_log_idempotency_unique unique (idempotency_key)
);

create index if not exists email_log_recipient_created_idx
  on public.email_log (recipient, created_at desc);
create index if not exists email_log_user_created_idx
  on public.email_log (user_id, created_at desc);
create index if not exists email_log_status_created_idx
  on public.email_log (status, created_at desc);
create index if not exists email_log_batch_key_idx
  on public.email_log (batch_key) where batch_key is not null;

alter table public.email_log enable row level security;

-- Deduplicate feature_overrides (keep newest id)
delete from public.feature_overrides a
using public.feature_overrides b
where a.target_org_id is null
  and b.target_org_id is null
  and a.organizer_id is not null
  and a.organizer_id = b.organizer_id
  and a.module_key = b.module_key
  and a.id < b.id;

delete from public.feature_overrides a
using public.feature_overrides b
where a.target_org_id is not null
  and b.target_org_id is not null
  and a.target_org_id = b.target_org_id
  and a.module_key = b.module_key
  and a.id < b.id;

create unique index if not exists feature_overrides_organizer_module_uidx
  on public.feature_overrides (organizer_id, module_key)
  where organizer_id is not null and target_org_id is null;

create unique index if not exists feature_overrides_org_module_uidx
  on public.feature_overrides (target_org_id, module_key)
  where target_org_id is not null;

create index if not exists feature_overrides_expires_at_idx
  on public.feature_overrides (expires_at)
  where expires_at is not null;

create index if not exists plan_changes_organizer_created_idx
  on public.plan_changes (organizer_id, created_at desc);

create index if not exists plan_changes_vendor_created_idx
  on public.plan_changes (vendor_id, created_at desc)
  where vendor_id is not null;

create index if not exists custom_pricing_active_organizer_idx
  on public.custom_pricing_agreements (organizer_id)
  where active = true;

alter table public.feature_overrides
  add column if not exists ended_emailed_at timestamptz;
