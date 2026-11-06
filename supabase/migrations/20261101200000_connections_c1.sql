-- Connections C1 (docs/17): integration_* tables, outbox stub, email_log.connection_id,
-- org kill switch. Backfill from organizer_email_connections (Google rows).

-- ---------------------------------------------------------------------------
-- Kill switch on organizations
-- ---------------------------------------------------------------------------
alter table public.organizations
  add column if not exists connections_google_disabled boolean not null default false;

alter table public.organizations
  add column if not exists connections_google_disabled_reason text;

comment on column public.organizations.connections_google_disabled is
  'Tenant kill switch for Google connections (docs/17 §10).';

-- ---------------------------------------------------------------------------
-- Core tables
-- ---------------------------------------------------------------------------
create table if not exists public.integration_connections (
  id uuid primary key default gen_random_uuid(),
  owner_type text not null check (owner_type in ('user', 'org')),
  owner_id uuid not null,
  provider text not null check (provider in ('google', 'microsoft')),
  provider_account_id text not null,
  provider_email text not null,
  display_name text,
  avatar_url text,
  status text not null default 'active'
    check (status in ('active', 'needs_reconnect', 'revoked', 'blocked_by_admin', 'disabled')),
  granted_scopes text[] not null default '{}',
  connected_by uuid references public.users(id) on delete set null,
  connected_at timestamptz not null default now(),
  last_used_at timestamptz,
  last_error text,
  last_error_at timestamptz,
  unique (owner_type, owner_id, provider, provider_account_id)
);

create index if not exists integration_connections_owner_idx
  on public.integration_connections (owner_type, owner_id);
create index if not exists integration_connections_status_idx
  on public.integration_connections (status);
create index if not exists integration_connections_connected_by_idx
  on public.integration_connections (connected_by);

create table if not exists public.integration_secrets (
  connection_id uuid primary key
    references public.integration_connections(id) on delete cascade,
  encrypted_refresh_token text not null,
  key_version int not null default 1,
  rotated_at timestamptz
);

create table if not exists public.integration_capabilities (
  connection_id uuid not null
    references public.integration_connections(id) on delete cascade,
  capability text not null
    check (capability in ('email.send', 'calendar', 'meet', 'drive.files', 'sheets.sync')),
  enabled boolean not null default true,
  settings jsonb not null default '{}'::jsonb,
  primary key (connection_id, capability)
);

create table if not exists public.connection_grants (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null
    references public.integration_connections(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  capabilities text[] not null default '{}',
  granted_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists connection_grants_connection_idx
  on public.connection_grants (connection_id);
create index if not exists connection_grants_user_idx
  on public.connection_grants (user_id);

create table if not exists public.sender_preferences (
  id uuid primary key default gen_random_uuid(),
  owner_type text not null check (owner_type in ('user', 'org')),
  owner_id uuid not null,
  event_id uuid references public.events(id) on delete cascade,
  connection_id uuid not null
    references public.integration_connections(id) on delete cascade
);

create unique index if not exists sender_preferences_owner_default_uidx
  on public.sender_preferences (owner_type, owner_id)
  where event_id is null;
create unique index if not exists sender_preferences_owner_event_uidx
  on public.sender_preferences (owner_type, owner_id, event_id)
  where event_id is not null;
create index if not exists sender_preferences_owner_idx
  on public.sender_preferences (owner_type, owner_id);
create index if not exists sender_preferences_connection_idx
  on public.sender_preferences (connection_id);

create table if not exists public.connection_usage (
  connection_id uuid not null
    references public.integration_connections(id) on delete cascade,
  capability text not null,
  usage_date date not null,
  count int not null default 0 check (count >= 0),
  primary key (connection_id, capability, usage_date)
);

create table if not exists public.oauth_states (
  id uuid primary key default gen_random_uuid(),
  state_hash text not null unique,
  code_verifier_enc text not null,
  user_id uuid not null references public.users(id) on delete cascade,
  owner_type text not null check (owner_type in ('user', 'org')),
  owner_id uuid not null,
  capability text not null,
  return_to text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists oauth_states_user_idx on public.oauth_states (user_id);
create index if not exists oauth_states_expires_idx on public.oauth_states (expires_at);

create table if not exists public.connection_audit (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid references public.integration_connections(id) on delete set null,
  owner_type text not null check (owner_type in ('user', 'org')),
  owner_id uuid not null,
  actor_id uuid references public.users(id) on delete set null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists connection_audit_owner_idx
  on public.connection_audit (owner_type, owner_id);
create index if not exists connection_audit_connection_idx
  on public.connection_audit (connection_id);
create index if not exists connection_audit_created_idx
  on public.connection_audit (created_at desc);

-- Minimal outbox for pause-on-invalid_grant (docs/18 extends later)
create table if not exists public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid references public.integration_connections(id) on delete set null,
  status text not null default 'queued'
    check (status in ('queued', 'paused', 'sending', 'sent', 'failed', 'cancelled')),
  paused boolean not null default false,
  payload jsonb not null default '{}'::jsonb,
  not_before timestamptz,
  last_error text,
  attempt_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists email_outbox_connection_idx on public.email_outbox (connection_id);
create index if not exists email_outbox_status_idx
  on public.email_outbox (status, not_before nulls first);

alter table public.email_log
  add column if not exists connection_id uuid
    references public.integration_connections(id) on delete set null;

create index if not exists email_log_connection_idx on public.email_log (connection_id);

-- ---------------------------------------------------------------------------
-- RLS: secrets never readable by clients
-- ---------------------------------------------------------------------------
alter table public.integration_connections enable row level security;
alter table public.integration_secrets enable row level security;
alter table public.integration_capabilities enable row level security;
alter table public.connection_grants enable row level security;
alter table public.sender_preferences enable row level security;
alter table public.connection_usage enable row level security;
alter table public.oauth_states enable row level security;
alter table public.connection_audit enable row level security;
alter table public.email_outbox enable row level security;

revoke all on table public.integration_connections from anon, authenticated;
revoke all on table public.integration_secrets from anon, authenticated;
revoke all on table public.integration_capabilities from anon, authenticated;
revoke all on table public.connection_grants from anon, authenticated;
revoke all on table public.sender_preferences from anon, authenticated;
revoke all on table public.connection_usage from anon, authenticated;
revoke all on table public.oauth_states from anon, authenticated;
revoke all on table public.connection_audit from anon, authenticated;
revoke all on table public.email_outbox from anon, authenticated;

grant all on table public.integration_connections to service_role;
grant all on table public.integration_secrets to service_role;
grant all on table public.integration_capabilities to service_role;
grant all on table public.connection_grants to service_role;
grant all on table public.sender_preferences to service_role;
grant all on table public.connection_usage to service_role;
grant all on table public.oauth_states to service_role;
grant all on table public.connection_audit to service_role;
grant all on table public.email_outbox to service_role;

-- ---------------------------------------------------------------------------
-- Backfill Google organizer connections (ciphertext reused; same key material)
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
  new_id uuid;
  status_map text;
  sub_id text;
begin
  for r in
    select *
    from public.organizer_email_connections
    where provider = 'google'
      and coalesce(secrets_ciphertext, '') <> ''
  loop
    status_map := case
      when r.status = 'active' then 'active'
      when r.status = 'revoked' then 'revoked'
      when r.status = 'error' then 'needs_reconnect'
      else 'needs_reconnect'
    end;

    -- Prefer google_account_email as stable key when sub unknown (legacy rows).
    sub_id := coalesce(nullif(trim(r.google_account_email), ''), r.from_email);

    insert into public.integration_connections (
      id, owner_type, owner_id, provider, provider_account_id, provider_email,
      display_name, status, granted_scopes, connected_by, connected_at,
      last_error, last_used_at
    ) values (
      gen_random_uuid(),
      'user',
      r.organizer_id,
      'google',
      sub_id,
      coalesce(nullif(trim(r.google_account_email), ''), r.from_email),
      r.from_name,
      status_map,
      array['openid', 'email', 'https://www.googleapis.com/auth/gmail.send']::text[],
      coalesce(r.provisioned_by, r.organizer_id),
      r.created_at,
      r.last_error,
      r.last_tested_at
    )
    on conflict (owner_type, owner_id, provider, provider_account_id) do update
      set status = excluded.status,
          provider_email = excluded.provider_email,
          display_name = excluded.display_name,
          last_error = excluded.last_error
    returning id into new_id;

    insert into public.integration_secrets (connection_id, encrypted_refresh_token, key_version)
    values (new_id, r.secrets_ciphertext, 1)
    on conflict (connection_id) do update
      set encrypted_refresh_token = excluded.encrypted_refresh_token;

    insert into public.integration_capabilities (connection_id, capability, enabled, settings)
    values (
      new_id,
      'email.send',
      status_map = 'active',
      jsonb_build_object(
        'daily_limit', 400,
        'per_minute_limit', 30,
        'from_email', r.from_email,
        'from_name', r.from_name
      )
    )
    on conflict (connection_id, capability) do update
      set enabled = excluded.enabled,
          settings = excluded.settings;
  end loop;

  -- SMTP-only rows → needs_reconnect placeholders (no secret migration)
  for r in
    select *
    from public.organizer_email_connections
    where provider = 'smtp'
  loop
    insert into public.integration_connections (
      owner_type, owner_id, provider, provider_account_id, provider_email,
      display_name, status, granted_scopes, connected_by, connected_at, last_error
    ) values (
      'user',
      r.organizer_id,
      'google',
      'smtp-legacy:' || r.organizer_id::text,
      r.from_email,
      r.from_name,
      'needs_reconnect',
      '{}',
      coalesce(r.provisioned_by, r.organizer_id),
      r.created_at,
      'SMTP is no longer supported — reconnect Google.'
    )
    on conflict (owner_type, owner_id, provider, provider_account_id) do nothing;
  end loop;
end $$;
