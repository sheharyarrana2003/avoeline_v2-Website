-- Onboarding status, vendor plans, plan audience, platform bank settings.

alter table public.users
  add column if not exists onboarding_status text not null default 'incomplete'
    check (onboarding_status in ('incomplete', 'awaiting_payment', 'complete')),
  add column if not exists pending_plan_key text;

update public.users set onboarding_status = 'complete' where setup_complete is true;

alter table public.subscription_plans
  add column if not exists audience text not null default 'organizer'
    check (audience in ('organizer', 'vendor', 'both'));

update public.subscription_plans set audience = 'organizer' where audience is null;

insert into public.subscription_plans (key, name, description, price_monthly, price_yearly, currency, is_active, sort_order, included_modules, audience)
values
  (
    'vendor_free',
    'Vendor Free',
    'Basic marketplace listing and quotes.',
    0,
    0,
    'PKR',
    true,
    0,
    array['vendor_dashboard','vendor_quotes','vendor_services','vendor_bookings']::text[],
    'vendor'
  ),
  (
    'vendor_pro',
    'Vendor Pro',
    'Portfolio highlights and analytics.',
    2999,
    29999,
    'PKR',
    true,
    10,
    array['vendor_dashboard','vendor_quotes','vendor_services','vendor_bookings','vendor_portfolio','vendor_analytics']::text[],
    'vendor'
  )
on conflict (key) do update set
  audience = excluded.audience,
  included_modules = excluded.included_modules,
  is_active = excluded.is_active;

alter table public.vendor_profiles
  add column if not exists plan_type text not null default 'vendor_free';

alter table public.vendor_profiles
  drop constraint if exists vendor_profiles_plan_type_fkey;
alter table public.vendor_profiles
  add constraint vendor_profiles_plan_type_fkey
  foreign key (plan_type) references public.subscription_plans(key)
  on update cascade on delete restrict;

create index if not exists vendor_profiles_plan_type_idx on public.vendor_profiles (plan_type);

alter table public.plan_changes
  add column if not exists vendor_id uuid references public.users(id) on delete cascade;

alter table public.plan_changes
  alter column organizer_id drop not null;

create table if not exists public.platform_billing_settings (
  id int primary key default 1 check (id = 1),
  bank_name text,
  account_title text,
  account_number text,
  iban text,
  branch text,
  jazzcash text,
  easypaisa text,
  instructions text,
  currency text not null default 'PKR',
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users(id) on delete set null
);

insert into public.platform_billing_settings (id, bank_name, account_title, instructions)
values (1, '', '', 'Transfer the plan amount and upload your payment screenshot. Approval may take 1–2 business days.')
on conflict (id) do nothing;

alter table public.platform_billing_settings enable row level security;
revoke all on table public.platform_billing_settings from anon, authenticated;
grant all on table public.platform_billing_settings to service_role;
