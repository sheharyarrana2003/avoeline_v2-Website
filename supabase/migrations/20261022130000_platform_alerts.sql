-- Admin dashboard plan/pricing alerts (service-role writes).
create table if not exists public.platform_alerts (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  title text not null,
  body text,
  href text,
  target_user_id uuid references public.users(id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists platform_alerts_created_idx
  on public.platform_alerts (created_at desc);

create index if not exists platform_alerts_kind_target_idx
  on public.platform_alerts (kind, target_user_id, created_at desc);

-- Already present on organizer_profiles in base schema; keep idempotent.
alter table public.organizer_profiles
  add column if not exists plan_expires_at timestamptz;

alter table public.platform_alerts enable row level security;
revoke all on table public.platform_alerts from anon, authenticated;
grant all on table public.platform_alerts to service_role;
