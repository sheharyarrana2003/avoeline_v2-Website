-- O1 FileStore metadata (bytes live in Drive or private Supabase fallback — never in this table).
-- QR image columns are deprecated (stop writing); do not DROP yet.

create table if not exists public.stored_files (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('drive', 'supabase')),
  provider_file_id text not null,
  connection_id uuid references public.integration_connections (id) on delete set null,
  name text not null,
  size bigint not null default 0 check (size >= 0),
  mime text not null default 'application/octet-stream',
  checksum text not null default '',
  category text not null check (
    category in (
      'payment_proof',
      'submission',
      'media',
      'certificate',
      'export',
      'other'
    )
  ),
  entity_type text not null default '',
  entity_id text not null default '',
  organizer_id uuid references public.users (id) on delete set null,
  event_id uuid references public.events (id) on delete set null,
  needs_promote boolean not null default false,
  promoted_at timestamptz,
  uploaded_at timestamptz not null default now(),
  expires_at timestamptz,
  extra jsonb not null default '{}'::jsonb
);

create index if not exists stored_files_event_id_idx on public.stored_files (event_id);
create index if not exists stored_files_organizer_id_idx on public.stored_files (organizer_id);
create index if not exists stored_files_entity_idx on public.stored_files (entity_type, entity_id);
create index if not exists stored_files_needs_promote_idx
  on public.stored_files (needs_promote)
  where needs_promote = true;
create index if not exists stored_files_provider_file_idx
  on public.stored_files (provider, provider_file_id);

comment on table public.stored_files is
  'O1 FileStore metadata only. Bytes in Drive (preferred) or private Supabase fallback.';
comment on column public.registrations.qr_code_image_url is
  'Deprecated O1 A6 — QR never stored; render via /api/qr/[token].png. Stop writing.';

alter table public.stored_files enable row level security;

-- Deny-by-default: no policies for anon/authenticated. Service role bypasses RLS.
