# SaaS Owner — Subscription & Tenant Management

Applies to: `/admin` routes, `platform_admin` role only.

## 1. Subscription Management

### New tables
```sql
create table subscription_plans (
  id uuid primary key default gen_random_uuid(),
  key text unique not null, -- 'free' | 'pro' | 'enterprise'
  name text not null,
  price_monthly numeric,
  included_modules text[] default '{}', -- module keys, see 04-organizer.md
  created_at timestamptz default now()
);

create table plan_changes (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references users(id),
  from_plan text,
  to_plan text not null,
  changed_by uuid references users(id), -- self-serve or admin-initiated
  reason text,
  created_at timestamptz default now()
);

-- The "bonus features unlock for some specific regardless of plan" requirement:
-- an override layer that sits ABOVE plan tier, not tied to it.
create table feature_overrides (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references users(id),
  module_key text not null, -- same keys as 04-organizer.md's paid module list
  granted_by uuid references users(id),
  reason text,
  expires_at timestamptz, -- null = permanent
  created_at timestamptz default now()
);

-- Custom pricing/budget arrangements per account ("custom budget management for specifics")
create table custom_pricing_agreements (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references users(id),
  discount_pct numeric,
  flat_monthly_override numeric,
  notes text,
  set_by uuid references users(id),
  active boolean default true,
  created_at timestamptz default now()
);
```

### Feature checklist
- Plan change/upgrade: admin picks a new `subscription_plans.key` for an organizer, writes a `plan_changes` row, updates `organizer_profiles.plan_type`. Reuse the module-activation check everywhere else already reads `organizer_profiles.plan_type` — do not add a second source of truth.
- Plan cancellation: sets `plan_type` back to `'free'`, does NOT delete any existing data (events, certificates, etc. stay intact) — only future access to paid modules is revoked.
- Bonus feature unlock: admin creates a `feature_overrides` row for a specific organizer/module combination. The module-gating check function must check `feature_overrides` in addition to plan tier — a feature is available if EITHER the plan includes it OR an active override exists.
- Custom budget: admin creates a `custom_pricing_agreements` row. This is informational/billing-only — it does not gate feature access, only affects what the organizer is actually charged (relevant when real payment integration is added later).

## 2. Tenant Ongoing Management

Covers organizers, departments, and vendors uniformly — reuse the same approval/rejection UI pattern across all three tenant types, parameterized by `org_type` or `user_type`.

### Approval/Rejection
- Departments and clubs: `organizations.is_verified` flag, toggled from an admin approval queue (already partially designed in earlier docs — extend the queue to show pending departments alongside pending category requests).
- Vendors: `vendor_profiles.status` (`pending`/`approved`/`suspended`/`rejected`) — already in the schema, just needs the admin UI.
- Organizers: typically auto-approved on signup, but support the same manual review flow for flagged/suspicious accounts via `organizer_profiles` — add a `review_status` column if manual organizer approval becomes required.

### Admin-created accounts ("account setup or creating pass and email for specifics")
- A form on `/admin/tenants/new`: admin enters name + email + tenant type (organizer/department/vendor), system generates a random temporary password, creates the Supabase Auth user directly (via Supabase Admin API, server-side only — never expose the service role key client-side), creates the matching `users` row, and sends a "welcome, here's your temp password, please reset" email via the existing notification helper.
- Force password reset: add a `must_reset_password boolean default false` column to `users`, set true on admin-created accounts, checked on first login to redirect to a mandatory password-change screen before anything else loads.

### Dashboard Management ("what to assign whom")
- Reuse `team_positions`/permissions pattern from the core team module, but at the tenant level: an admin can grant a department/organizer/vendor account specific dashboard tab visibility independent of their plan (e.g., a department that hasn't paid for analytics yet can still be manually granted the Analytics tab). This is a natural extension of `feature_overrides` above — same table, just also usable for non-organizer tenant types (add a `target_org_id` alternative to `organizer_id` if the override applies to a department/club rather than an individual organizer).
