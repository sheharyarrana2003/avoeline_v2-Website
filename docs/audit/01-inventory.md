# AUD Pass 1 — Inventory and baseline

**Pass:** 1  
**Date:** 2026-11-04  
**Mode:** Read-only (evidence under `docs/audit/evidence/`; no production writes, no secret values printed)  
**Repo:** `avoeline_v2-Website-main` (Next.js App Router + Supabase)

---

## 1. Scope and method

### Read

| Source | Purpose |
|--------|---------|
| [`docs/ENGINEERING_RULES.md`](../ENGINEERING_RULES.md) | Intended behavior / DoD |
| [`docs/11-events-and-hackathon-complete-spec.md`](../11-events-and-hackathon-complete-spec.md) | Event/hackathon UI + architecture |
| [`docs/16-platform-email.md`](../16-platform-email.md), [`17-connections-system.md`](../17-connections-system.md), [`18-email-send-limits-and-scheduling.md`](../18-email-send-limits-and-scheduling.md), [`19-marketing-website.md`](../19-marketing-website.md) | Specs present for drift scan |
| [`docs/00-INDEX.md`](../00-INDEX.md), [`completeContext.md`](../../completeContext.md) | Route/feature map substitute |
| [`src/proxy.ts`](../../src/proxy.ts) | Edge auth matcher |
| [`src/env.ts`](../../src/env.ts), [`.env.example`](../../.env.example) | Declared / documented env |
| [`data/collections.ts`](../../data/collections.ts) | `TABLES` inventory |
| [`src/features/permissions/moduleKeys.ts`](../../src/features/permissions/moduleKeys.ts) | Plan modules |
| App tree under `src/app/**/{page.tsx,route.ts}` | Route enumeration |
| `src/features/**/actions/*.action.ts` (+ a few page-embedded `"use server"`) | Server actions |

### Ran (evidence paths)

| Command / check | Exit | Evidence |
|-----------------|------|----------|
| `npm run typecheck` (`tsc --noEmit`) | 0 | [`evidence/01-typecheck.txt`](evidence/01-typecheck.txt) |
| `npm run lint` | 1 | [`evidence/01-lint.txt`](evidence/01-lint.txt) — **362 problems (269 errors, 93 warnings)** |
| `npm run build` | 0 | [`evidence/01-build.txt`](evidence/01-build.txt) |
| `npm run knip` | 1 | [`evidence/01-knip.txt`](evidence/01-knip.txt) — unused files 47, unused exports 328, duplicate exports 16 |
| `npm audit` | non-zero | [`evidence/01-npm-audit-summary.txt`](evidence/01-npm-audit-summary.txt), [`01-npm-audit.json`](evidence/01-npm-audit.json), [`01-npm-audit-critical.txt`](evidence/01-npm-audit-critical.txt) — **60 vulns (1 critical, 12 high, 43 moderate, 4 low)** |
| `npx depcheck` | — | [`evidence/01-depcheck.txt`](evidence/01-depcheck.txt) — unused: `react-email`, `react-icons`; unused dev: `@tailwindcss/postcss`, `lint-staged`, `tailwindcss` (depcheck often false-positives Tailwind) |
| `npm run test:unit` | 1 | [`evidence/01-tests.txt`](evidence/01-tests.txt), [`01-tests-unit.txt`](evidence/01-tests-unit.txt) — fails **before** tests on Connections C6 import gate |
| Sample unit tests (gate bypassed) | 0 | 13/13 pass (`eventState`, `safeAction`, `permissions`, `oauthPkce`) |
| `npm test` | 1 | No `test` script (only `test:unit`, `test:e2e`, `test:sql:*`, …) |
| Route enumerator | 0 | [`01-routes-pages.txt`](evidence/01-routes-pages.txt) **173 pages**, [`01-routes-api.txt`](evidence/01-routes-api.txt) **13** `route.ts` files (**11** under `src/app/api/**`, plus `/auth/callback`, `/certificate/[code]/download`) |
| Env used vs declared | — | [`01-env-used.txt`](evidence/01-env-used.txt), [`01-env-gaps.json`](evidence/01-env-gaps.json); cross-check from [READ-ONLY env/tables inventory](e442ff4b-6c85-4700-9630-e1255aeff46c) |
| Actions list | — | [`01-actions.txt`](evidence/01-actions.txt) — **106** `*.action.ts` files; **103** feature action modules with top-level `"use server"` per [READ-ONLY routes inventory](38f9ae73-8910-4709-bf6e-df664787d255) (delta = non-`*.action.ts` / nested naming) |
| Hygiene | — | [`01-large-files.txt`](evidence/01-large-files.txt) empty (>1 MB tracked); [`01-secret-filenames.txt`](evidence/01-secret-filenames.txt) only `.env.example` |
| Supabase MCP `list_tables(public)` | OK (read) | [`01-supabase-tables.txt`](evidence/01-supabase-tables.txt) — **131** tables, all `rls_enabled: true` on listed rows |

### Could not check (Pass 1)

| Item | Why |
|------|-----|
| [`docs/12-*.md`](../), [`docs/15-*.md`](../), [`docs/20-*.md`](../) §6 feature matrix | **Files absent** from `docs/`. Interim: teams notes in `plans/2026-10-12-phase6-teams.md`; `docs/connections-security-review.md` marks `docs/15*` N/A |
| Full `test:unit` suite pass/fail counts | Script exits on `check-connections-imports.mjs` before node:test runs |
| Playwright / browser flows | Pass 1 is inventory; deferred to Passes 4–9 |
| Local Postgres vs MCP project identity | MCP project is the Cursor-linked Supabase project; treat as staging/linked. Not proven local. No writes performed. |
| Production secrets / git-history leak scan (gitleaks/trufflehog) | Tools not run this pass; S19 **needs check** |
| `vercel.json` / hosted cron schedule | No `vercel.json` in repo; cron auth pattern exists in code; schedule **needs check** on host |
| Whether every action uses full S2 chain | Spot-check only; full matrix is Pass 2 |

---

## 2. Findings

| ID | Severity | Category | Location | Description | Evidence | Impact | Recommendation | Effort | Confidence | Spec |
|----|----------|----------|----------|-------------|----------|--------|----------------|--------|------------|------|
| AUD-1-001 | High | Hygiene / DoD | repo CI gates | ENGINEERING_RULES DoD requires typecheck, lint, knip, build all pass with zero errors. Lint and knip fail; audit not clean for high/critical. | lint exit 1 / 362 problems; knip exit 1; npm audit 60 vulns; typecheck+build exit 0 — evidence files above | Merges can ship known lint/dead-code debt; DoD not met | Triage lint errors; knip cleanup policy; upgrade Next | L | confirmed | ENGINEERING_RULES §5 |
| AUD-1-002 | Critical | Dependencies | `package.json` → `next@16.2.6` | npm audit marks **critical** on `next` with fix `16.4.5`. Advisories include Middleware/Proxy bypass (GHSA-6gpp-xcg3-4w24) and App Router Server Actions DoS (GHSA-m99w-x7hq-7vfj) for ranges covering 16.2.6. | [`01-npm-audit-critical.txt`](evidence/01-npm-audit-critical.txt); `node_modules/next/package.json` version 16.2.6 | Potential auth-middleware bypass / availability risk depending on deploy flags (Turbopack/locale). Needs Pass 2 confirmation of exploitability on this app. | Upgrade Next to ≥16.2.11 / 16.4.5 per advisory; re-audit | M | confirmed (CVE present); exploitability **needs check** | ENGINEERING_RULES S16 |
| AUD-1-003 | High | Spec docs missing | `docs/` | Specs required by audit brief (`docs/12`, `15`, `20`) are missing. Feature coverage matrix vs docs/20 §6 cannot be completed as specified. Interim substitutes: `plans/2026-10-12-phase6-teams.md` (teams); connections-security-review marks `docs/15*` N/A. | Glob of `docs/**/*.md` — no `12-*`, `15-*`, `20-*` | Inventory and later passes lack the intended contract; owners may assume specs exist | Restore or publish docs 12/15/20; until then use ENGINEERING_RULES + completeContext + docs 11/16–19 + plan interim | M | confirmed | Audit brief; ENGINEERING_RULES C13 |
| AUD-1-004 | Medium | Spec drift | `src/app/organizer/.../hackathon/**` vs docs/11 Part 1 | Spec: “One list… No separate hackathon list route.” Code still has organizer hackathon tree (`/organizer/[id]/hackathon`, `.../hackathon/create`, `.../hackathon/[eventId]/*` — 14 routes in pages list). | [`01-routes-pages.txt`](evidence/01-routes-pages.txt) lines 121–134; docs/11 L13 | Dual navigation surfaces; confusion and double maintenance | Align routes to unified `/events` shell or update docs/11 if dual trees are intentional | M | confirmed | docs/11 Part 1 |
| AUD-1-005 | Medium | Spec / tests | `package.json` `test:unit` → `scripts/check-connections-imports.mjs` | Unit suite never runs: C6 gate fails because `attendeeImport.service.ts` imports Google providers outside `connections/{server,providers,__tests__}`. | [`01-tests-unit.txt`](evidence/01-tests-unit.txt); gate message names that file | CI/local “tests green” false; regressions undetected | Move Sheets client behind connections server API, or allowlist the import in the gate with review | S | confirmed | docs/17 C6; ENGINEERING_RULES C12 |
| AUD-1-006 | Medium | Env inventory | Split gaps | (a) In `env.ts` but **not** in `.env.example`: `RESEND_FROM`, `PLATFORM_EMAIL_DAILY_CAP`, `PLATFORM_EMAIL_ESSENTIAL_RESERVE` (lane `RESEND_FROM_*` commented in example). (b) Used in app/scripts but **not** in `env.ts` Zod: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_APP_URL`, `CONNECTIONS_UNSUBSCRIBE_SECRET`, `UNSUBSCRIBE_SECRET`, plus script-only `DEMO_SEED_*`, `SUPABASE_DB_URL`, `VERCEL_*`, etc. | [`01-env-gaps.json`](evidence/01-env-gaps.json); env inventory agent | Misconfigured deploys; unsubscribe/HMAC may silently degrade; caps may fall back unexpectedly | Document all runtime vars in `.env.example`; add Zod for secrets that must fail-fast | S | confirmed | ENGINEERING_RULES C9, S1 |
| AUD-1-007 | Low | Env inventory | `.env.example` `SAAS_OWNER_PASSWORD_1/2` | Documented for seed script but not in `src/env.ts` (acceptable if scripts-only); easy to confuse with runtime secrets. | `.env.example` L12–13; gaps JSON `example_not_in_env_ts` | Operator confusion | Clarify “seed-only” in example comments (already partly noted in completeContext) | S | confirmed | — |
| AUD-1-008 | Medium | Feature gating | `src/features/custom_forms/**`, organizer `/forms` | Custom Forms library is implemented (routes + tables + actions) but **not** listed in `moduleKeys.ts`; actions check owner/admin only — no `hasModuleAccess`. | `moduleKeys.ts` FREE/PAID lists; `customForms.action.ts` `assertOwner` L38–46; routes `/organizer/.../forms*`, `/f/[token]` | Free and paid organizers both get feature; plan monetization drift if Forms was meant to be paid | Decide plan key; gate UI + server; or document as free | S | likely (intent of monetization **needs check**) | docs/04 / missing docs/20 |
| AUD-1-009 | Medium | Auth surface | `src/proxy.ts` `config.matcher` | Proxy only matches organizer/vendor/attendee/admin/department/clubs + two auth paths (`PUBLIC_PATHS` = `/admin/signin`). Token/public routes (`/events/.../ticket/...`, `/judge/[token]`, `/apply/[token]`, `/f/[token]`, `/collaborate/[token]`, `/teams`) rely on page/action checks. `/support` is **not** in matcher but page uses `AuthService` → sign-in if anonymous. | `src/proxy.ts` L153–165; routes inventory agent | Inventory note for Pass 2: verify token entropy + ownership on each | Pass 2 auth matrix | — | confirmed | ENGINEERING_RULES S2, S7, S12 |
| AUD-1-010 | Info | Dual OAuth callbacks | `/api/connections/[provider]/callback` and `/api/email/google/callback` | Legacy path remains; handler is redirect-only into `/api/connections/google/callback`. | [`01-routes-api.txt`](evidence/01-routes-api.txt); routes inventory | Confusion / misconfigured redirect URI in Google console | Prefer docs/17 URI only; keep legacy redirect until consoles updated | S | confirmed | docs/17 |
| AUD-1-011 | Low | Tooling drift | ENGINEERING_RULES C12 “vitest” vs `node --test` + tsx | Spec says vitest; repo uses Node test runner. | `package.json` `test:unit`; ENGINEERING_RULES C12 | Doc inaccuracy only | Update ENGINEERING_RULES to match runner | S | confirmed | ENGINEERING_RULES C12 |
| AUD-1-012 | Info | Dead code signal | knip | 47 unused files, 328 unused exports, 16 duplicate default/named exports. | [`01-knip.txt`](evidence/01-knip.txt) | Maintenance cost; some may be false positives (Next entrypoints) | Curated knip allowlist + phased deletion (C8) | L | confirmed | ENGINEERING_RULES C8 |
| AUD-1-013 | Low | Dependencies | depcheck unused `react-email`, `react-icons` | Flagged unused. | [`01-depcheck.txt`](evidence/01-depcheck.txt) | Bundle/install noise if truly unused | Confirm with knip/grep then remove | S | needs check | S16 |
| AUD-1-014 | Info | Hosting config | repo root | No `vercel.json`; crons implemented as `/api/cron/*` with `CRON_SECRET`. | Shell: `no_vercel_json`; cron routes use Bearer/`?secret=` | Schedule may live only in Vercel dashboard | Document cron schedule + secret rotation in ops docs | S | confirmed (missing file); schedule **needs check** | docs/16–18 |
| AUD-1-015 | Info | Spec drift inventory | docs/11 shell path wording | Spec mentions dashboard shell `/events/{eventId}`; product organizer shell is `/organizer/{id}/events/{eventId}` (plus public `/events/[eventId]`). | docs/11 L15; routes pages | Mild doc drift | Clarify public vs organizer paths in docs/11 | S | confirmed | docs/11 |

---

## 3. Inventories

### 3.1 App routes × auth requirement (summary)

Full path list: [`evidence/01-routes-pages.txt`](evidence/01-routes-pages.txt) (173).

| Prefix / area | Count | Proxy matcher | Auth expectation (from code/docs) |
|---------------|------:|:-------------:|-----------------------------------|
| `/` marketing (`/`, `/about`, `/plans`, `/partners`, `/contact`, `/privacy`, `/terms`, `/unsubscribe*`) | ~10 | No | Public |
| `/auth/*` | 7 | Partial (`change-password`, `awaiting-approval`) | Mixed public/session |
| `/admin`, `/admin/*` | 25 | Yes | Platform owner/staff; `/admin/signin` public entry |
| `/organizer`, `/organizer/[id]/*` | 68 | Yes | Organizer (or staff grant on event paths); id must match session |
| `/vendor/[id]/*` | 15 | Yes | Vendor |
| `/attendee/[id]/dashboard` | 1 | Yes | Attendee |
| `/department/*` | 12 | Yes | Department admin |
| `/clubs/[clubId]/*` | 10 | Yes | Club president/exec |
| `/events`, `/events/[eventId]/*` | 13 | No | Public event + tokenized ticket/compete/staff-apply |
| `/e/[eventId]` | 1 | No | Short public event alias |
| `/f/[token]` | 1 | No | Public custom form |
| `/apply/[token]`, `/collaborate/[token]`, `/judge/[token]` | 3 | No | Token gates |
| `/verify/[code]` | 1 | No | Public certificate verify |
| `/support/*` | 2 | No | Page-level `AuthService` (sign-in if anonymous) |
| `/teams/*`, `/network`, `/suspended`, `/access-denied` | ~6 | No | Public / mixed |

**`route.ts` handlers** ([`01-routes-api.txt`](evidence/01-routes-api.txt)) — 11 under `/api/**` + 2 outside:

| Route | Methods (spot) | Expected auth |
|-------|----------------|---------------|
| `/auth/callback` | — | OAuth code exchange (Supabase) |
| `/api/connections/[provider]/start` | GET | Session; admin path via `requireAdmin("organizers")` |
| `/api/connections/[provider]/callback` | GET | Session or redirect sign-in; one-time OAuth state |
| `/api/connections/google/picker-token` | GET, POST | Session + connection |
| `/api/email/google/callback` | GET | Redirect → `/api/connections/google/callback` |
| `/api/cron/linked-files`, `sheet-syncs`, `connections-health`, `email-outbox`, `plan-expiry` | GET, POST | `CRON_SECRET` Bearer or `?secret=` / `?cron_secret=` |
| `/api/cron/feature-override-expiry` | GET | same |
| `/api/certificates/[id]` | GET | Public JSON for issued cert + `rateLimit` (Pass 2: field exposure) |
| `/certificate/[code]/download` | — | Code gate — Pass 2 |

### 3.2 Server actions

- **106** files matching `src/features/**/actions/*.action.ts` ([`01-actions.txt`](evidence/01-actions.txt)).
- **103** modules under `src/features/**/actions` with top-level `"use server"` (feature-folder counts: access 6, admin 11, agendas 1, auth 4, billing 1, bookings 1, certificates 5, clubs 2, connections 9, custom_forms 1, department 3, email 2, event_attendee 3, event_expenses 1, event_external_vendors 1, event_vendors 3, events 6, exports 1, hackathon 11, notifications 2, onboarding 1, organizations 1, registration 4, saas 3, teams 8, taxonomy 2, ticketing 1, vendor_quotes 1, website 10, analytics 2).
- Additional `"use server"` in some `src/app/**/page.tsx` (auth signup/signin, a few organizer/vendor pages) — not in the 103/106.
- Also: `src/features/event_attendee/import/attendeeImport.action.ts`, `src/shared_components/organizer/updateOrganizerLogo.action.ts`, `src/features/media/uploadMedia.action.ts` may sit outside the feature `actions/` tally depending on glob.

### 3.3 Tables

| Layer | Count | Notes |
|-------|------:|-------|
| `TABLES` keys in [`data/collections.ts`](../../data/collections.ts) | 146 | Includes aliases (e.g. `ORGANIZERS` → `organizer_profiles`) |
| Unique physical table names in `TABLES` | 131 | |
| Supabase MCP `public` tables | 131 | All reported `rls_enabled: true` (Pass 3 still audits policy quality) |

Notable product tables present remotely: `custom_forms`, `custom_form_responses`, `sheet_syncs`, `linked_files`, `calendar_links`, Connections (`integration_*`, `oauth_states`, …), marketing CMS, email limits/outbox.

### 3.4 Environment variables

**Declared in `src/env.ts` (zod):** public `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, optional `NEXT_PUBLIC_TURNSTILE_SITE_KEY`; server includes service role, Resend lanes, Google OAuth + Picker, Connections encryption/kill switch, cron, Gemini, Turnstile secret, platform email caps, bootstrap email lists, etc.

**Gaps (used in repo, weak/missing declaration/docs):** see finding AUD-1-006 and [`01-env-gaps.json`](evidence/01-env-gaps.json).

**Noise keys in scan:** `CONFIRM`, `NEW_KEY`, `OLD_KEY` (script locals) — ignore.

### 3.5 Third-party services

| Service | Role in product | Config signals |
|---------|-----------------|----------------|
| Supabase | Auth, Postgres, Storage, Realtime | `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY` |
| Resend | Platform email lanes | `RESEND_API_KEY`, `RESEND_FROM_*` |
| Brevo | Legacy fallback mail | `BREVO_API_KEY` |
| Google OAuth / Gmail / Calendar / Drive / Sheets / Picker | Connections | `GOOGLE_OAUTH_*`, Picker keys, encryption key |
| Google (Supabase Auth provider) | Signup/signin | Dashboard config (not env) |
| Cloudflare Turnstile | Contact captcha | `NEXT_PUBLIC_TURNSTILE_*`, `TURNSTILE_SECRET_KEY` |
| Google Gemini | Feedback analysis | `GEMINI_API_KEY`, `GEMINI_MODEL` |
| Generic AI | Designer/chatbot path | `AI_API_KEY`, `AI_URL` |
| Vercel | Likely host (`VERCEL_ENV`/`VERCEL_URL` referenced) | No `vercel.json` in repo |
| New Relic | Listed in knip ignoreDependencies | **needs check** if still used |
| nodemailer | In `package.json` | **needs check** — no app import hits in env inventory grep |
| Google APIs / Gemini | No official SDK packages; `fetch`-based | Confirmed by env inventory agent |

### 3.6 Feature coverage matrix (substitute — docs/20 §6 missing)

Substitute sources: `moduleKeys.ts`, `completeContext.md`, docs 11/16–19. Status: **I** = implemented in tree; **T** = automated tests observed in `test:unit` file list (gate currently blocks full run).

| Feature | Roles | Plan | Implemented | Tested | Notes |
|---------|-------|------|:-----------:|:------:|-------|
| Events dashboard / CRUD | Organizer, club, dept | free `events_dashboard` | I | Partial | docs/11 |
| Registrations / ticketing / promo | Organizer, attendee, guest | free `registrations` | I | Schema/promo unit files present | Pass 4 |
| Access control / invites | Organizer | free `access_control` | I | — | |
| Teams basic | Organizer | free `teams_basic` | I | helpers/filters tests | |
| Teams advanced / recruitment / grants | Organizer | paid `teams_advanced_roles` | I | Partial | |
| Hackathon ops | Organizer, participant, judge | paid `hackathon_ops` | I | flagHash, scoreboard, settings, dates | Dual route tree AUD-1-004 |
| Certificates | Organizer, public verify | paid `certificates` | I | renderCertificate | |
| Analytics | Organizer | free `analytics_basic` | I | derive + gemini tests | |
| Vendor store / quotes | Organizer, vendor | paid `vendor_store` / vendor modules | I | bookingValue | |
| Ushers | Organizer | paid `ushers_ops` | I | — | |
| AI designer / planner | Organizer | paid/free keys | I | — | |
| Sponsors | Organizer | free/paid keys | I | — | |
| Platform email (Resend) | Platform | n/a | I | lanes + sanitize tests | docs/16 |
| Connections Google mail/calendar/drive/sheets | Organizer, vendor, dept | plan email caps docs/18 | I | many `__tests__` under connections | C6 gate broken AUD-1-005 |
| Marketing website + CMS | Public, admin | website caps | I | extensive website tests | docs/19 |
| Consent / legal | Public, admin | n/a | I | consent.logic tests | |
| Custom Forms library | Organizer, public `/f` | **ungated** | I | — | AUD-1-008 |
| Attendee Excel/Sheets import | Organizer | n/a | I | — | breaks C6 gate |
| Departments / clubs / tenures | Dept, club, admin | org modules | I | — | |
| SaaS tenants / plans / overrides | Platform owner/staff | n/a | I | tenantBoard filters | |
| Badges / networking | Attendee | — | Tables exist; product depth **needs check** | — | docs/05 legacy |
| API access / website_builder modules | Organizer | paid keys exist | Keys in catalog | **needs check** product surface | moduleKeys only |

---

## 4. Spec-drift list (docs present)

| Spec | Drift / gap | Severity |
|------|-------------|----------|
| docs/11 Part 1 “no separate hackathon list” | Separate `/organizer/.../hackathon*` routes exist | Medium — AUD-1-004 |
| docs/11 shell path `/events/{eventId}` | Organizer shell under `/organizer/.../events/...` | Info — AUD-1-015 |
| docs/12 | **Missing file**; interim teams plan `plans/2026-10-12-phase6-teams.md` | High — AUD-1-003 |
| docs/15 | **Missing file**; `docs/connections-security-review.md` marks `docs/15*` N/A | High — AUD-1-003 |
| docs/16 | Platform Resend + caps declared in `env.ts`; `.env.example` omits several lane/cap vars | Medium — AUD-1-006 |
| docs/17 | Dual callback routes; C6 boundary violated by attendee import | Medium — AUD-1-005, AUD-1-010 |
| docs/18 | Outbox cron + capacity code present; host schedule undocumented in-repo | Info — AUD-1-014 |
| docs/19 | Marketing routes + CMS tables present; not deep-audited this pass | — |
| docs/20 §6 | **Missing file** — matrix substituted | High — AUD-1-003 |
| ENGINEERING_RULES §5 DoD | lint/knip/audit fail | High — AUD-1-001 |
| ENGINEERING_RULES C12 vitest | Uses `node --test` | Low — AUD-1-011 |

---

## 5. Flow / area health (inventory lens)

| Area | Rating | Note |
|------|--------|------|
| Typecheck | Works | exit 0 |
| Production build | Works | exit 0; Proxy listed in build output |
| Lint | Broken | 269 errors |
| Knip / dead-code gate | Broken | exit 1 |
| Unit test runner | Broken | C6 import gate |
| npm audit / deps | Works with issues | critical Next + 12 high |
| Route inventory | Works | 173 + 13 enumerated |
| Env documentation | Works with issues | gaps vs example/env.ts |
| Spec pack (11–20) | Works with issues | 12, 15, 20 missing |
| Supabase schema presence | Works | 131 tables, RLS flag on |
| Auth proxy coverage | Works with issues | many sensitive public routes outside matcher |
| Custom Forms | Works with issues | shipped; plan gating unclear |
| Connections feature | Works with issues | tests exist; import boundary fail |
| Browser E2E this pass | Not testable | out of Pass 1 scope |

---

## 6. What works well

- Typecheck and production build are green on this tree.
- Central `src/env.ts` zod split for public vs server env (C9 pattern in place).
- `TABLES` catalog aligns with live public table count (131).
- Broad automated unit coverage is **authored** (permissions, hackathon scoring/flags, connections OAuth/PKCE/quotas, website/consent, onboarding).
- Proxy matcher consistently wraps the six primary authenticated product areas.
- `.gitignore` ignores `.env*`; only `.env.example` is tracked among secret-like names; no >1 MB tracked blobs found by the Pass 1 scan.

---

## 7. Questions for the owner

1. Where should canonical **docs/12, 15, and 20** live (restore from another branch, or rewrite)? Without docs/20 §6 the feature×role×plan matrix cannot be signed off.
2. Is the parallel **`/organizer/.../hackathon*`** tree intentional compatibility, or should it be removed to match docs/11?
3. Should **Custom Forms** be a paid module, free for all organizers, or department/club-scoped?
4. Is the Cursor-linked Supabase MCP project **staging** or production? (Pass 1 only listed tables; Pass 3+ need an explicit non-prod target.)
5. Confirm Vercel (or other) **cron schedules** for the five `/api/cron/*` routes and that `CRON_SECRET` is set in every deployed env.
6. Approve upgrading **Next** past the GHSA-fixed versions before Pass 2 security work?

---

## 8. Baseline command counts (quick reference)

| Gate | Result |
|------|--------|
| typecheck | PASS |
| lint | FAIL — 362 (269 err / 93 warn) |
| build | PASS |
| knip | FAIL — 47 unused files, 328 unused exports |
| npm audit | FAIL — 60 (1 critical / 12 high / 43 moderate / 4 low) |
| test:unit | FAIL — C6 import boundary (tests not executed) |
| depcheck | unused deps flagged (see evidence) |

---

*End of Pass 1. Passes 2–11 not in scope until requested.*
