-- Connections C2: grant uniqueness + one-time reconnect tokens

create unique index if not exists connection_grants_active_uidx
  on public.connection_grants (connection_id, user_id)
  where revoked_at is null;

create table if not exists public.connection_reconnect_tokens (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  owner_type text not null check (owner_type in ('user', 'org')),
  owner_id uuid not null,
  connection_id uuid references public.integration_connections(id) on delete cascade,
  created_by uuid references public.users(id) on delete set null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists connection_reconnect_tokens_owner_idx
  on public.connection_reconnect_tokens (owner_type, owner_id);

alter table public.connection_reconnect_tokens enable row level security;
revoke all on table public.connection_reconnect_tokens from anon, authenticated;
grant all on table public.connection_reconnect_tokens to service_role;
