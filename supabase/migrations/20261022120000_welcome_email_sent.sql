-- Track one-time welcome emails and admin-provisioned tenant accounts.
alter table public.users
  add column if not exists welcome_email_sent_at timestamptz,
  add column if not exists tenant_provisioned boolean not null default false;
