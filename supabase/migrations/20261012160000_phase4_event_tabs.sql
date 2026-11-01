-- Phase 4: maps_url, partner_types, external vendors, expenses

-- 4A Location: rename map_url → maps_url; drop coordinates jsonb
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'events' and column_name = 'map_url'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'events' and column_name = 'maps_url'
  ) then
    alter table public.events rename column map_url to maps_url;
  end if;
end $$;

alter table public.events add column if not exists maps_url text;
alter table public.events drop column if exists coordinates;

-- 4D Partner types + collaborator contribution fields on event_sponsors_partners
alter table public.event_sponsors_partners
  add column if not exists contribution_kind text,
  add column if not exists contribution_custom text,
  add column if not exists collaboration_terms text;

create table if not exists public.partner_types (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.users(id) on delete cascade,
  label text not null,
  description text not null default '',
  created_at timestamptz not null default now(),
  unique (organizer_id, label)
);
create index if not exists partner_types_organizer_id_idx on public.partner_types (organizer_id);
alter table public.partner_types enable row level security;
revoke all on table public.partner_types from anon, authenticated;
grant all on table public.partner_types to service_role;

-- 4E Own vendors
create table if not exists public.event_external_vendors (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  vendor_type text not null default '',
  description text not null default '',
  budget numeric(12,2),
  contact text not null default '',
  status text not null default 'planned'
    check (status in ('planned', 'confirmed', 'paid', 'cancelled')),
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists event_external_vendors_event_id_idx
  on public.event_external_vendors (event_id);
alter table public.event_external_vendors enable row level security;
revoke all on table public.event_external_vendors from anon, authenticated;
grant all on table public.event_external_vendors to service_role;

-- 4F Expenses
alter table public.events
  add column if not exists budget_total numeric(12,2);

create table if not exists public.event_expenses (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  title text not null,
  description text not null default '',
  category text not null default 'Other',
  amount numeric(12,2) not null check (amount >= 0),
  kind text not null default 'expense' check (kind in ('expense', 'credit')),
  status text not null default 'planned' check (status in ('planned', 'paid')),
  paid_on date,
  booking_id uuid references public.bookings(id) on delete set null,
  external_vendor_id uuid references public.event_external_vendors(id) on delete set null,
  receipt_path text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists event_expenses_event_status_idx
  on public.event_expenses (event_id, status);
create index if not exists event_expenses_event_category_idx
  on public.event_expenses (event_id, category);
alter table public.event_expenses enable row level security;
revoke all on table public.event_expenses from anon, authenticated;
grant all on table public.event_expenses to service_role;

insert into storage.buckets (id, name, public, file_size_limit)
values ('expense-receipts', 'expense-receipts', false, 10485760)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

create or replace function public.event_expense_totals(p_event_id uuid)
returns table (
  budget numeric,
  spent numeric,
  remaining numeric,
  category text,
  category_spent numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with budget as (
    select coalesce(e.budget_total, 0)::numeric as budget
    from public.events e
    where e.id = p_event_id
  ),
  totals as (
    select
      coalesce(sum(case when kind = 'expense' then amount else 0 end), 0)
      - coalesce(sum(case when kind = 'credit' then amount else 0 end), 0) as spent
    from public.event_expenses
    where event_id = p_event_id
  ),
  by_cat as (
    select
      category,
      coalesce(sum(case when kind = 'expense' then amount else -amount end), 0) as category_spent
    from public.event_expenses
    where event_id = p_event_id
    group by category
  )
  select
    b.budget,
    t.spent,
    (b.budget - t.spent) as remaining,
    coalesce(c.category, '') as category,
    coalesce(c.category_spent, 0) as category_spent
  from budget b
  cross join totals t
  left join by_cat c on true;
$$;

revoke all on function public.event_expense_totals(uuid) from public, anon, authenticated;
grant execute on function public.event_expense_totals(uuid) to service_role;
