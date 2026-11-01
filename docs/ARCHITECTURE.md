# Avoeline — Architecture

**Stack:** Next.js 16 App Router · React 19 · TypeScript · Tailwind 4 · Supabase Auth + Postgres + Storage · Vercel.

## Folders

| Path | Role |
| --- | --- |
| `src/app/**` | Thin routes: fetch, compose feature UI, `loading.tsx` / `error.tsx` |
| `src/features/<domain>/` | Domain: `types.ts`, `*.service.ts`, `actions/*.action.ts`, `components/` |
| `src/shared_components/` | Preferred dashboard UI kit (Card, Modal, EventCard/Thumb, FileUploadField, …) |
| `src/components/ui/` | Legacy form kit — prefer shared for new UI |
| `data/` | `TABLES`, typed `supabaseAdmin` / `createSupabaseServer` (`server-only`) |
| `src/lib/` | `safeAction`, `rateLimit`, `logger`, datetime, money, keyset, `database.types.ts` |
| `src/env.ts` | Zod-validated public/server env |
| `supabase/migrations/` | All schema changes; regenerate types after |
| `plans/` | Dated plan archive |

## Patterns

1. **Auth before write:** session → role/ownership → plan (`hasModuleAccess`) → `can()` → zod (`safeAction`).
2. **Data:** service role for app writes; RLS deny-default on private tables; JWT policies only where intentional (events public catalog, scoped hackathon_tasks, own notifications).
3. **Dates:** store UTC `timestamptz`; UI via `toEventLocalInput` / `fromEventLocalInput` / `formatExactSecond` in event TZ.
4. **Money:** `formatCurrency` / numeric(12,2); never trust client prices (`redeem_promo` RPC).
5. **Lists:** keyset pagination (`src/lib/keyset.ts`) for attendees, submissions, audit, announcements.
6. **Heavy client:** `next/dynamic` (certificate editor, charts, QR).
7. **Uploads:** allowlisted buckets/folders; private buckets via ≤5m signed URLs.

## Data flow (hackathon compete)

```
enter code → enterCompete.action (rate limit + audit failures)
  → httpOnly compete cookie (6h, path-scoped)
  → getParticipantAccess (reason UI)
  → compete tabs (instructions / tasks / scoreboard / submissions / team)
  → task actions require requireCompeteRegistration + membership
  → hackathon_task_submissions + optional activity/integrity signals
```

## Related docs

- Product tabs: `docs/11-events-and-hackathon-complete-spec.md`
- Engineering rules: `docs/ENGINEERING_RULES.md`
- Living map: `completeContext.md`
- Settings matrix: `docs/hackathon-settings-matrix.md`
- Phase 10 report: `docs/phase10-hardening-report.md`
