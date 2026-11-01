# Phase 10 + Schema gap closure

**Status:** done (2026-10-18)  
**Branch:** `staging/schema-optimization`  
**Source plan:** `.cursor/plans/phase10_schema_gaps_d964f89d.plan.md`

## Outcome

Gap-closure pass against Phase 10 + schema Steps 1–9 checklists. No new table DROPs (INVESTIGATE C1–C10 remain KEEP).

| Todo | Result |
| --- | --- |
| Advisors + RLS | Security/Performance Advisors refreshed; `supabase/tests/phase10_rls_isolation.sql` extended; storage buckets verified private except media/sponsor-logos |
| Hot `select('*')` | Explicit cols in attendee / expenses / accessCodes / ctf services |
| loading + keyset | `loading.tsx` for expenses, agenda, staff, tasks; keyset pages for moderation + department announcements |
| Tests / docs | Warm Playwright smoke timeouts; phase10 report addendum; Part 6 items 1–2 closed; `completeContext` changelog |
| Optional Part 6 | Overview capacity uses live occupying count; `mapFeeStatus` maps DB `unpaid` → `fee_pending` |

## Evidence

- `docs/phase10-hardening-report.md` (gap pass 2026-10-18)
- `docs/11-events-and-hackathon-complete-spec.md` Part 6
- `docs/schema.md` (matview refresh note)
- `completeContext.md` Change log 2026-10-18

## Follow-ups (not blocking)

- `npx playwright install chromium` then `npm run test:e2e` (CDN blocked in agent env)
- Lighthouse paste cells in phase10 report
- Enable Auth HIBP in Supabase Dashboard
- Next 16.4+ for `sharp` (needs approval)
- Schema INVESTIGATE answers before any further DROPs (C2/C3/C9/C10 especially)
- Full Playwright registration matrix with seed data
