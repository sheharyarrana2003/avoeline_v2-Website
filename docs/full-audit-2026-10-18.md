# Avoeline — Full project audit

**Date:** 2026-10-18  
**Branch baseline:** `staging/schema-optimization`  
**Type:** Findings + prioritized backlog (no remediations in this pass)  
**Baselines:** [`docs/audit-report.md`](audit-report.md) (Phase 0), [`docs/phase10-hardening-report.md`](phase10-hardening-report.md), [`docs/schema-report.md`](schema-report.md)  
**Live inputs:** Supabase Security + Performance Advisors (MCP), `npm audit`, `knip --include dependencies`, repo greps

---

## Executive summary

Posture is **service-role + app-layer auth** with deny-default RLS on ~58 tables. Phase 10 closed the Phase 0 criticals (uploadMedia auth, compete secret, open cert/notifications policies, CSP/HSTS). Residual risk is mostly **operational** (Auth HIBP off, npm `sharp`/Next pin), **debt** (legacy actions, `select('*')`, dual UI kits), and **load speed** (missing `loading.tsx` on several tabs; a few sequential page waterfalls).

### Top 10 (actionable)

| # | Sev | Area | Finding |
| --- | --- | --- | --- |
| 1 | high | npm | `sharp` / Next-transitive CVEs — needs Next ≥16.4 (approve bump) |
| 2 | high | Auth | Leaked-password protection (HIBP) disabled in Supabase Auth dashboard |
| 3 | med | Authz | General `/auth/signin` and `uploadMedia` lack `rateLimit` |
| 4 | med | CSP | `'unsafe-inline'` / `'unsafe-eval'` until nonces |
| 5 | med | XSS | Certificate SVG via `dangerouslySetInnerHTML` without sanitizer (trusted render path) |
| 6 | med | DB | ~137 `select('*')` remaining (hot: `teamEngine`, `hackathon.service`, `categoryEngine`) |
| 7 | med | Actions | ~majority of `*.action.ts` still on legacy `ActionResult` vs ~15 `safeAction` |
| 8 | med | Load | No `loading.tsx` on competitions, scoreboard, submissions, teams, settings, tickets, vendors, … |
| 9 | low | Design | Dual UI kits; form Input/Select only in legacy kit; no shared `TextField` |
| 10 | info | Schema | INVESTIGATE C2/C3/C9/C10 KEEP — no DROPs without product answers |

---

## 1. Security / breaches (re-diff vs Phase 0)

### 1a Closed since Phase 0 (do not re-open)

| ID | Status | Evidence |
| --- | --- | --- |
| A-001 uploadMedia | **Closed** | Session + bucket/folder/MIME allowlist in `uploadMedia.action.ts` |
| A-002–A-004 media/review/logo | **Closed / mitigated** | Ownership checks in later phases |
| A-005 Enter View / S9 | **Closed** | No Enter View; admin detail-only |
| S-001 `.env*` | **Closed** | `.gitignore` `.env*` / `!.env.example` |
| S-002 compete secret | **Closed** | `requireCompeteSecret` — no service-role fallback |
| DB-003 certificates open SELECT | **Closed** | Deny-default; no open public SELECT (spot-check 2026-10-18) |
| DB-004 notifications open INSERT | **Closed** | Insert self-only policies |
| CSP | **Closed (enforced)** | `next.config.ts` CSP + HSTS |
| Client `supabaseAdmin` | **None** | `data/supabase.ts` is `server-only` |

### 1b Advisors (2026-10-18)

| Lint | Level | Count | Assessment |
| --- | --- | --- | --- |
| `rls_enabled_no_policy` | INFO | **58** | Intentional deny-default / service-role tables |
| DEFINER executable (authenticated) | WARN | **3** | `is_platform_admin`, `user_is_event_staff`, `user_org_ids` — needed for JWT RLS |
| Auth HIBP | WARN | **1** | **Open** — enable in Dashboard (C7) |
| Unindexed FKs | INFO | **46** | Mostly cold/legacy; hot paths indexed in Phase 10 + schema Step 6 |
| Unused indexes | INFO | **103** | Low-traffic staging; do not drop blindly |
| Multiple permissive policies | WARN | **22** | Mostly `events` policy stacking |

**Storage:** private buckets remain private; public SELECT only on `media` / `sponsor-logos`. Matview `mv_event_registration_counts` not grantable to anon (`anon_mv = false`).

### 1c Open / residual / new

| ID | Sev | Finding | Fix | Effort |
| --- | --- | --- | --- | --- |
| F-SEC-01 | high | npm `sharp` critical/high via Next | Approve Next 16.4+ bump | M |
| F-SEC-02 | high | Auth HIBP disabled | Dashboard toggle | S |
| F-SEC-03 | med | `/auth/signin` no `rateLimit` (admin sign-in is limited) | Share `rateLimit` on public login | S |
| F-SEC-04 | med | `uploadMedia` authed but no rate limit | Add `rateLimit` per user | S |
| F-SEC-05 | med | CSP `unsafe-inline` / `unsafe-eval` | Nonce migration | L |
| F-SEC-06 | med | Cert SVG unsanitized HTML | Sanitize or restrict to server-trusted SVG only | M |
| F-SEC-07 | med | In-memory `rateLimit` (not multi-instance) | Redis/Upstash when scaling | M |
| F-SEC-08 | low | Demo passwords / seed docs | Keep labeled demo-only | — |
| F-SEC-09 | low | DEFINER RPC callable by authenticated | Keep; document intentional | — |

**No live API keys** found in tree. Route handlers: only `GET /api/certificates/[id]` (+ certificate download route).

---

## 2. Unused code

| Signal | Status |
| --- | --- |
| Knip deps CI | Clean of unused production deps; **9 config hints** (stale `ignoreDependencies` for removed typography/newrelic; react-email still ignored) |
| CTF tree | Still knip-ignored under `src/features/hackathon/components/ctf/**` |
| Typo shims | `registeration` / `anayl` / `event_venders` still heavily imported; canonical re-exports exist — **no mass rename** this pass |
| Package | `react-email` / `@react-email/components` / `react-icons` present but knip-ignored — confirm usage or remove |

---

## 3. DB optimization

| Item | Status |
| --- | --- |
| Hot FK indexes | Shipped Phase 10 + schema Step 6 |
| Keyset | Registrations, submissions, moderation, announcements |
| Matview | `mv_event_registration_counts` — hourly / after bulk; service-role only |
| `select('*')` | **~137** occurrences across ~46 unique logical files; hottest: `teamEngine.service.ts` (24), `hackathon.service.ts` (12), `categoryEngine.service.ts` (9), `admin.service.ts` / `formFields.service.ts` (8) |
| Gap pass | Explicit cols already on attendee / expenses / accessCodes / ctf |
| EXPLAIN | Tiny tables may seq-scan despite indexes; expenses/moderation use index scans |

**Do not** add indexes for Advisor INFO cold FKs without proven hot-path seq scans.

---

## 4. Load / parallel fetch

### Already good (exemplars)

- Overview: `Promise.all([regs, teams, groups, recent, shareable])`
- Staff / expenses / agenda / sponsors / certificates / vendors: parallel reads
- Attendees: batched users + profiles + signed URLs; second `Promise.all` for tracks/teams/groups
- Public event: large `Promise.all` after gate
- Compete / ticket tracks: multi-fetch `Promise.all`
- Department announcements: `Promise.all([clubs, announcements])`
- Attendee profiles: chunked `.in()` (no per-id loop)

### Gaps (backlog)

| ID | Surface | Issue | Recommendation |
| --- | --- | --- | --- |
| F-LOAD-01 | Attendees page | Serial `getEvent` → `assertEventActor` → `getRegs` before parallel block | Where safe, start independent reads earlier / overlap ownership with first data fetch |
| F-LOAD-02 | Public event | Sequential visitor event → auth → gate (mostly dependent) | Keep; optional defer non-critical sponsor strip |
| F-LOAD-03 | Event tabs | **Missing `loading.tsx`:** competitions, scoreboard, submissions, teams, settings, tickets, speakers, vendors, exports, hackathon, pub-succ | Add thin loaders matching expenses/agenda pattern |
| F-LOAD-04 | Services | Remaining N+1 risk inside `teamEngine` / taxonomy / email batch sends | Batch `.in()`; never await-in-loop for Supabase reads |
| F-LOAD-05 | Rate limit store | In-memory Map | Fine for single instance; document for multi-region |

**Rule reminder:** parallelize **independent reads** only. Multi-row writes stay RPC / single statement.

---

## 5. Schema

| ID | Topic | Status |
| --- | --- | --- |
| C1 | OTHER_REPOS | Assume none; no further DROPs |
| C2 | `hackathon_submissions` vs `teams.extra` | KEEP |
| C3 | Legacy CTF tables | KEEP |
| C4 | Category string/id | Document only |
| C5 | Prize amount text | KEEP text |
| C7 | Auth HIBP | Dashboard — **open** |
| C9 | `event_access_tiers` / `hackathon_settings` | KEEP INVESTIGATE |
| C10 | `events.access_code` | KEEP INVESTIGATE |

Dropped earlier: `solo_participants`, `hackathon_mentor_slots`, `hackathon_team_phases`, `badge_meetup_attendees`.

---

## 6. Design tokens — change once

| Concern | Single home | Notes |
| --- | --- | --- |
| Colors / semantic surfaces | [`src/app/globals.css`](../src/app/globals.css) `:root` + `@theme` | Dark via `[data-theme="dark"]` |
| Fonts | [`src/app/layout.tsx`](../src/app/layout.tsx) `next/font` → `--font-heading` / `--font-body` / `--font-mono` | |
| Field/button class recipes | [`src/lib/ui.ts`](../src/lib/ui.ts) | Not color tokens — Tailwind class strings |
| Theme toggle | `ThemeToggle` + layout bootstrap script | |
| Tailwind bridge | `tailwind.config.js` | Mirrors some vars |

**No separate `tokens.ts`.** Prefer editing `globals.css` / `layout.tsx` over scattering hex.

**Hex outside tokens (~15 TS/TSX files):** heavy in certificates (`CertificateEditor`, `renderCertificate`, emails); also `global-error.tsx`, dashboard loading skeletons. Prefer semantic CSS vars or shared chart/email palette helpers.

---

## 7. Reusable UI

### Preferred: `src/shared_components/ui/`

PageHeader, Card, DataTable, EmptyState, StatusBadge, FilterTabs, ConfirmDialog, MetricTile, EventCard/Thumb, FileUploadField, PasswordField, SearchField, FormFeedback, charts (Meter, TrendChart.lazy), …

### Legacy: `src/components/ui/`

Button, Input, Select, Modal, Badge, Card — **migrate toward shared**.

### Form primitive gaps

| Primitive | Today | Target |
| --- | --- | --- |
| Input / Select | Legacy kit only | Promote to `shared_components/ui` |
| TextField | Missing | Add labeled wrapper over Input + `labelClass` |
| Textarea | Raw + `fieldClass` | Shared `Textarea` |
| File upload | Shared `FileUploadField` → MediaUpload | Keep |
| Date | `shared_components/DateField` | Keep |
| Modal | Legacy only; ConfirmDialog in shared | Unify |

---

## 8. Remediation backlog (P0–P3)

### P0 — do soon (security / compliance)

| ID | Item | Effort | Paths |
| --- | --- | --- | --- |
| P0-1 | Enable Auth HIBP | S | Supabase Dashboard |
| P0-2 | Rate-limit public sign-in + uploadMedia | S | `src/app/auth/signin`, `uploadMedia.action.ts` |
| P0-3 | Schedule Next bump for `sharp` | M | `package.json` (needs approval) |

### P1 — load + integrity

| ID | Item | Effort | Paths |
| --- | --- | --- | --- |
| P1-1 | Add `loading.tsx` for remaining event tabs | S | competitions, scoreboard, submissions, teams, settings, tickets, speakers, vendors, exports |
| P1-2 | Continue `select('*')` burn-down (teamEngine, hackathon.service, categoryEngine, formFields) | M | listed services |
| P1-3 | Overlap Attendees page serial fetches where safe | S | `attendees/page.tsx` |

### P2 — standards

| ID | Item | Effort | Paths |
| --- | --- | --- | --- |
| P2-1 | Migrate remaining actions to `safeAction` + zod | L | ~42 legacy `*.action.ts` |
| P2-2 | Unify UI kits (Input/Select/Button/Modal → shared) | L | `src/components/ui` → `shared_components/ui` |
| P2-3 | Add shared TextField / Textarea | M | new shared components + `ui.ts` |
| P2-4 | Replace cert/email hardcoded hex with token/helpers | M | certificates + email templates |
| P2-5 | CSP nonces | L | `next.config.ts`, layouts |

### P3 — cleanup

| ID | Item | Effort |
| --- | --- | --- |
| P3-1 | Clean knip `ignoreDependencies` stale entries | S |
| P3-2 | Confirm/remove unused react-email / react-icons | S |
| P3-3 | Typo shim import migration (optional; policy was leave) | L |
| P3-4 | Schema INVESTIGATE answers → optional scream DROPs | L |
| P3-5 | Distributed rate limit when multi-instance | M |
| P3-6 | Lighthouse paste + Playwright seed suite | M |

---

## Remediation progress (2026-10-19)

| ID | Status |
| --- | --- |
| P0-1 HIBP | **Open** — Dashboard toggle (not code) |
| P0-2 rateLimit sign-in + uploadMedia | **Done** (+ Google OAuth start) |
| P0-3 Next/sharp bump | **Open** — needs explicit approve |
| P1-1 event tab `loading.tsx` | **Done** (10 tabs) |
| P1-2 `select('*')` hottest services | **Done** teamEngine / hackathon / categoryEngine |
| P1-3 Attendees overlap | **Done** |
| Onboarding smoke | **Done** unit + Playwright gates + `npm run test:smoke:onboarding` |

---

## Out of scope (this report)

Implementing the backlog, Next force-bump, UI kit merge, schema DROPs, lint-to-zero.

---

## Appendix — how to re-run signals

```bash
npm audit --omit=dev
npx knip --include dependencies
npm run test:unit
# Advisors: Supabase MCP get_advisors security|performance
```
