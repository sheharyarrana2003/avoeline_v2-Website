-- Indexes for onboarding / subscription billing hot paths (D2).

create index if not exists users_pending_plan_key_idx
  on public.users (pending_plan_key)
  where pending_plan_key is not null;

create index if not exists users_onboarding_status_idx
  on public.users (onboarding_status);

create index if not exists plan_changes_vendor_id_idx
  on public.plan_changes (vendor_id)
  where vendor_id is not null;

create index if not exists platform_billing_settings_updated_by_idx
  on public.platform_billing_settings (updated_by);

create index if not exists payments_subscription_pending_idx
  on public.payments (created_at desc)
  where purpose = 'subscription' and status = 'pending';
