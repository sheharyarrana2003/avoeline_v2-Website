-- O7: throttled Drive archive / share jobs for certificates (issue stays records-only)
create table if not exists public.certificate_jobs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  certificate_id uuid not null references public.certificates (id) on delete cascade,
  kind text not null check (kind = any (array['archive'::text, 'share'::text])),
  status text not null default 'pending'
    check (status = any (array['pending'::text, 'running'::text, 'done'::text, 'failed'::text])),
  attempts int not null default 0 check (attempts >= 0),
  not_before timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists certificate_jobs_pending_idx
  on public.certificate_jobs (status, not_before, created_at)
  where status = 'pending';

create index if not exists certificate_jobs_cert_idx
  on public.certificate_jobs (certificate_id, kind);

alter table public.certificate_jobs enable row level security;
