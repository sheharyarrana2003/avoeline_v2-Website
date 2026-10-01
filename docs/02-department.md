# Department — Club Management & Analytics

Applies to: `/department` routes, `department_admin` role, scoped to `organizations` where `parent_org_id` = their own department org.

## New tables

```sql
-- "Year-wise teams, events and tenures" — a club's history is organized into tenures
-- (academic years / committee terms), not just a flat member list.
create table org_tenures (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade, -- the club
  label text not null, -- e.g. "2025-2026"
  start_date date not null,
  end_date date not null,
  is_current boolean default false,
  created_at timestamptz default now()
);

-- Which tabs/modules a department has enabled for a given club — department decides
-- what its clubs can access, independent of the SaaS owner's plan gating on organizers.
create table org_module_access (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade, -- the club
  module_key text not null, -- 'budget','teams','sponsors','certificates', etc.
  enabled boolean default true,
  granted_by uuid references users(id),
  unique (org_id, module_key)
);

create table org_announcements (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  body text not null,
  created_by uuid references users(id),
  created_at timestamptz default now()
);
```

## Schema changes to existing tables
- `teams`: add `tenure_id uuid references org_tenures(id)` — a club committee team is scoped to one tenure, so switching to a new tenure starts a fresh committee roster without deleting the previous one's history.
- Events don't need a `tenure_id` FK — filter by `events.created_at` falling within a tenure's `start_date`/`end_date` range for year-wise reporting, since an event's date is already meaningful data on its own.

## Feature checklist

- **Club events/budget/teams**: reuse the existing `events` (filtered by `org_id`), `budget_entries` (filtered by `org_id`), and `teams` (context_type = `'club_committee'`) tables — no new tables needed here, just scoped queries.
- **Year-wise view**: a tenure selector (dropdown of `org_tenures` for the selected club) filters the teams/events/budget views to that period. Default to the tenure where `is_current = true`.
- **Club account creation**: same admin-created-account pattern as `01-saas-owner.md`'s tenant management — reuse that exact flow, just invoked from the department dashboard instead of the platform admin dashboard, with `parent_org_id` set to the department.
- **Dashboard access to clubs**: department toggles `org_module_access` rows per club — the club president's dashboard checks this table to decide which tabs render, in addition to whatever the org's own plan/override state allows.
- **Export sheets**: reuse the existing Excel export utility (same one built for Certificates & Data Exports) — do not write a second export function, just point it at club-scoped queries (budget_entries, registrations across the club's events, team rosters).
- **Announcements**: department creates an `org_announcements` row targeting a specific club (or all clubs, by inserting one row per club, or add a `broadcast_to_all boolean` flag and resolve at read time) — surfaces on the club president's dashboard and optionally triggers a notification via the existing notification helper.

## Department Analytics (filter-wise)

Build one analytics view with filter controls, not separate pages per filter:
- Filters: by club, by tenure/year, by event category, by date range
- Metrics: total events, total registrations, total revenue/budget, average attendance rate — aggregate from `events`, `registrations`, `budget_entries` scoped to the department's child clubs (`organizations` where `parent_org_id = <department id>`)
- For performance, see `08-build-flow-and-optimization.md` on when to use a materialized view instead of computing this live on every dashboard load.
