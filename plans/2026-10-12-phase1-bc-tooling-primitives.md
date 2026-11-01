# Phase 1 B+C — tooling + shared primitives

**Status:** done (pause for review before Phase D)  
**Date:** 2026-10-12  
**Inputs:** `docs/ENGINEERING_RULES.md`, `docs/audit-report.md` (D-001/D-002/A-009 slice, S6/S14/C2/C3/C5/C9)

## Scope shipped

### B — Tooling
- `zod` + `server-only` + Prettier + husky + lint-staged + knip + eslint-config-prettier
- Scripts: `typecheck`, `format`, `knip`, `prepare` (husky); unit tests include rateLimit/safeAction
- `src/env.ts` — public/server zod env; `requireCompeteSecret`
- `data/supabase.ts`, `src/lib/email/resend.ts`, `competeSession.ts` — `import "server-only"` + env
- CSP **Report-Only** + `X-Content-Type-Options` / `Referrer-Policy` / `X-Frame-Options` / `Permissions-Policy` in `next.config.ts`
- CI: typecheck, lint (`continue-on-error` until ESLint debt cleared), unit tests, knip `--include dependencies`, build
- `tsconfig` includes `src/` + `data/` (avoids stale `.next` dual-types conflict)

### C — Primitives
- `safeAction` / `SafeActionResult` (`src/lib/safeAction.ts`); legacy `ActionResult` kept with `toLegacyResult`
- `rateLimit(key, limit, windowSec)` in-memory (swappable)
- `logger` with secret/email scrubbing
- `can(user, permission, scope)` over `hasModuleAccess` / `checkPermission`
- C3 UI: `FileUploadField`, `CompetitionFilter`, `EventCard`, `EventThumb`
- Zod schemas + rate limits on: admin sign-in, enter-compete, mark-invite-opened, submit-flag
- Browse `/events` uses `EventCard`

## Intentionally not done (later / Phase D)
- Full migration of ~167 actions to `SafeActionResult` (D-001 remainder)
- Remove unused deps (`ethers`/blockchain, `react-icons`, etc.) — Phase D
- Enforce CSP (still report-only)
- Redis-backed rate limit
- Dual UI kit full merge (`components/ui` → `shared_components/ui`)

## Verify
```bash
npm run typecheck
npm run test:unit
npm run knip -- --include dependencies
```
