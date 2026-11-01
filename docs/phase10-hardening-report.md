# Phase 10 — Hardening report

**Date:** 2026-10-12 (initial) · **Gap closure:** 2026-10-18  
**Baseline:** [`docs/audit-report.md`](audit-report.md) (Phase 0)  
**Branch:** `staging/schema-optimization`

## 1. Security re-audit (vs Phase 0)

| ID | Was | Now | Notes |
| --- | --- | --- | --- |
| A-001 uploadMedia | critical | **Closed** | Session + bucket/folder allowlist |
| A-002–A-004 media/review | critical | **Closed** | AuthService ownership checks |
| A-005 Enter View / S9 | critical | **Closed** | No Enter View (Phase 2); admin detail only |
| A-006–A-008 | high | **Closed / mitigated** | Team helper internal; ticketing/invite hardened in later phases |
| S-001 .env* | high | **Closed** | `.gitignore` has `.env*` / `!.env.example` |
| S-002 compete secret | high | **Closed** | `requireCompeteSecret` — no service-role fallback |
| DB-003 certificates open SELECT | critical | **Closed** | No open SELECT; deny-default |
| DB-004 notifications open INSERT | critical | **Closed** | Insert self-only |
| DB-005 hackathon_tasks | high | **Closed** | Scoped SELECT (owner/staff/participant) |
| DB-008 DEFINER EXECUTE | high | **Partial** | **anon** revoked; authenticated kept for RLS policy helpers |
| CSP | report-only | **Enforced** | `Content-Security-Policy` + HSTS |
| npm audit high/critical | open | **Residual** | Transitive `sharp` (via Next) + `exceljs`/`uuid` need major bumps; force would move Next→16.4 — **deferred** |

### Advisors — before / after gap pass (2026-10-18 refresh)

| Advisor | Before (Phase 10 ship) | After gap pass | Notes |
| --- | --- | --- | --- |
| Security `rls_enabled_no_policy` | ~58 INFO | **58 INFO** | Intentional deny-default / service-role tables |
| Security DEFINER executable (authenticated) | 3 WARN | **3 WARN** | `is_platform_admin`, `user_is_event_staff`, `user_org_ids` — needed for JWT RLS |
| Auth HIBP leaked-password | WARN | **WARN** | Enable in Supabase Auth dashboard (C7) — no migration |
| Performance unindexed FKs | many INFO | **46 INFO** | Cold/legacy FKs; hot paths already indexed in Phase 10 + schema Step 6 — **no new indexes this pass** |
| Performance unused indexes | many INFO | **103 INFO** | Expected on low-traffic staging; do not drop blindly |
| Performance multiple permissive policies | WARN on events | **22 WARN** | Known events/notifications policy stacking |

**Storage (ENGINEERING_RULES S3):** private buckets (`certificates`, `payment-screenshots`, `hackathon-challenge-files`, `hackathon-submissions`, `support-attachments`, `expense-receipts`) are `public=false`. Public SELECT policies only on `media` and `sponsor-logos`.

**RLS tests:** `supabase/tests/phase10_rls_isolation.sql` extended with teams/submissions/support/certificates/expenses/`access_grants`/moderation + storage privacy assertions + matview grant check.

**CSP:** still enforced in `next.config.ts` (spot-checked 2026-10-18).

## 2. DB optimization

- Indexes: hackathon_teams, completions, submissions, certificates, expenses, access_grants, registrations, support_*, team_members, promo_redemptions, form fields, moderation_logs (migration `20261012220000_phase10_hardening_indexes_security.sql`).
- Keyset: `src/lib/keyset.ts`, `listEventRegistrationsPage`, submissions list capped + cursor; **gap pass:** `listModerationLogPage`, `listDepartmentAnnouncementsPage`.
- Aggregates: `mv_event_registration_counts` — refresh hourly / after bulk jobs (`REFRESH MATERIALIZED VIEW CONCURRENTLY`); documented in `docs/schema.md`.
- **Gap pass `select('*')` burn-down (hot paths only):** `attendee.service`, `expenses.service`, `accessCodes.service`, `ctf.service` — explicit column lists; sandbox list scoped by `event_id`.
- **EXPLAIN (gap pass):** `event_expenses` by event → `Index Scan` on `event_expenses_event_id_created_idx`; `moderation_logs` newest → `Index Scan` on `moderation_logs_created_idx`. Tiny-table `registrations` / `hackathon_teams` lists may seq-scan despite existing `*_event_id*` indexes (planner choice at low row counts). **No new indexes** this pass.
- Remaining: wholesale `select('*')` burn-down (P-002) is multi-sprint.

## 3. Frontend speed

| Item | Status |
| --- | --- |
| Bundle analyzer | `@next/bundle-analyzer`; `npm run analyze` |
| Dynamic cert editor | Confirmed on `making-template/page.tsx` + Konva dynamic |
| loading.tsx | Gap pass: expenses, agenda, staff, tasks (+ prior compete/enter/department/attendees/…) |
| next/image | EventThumb + EventCard thumbnail |
| Virtualize / debounce | Keyset page size ≤50; full virtualization deferred |
| Lighthouse / Web Vitals | **Not runnable as product truth in agent CI** — see checklist below |

### How to measure (paste scores into blank cells)

Run Lighthouse (mobile + desktop) or Chrome Web Vitals on a warm `next start` build (not cold `dev`):

| Surface | LCP | INP | CLS | Notes |
| --- | --- | --- | --- | --- |
| Organizer Overview | | | | |
| Attendees | | | | |
| Phases & Tasks | | | | |
| Scoreboard | | | | |
| Public event page | | | | |
| Registration flow | | | | |

## 4. Unused / standards

- Removed earlier: `newrelic`, `@tailwindcss/typography`.
- Knip remains in CI (`dependencies` include).
- Lint still soft in CI (pre-existing debt); typecheck hard gate.
- Husky + lint-staged unchanged.
- No mass `console.*` purge this pass.

## 5. Tests

- Unit: permissions, form schema, certificate render, competition dates, scoreboard isolation, settings resolver, flag HMAC, keyset, statusConstraints.
- Playwright: `e2e/smoke.spec.ts` — warm `/events` + sign-in with 120s goto / `domcontentloaded`; enter gate when `E2E_EVENT_ID` set. Spec updated this pass; **local run blocked** (`npx playwright install chromium` → `ENOTFOUND cdn.playwright.dev`). Re-run after `npx playwright install chromium` on a networked machine.
- **Follow-up with seed (not this pass):** solo/group/hackathon registration + upload, payment approval, check-in, flag/file submission, certificate download, owner vs staff permissions.

## 6. Docs / Part 6

- Doc 11 Part 6: items **1–2 closed** this gap pass; **5 deferred**; rest already closed.
- Schema INVESTIGATE C1–C10 remain **KEEP** (no further DROPs without answers).
- ARCHITECTURE / schema.md / completeContext updated for keyset + matview refresh + gap work.

## Gap pass closed (2026-10-18)

1. Advisors refresh + RLS test / storage verification.
2. Hot-path explicit selects.
3. loading.tsx for expenses/agenda/staff/tasks; audit + announcements keyset.
4. Capacity Overview math + team fee `unpaid`→`fee_pending` mapping.
5. Playwright smoke warm timeouts; this report addendum.

## Remaining risks

1. Enable Auth **leaked password protection** in Supabase Dashboard (DB-010 / C7).
2. npm `sharp` critical/high until Next pins patched sharp — schedule Next 16.4+ bump (approved separately).
3. Service-role-only tables without JWT policies — architecture is intentional; every action must stay S2-gated.
4. Full Lighthouse numbers and complete Playwright seed suite not run in this session.
5. ESLint error count still non-zero (soft CI gate).
6. Schema INVESTIGATE leftovers (C2/C3/C9/C10 etc.) — KEEP until product answers.
