-- Vendor quotation message/body templates (MVP; service-role access via app).
create table if not exists public.quotation_templates (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  body_html text not null default '',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists quotation_templates_vendor_idx
  on public.quotation_templates (vendor_id);

-- At most one default template per vendor.
create unique index if not exists quotation_templates_vendor_default_uidx
  on public.quotation_templates (vendor_id)
  where is_default;

drop trigger if exists trg_set_updated_at on public.quotation_templates;
create trigger trg_set_updated_at
  before update on public.quotation_templates
  for each row execute function public.set_updated_at();

alter table public.quotation_templates enable row level security;
revoke all on table public.quotation_templates from anon, authenticated;
grant all on table public.quotation_templates to service_role;
