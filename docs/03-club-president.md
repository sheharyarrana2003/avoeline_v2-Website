# Club President — Portal

Applies to: `/club/[orgId]` routes, users with `org_memberships.role = 'president'` or `'executive'` for that club.

## New table

```sql
-- Generic upward-request system: budget requests, event approval requests, anything
-- a club needs to ask its department for. One table, a request_type column, not
-- a separate table per request kind.
create table org_requests (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade, -- the requesting club
  request_type text not null check (request_type in ('budget','event_approval','other')),
  title text not null,
  details text,
  requested_amount numeric, -- only relevant for request_type = 'budget'
  status text default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by uuid references users(id),
  review_note text,
  requested_by uuid references users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

## Feature checklist

- **Team and roles**: reuse `teams` (context_type `'club_committee'`, scoped to the club's current `org_tenures` row) + `team_positions` for named roles (President, VP, Secretary, Registration Lead, etc.) — same pattern as the earlier team redesign, not a new system.
- **Event dashboard / registrations**: standard `events`/`registrations` tables, filtered to `org_id = this club`. This is identical to the organizer event dashboard (`04-organizer.md`) — reuse that same dashboard component, just pre-scoped to the club's org_id rather than an individual organizer_id.
- **Analytics**: club-scoped version of the same analytics view described in `02-department.md`, minus the cross-club filter (a club only ever sees its own data).
- **Budget to department**: club submits an `org_requests` row with `request_type = 'budget'`. Department sees these in their own request queue (add to the department dashboard) and approves/rejects. On approval, optionally auto-create a corresponding `budget_entries` row with `entry_type = 'income'`.
- **Assign portal access to team/leads**: reuse `team_positions.permissions` — e.g. a "Registration Lead" position with `permissions = {'registrations:manage'}` limits that member's dashboard to the Registrations tab only. Same permission-check function as everywhere else (see `00-INDEX.md`'s cross-cutting rule).
- **Sponsors/Partners**: reuse `event_sponsors_partners`, scoped through the club's events.
- **Certificates**: reuse `certificates`/`certificate_templates`, scoped through the club's events.
- **Requests**: the `org_requests` table above also covers non-budget requests (e.g., requesting department approval to run an event under the department's name, or requesting a module be enabled) — use `request_type = 'event_approval'` or `'other'` as needed rather than adding new tables per request kind.
