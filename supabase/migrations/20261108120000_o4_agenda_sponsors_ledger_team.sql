-- O4: agenda track_id, sponsor payments, expense income, ledger view/RPC, event lead

-- Agenda → competition link
alter table public.event_agenda_items
  add column if not exists track_id uuid references public.hackathon_tracks(id) on delete set null;
create index if not exists event_agenda_items_track_id_idx
  on public.event_agenda_items (track_id)
  where track_id is not null;

-- Sponsor payment tracking
alter table public.event_sponsors_partners
  add column if not exists payment_status text not null default 'pending'
    check (payment_status in ('pending', 'partial', 'received'));
alter table public.event_sponsors_partners
  add column if not exists amount_received numeric(12,2) not null default 0
    check (amount_received >= 0);
alter table public.event_sponsors_partners
  add column if not exists received_on date;

-- Manual expense kinds: income | expense | credit
alter table public.event_expenses drop constraint if exists event_expenses_kind_check;
alter table public.event_expenses
  add constraint event_expenses_kind_check
  check (kind in ('expense', 'credit', 'income'));

-- Per-event lead on staff assignment
alter table public.event_staff_assignments
  add column if not exists lead_member_id uuid references public.team_members(id) on delete set null;

-- Unified ledger lines (automatic + manual). Superseded auto booking/own-vendor
-- lines are still listed for audit but totals exclude them.
create or replace view public.event_ledger_lines as
with
ticket_income as (
  select
    r.id::text as line_id,
    r.event_id,
    'auto_ticket'::text as source,
    'income'::text as direction,
    case when coalesce(r.payment_status, '') = 'paid' then 'received' else 'expected' end as status,
    coalesce(r.amount_paid, 0)::numeric(12,2) as amount,
    'Tickets'::text as category,
    coalesce(nullif(trim(r.attendee_name), ''), r.attendee_email, 'Registration')::text as title,
    ('/organizer/_/events/' || r.event_id::text || '/attendees')::text as source_path,
    null::uuid as booking_id,
    null::uuid as external_vendor_id,
    null::uuid as manual_expense_id,
    null::uuid as sponsor_id,
    false as superseded,
    r.created_at
  from public.registrations r
  where coalesce(r.status, '') not in ('cancelled', 'rejected')
    and coalesce(r.payment_status, '') in ('paid', 'pending')
    and coalesce(r.amount_paid, 0) <> 0
),
competition_income as (
  select
    t.id::text as line_id,
    t.event_id,
    'auto_competition'::text as source,
    'income'::text as direction,
    case when coalesce(t.fee_status, '') = 'fee_paid' then 'received' else 'expected' end as status,
    coalesce(tr.fee, 0)::numeric(12,2) as amount,
    'Competition fees'::text as category,
    coalesce(nullif(trim(t.name), ''), 'Team')::text as title,
    ('/organizer/_/events/' || t.event_id::text || '/attendees')::text as source_path,
    null::uuid as booking_id,
    null::uuid as external_vendor_id,
    null::uuid as manual_expense_id,
    null::uuid as sponsor_id,
    false as superseded,
    t.created_at
  from public.hackathon_teams t
  join public.hackathon_tracks tr on tr.id = t.track_id
  where coalesce(t.status, '') not in ('cancelled', 'disqualified')
    and coalesce(tr.fee, 0) <> 0
),
sponsor_expected as (
  select
    (s.id::text || ':expected') as line_id,
    s.event_id,
    'auto_sponsor_expected'::text as source,
    'income'::text as direction,
    'expected'::text as status,
    coalesce(s.contract_value, 0)::numeric(12,2) as amount,
    'Sponsorships'::text as category,
    (coalesce(nullif(trim(s.name), ''), 'Sponsor') || ' (expected)')::text as title,
    ('/organizer/_/events/' || s.event_id::text || '/sponsors')::text as source_path,
    null::uuid as booking_id,
    null::uuid as external_vendor_id,
    null::uuid as manual_expense_id,
    s.id as sponsor_id,
    false as superseded,
    s.created_at
  from public.event_sponsors_partners s
  where s.type = 'sponsor'
    and coalesce(s.contract_value, 0) > 0
),
sponsor_received as (
  select
    (s.id::text || ':received') as line_id,
    s.event_id,
    'auto_sponsor_received'::text as source,
    'income'::text as direction,
    'received'::text as status,
    coalesce(s.amount_received, 0)::numeric(12,2) as amount,
    'Sponsorships'::text as category,
    (coalesce(nullif(trim(s.name), ''), 'Sponsor') || ' (received)')::text as title,
    ('/organizer/_/events/' || s.event_id::text || '/sponsors')::text as source_path,
    null::uuid as booking_id,
    null::uuid as external_vendor_id,
    null::uuid as manual_expense_id,
    s.id as sponsor_id,
    false as superseded,
    s.created_at
  from public.event_sponsors_partners s
  where s.type = 'sponsor'
    and coalesce(s.payment_status, 'pending') in ('partial', 'received')
    and coalesce(s.amount_received, 0) > 0
),
booking_expense as (
  select
    b.id::text as line_id,
    b.event_id,
    'auto_booking'::text as source,
    'expense'::text as direction,
    case when b.status = 'completed' then 'paid' else 'planned' end as status,
    coalesce(b.total_amount, 0)::numeric(12,2) as amount,
    'Vendor'::text as category,
    coalesce(nullif(trim(b.service_type), ''), 'Vendor booking')::text as title,
    ('/organizer/_/events/' || b.event_id::text || '/vendors')::text as source_path,
    b.id as booking_id,
    null::uuid as external_vendor_id,
    null::uuid as manual_expense_id,
    null::uuid as sponsor_id,
    exists (
      select 1 from public.event_expenses e
      where e.event_id = b.event_id
        and e.booking_id = b.id
        and e.kind = 'expense'
    ) as superseded,
    b.created_at
  from public.bookings b
  where b.status in ('confirmed', 'completed')
    and coalesce(b.total_amount, 0) <> 0
),
own_vendor_expense as (
  select
    v.id::text as line_id,
    v.event_id,
    'auto_own_vendor'::text as source,
    'expense'::text as direction,
    case when v.status = 'paid' then 'paid' else 'planned' end as status,
    coalesce(v.budget, 0)::numeric(12,2) as amount,
    'Vendor'::text as category,
    coalesce(nullif(trim(v.name), ''), 'Own vendor')::text as title,
    ('/organizer/_/events/' || v.event_id::text || '/vendors')::text as source_path,
    null::uuid as booking_id,
    v.id as external_vendor_id,
    null::uuid as manual_expense_id,
    null::uuid as sponsor_id,
    exists (
      select 1 from public.event_expenses e
      where e.event_id = v.event_id
        and e.external_vendor_id = v.id
        and e.kind = 'expense'
    ) as superseded,
    v.created_at
  from public.event_external_vendors v
  where v.status in ('planned', 'confirmed', 'paid')
    and coalesce(v.budget, 0) <> 0
),
manual_lines as (
  select
    e.id::text as line_id,
    e.event_id,
    'manual'::text as source,
    case
      when e.kind = 'income' then 'income'
      when e.kind = 'credit' then 'income'
      else 'expense'
    end as direction,
    case
      when e.kind = 'income' then 'received'
      when e.kind = 'credit' then 'received'
      when e.status = 'paid' then 'paid'
      else 'planned'
    end as status,
    e.amount::numeric(12,2) as amount,
    coalesce(nullif(trim(e.category), ''), 'Other')::text as category,
    e.title::text as title,
    ('/organizer/_/events/' || e.event_id::text || '/expenses')::text as source_path,
    e.booking_id,
    e.external_vendor_id,
    e.id as manual_expense_id,
    null::uuid as sponsor_id,
    false as superseded,
    e.created_at
  from public.event_expenses e
)
select * from ticket_income
union all select * from competition_income
union all select * from sponsor_expected
union all select * from sponsor_received
union all select * from booking_expense
union all select * from own_vendor_expense
union all select * from manual_lines;

revoke all on public.event_ledger_lines from anon, authenticated;
grant select on public.event_ledger_lines to service_role;

create or replace function public.event_ledger_totals(p_event_id uuid)
returns table (
  income_received numeric,
  income_expected numeric,
  expenses_paid numeric,
  expenses_planned numeric,
  net numeric,
  projected_net numeric,
  budget numeric,
  category text,
  category_budget numeric,
  category_actual numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with lines as (
    select *
    from public.event_ledger_lines
    where event_id = p_event_id
      and not superseded
  ),
  -- Received = cash in (tickets paid, competition fee_paid, sponsor amount_received, manual income/credit).
  -- Expected (projected top-line) = sponsor contracts + all ticket/competition amounts (pending+paid)
  --   + manual income/credit. Sponsor received is not added on top of contract.
  sums as (
    select
      coalesce(sum(case
        when direction = 'income' and status = 'received'
          and source <> 'auto_sponsor_expected' then amount
        else 0 end), 0) as income_received,
      coalesce(sum(case
        when source = 'auto_sponsor_expected' then amount
        when source in ('auto_ticket', 'auto_competition') then amount
        when source = 'manual' and direction = 'income' then amount
        else 0 end), 0) as income_expected,
      coalesce(sum(case when direction = 'expense' and status = 'paid' then amount else 0 end), 0) as expenses_paid,
      coalesce(sum(case when direction = 'expense' and status = 'planned' then amount else 0 end), 0) as expenses_planned
    from lines
  ),
  budget as (
    select coalesce(e.budget_total, 0)::numeric as budget
    from public.events e
    where e.id = p_event_id
  ),
  by_cat as (
    select
      category,
      coalesce(sum(case when direction = 'expense' and status = 'planned' then amount else 0 end), 0) as category_budget,
      coalesce(sum(case when direction = 'expense' and status = 'paid' then amount else 0 end), 0) as category_actual
    from lines
    where direction = 'expense'
    group by category
  )
  select
    s.income_received,
    s.income_expected,
    s.expenses_paid,
    s.expenses_planned,
    (s.income_received - s.expenses_paid) as net,
    (s.income_expected - (s.expenses_paid + s.expenses_planned)) as projected_net,
    b.budget,
    coalesce(c.category, '') as category,
    coalesce(c.category_budget, 0) as category_budget,
    coalesce(c.category_actual, 0) as category_actual
  from sums s
  cross join budget b
  left join by_cat c on true;
$$;

revoke all on function public.event_ledger_totals(uuid) from public, anon, authenticated;
grant execute on function public.event_ledger_totals(uuid) to service_role;
