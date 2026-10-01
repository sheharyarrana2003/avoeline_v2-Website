# Build Flow, Parallelization & Database Optimization

## Build order for this feature batch

Everything in docs 01–07 sits ON TOP of the already-built Foundational Modules, Tenancy model, and Team redesign — build in this order:

1. **`01-saas-owner.md`** — subscription/tenant tables first, since `04-organizer.md`'s gating function depends on `subscription_plans` and `feature_overrides` existing.
2. **`04-organizer.md`** — the gating function and module_key list, since almost everything else checks against it.
3. **`02-department.md` → `03-club-president.md`** — in that order, since club tenures/module-access are department-controlled.
4. **`06-hackathon-participant.md` → `07-hackathon-organizer-config.md`** — build the task/phase data model (participant doc) before the organizer config screen that manages it, since the config screen is just a UI over that data model.
5. **`05-networking-badges.md`** — last, since it references user_badges across all other roles and reads more cleanly once organizer/vendor profiles have more real data shape from the steps above.

## Parallelizing the actual build work

"Parallel calls" here means two different things — do both:

### A. Parallel AI sessions (saves wall-clock time, not tokens)
Once step 2 above (organizer gating) is done, steps 3, 4, and 5 touch almost entirely different files and tables — run them as **separate Cursor/Antigravity sessions at the same time** instead of one long sequential session:
- Session A: Department + Club President (docs 02-03)
- Session B: Hackathon participant + config (docs 06-07)
- Session C: Networking + Badges (doc 05)

Use separate git branches or worktrees per session to avoid merge conflicts, and merge each back to main once its own module is verified working — do not let three agent sessions write to the same branch simultaneously.

### B. Parallel database calls (saves tokens AND real performance)
Any dashboard that loads multiple independent stats (e.g., the department analytics view pulling event count, budget total, and registration count) should fire those queries concurrently, not as sequential awaited calls:

```ts
// Wrong — three round trips in sequence
const events = await supabase.from('events').select('*').eq('org_id', orgId);
const budget = await supabase.from('budget_entries').select('*').eq('org_id', orgId);
const regs = await supabase.from('registrations').select('*').in('event_id', eventIds);

// Right — fired together
const [events, budget, regs] = await Promise.all([
  supabase.from('events').select('*').eq('org_id', orgId),
  supabase.from('budget_entries').select('*').eq('org_id', orgId),
  supabase.from('registrations').select('*').in('event_id', eventIds),
]);
```
Tell Antigravity/Cursor explicitly to use `Promise.all` for any screen with more than one independent data need — this is a common thing agents skip unless told, defaulting to sequential awaits.

## Database optimization checklist (apply across every doc above)

1. **Use Postgres joins, not app-level loops.** For anything like "get all clubs under a department with their event counts," use a single Supabase query with a nested select (`organizations.select('*, events(count)')`) instead of fetching clubs, then looping to fetch each club's events separately (classic N+1).
2. **Materialized views for expensive aggregates.** The Department Analytics view (`02-department.md`) and platform-wide admin dashboard should NOT recompute sums/counts live on every page load once data volume grows — create a materialized view refreshed on a schedule (e.g., every 15 minutes via a Postgres cron job or Supabase scheduled function) for anything aggregating across many rows.
3. **Index every foreign key used in a WHERE or JOIN.** The base schema already indexes the obvious ones (`org_id`, `event_id`, `parent_event_id`) — when adding the new tables in docs 01–07, add an index on every new foreign key column (`badge_meetups.badge_tier_id`, `hackathon_tasks.track_id`, `org_requests.org_id`, etc.) as part of the same migration, not as an afterthought.
4. **Use `count: 'estimated'` for large-table counts, `'exact'` only when correctness matters.** Supabase's exact count on a large table (e.g., total registrations platform-wide) is expensive — use estimated counts for dashboard "roughly how many" displays, exact counts only for things like capacity limits where the number must be precise.
5. **Batch writes.** Anything that creates many rows at once (e.g., bulk certificate issuance, bulk inviting a whitelist CSV) should use a single batched insert, not one insert call per row in a loop.
6. **Use RPC/Postgres functions for multi-step transactional operations.** "Accept an applicant" (from the Advanced Team Management doc) touches both `applicants` and `team_members` — wrap this in a single Postgres function called via `supabase.rpc(...)` so it's one round trip and one transaction, not two separate client calls that could partially fail.
