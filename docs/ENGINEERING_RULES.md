# Avoeline — Engineering Rules

Read this before changing anything. Every prompt in the update batch says "follow ENGINEERING_RULES.md" so these rules are written once here instead of repeated per prompt. If a rule blocks a task, say so and propose an alternative. Never silently skip a rule.

---

## 1. Security

- **S1 Secrets.** Only `NEXT_PUBLIC_SUPABASE_URL` and the anon key are public. The service-role key, Resend key and any HMAC secret live only in server-only modules (`import 'server-only'`). Never log secrets, tokens, flags, access codes or full emails. `.env*` is gitignored; `.env.example` holds names only.
- **S2 Authorization on every entry point.** Every server action and route handler starts with: session check → role/ownership check → plan check (`hasModuleAccess`) → permission check (`can(user, permission, scope)`). Never trust ids, roles, prices, statuses or timestamps sent by the client.
- **S3 RLS everywhere.** Row Level Security is enabled on every public table, deny by default, policies built from shared helper functions. Storage: public buckets only for logos, banners and event images. Private buckets for payment proofs, ID uploads, challenge files, submissions and support attachments, served through signed URLs of 5 minutes or less.
- **S4 Validation.** zod at every boundary (actions, route handlers, query params). Updates use an allowlist of columns (no mass assignment).
- **S5 Uploads.** Size caps enforced on the server (signed upload with a limit), MIME sniffing, sanitized filenames, random object keys. Serve user files with `Content-Disposition: attachment` and `X-Content-Type-Options: nosniff`. Never render untrusted HTML or SVG inline.
- **S6 Rate limiting.** One `rateLimit(key, limit, windowSec)` function (swappable backing store) on: login/signup, registration submit, promo validation, access-code entry, flag submit, invite open, support create, bulk email, public apply links.
- **S7 Tokens and codes.** Invite and apply tokens ≥128-bit random. Access codes ≥8 chars from an unambiguous alphabet. Both are hashed at rest, with lockout/backoff on failures.
- **S8 CTF flags.** Store HMAC-SHA256(server secret + per-task salt). Timing-safe compare. Throttle attempts. Never return the flag, its hash, or locked hints early.
- **S9 No impersonation.** No "Enter view" into another user's dashboard. Owners and staff use read-only detail pages. Any future "view as" must be read-only, audited and visibly bannered.
- **S10 Audit log.** Every privileged admin/staff action records who, what, target, reason, timestamp.
- **S11 Passwords.** Never email a password. Use expiring single-use invite/set-password links. Admin-created accounts force a reset on first login.
- **S12 Public pages.** No personal data behind guessable URLs. Ticket/status pages use unguessable tokens. Verify pages expose minimal data.
- **S13 Injection/XSS.** Escape all interpolated HTML (emails). Sanitize rich text on the server. No `dangerouslySetInnerHTML` without sanitized input. Parameterized queries only. No string-built SQL inside RPCs.
- **S14 Headers and cookies.** CSP (start report-only, then enforce), HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors`. Cookies `httpOnly`, `secure`, `sameSite=lax`.
- **S15 URL safety.** Redirect targets must be same-origin. Embeds and streams use host allowlists. Maps links must be https.
- **S16 Dependencies.** Lockfile committed. `npm audit` clean for high/critical. Remove unused packages. Dependabot enabled.
- **S17 Errors.** Generic messages to the client, detail to server logs without personal data. Error boundaries on every route segment.
- **S18 Owner accounts.** MFA (TOTP) enabled for `platform_admin`. Sensible session timeouts.
- **S19 Leak scan.** Run gitleaks/trufflehog including git history. Rotate anything found. No real personal data in the repo, seeds, screenshots or logs.

## 2. Database

- **D1 Migrations only.** All schema changes go in `supabase/migrations`, idempotent and reviewed. No dashboard-only changes. Regenerate `database.types.ts` after each migration.
- **D2 Indexes.** Index every foreign key and every column used in WHERE/ORDER/JOIN. Use composite indexes for common filters (e.g. `event_id, status`) and partial indexes where selective. Encode business rules as constraints (e.g. one current tenure per club, unique promo code per event).
- **D3 Query shape.** No `select('*')` in app code. Use nested selects or RPC to avoid N+1. Independent queries run in `Promise.all`.
- **D4 Pagination.** Keyset pagination for lists that can grow (attendees, submissions, audit logs, announcements). Default page size 25–50, with server-side search/filter.
- **D5 Aggregates.** Counters via triggers or materialized views refreshed on a schedule. `count: 'estimated'` for non-critical displays. Exact counts only where correctness matters (capacity, payment).
- **D6 Transactions.** Multi-step writes go in an RPC (single transaction): accept applicant, redeem promo, register group, bulk issue certificates. Seat/usage counters use atomic updates or `FOR UPDATE`.
- **D7 Types.** `timestamptz` (UTC) for all datetimes, `numeric(12,2)` for money, check constraints/enums for statuses. `jsonb` only for flexible config and answers, never for relational data you filter or join on.
- **D8 Deletion.** Soft delete/archive where history matters (form fields with responses, tenures). Explicit cascade rules elsewhere.
- **D9 Storage economy.** Store source files once. Never persist per-render artifacts (certificates are rendered on demand). Clean up orphaned objects.
- **D10 Realtime.** Only for scoreboard, team rosters and notifications. Subscribe narrowly with filters and unsubscribe on unmount.
- **D11 Connections.** Use the pooled connection string for serverless. No long transactions.
- **D12 Advisors.** Run Supabase Security and Performance Advisors after every migration batch and fix findings.

## 3. Performance

- **P1** Server Components by default. `'use client'` only where interaction needs it, pushed as low in the tree as possible.
- **P2** Parallel data fetching, `Suspense` and `loading.tsx` per tab. No client-side fetch waterfalls.
- **P3** Tag/path-based revalidation on writes. Cache or ISR public event pages and revalidate on event update.
- **P4** Heavy client code via `next/dynamic` (certificate editor, charts, QR scanner, rich text).
- **P5** `next/image` everywhere with thumbnail sizes for cards. No multi-MB banners in lists.
- **P6** Lists over ~200 rows are paginated or virtualized. Search debounced 250–300 ms. Optimistic updates for toggles.
- **P7** Keep dependencies lean. Run the bundle analyzer. Target route JS under ~200 KB gzipped.
- **P8** Polling/realtime limited, backing off when the tab is hidden.
- **P9** Bulk email/PDF work is batched and capped, off the request path where possible.
- **P10** Measure: record Lighthouse/Web Vitals before and after significant changes.

## 4. Code standards

- **C1 Structure.** `src/features/<domain>/{components,actions,*.service.ts,*.schema.ts,*.types.ts}`. Shared UI in `src/components/ui`, utilities in `src/lib`. Route files are thin and only compose feature components.
- **C2 One action pattern.** `safeAction({ input: zodSchema, auth, run })` returning `ActionResult<T>` (`{ ok: true, data } | { ok: false, error: { code, message } }`). The UI consumes results, not thrown strings.
- **C3 One of each shared thing.** Date/time util (store UTC, display in event timezone), money util (Intl, currency per event/plan), `FileUploadField`, `Modal`, `ConfirmDialog`, `StatusBadge`, `EmptyState`, `DataTable`, `CompetitionFilter`, `EventThumb`/`EventCard`. Search for an existing one before writing a new one.
- **C4 TypeScript.** Strict mode, no `any`, no `as unknown as`. Types from `database.types.ts` and zod inference.
- **C5 Lint/format.** ESLint (next/core-web-vitals + typescript-eslint), Prettier, `no-console` (use a logger), unused-imports, husky + lint-staged.
- **C6 Size.** Files ≤ ~300 lines, functions ≤ ~60 lines. Split by responsibility, no god components.
- **C7 Naming.** Components `PascalCase.tsx`, `*.service.ts`, `*.action.ts`, `*.schema.ts`, hooks `use*.ts`, constants in `*.constants.ts`. DB `snake_case`, TS `camelCase`, mapped at the service boundary.
- **C8 No dead code.** No commented-out blocks, no unused exports (knip), no TODO without an issue reference.
- **C9 Env.** `src/env.ts` validates env with zod (server/client separated) and fails fast.
- **C10 States.** `error.tsx` and `loading.tsx` per segment. Designed empty states.
- **C11 Accessibility.** Labels on every input, focus management in modals, keyboard operable, sufficient contrast.
- **C12 Tests.** vitest for services, schemas and permission functions. Playwright smoke tests for critical flows. Every fixed bug gets a regression test.
- **C13 Docs.** Update `docs/11-events-and-hackathon-complete-spec.md` and `completeContext.md` whenever behavior changes.
- **C14 Commits.** Small, scoped commits. The Definition of Done below is the PR checklist.

## 5. Definition of Done (every phase)

1. `typecheck`, `lint`, `knip` and `build` all pass with zero errors.
2. New/changed tables have RLS, indexes and regenerated types. Advisors show no new findings.
3. Every new action enforces S2 (session, ownership, plan, permission, validation).
4. No `console.*`, no secrets, no unused code introduced.
5. Loading, error and empty states exist for every new view.
6. Tests added for new logic. A regression test for any bug fixed.
7. Docs updated (doc 11 + completeContext.md).
8. Summary lists files changed, migrations added, and anything intentionally not done.

## 6. Do not

- Do not add a second implementation of anything listed in C3.
- Do not enforce a rule only in the UI. Enforce it on the server first, then mirror it in the UI.
- Do not store derived or rendered artifacts that can be regenerated cheaply.
- Do not email passwords, or expose flags, hashes, signed URLs or tokens in client logs.
- Do not remove code on a guess. Remove only what knip and grep both confirm is unreferenced, and list deletions first.
