-- Organizer outbound email connections (Google OAuth or SMTP).
-- Platform mail stays on Resend; attendee/cert/bulk must use a row here.

create table if not exists public.organizer_email_connections (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.users(id) on delete cascade,
  provider text not null check (provider in ('google', 'smtp')),
  from_email text not null,
  from_name text,
  status text not null default 'active' check (status in ('active', 'revoked', 'error', 'pending')),
  created_by text not null default 'self' check (created_by in ('self', 'saas_owner')),
  provisioned_by uuid references public.users(id) on delete set null,
  -- AES-GCM ciphertext (base64): refresh token / SMTP password / etc.
  secrets_ciphertext text,
  smtp_host text,
  smtp_port int,
  smtp_secure boolean default true,
  smtp_user text,
  google_account_email text,
  last_error text,
  last_tested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organizer_id)
);

create index if not exists organizer_email_connections_status_idx
  on public.organizer_email_connections (status);

alter table public.organizer_email_connections enable row level security;

revoke all on table public.organizer_email_connections from anon, authenticated;
grant all on table public.organizer_email_connections to service_role;

comment on table public.organizer_email_connections is
  'Organizer Google/SMTP send credentials. App uses service role; never expose secrets to clients.';
