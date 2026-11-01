-- Phase 5: JSON certificate templates, versions, on-demand render; drop blockchain + pdf_url

-- Drop legacy status check before rewriting values
alter table public.certificates drop constraint if exists certificates_status_check;

alter table public.certificate_templates
  add column if not exists name text,
  add column if not exists version int not null default 1,
  add column if not exists layout jsonb not null default '{}'::jsonb,
  add column if not exists assets jsonb not null default '{}'::jsonb,
  add column if not exists status text not null default 'draft',
  add column if not exists email_attach_pdf boolean not null default false;

update public.certificate_templates
set
  name = coalesce(nullif(name, ''), nullif(template_name, ''), 'Certificate'),
  layout = case
    when layout = '{}'::jsonb then
      jsonb_build_object(
        'schemaVersion', 1,
        'page', jsonb_build_object(
          'size', 'A4-landscape',
          'width', 842,
          'height', 595,
          'background', jsonb_build_object('color', coalesce(primary_color, '#ffffff'))
        ),
        'elements', '[]'::jsonb
      )
    else layout
  end,
  assets = case
    when assets = '{}'::jsonb then
      jsonb_build_object(
        'logo', coalesce(logo_url, ''),
        'signature', coalesce(signature_url, '')
      )
    else assets
  end
where true;

update public.certificate_templates set name = 'Certificate' where name is null;
alter table public.certificate_templates alter column name set not null;
alter table public.certificate_templates alter column name set default 'Certificate';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'certificate_templates_status_check'
  ) then
    alter table public.certificate_templates
      add constraint certificate_templates_status_check
      check (status in ('draft', 'published'));
  end if;
end $$;

alter table public.certificate_templates drop column if exists blockchain_enabled;
alter table public.certificate_templates drop column if exists blockchain_network;
alter table public.certificate_templates drop column if exists border_color;
alter table public.certificate_templates drop column if exists border_size;
alter table public.certificate_templates drop column if exists border_style;
alter table public.certificate_templates drop column if exists canvas;
alter table public.certificate_templates drop column if exists layout_fields;
alter table public.certificate_templates drop column if exists logo_url;
alter table public.certificate_templates drop column if exists signature_url;
alter table public.certificate_templates drop column if exists primary_color;
alter table public.certificate_templates drop column if exists secondary_color;
alter table public.certificate_templates drop column if exists template_name;

create unique index if not exists certificate_templates_event_id_uidx
  on public.certificate_templates (event_id)
  where event_id is not null;

create table if not exists public.certificate_template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.certificate_templates(id) on delete cascade,
  version int not null,
  layout jsonb not null,
  assets jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (template_id, version)
);
create index if not exists certificate_template_versions_template_id_idx
  on public.certificate_template_versions (template_id);
alter table public.certificate_template_versions enable row level security;
revoke all on table public.certificate_template_versions from anon, authenticated;
grant all on table public.certificate_template_versions to service_role;

insert into public.certificate_template_versions (template_id, version, layout, assets, created_at)
select t.id, t.version, t.layout, t.assets, coalesce(t.updated_at, t.created_at, now())
from public.certificate_templates t
on conflict (template_id, version) do nothing;

alter table public.certificates
  add column if not exists data jsonb not null default '{}'::jsonb,
  add column if not exists template_version int not null default 1,
  add column if not exists issued_at timestamptz;

update public.certificates
set
  data = case
    when data = '{}'::jsonb then
      jsonb_build_object(
        'recipient_name', coalesce(recipient_name, ''),
        'role', coalesce(extra->>'role', title, ''),
        'award', coalesce(description, ''),
        'event_title', coalesce(event_title, ''),
        'event_dates', coalesce(completion_date::text, ''),
        'issuer_name', coalesce(issuer_name, ''),
        'issuer_title', coalesce(issuer_designation, ''),
        'custom_fields', coalesce(extra->'customFields', '{}'::jsonb)
      )
    else data
  end,
  issued_at = coalesce(issued_at, created_at, now()),
  status = case
    when lower(coalesce(status, '')) = 'revoked' then 'revoked'
    else 'issued'
  end
where true;

alter table public.certificates drop column if exists blockchain_contract_address;
alter table public.certificates drop column if exists blockchain_ipfs_hash;
alter table public.certificates drop column if exists blockchain_minted;
alter table public.certificates drop column if exists blockchain_network;
alter table public.certificates drop column if exists blockchain_token_id;
alter table public.certificates drop column if exists blockchain_tx_hash;
alter table public.certificates drop column if exists pdf_url;
alter table public.certificates drop column if exists recipient_name;
alter table public.certificates drop column if exists event_title;
alter table public.certificates drop column if exists issuer_name;
alter table public.certificates drop column if exists issuer_designation;
alter table public.certificates drop column if exists completion_date;
alter table public.certificates drop column if exists duration;
alter table public.certificates drop column if exists title;
alter table public.certificates drop column if exists description;
alter table public.certificates drop column if exists is_verified;
alter table public.certificates drop column if exists share_count;
alter table public.certificates drop column if exists last_downloaded_at;

alter table public.certificates
  add constraint certificates_status_check
  check (status in ('issued', 'revoked'));

create index if not exists certificates_event_id_idx on public.certificates (event_id);
create index if not exists certificates_registration_id_idx on public.certificates (registration_id);
create unique index if not exists certificates_verification_code_uidx on public.certificates (verification_code);
create unique index if not exists certificates_certificate_number_uidx on public.certificates (certificate_number);

alter table public.certificates enable row level security;
revoke all on table public.certificates from anon, authenticated;
grant all on table public.certificates to service_role;

alter table public.certificate_templates enable row level security;
revoke all on table public.certificate_templates from anon, authenticated;
grant all on table public.certificate_templates to service_role;
