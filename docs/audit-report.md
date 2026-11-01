# Avoeline — Phase 0 read-only audit report

**Date:** 2026-10-12  
**Scope:** Secrets, authorization, Supabase RLS/storage, unused code, DB/FE performance, ENGINEERING_RULES drift  
**Inputs:** [`docs/ENGINEERING_RULES.md`](ENGINEERING_RULES.md), [`docs/11-events-and-hackathon-complete-spec.md`](11-events-and-hackathon-complete-spec.md), live Supabase Advisors (Security + Performance via MCP), repo grep/knip/SQL  
**Code changes in this phase:** none (report only)

---

## Executive summary

Architecture is **service-role + app-layer auth** for most tables (45 public tables have RLS on but **zero policies** — anon/authenticated are denied; `supabaseAdmin` bypasses RLS). That makes **unauthenticated Server Actions that write via service role** critical. Dashboard Advisors also flag open SELECT policies (`certificates`, `hackathon_tasks`), open `notifications` INSERT, and **102 unindexed FKs**. No live API keys found in the tree; highest secret risks are compete-cookie secret fallback and PII-heavy logs.

**Please also paste** Dashboard → Advisors (Security + Performance) into a follow-up message if you want pixel-perfect parity with the UI; this report already includes the MCP Advisors dump from 2026-10-11.

---

## 1. Secrets & leaks

| ID | Severity | File or table | Finding | Recommended fix | Effort |
| --- | --- | --- | --- | --- | --- |
| S-001 | high | `.gitignore` | Not full `.env*`: `.env.production` / `.env.development` / `.env.staging` are **not** ignored (only `.env`, `.env*.local`, a few `*.local`). | Add `.env*` with `!.env.example`; align ENGINEERING_RULES S1. | S |
| S-002 | high | `src/features/hackathon/competeSession.ts` | HMAC secret falls back to `SUPABASE_SERVICE_ROLE_KEY` or hardcoded `"avoeline-compete-dev"`. | Require `HACKATHON_COMPETE_SECRET`; document in `.env.example`; no service-role/fixed fallback. | S |
| S-003 | high | `src/services/certificate.service.ts` | `[CERT_GEN]` logs full event/registration/cert JSON (emails/PII). | Log ids only; gate behind debug. | M |
| S-004 | medium | `src/lib/email/resend.ts`, `src/lib/email.ts` | Logs full recipient emails on send/skip. | Redact/hash emails in logs. | S |
| S-005 | medium | `src/features/hackathon/hackathon.service.ts` | Logs team `join_code` on duplicate-code error. | Log team id only. | S |
| S-006 | medium | `docs/TESTING.md` | Real owner Gmail addresses as env examples. | Use placeholders in docs. | S |
| S-007 | medium | `docs/TESTING.md`, `scripts/seed-demo.mjs` | Demo password `AvoelineDemo1!`, join/enter codes, CTF `FLAG{demo*}` committed. | Label demo-only; rotate if shared/prod ever used. | S |
| S-008 | medium | `cookies.txt` (untracked) | Cookie dump present; not gitignored. | Delete; ignore cookie dumps. | S |
| S-009 | low | `body.html` (untracked) | Path dump with org/event UUIDs. | Delete; ignore capture dumps. | S |
| S-010 | low | `src/features/auth/authService.ts` | `requireAdmin` warn logs admin email. | Log user id only. | S |
| S-011 | info | `.env.example` / code | Only `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` are public (correct). Private names (`SUPABASE_SERVICE_ROLE_KEY`, `RESEND_*`, etc.) are non-public. | Add `HACKATHON_COMPETE_SECRET=` (see S-002). | S |
| S-012 | info | tooling | Gitleaks/TruffleHog via npx failed in this environment; grep-only coverage. No live `re_*` / `sk_*` / `AIza` / PEM / firebase adminsdk JSON in tree. | Pin gitleaks in CI; re-scan history. | M |

### NEXT_PUBLIC inventory

| Variable | Should be private? |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | No |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No (publishable; must be protected by RLS) |

No other `NEXT_PUBLIC_*` vars found.

---

## 2. Authorization

**Inventory:** ~54 `*.action.ts` files, ~167 exported actions; **0** `src/app/api/**` route handlers. Gates used: `requireAdmin` (~12 files), `assertOwnedEvent` / `assertEventActor` (~24), `hasModuleAccess` (~3). **zod / `safeAction`:** 0. **`getAuthenticatedUser` / `requireRole` in actions:** ~0.

| ID | Severity | File or table | Finding | Recommended fix | Effort |
| --- | --- | --- | --- | --- | --- |
| A-001 | critical | `src/features/media/uploadMedia.action.ts` | No session. Client chooses `bucket`/`folder`/`allowAny`/`maxBytes`; writes via service role. | Require auth; allowlist buckets/folders; drop open `allowAny`; MIME sniff (S5). | M |
| A-002 | critical | `src/features/event_vendors/actions/updateVendor{Logo,Cover,Portfolio}.action.ts` | No session/ownership; any caller can rewrite vendor media URLs. | Session must own vendor (or admin). | S |
| A-003 | critical | `src/shared_components/organizer/updateOrganizerLogo.action.ts` | No session; trusts client `organizerId` + `logoUrl`. | Session `userId === organizerId`. | S |
| A-004 | critical | `src/features/bookings/actions/reviewVendor.action.ts` | No session; trusts client `organizerId` matching booking. | Require session owner of booking. | S |
| A-005 | critical | `src/features/admin/supportPreview.ts`, organizer/vendor layouts, `ownership.ts` | **S9 violation:** support preview enters live dashboards; `assertOwnedEvent` grants platform_admin **full write**, not read-only, not audited. | Block mutations in preview (or read-only pages); audit log; keep banner. | L |
| A-006 | high | `src/features/hackathon/actions/teams.action.ts` (`insertHackathonTeam`) | Exported `"use server"` helper with no auth. | Make non-exported / internal-only. | S |
| A-007 | high | `src/features/access/actions/inviteLinks.action.ts` (`markInviteRegisteredAction`) | No session; client `registrationId` can attach arbitrary reg to invite. | Bind invite↔reg only in registration success path. | S |
| A-008 | high | `src/features/ticketing/actions/ticketing.action.ts` (+ service) | Own event A, pass tier/promo id from event B → mutate by id only. | Always `.eq("event_id", eventId)` on mutate/delete. | S |
| A-009 | high | all `*.action.ts` | No zod at boundaries (S4/C2). | Introduce `safeAction` + schemas per family. | L |
| A-010 | medium | most organizer writes | Plan check (`hasModuleAccess`) rare (teams/exports only). | Gate paid modules on writes (certs, email, hackathon…). | M |
| A-011 | medium | `src/app/events/[eventId]/ticket/[registrationId]/page.tsx` | Public ticket = UUID capability URL; PII if leaked (S12). | Optional opaque ticket token. | M |
| A-012 | medium | `downloadCertificatePublicly` | Unauth PDF by cert id (revoked blocked). | Short-lived signed download claim. | M |
| A-013 | medium | enterCompete, flag submit, invite open | No rate limit (S6). | Shared `rateLimit` on public entry points. | M |
| A-014 | medium | `accessCodes.service.ts` | Codes stored plaintext + hash. | Hash-only at rest; show once. | M |
| A-015 | medium | `eventEmail.action.ts` | Bulk email: ownership OK; no plan/rate limit/audit. | Plan + rateLimit + audit (S10). | S |
| A-016 | low | `tasks.service.ts` `hashFlag` | Plain SHA256, not HMAC+salt (S8). | HMAC(secret, salt‖flag); timing-safe. | S |
| A-017 | info | registration / most staff paths | Registration prices server-derived; many staff actions use `assertEventActor` after recent hardening. | Keep; add zod/plan. | — |

---

## 3. Supabase

### 3a SQL results (run via project MCP)

| ID | Severity | File or table | Finding | Recommended fix | Effort |
| --- | --- | --- | --- | --- | --- |
| DB-001 | info | 79 public tables | **All have `relrowsecurity = true`.** None with RLS disabled. | Keep; do not disable. | — |
| DB-002 | high | 45 tables (Advisor `rls_enabled_no_policy`) | RLS on, **no policies** (e.g. `hackathon_*`, `payments`, `promo_codes`, `event_invites`, `teams`, `organizer_profiles`, …). Anon/auth get deny-all; app relies entirely on `supabaseAdmin`. | Either add least-privilege policies for JWT paths **or** document “service-role only” and treat every action as a security boundary (A-001…). Prefer policies for any client-facing reads. | L |
| DB-003 | critical | `certificates` / `certificates_public_verify` | Policy `SELECT` with `qual = true` for `{public}` — **any anon can read all certificate rows**. | Restrict to verification-code lookup or public columns only. | S |
| DB-004 | critical | `notifications` INSERT policies | Two policies `with_check = true` for `{public}` — **anyone can insert notifications**. | Drop open inserts; service role / authenticated own-user only. | S |
| DB-005 | high | `hackathon_tasks` / `hackathon_tasks_read` | `SELECT` `qual = true` for `{authenticated}` — any signed-in user reads all tasks (incl. flags/hints in row/extra). | Scope to event participant/staff/owner. | M |
| DB-006 | medium | catalog read policies | `badge_*`, `event_categories`, `category_field_sets`, `subscription_plans`, `vendor_profiles`, `vendor_services` use `qual = true` SELECT (intentional public catalogs — OK if no secrets in rows). | Confirm vendor profiles expose no private fields; tighten if needed. | S |
| DB-007 | high | storage buckets | `media` (public), `sponsor-logos` (public); private: `certificates`, `payment-screenshots`, `hackathon-challenge-files`. Public SELECT policies only for `media` + `sponsor-logos`. Private buckets have **no** SELECT policies (signed URLs via service role — OK if uploads gated). | Enforce A-001 allowlist; set `file_size_limit` + `allowed_mime_types` on all buckets; signed URL TTL ≤ 5 min (S3). | M |
| DB-008 | medium | Advisors | `is_platform_admin()`, `user_org_ids()`, `user_is_event_staff(uuid)` executable by **anon + authenticated** as SECURITY DEFINER. | `REVOKE EXECUTE FROM anon, authenticated` (or INVOKER); keep for policy helpers via table owner. | S |
| DB-009 | info | SECURITY DEFINER search_path | Query for DEFINER without `search_path=` returned **0** rows (good). | Keep setting search_path on new functions. | — |
| DB-010 | medium | Auth Advisor | Leaked password protection **disabled**. | Enable HaveIBeenPwned check in Auth settings. | S |
| DB-011 | high | App usage | `supabaseAdmin` used across **100+** server modules (services/actions). No `"use client"` imports of admin found (good). Cookie client: `createSupabaseServer()`. | Keep admin off client; reduce surface by moving safe reads to JWT+RLS where possible. | L |

### 3b Supabase Advisors (MCP snapshot 2026-10-11) — paste Dashboard output to confirm

**Security**

| Lint | Level | Count | Notes |
| --- | --- | ---: | --- |
| `rls_enabled_no_policy` | INFO | 45 | Tables listed above (DB-002) |
| `anon_security_definer_function_executable` | WARN | 3 | `is_platform_admin`, `user_org_ids`, `user_is_event_staff` |
| `authenticated_security_definer_function_executable` | WARN | 3 | same three |
| `auth_leaked_password_protection` | WARN | 1 | disabled |

Remediation links: [0008](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [0028](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [0029](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

**Performance**

| Lint | Level | Count | Notes |
| --- | --- | ---: | --- |
| `unindexed_foreign_keys` | INFO | **102** | See §5; full list matches SQL FK audit |
| `auth_rls_initplan` | WARN | 14 | Wrap `auth.uid()` as `(select auth.uid())` in policies |
| `unused_index` | INFO | 17 | Candidates after traffic grows |
| `multiple_permissive_policies` | WARN | 31 | Especially `events`, `notifications` |

---

## 4. Unused code

Knip via explore agent reported unused surface; a later `knip@5.41.1` npx run failed (`ts.getDefaultLibFilePath`). Treat numbers as directional until knip is pinned in CI.

| ID | Severity | File or table | Finding | Recommended fix | Effort |
| --- | --- | --- | --- | --- | --- |
| U-001 | medium | `src/features/hackathon/components/ctf/*` (+ others) | ~32 unused files (CTF manager UIs, JoinTeamModal, DomainCategoryPicker, wizard results bits, HomeHeader/Footer, …). | Confirm with knip+grep; delete or wire into doc-11 CTF tabs. | M |
| U-002 | low | typo/alias shims | `auth.service.ts`, `registration.service.ts`, `analytics.service.ts`, etc. unused; callers keep typo paths. | Migrate imports then delete shims (ENGINEERING_RULES: list deletions first). | M |
| U-003 | low | `package.json` | Unused deps: `@tailwindcss/typography`, `newrelic`, `react-email`, `react-icons` (knip). | Remove after confirm. | S |
| U-004 | low | many modules | ~136 unused exports (knip). | Prune after wiring CTF/UI. | M |
| U-005 | info | `/hackathon/**`, `/tickets` | Intentional redirect stubs to unified event routes (doc 11). | Keep stubs; do not delete until analytics clear. | — |
| U-006 | info | Firebase | No live Firebase/adminDb in `src/`. | Done. | — |
| U-007 | info | `ethers` / blockchain | Still used by certificate mint/Pinata — **not** dead. | Keep until product drops chain certs. | — |
| U-008 | low | scattered | Few large commented-out blocks; mostly historical notes. | Delete dead comments when touching files (C8). | S |

---

## 5. DB performance

| ID | Severity | File or table | Finding | Recommended fix | Effort |
| --- | --- | --- | --- | --- | --- |
| P-001 | high | 102 FKs (Advisor + SQL) | Unindexed FK leading columns across hackathon_*, certificates, bookings, teams, registrations, … | Migration: index hot paths first (`hackathon_teams.event_id/track_id`, `registrations.event_id` already?, `team_members.user_id`, `bookings.*_id`, `event_invites.event_id`). | L |
| P-002 | high | `src/` (~162 hits / 46 files) | Widespread `.select("*")`. Worst: `teamEngine.service.ts` (~22), `hackathon.service.ts` (~12), `ctf`/`admin`/`categoryEngine` (~9). | Column lists / nested selects (D3). | L |
| P-003 | high | teams/judging/leftover/tracks/tasks actions | N+1 write loops (`await` inside `for`). | Batch updates / single RPC (D6). | M |
| P-004 | medium | `eventEmail.action.ts`, `guestList.action.ts` | Sequential email per recipient on request path. | Queue/batch; cap; off-request (P9). | M |
| P-005 | high | `admin.service.ts`, regs/teams lists | Unbounded lists (no `.range` / keyset). | Pagination default 25–50 (D4). | M |
| P-006 | medium | RLS policies | 14 `auth_rls_initplan` WARN; 31 multiple permissive policies on `events`/`notifications`. | `(select auth.uid())`; merge policies. | M |
| P-007 | medium | page loaders | Heavy sequential chains: attendees, HackathonWorkspace, compete, event layout, organizer dashboard (partially parallelized). | Finish Promise.all; Suspense per tab (P2). | M |
| P-008 | info | Advisors | 17 unused indexes (early traffic). | Revisit after launch; do not drop hot FK indexes. | S |

### Estimated heaviest page loads (query fan-out)

| Rank | Route / view | Notes |
| ---: | --- | --- |
| 1 | Organizer event Attendees | Event + ACL + all regs + users + attendees + signed proofs + teams/tracks |
| 2 | HackathonWorkspace (competitions/tasks/…) | Tracks, teams, orgs, judges, mentors, announcements, settings, prizes, task configs |
| 3 | Compete / ParticipantArena | Session + teams + track + tasks + submissions |
| 4 | Event layout shell | Event + user + staff grant + hackathon flag + module checks + tabs |
| 5 | Organizer dashboard | Plan + events + reviews/analytics widgets |
| 6 | Staff tab | Teams + members + positions + applicants + forms |
| 7 | Access tab | Guests + tiers + promos + settings |
| 8 | Admin tenants/list | Unbounded profile/event scans |
| 9 | Public event page | Event + related media/agenda |
| 10 | Certificates designer | Templates + preview payloads |

(Exact query counts need a runtime tracer; not instrumented in this phase.)

---

## 6. Frontend performance

| ID | Severity | File or table | Finding | Recommended fix | Effort |
| --- | --- | --- | --- | --- | --- |
| F-001 | medium | `src/app/**` | 134 `page.tsx`; ~104 lack an ancestor `loading.tsx` (25 loading files exist). Root `error.tsx` covers most. | Add `loading.tsx` under organizer event, compete, admin. | M |
| F-002 | high | client components | Largest `"use client"`: ParticipantArena (~665), certificateClient (~634), CategoryManagementView (~592), SingleAttendeeView (~568), … | Split + `next/dynamic` for editor/charts/QR (P4). | L |
| F-003 | high | images | **0** `next/image` imports; ~17 raw `<img>` (banners/overview). | Adopt `next/image` + thumb sizes (P5). | M |
| F-004 | medium | `LiveRefresh.tsx` | Polling via `router.refresh` (≥5s); countdown/email verify intervals. **No** Supabase Realtime channels. | Back off when hidden; scoreboard → Realtime (D10/P8). | M |
| F-005 | medium | tooling | `@next/bundle-analyzer` **not configured** — route sizes not measured. | Add analyzer; target ~200 KB gzipped/route (P7). | S |

---

## 7. Standardization drift (vs ENGINEERING_RULES)

| ID | Severity | File or table | Finding | Recommended fix | Effort |
| --- | --- | --- | --- | --- | --- |
| D-001 | high | actions / package.json | No `safeAction`, no zod, no `*.schema.ts`. `ActionResult` is `{ success, error? }` not `{ ok, data }`. | Adopt C2 end-to-end. | L |
| D-002 | high | — | No `src/env.ts` zod env validation (C9). | Add server/client env schemas; fail fast. | S |
| D-003 | medium | `src/` | ~200 `: any` / `as any`. | Ban new `any`; burn down hotspots. | L |
| D-004 | medium | `src/` | ~250+ `console.*` (C5/no-console). | Logger; strip PII (ties S-003). | M |
| D-005 | medium | many files | 71 files >300 lines (god services/components). | Split by responsibility (C6). | L |
| D-006 | medium | UI kits | Dual kits: `src/components/ui` vs `shared_components/ui`. Missing C3: `FileUploadField`, `CompetitionFilter`, `EventCard`/`EventThumb`. | Consolidate on one kit; build missing primitives. | L |
| D-007 | medium | tests | Only 2 unit tests in `test:unit`; no Playwright in scripts (C12). | vitest for permissions/schemas; Playwright smokes. | L |
| D-008 | medium | DoD | knip not in CI; Definition of Done unmet for unused/zod/RLS policies. | Add knip + Advisors gate to CI. | M |
| D-009 | high | S9 | Support “Enter view” contradicts ENGINEERING_RULES (see A-005). | Product decision + enforce read-only. | L |
| D-010 | medium | S6/S10/S18 | No shared rateLimit; weak audit log coverage; no MFA for platform_admin. | Implement incrementally. | L |

---

## Prioritized plan

### Must-fix before launch

1. **A-001–A-004** — Auth-gate upload + vendor/organizer media + review writes.  
2. **DB-003, DB-004** — Close `certificates` open SELECT and `notifications` open INSERT.  
3. **DB-005** — Scope `hackathon_tasks` SELECT (flags/hints).  
4. **A-005 / D-009** — Make support preview read-only (or remove Enter view).  
5. **S-002** — Compete session secret (no service-role / hardcoded fallback).  
6. **S-001** — Broaden `.gitignore` for `.env*`.  
7. **A-006–A-008** — Unexport forgeable helpers; ticketing event_id binding; invite register bind.  
8. **DB-010** — Enable Auth leaked-password protection.  
9. **DB-008** — Revoke anon EXECUTE on SECURITY DEFINER helpers.

### This batch (next engineering sprint)

1. Rate limits on login, flag submit, invite open, access codes, bulk email (A-013/A-015).  
2. Access codes hash-only; CTF HMAC flags (A-014/A-016).  
3. Plan gates on paid writes (A-010).  
4. Index top ~30 hot FKs (P-001); pagination on admin + attendees (P-005).  
5. Strip CERT_GEN / email PII logs (S-003/S-004).  
6. `src/env.ts` + start zod on highest-risk actions (D-002/A-009 slice).  
7. `loading.tsx` on event/compete/admin; introduce `next/image` for banners (F-001/F-003).  
8. Pin gitleaks + knip in CI (S-012/D-008).

### Later

1. Full `safeAction` migration + ActionResult shape (D-001).  
2. Dual UI kit merge + C3 primitives (D-006).  
3. RLS policies for service-role-only tables where JWT reads are desired (DB-002) **or** formal “admin client only” architecture doc.  
4. N+1 write batching / email queue (P-003/P-004).  
5. Bundle analyzer + dynamic import of certificate editor / ParticipantArena (F-002/F-005).  
6. Realtime scoreboard; MFA for owners; Playwright suite; file-size burn-down; unused CTF UI delete-or-ship (U-001).  
7. Opaque ticket/cert download tokens (A-011/A-012).

---

## Pause for review

No application code was modified in Phase 0. Reply with which **must-fix** / **this batch** items to implement next (or paste Dashboard Advisors if they differ from the MCP snapshot above).
