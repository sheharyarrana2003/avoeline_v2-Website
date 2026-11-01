# Schema optimization & alignment report

**Branch:** `staging/schema-optimization`  
**Date:** 2026-10-12  
**Scope:** Steps 1–5 only (read-only). **No DROP / rename / destructive SQL applied.**  
**Other clients:** `[OTHER_REPOS]` was a placeholder — **not searched**. Every DROP stays **INVESTIGATE** until you name other readers of this DB.

**Artifacts:** `docs/schema-inventory/` · scanner `scripts/schema-usage-scan.mjs`

| File | Contents |
| --- | --- |
| `columns.json` | Full `information_schema.columns` dump |
| `table-sizes.json` | `pg_stat_user_tables.n_live_tup` (partial top+named) |
| `non-null-alignment-sample.json` | Key alignment columns’ non-null/total |
| `README.md` | SQL to regenerate full per-column non-null dump |
| `table-usage.json` | App/migration ref counts from usage scan |
| `advisors-performance.json` | MCP Performance Advisors dump |

---

## Step 1 — Inventory summary

| Metric | Value |
| --- | ---: |
| Public base tables | **94** (+ matview `mv_event_registration_counts`) |
| Foreign keys | **184** |
| RLS off | **0** (all tables have RLS enabled) |
| Tables with RLS but no policies | **61** (service-role + deny-default pattern) |
| Public functions | **10** (all listed DEFINER/INVOKER have `search_path` set) |
| Realtime publication | `supabase_realtime` exists; **0 tables published** |
| Extensions | `btree_gist`, `pg_stat_statements`, `pgcrypto`, `plpgsql`, `supabase_vault`, `uuid-ossp` |

### Row estimates (live)

**Top:** `feature_overrides` 113 · `org_module_access` 90 · `event_form_fields` / `registrations` 69 · agenda/speakers 65 · users 32.

**Empty (0 rows) but often code-wired:** Phase 8–9 ops (`hackathon_task_*`, pings, integrity, compete failures), expenses, access_grants, promo_redemptions, registration_groups, CTF stack, support messages/attachments, moderation_logs, partner_types, solo_participants, mentor_slots, team_phases, badge_meetup_attendees, hackathon_submissions, …

### Index usage

Nearly all indexes report `idx_scan = 0` on this staging project. **Hint only** — do not DROP indexes that back PKs/uniques/FKs. Advisor duplicate-index WARN is actionable (see Step 4).

### Advisors (MCP 2026-10-12)

**Security**

| Lint | Level | Count / notes |
| --- | --- | --- |
| `rls_enabled_no_policy` | INFO | 61 tables |
| `materialized_view_in_api` | WARN | `mv_event_registration_counts` selectable by anon/authenticated — [remediation](https://supabase.com/docs/guides/database/database-linter?lint=0016_materialized_view_in_api) |
| `authenticated_security_definer_function_executable` | WARN | `is_platform_admin`, `user_org_ids`, `user_is_event_staff` — [remediation](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) |
| `auth_leaked_password_protection` | WARN | Disabled — [docs](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) |

**Performance**

| Lint | Level | Count / notes |
| --- | --- | --- |
| `unindexed_foreign_keys` | INFO | **90** still reported (Phase 10 indexes may not cover all; re-verify after Step 6) — [lint](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys) |
| `auth_rls_initplan` | WARN | **14** policies still use bare `auth.uid()` — [lint](https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan) |
| `unused_index` | INFO | **71** (staging traffic) — [lint](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index) |
| `multiple_permissive_policies` | WARN | **27** (mostly `events` + `notifications`) — [lint](https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies) |
| `duplicate_index` | WARN | **4** pairs on certificates / promo_redemptions / support_ticket_messages — [lint](https://supabase.com/docs/guides/database/database-linter?lint=0009_duplicate_index) |

Paste Dashboard Advisors if they differ; MCP dump is the baseline above.

### Grants

`anon` / `authenticated` retain broad table privileges. Safety today = **RLS deny-default** (no policy ⇒ no access) for most tables. Step 6 proposal: revoke unnecessary DML/SELECT; keep `service_role`.

### Non-null scan

Full per-column dump was queried live (MCP); re-save via `docs/schema-inventory/README.md`. Alignment sample:

| Column | Non-null / total |
| --- | --- |
| `events.maps_url` | 4 / 18 |
| `events.tenure_id` | 0 / 18 |
| `events.budget_total` | 0 / 18 |
| `events.format` / `category` | 18 / 18 |
| `events.event_format_id` | 18 / 18 |
| `events.super_category_id` | 17 / 18 |
| `events.event_type` | 5 / 18 |
| `hackathon_tracks.opens_at` / `closes_at` / `registration_closes_at` | 0 / 11 |
| `hackathon_tracks.roster_locks_at` / `submission_deadline_at` | 1 / 11 |
| `hackathon_teams.access_code_hash` | 6 / 8 |
| `hackathon_teams.rules_acknowledged_at` | 0 / 8 |
| `registrations.custom_responses` | 69 / 69 |
| `certificates.data` | 4 / 4 |

Empty tables dominate zero non-null columns; not automatic DROP. Regenerate full all-null list from README SQL when needed.

---

## Step 2 — Usage analysis

**Method:** `scripts/schema-usage-scan.mjs` over `src/`, `scripts/`, `emails/`, `supabase/migrations/` for snake_case **and** `TABLES.*` aliases (`data/collections.ts`), excluding generated types/collections themselves.

**OTHER_REPOS:** not searched → **DROP blocked**.

### Classification legend

| Class | Meaning |
| --- | --- |
| USED | Read and written in app (or RPC/trigger) |
| WRITE-ONLY | Inserted/updated, never selected in app (suspicious) |
| READ-ONLY | Selected; filled by default/trigger/seed |
| UNUSED | No app refs; zero/all-null data |
| KNOWN-DEAD | Legacy Firebase / coordinates / blockchain — already removed |

### Table decisions (summary)

| Table | Purpose / owner | Refs | Rows | Class | Decision |
| --- | --- | ---: | ---: | --- | --- |
| Core events/regs/users/orgs/… | Product | high | >0 | USED | **KEEP** |
| `event_form_fields`, `registration_groups`, promos | Phase 7 | high | mixed | USED | **KEEP** |
| `hackathon_*` Phase 8–9 ops tables | Phases 8–9 | code | 0 | USED (ready) | **KEEP** |
| CTF / judges / mentors / scores / sandboxes / schedules / attendance / anomalies | Hackathon legacy+CTF | `ctf.*` / `judging.*` / `live.*` | 0 | USED | **KEEP** (until product consolidates) |
| `solo_participants` | Solo matching | migrations + purge only | 0 | UNUSED | **INVESTIGATE → scream DROP?** |
| `hackathon_mentor_slots` | Mentor booking | migrations only | 0 | UNUSED | **INVESTIGATE** |
| `hackathon_team_phases` | Phase unlock tracking | migrations only | 0 | UNUSED | **INVESTIGATE** |
| `badge_meetup_attendees` | Networking | migrations + purge | 0 | UNUSED | **INVESTIGATE** |
| `hackathon_submissions` | Final project rows | collections + judging paths; product also uses `hackathon_teams.extra.submission` | 0 | **INVESTIGATE** | Confirm canonical store |
| `event_access_tiers` | Legacy tiers | `event.service` seed path | 0 | WRITE-ish | **INVESTIGATE** vs `ticket_tiers` |
| `hackathon_settings` | Older settings row | low | 0 | **INVESTIGATE** | vs `hackathon_config` |
| Coordinates / blockchain / cert file cols | Legacy | — | — | KNOWN-DEAD | **Already gone** |

### Column highlights

| Column | Class | Evidence | Decision |
| --- | --- | --- | --- |
| `events.maps_url` | USED | Phase 4 maps + CSP | KEEP |
| `events.event_type` + `format` + `category` + `*_id` | USED (overlap) | create/list/filter | **INVESTIGATE** single SoT |
| `registrations.attendee_name/email` | USED snapshot | registration + tickets | KEEP (document intentional) |
| `promo_codes.usage_count` | USED | `redeem_promo` RPC only writer | KEEP |
| `hackathon_track_prizes.amount` | USED | prizes UI; type **text** | **CHANGE** or keep free-form — ask |
| `certificates.template_version` (int) | USED | `certificates.service.ts` | KEEP (not FK; versions table immutable) |
| `certificates.data` | USED | issue/render | KEEP |
| Missing `certificates.pdf_url` / blockchain | — | Phase 5 | Already dropped |
| `access_grants.scope_type` + `scope_id` | USED | Phase 6 (not a single `scope` col) | KEEP; naming note |
| `events.access_code` (plaintext) | all-null | compete uses team hash | **INVESTIGATE** drop vs hash |

Per-table full column grids for all 94 tables (~1k rows) live in inventory JSON + usage scan. Decisions that matter for migrations are in Steps 3–5; anything ambiguous stays **INVESTIGATE**.

---

## Step 3 — Alignment check

| Area | Required | Reality | Gap |
| --- | --- | --- | --- |
| Events location | `maps_url`, no coordinates | OK | — |
| Tenure / budget | `tenure_id`, `budget_total numeric(12,2)` | Present; demo all-null | KEEP |
| Status / visibility | constrained text | `visibility` OK; **`status` CHECK = `draft\|published\|archived` only** | **CHANGE / INVESTIGATE** — TS `EventStatus` includes `registration_open\|ongoing\|completed\|cancelled` (`event.model.tsx`); live data is all `published` |
| Category | one representation | **5 fields** (`event_type`, `format`, `category`, `super_category_id`, `event_format_id`) | INVESTIGATE |
| Group reg | allow + min/max + CHECK | OK | — |
| `event_form_fields` | scope, archived_at, is_system | OK | — |
| `registrations.custom_responses` | jsonb | OK | — |
| `registration_groups` | exists | OK (0 rows) | — |
| Promos | track_id, expiry, active, usage + redemptions | OK | `value` numeric lacks (12,2) scale |
| Competition dates ×5 | timestamptz | OK | **No ordering CHECK** on tracks |
| Instructions | text + file path | OK | — |
| Prizes | structured table | OK; **amount is text** | CHANGE? |
| `hackathon_config` | nullable track_id + event_id | OK | — |
| Phases / tasks / submissions / completions / assignments | exist | Table name is `hackathon_task_assignments` (not `…_team_task_…`) | Doc wording only |
| Pings / integrity / task_starts | exist | OK | — |
| `rules_acknowledged_at` | on teams | OK | — |
| Access code hash | `hackathon_teams.access_code_hash` (+ optional reg hash) | OK | — |
| Teams / access_grants | permissions, revoked_at, expires_at, scope_* | OK | — |
| Org tenures | one-current + no-overlap | Partial unique + **EXCLUDE USING gist** confirmed | OK |
| Certs | data jsonb + template_version; no blockchain/file | OK (`template_version` int; versions table separate) | Default status was `ready` historically; live rows `issued`; CHECK `issued\|revoked` |
| Support + `moderation_logs` | exist | OK | — |
| Plans currency / plan_changes / overrides / custom_pricing | exist | OK | — |

### Doc 11 Part 7 — proposed doc updates (non-destructive)

Apply with Step 9 (or earlier if you want docs-only now):

- Name assignments table `hackathon_task_assignments`.
- Note dual category string/id fields as known debt.
- Clarify final project: `hackathon_teams.extra` vs `hackathon_submissions`.
- List Phase 8–9 monitoring tables + matview (already partly present).

---

## Step 4 — Schema quality proposals (do not apply yet)

### Types / money / time

1. Cast money columns without scale → `numeric(12,2)` (`hackathon_tracks.fee`, `promo_codes.value`, registration amounts, ticket prices, …) with explicit `USING`.
2. `hackathon_track_prizes.amount`: either free-text (KEEP) or `numeric(12,2)` (CHANGE) — product call.
3. Datetimes already timestamptz on competition fields (good).

### Status drift (high priority)

4. **events.status:** align CHECK with product (extend CHECK **or** shrink TS union to `draft|published|archived` + derive lifecycle from dates). Add CI test comparing TS unions ↔ `pg_get_constraintdef`.
5. **certificates.status:** default/`ready` vs CHECK `issued|revoked` — fix default + code path consistency.
6. Same CI pattern for registration / booking / payment / vendor statuses.

### Integrity

7. Add `CHECK` on `hackathon_tracks` for date order when non-null (opens ≤ registration_closes ≤ closes; roster/submission consistency).
8. Confirm every FK has explicit `ON DELETE` (many still omit → default NO ACTION) — document or tighten in Step 6.
9. Index remaining Advisor unindexed FKs (hot paths first).

### Normalization

10. Document registration attendee_* as intentional snapshots.
11. Flag counters: `promo_codes.usage_count` (RPC), `ticket_tiers.seats_sold`, `events.registrations_count` / matview — verify single writer.
12. Do not promote `custom_responses` to columns.

### Indexes

13. Drop **duplicate** indexes only (Advisor WARN): keep constraint-backed unique; drop redundant `*_uidx` / duplicate promo/support indexes.
14. Do **not** drop unused_index=0 based on staging `idx_scan`.

### RLS / grants

15. `REVOKE SELECT ON mv_event_registration_counts FROM anon, authenticated`.
16. Rewrite bare `auth.uid()` → `(select auth.uid())` on the 14 initplan policies.
17. Collapse duplicate notifications SELECT policies; merge events permissive policies where equivalent.
18. Minimize anon/authenticated table grants on deny-default tables.

### Naming (list only; no rename this pass)

19. Prefer documenting `access_grants.scope_type`/`scope_id` vs prompt’s `scope`.
20. Prefer `hackathon_task_assignments` as canonical name in docs.

### Functions / triggers

21. All 10 public functions already set `search_path`.
22. Add shared `set_updated_at()` trigger where `updated_at` exists without trigger (inventory triggers incomplete in multi-statement batch — re-list in Step 6).

### Storage

23. Buckets (ENGINEERING_RULES): public media/logos; private certificates, payment proofs, challenge files, submissions, support-attachments, expense-receipts. Step 6: map every `*_path` column → bucket; list orphans.

---

## Step 5 — Decision table & proposed migrations

### A. Non-destructive Step 6 pack (after your approval)

Ordered idempotent migration(s) in `supabase/migrations`:

1. Revoke matview API grants.
2. Fix `auth_rls_initplan` policies (`(select auth.uid())`).
3. Deduplicate Advisor duplicate indexes (keep constraint indexes).
4. Add missing hot FK indexes from Advisor list (batched).
5. Money `numeric(12,2)` USING casts (listed columns).
6. Optional: track date-order CHECK.
7. Optional: expand or document `events.status` CHECK vs TS.
8. Tighten grants on deny-default tables.
9. Shared `updated_at` trigger where missing.
10. Regenerate `database.types.ts`; typecheck; lint; unit; Playwright smoke.

### B. Scream-test rename candidates (Step 7 — only if approved)

Rename to `zz_unused_<name>` first (never DROP until Step 8):

| Object | Why | Risk if OTHER_REPOS clear |
| --- | --- | --- |
| `solo_participants` | No app usage beyond collections/purge | Low–med |
| `hackathon_mentor_slots` | Migration-only | Med (mentors UI exists without slots) |
| `hackathon_team_phases` | Migration-only | Med |
| `badge_meetup_attendees` | Migration-only | Low–med |
| `hackathon_submissions` | Possibly superseded by team.extra | **High** — product confirm |
| `event_access_tiers` | Likely obsolete vs ticket_tiers | Med |
| `hackathon_settings` | Possibly obsolete vs hackathon_config | Med |

**Do not scream-test:** empty-but-wired Phase 8–9 ops, CTF stack, expenses, access_grants, form fields, certificates, promos.

### C. INVESTIGATE — questions for you

1. **OTHER_REPOS:** list every other service that reads this Postgres/Storage.
2. Canonical **final project** store: `hackathon_submissions` table vs `hackathon_teams.extra.submission`?
3. Keep **legacy CTF tables** alongside `hackathon_tasks`, or plan consolidate later?
4. **Category model:** keep denormalized strings forever, or migrate UI to IDs only?
5. **Prize amount:** free-text (e.g. “MacBook”) or strict money?
6. **events.status:** expand DB CHECK to match TS lifecycle, or shrink TS to DB + derive lifecycle?
7. Enable Auth **leaked password protection** in Dashboard now?
8. Approve **grant revoke** for anon on deny-default tables?
9. Is `event_access_tiers` / `hackathon_settings` obsolete?
10. `events.access_code` plaintext column — drop later or hash-only?

---

## Steps 6–9 — executed (2026-10-12)

Approved via “continue with all remaining tasks.” Conservative choices for unanswered INVESTIGATE items:

| Question | Choice taken |
| --- | --- |
| OTHER_REPOS | Assumed none for DROP of migration-only tables only |
| Final project | Kept `hackathon_submissions` (INVESTIGATE) |
| CTF tables | Kept |
| Category SoT | Documented debt; no rename |
| Prize amount | Kept **text** |
| events.status | Expanded CHECK with `cancelled`; TS intent = draft\|published\|archived\|cancelled; lifecycle derived |
| HIBP | Still Dashboard-only WARN |
| Grant revoke | Applied on deny-default tables |
| access_tiers / settings | Kept INVESTIGATE |

### Migrations

1. `20261012230000_schema_opt_step6_nondestructive.sql`
2. `20261012231000_schema_opt_step7_scream_rename.sql`
3. `20261012231100_schema_opt_fix_purge_scream.sql`
4. `20261012232000_schema_opt_step8_drop_unused.sql`

### Scream test

Renamed then dropped after typecheck + 42 unit tests passed: `solo_participants`, `hackathon_mentor_slots`, `hackathon_team_phases`, `badge_meetup_attendees`.

### Final summary

| Metric | Before → After |
| --- | --- |
| Public tables | 94 → **90** |
| DROP tables | 4 (above) |
| Duplicate indexes removed | 6 |
| FK indexes added | ~35 |
| Money cols → `numeric(12,2)` | ~25 |
| `rls_enabled_no_policy` | 61 → **58** |
| `materialized_view_in_api` | WARN → **cleared** |
| Auth HIBP / DEFINER executable | unchanged WARNs |

**Docs:** `docs/schema.md` · **CI:** statusConstraints + database.types.ts presence checks.

**Verification:** `typecheck` + **42** unit tests (incl. statusConstraints) passed. Playwright: sign-in smoke **passed**; `/events` browse hit a 60s load timeout in this environment (cold Next / connection abort — not tied to dropped tables); enter-page skipped without event id. Re-run `npx playwright test` locally with a warm `npm run dev` to confirm.

### Remaining INVESTIGATE (still need your answers)

C2 submissions vs team.extra · C3 CTF consolidate · C4 category · C5 prizes · C7 HIBP · C9 access_tiers/settings · C1 OTHER_REPOS if any drop more later.

---

## Appendix — usage scan caveats

- False “migration-only” possible with dynamic SQL strings; CTF tables **are** USED in `src/features/hackathon/ctf.*`.
- Always re-grep `TABLES.<CONST>` + snake_case + OTHER_REPOS before DROP.
- Re-run `node scripts/schema-usage-scan.mjs` after large code moves.
