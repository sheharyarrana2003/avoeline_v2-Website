# Avoeline — complete implementation context

**Purpose:** Living map of the codebase. Agents and humans should read this file first, then open only the files named here. After any page/feature change, update this document in the same session (see Change log).

**Product:** End-to-end event platform (Pakistan education / corporate training). Organizers create events, attendees register, vendors quote/book, admins moderate. Live: https://avoeline-website.vercel.app/

**Stack:** Next.js **16.2.6** App Router, React **19**, TypeScript, Tailwind **4**, **Supabase Auth + Postgres**, Supabase Storage, Vercel. Related libs: `pdf-lib`, `exceljs`, `qrcode`, `konva` / `react-konva` (cert editor), `recharts`, `lucide-react`.

**Path alias:** `@/*` → repo root (`tsconfig.json`). `@/components/*` → `src/components/*`.

---

## Canonical standards (Supabase-only)

**Firebase is gone.** Do not reintroduce Firestore APIs, `adminDb`, or `firebase` packages. All data access uses typed `supabaseAdmin` / `createSupabaseServer` from [`data/supabase.ts`](data/supabase.ts) (`SupabaseClient<Database>`). `SUPABASE_SERVICE_ROLE_KEY` is required (no anon fallback). Regenerate types with `npm run types:db`.

| Layer | Location | Role |
| --- | --- | --- |
| Routes (thin) | `src/app/**` | Pages, layouts, loading/error. Fetch + compose feature UI. Prefer Server Actions; **documented Route Handlers only** (certificates: `GET /api/certificates/[id]` for mobile ETag). |
| Features | `src/features/<name>/` | Domain: `types.ts` (client-safe), `*.service.ts` (reads via `supabaseAdmin`), `actions/*.action.ts` (`"use server"` writes), `components/`. |
| Shared services | `src/services/` | Cross-cutting leftovers migrating into features; prefer feature services for new work. |
| Shared UI | `src/shared_components/` | Chrome + dashboard design system (**preferred** for new UI). |
| Form UI kit | `src/components/ui/` | Badge/Button/Card/Input/Modal/Select — migrate toward `shared_components/ui`. |
| Data clients | `data/` | `TABLES` in `collections.ts`, typed `supabaseAdmin` / SSR Auth. **No Firestore façade.** |
| Helpers | `src/lib/` | Legacy `ActionResult`, C2 `safeAction` / `SafeActionResult`, `rateLimit`, `logger`, dates, status, email, CSV, money, UI classes, `database.types.ts`. |
| Env | `src/env.ts` | Zod-validated public + server env (`getPublicEnv` / `getServerEnv` / `requireCompeteSecret`). |
| Edge auth | `src/proxy.ts` | Session cookie + role prefix. Matcher: `/organizer`, `/vendor`, `/attendee`, `/admin`, `/department`, `/clubs`. |

**Conventions**

- New Server Actions: `safeAction({ input: zodSchema, auth?, run })` → `SafeActionResult` (`{ ok, data } \| { ok: false, error: { code, message } }`) in `src/lib/safeAction.ts`. Legacy forms still use `ActionResult` / `ok()` / `fail()` via `toLegacyResult`.
- Form actions: `xImpl()` + `finishForm` from `src/lib/formRedirect.ts` → `?e=` / `?ok=` + `FormFeedback`.
- Queries use Postgres snake_case + `TABLES.*`. Status/payment/booking enums match DB check constraints (no dual remaps).
- Parallel reads: `Promise.all` of batched `.in()` queries — never per-id round trips when a batch works.
- Multi-row integrity: Postgres `rpc` / single statement, not sequential fake transactions.
- Auth before every write: `getAuthenticatedUser` / `requireRole` / `assertOwnedEvent` (service role bypasses RLS). Prefer `can(user, permission, scope)` from `src/features/permissions/can.ts` for module/permission keys (`src/lib/permissions.ts` catalog + `access_grants`).
- Rate-limit sensitive public entry points with `rateLimit(key, limit, windowSec)` (`src/lib/rateLimit.ts`).
- Never import `supabaseAdmin` in `"use client"` files (`data/supabase.ts` is `server-only`). Keep Client Component types in `types.ts`.
- Request-cached reads use React `cache()` (AuthService, EventService).
- Event **lifecycle** is **derived** from schedule + now in `src/lib/eventState.ts`.
- Organizer/vendor/attendee URLs use **user UUID**.
- Uploads: `src/features/media/uploadMedia.action.ts` (C3 alias `FileUploadField`). Body limits **50mb** (`serverActions.bodySizeLimit` + `proxyClientMaxBodySize`).
- Paid modules: `hasModuleAccess` / `checkPermission` / `can` — no new raw role gates for modules.
- C3 UI primitives: `EventCard`, `EventThumb`, `CompetitionFilter`, `FileUploadField`, plus existing Modal/ConfirmDialog/StatusBadge/EmptyState/`DataTable` (Server Component)/`ClientDataTable` (row clicks only)/FilterTabs under `shared_components/ui`. Never mark `DataTable` as `"use client"` — that breaks organizer/vendor/attendee list pages.
- Tooling: `npm run typecheck` / `lint` / `knip` / `format` / `test:unit` / `test:e2e` / `analyze`; husky + lint-staged on commit; **CSP enforced** + HSTS in `next.config.ts`. Architecture: `docs/ARCHITECTURE.md`. Phase 10 report: `docs/phase10-hardening-report.md`.

---

## Auth, roles, and gates

**User types (session / `userType`):** `attendee` | `organizer` | `vendor` | `admin`

**Fine roles (`User.role`):** `platform_admin` | `department_admin` | `organizer` | `team_lead` | `attendee`

**Files**

- Client + session: `src/features/auth/authService.ts` (Supabase Auth cookies, `getCurrentUser`, `requireAdmin`, signup/setup). New Auth users also get `public.users` + profile via `private.handle_new_user`. Self-serve: Google or email/password → verify email → profile → plan (`/auth/signup/organizerSetup` | `vendorSetup`); free self-serve organizers get `organizer_profiles.review_status = pending` and vendors `vendor_profiles.status = pending` → `/auth/signup/awaiting-approval` until admin approves (`setOrganizerReview` / `setVendorStatus` / `setTenantVerification`). Paid plans also wait there until owner approves payment at `/admin/billing/pending` (payment approval also sets profile approved). Tenant-created accounts stay approved. Docs: `docs/onboarding-plans-checkout.md`.
- RBAC: `src/features/auth/rbac.service.ts` (`requireRole`, `getAuthenticatedUser`, team-lead check).
- Module gating: `hasModuleAccess` / `hasVendorModuleAccess` uses the plan's `included_modules` (every key is optional, including the usual free set) plus grant/deny rows in `feature_overrides`. Keys in `src/features/permissions/moduleKeys.ts` (vendor free: dashboard/quotes/services/bookings; pro adds portfolio, event marketing, analytics). Free vendors: max 5 services; portfolio videos require `vendor_portfolio`.
- Forced password reset: `users.must_reset_password` → `/auth/change-password` (`src/proxy.ts` + sign-in).
- UI guard: `src/features/auth/components/RequireRole.tsx`
- Sign-out: `src/features/auth/actions/signOut.action.ts`
- Promote admin: `src/features/auth/actions/promoteToAdmin.action.ts`
- Middleware: `src/proxy.ts` — verifies session; wrong role redirected to `/{userType}/{roleId|userId}/dashboard`. Also gates pending organizer review / vendor status to `/auth/signup/awaiting-approval` (layouts mirror). Event staff (`user_is_event_staff`) may stay on the owner's event URLs. Platform admins oversee tenants via `/admin/*` detail routes only (no Enter View / product impersonation; S9). Public exception: `/admin/signin`. `assertOwnedEvent` = owner/collab/dept/president/platform admin only. Staff mutations use `assertEventActor(eventId, tab)` + page grants from `staffEventAccess.ts`. Admin grants: `area:view` / `area:manage` via `can()` + `holdsArea` / `canManageArea`. Admin sign-in errors: `src/features/auth/authErrors.ts` (`mapSignInAuthError`).
- Suspended accounts: `accountIsLive` in `src/features/admin/types.ts` → `/suspended`
- Access denied: `src/app/access-denied/page.tsx`

**Roles from memberships:** department and club roles are not stored on `users`. `withOrgStanding` in `src/services/user.service.ts` derives them from `org_memberships`: a `department_admin` row sets `role = department_admin`, `orgId`, and `managedOrgIds` (department + its clubs); `president` rows fill `presidentOfOrgIds`. `landingPathFor(user)` picks the post-login page (admin → `/admin`, department → `/department`, president → `/clubs/{id}`, then organizer / vendor / attendee dashboards); used by sign-in, change-password, and access-denied. Scope checks: `canManageOrg` / `canLeadClub` in `src/features/department/orgScope.ts`.

**SaaS owners:** `npm run seed:owners` (`scripts/seed-saas-owners.mjs`) creates or resets the Auth users listed in `SAAS_OWNER_EMAILS` with `SAAS_OWNER_PASSWORD_1..N` from `.env.local`, as `platform_admin` + `is_owner`. **Full wipe (delete only):** `CONFIRM=YES npm run reset:wipe-data` then re-run `seed:owners` (`docs/TESTING.md` §0a). **Demo tenants:** `npm run seed:demo` (`scripts/seed-demo.mjs`) — emails `*@avoeline.demo`, password `AvoelineDemo1!`, default **`DEMO_SEED_CAP=2`** of each list for tab smoke (`DEMO_SEED_CAP=5` for the fuller cast). Walkthrough: `docs/TESTING.md`.

Admin panel identity: `src/features/admin/types.ts` — areas `orgs | organizers | events | vendors | support | categories | tenants | plans | website`. Owner (`is_owner`) has all areas + Platform staff. Staff are `user_type = platform_admin` with `is_owner = false`. Bootstrap via `PLATFORM_ADMIN_EMAILS` is documented on `AdminIdentity.viaBootstrap`. Tenant write caps: `TENANT_CAPS` (`tenants:create` | `plans:change` | `grants:manage` | `pricing:manage` | `approvals:manage`) via `canTenantCap`; `tenants:manage` implies all caps. Website caps: `WEBSITE_CAPS` (`website:view` | `website:edit` | `website:publish` | `legal:publish` | `contact:manage` | `community:view`) via `canWebsiteCap` / `requireWebsiteCap`; legacy `website:manage` / bare `website` implies view+edit only.

---

## Data stores

### Postgres tables (`data/collections.ts` `TABLES` / `COLLECTIONS` aliases)

Auth IDs are **UUIDs** (`auth.users` → `public.users.id`). Vendor URLs use the same `users.id`. Schema: `supabase/migrations/20260920120000_complete_schema.sql`. Types: `src/lib/database.types.ts`.

| Constant | Table | Used by |
| --- | --- | --- |
| USERS | `users` | Auth, RBAC, admin (`is_owner`, `admin_permissions`, `user_type`) |
| ORGANIZER_PROFILES / ORGANIZERS | `organizer_profiles` | Organizer profiles |
| VENDOR_PROFILES / VENDORS | `vendor_profiles` | Vendor profiles |
| ATTENDEE_PROFILES / ATTENDEES | `attendee_profiles` | Attendee profiles |
| ORGANIZATIONS / ORGS | `organizations` | Departments, clubs, businesses |
| ORG_MEMBERSHIPS | `org_memberships` | Tenancy roles |
| PENDING_INVITES | `pending_invites` | SaaS owner → department / club invites |
| EVENTS | `events` | Events (`parent_event_id`, `org_id`; `allow_group_registration` / `group_min_size` / `group_max_size`; `website_featured`; lifecycle still derived) |
| EVENT_FORM_FIELDS | `event_form_fields` | Per-event registration questions (system + custom; soft-archive) |
| PROMO_REDEMPTIONS | `promo_redemptions` | Atomic promo usage rows; totals on Access; RPC `redeem_promo` |
| EVENT_CATEGORIES | `event_categories` | Super categories + formats. `id` is a **text slug** (format `hackathon` drives `isHackathon`); `category_type` = `super_category` \| `event_format` |
| CATEGORY_FIELD_SETS | `category_field_sets` | Dynamic category fields |
| CATEGORY_REQUESTS | `category_requests` | Organizer requests, admin review |
| CHECKLIST_TEMPLATES | `checklist_templates` | Wizard starter checklists |
| EVENT_CHECKLIST_ITEMS | `event_checklist_items` | Per-event checklist |
| EVENT_AGENDA_ITEMS | `event_agenda_items` | Agenda |
| EVENT_AGENDA_SPEAKERS | `event_agenda_speakers` | Session ↔ speaker join |
| REGISTRATION_GROUPS | `registration_groups` | Regular (non-hackathon) group bookings |
| EVENT_SPEAKERS | `event_speakers` | Speakers |
| EVENT_ACCESS_TIERS / EVENT_TIERS | `event_access_tiers` | VIP/access names |
| EVENT_INVITES / INVITE_LINKS | `event_invites` | Guest list + invite links (`kind` whitelist / invite_link) |
| TICKET_TIERS | `ticket_tiers` | Paid SKUs (Access tab “Tiers & promos”; `active`, `available_until`). Hidden on hackathons |
| PROMO_CODES | `promo_codes` | Promo codes (`expires_at`, `active`, `track_id` for a competition) |
| REGISTRATIONS / WAITLIST | `registrations` | Tickets; waitlist is `status = waitlisted`. Door QR JSON: name, email, registrationId, eventId |
| HACKATHON_TEAMS | `hackathon_teams` | One occupancy per team. Dashboard login: `access_code_hash` (plaintext `accessCode` in extra after pay + confirm) **or** roster `join_code`. `/enter` hashes first, then join code. |
| TEAMS / TEAM_MEMBERS / TEAM_POSITIONS / ACCESS_GRANTS | `teams`, `team_members`, `team_positions`, `access_grants`, `recruitment_forms`, `applicants` | Ops library + grants; forms `public_token`; members `source`; grants `invite_token_hash`/`invite_sent_at`; RPC `organizer_teams_stats` |
| EVENT_STAFF_ASSIGNMENTS | `event_staff_assignments` | Which library team (and optional `member_ids`) staffs an event. Empty `member_ids` = whole roster. |
| APPLICANTS / RECRUITMENT_FORMS | `applicants`, `recruitment_forms` | Staff pipeline (`applicants.email`, unique per team+email; `recruitment_forms.position_id`) |
| HACKATHON_TRACK_PRIZES | `hackathon_track_prizes` | Structured prizes per competition |
| HACKATHON_* | tracks, teams, members, scores, judges, mentors, CTF, phases, sandboxes, anomalies, schedules, attendance | Hackathon + CTF |
| EVENT_SPONSORS_PARTNERS | `event_sponsors_partners` | Sponsors / collaborators / partners (`contribution_*`, `collaboration_terms`) |
| PARTNER_TYPES | `partner_types` | Organizer-scoped custom partner labels |
| EVENT_EXTERNAL_VENDORS | `event_external_vendors` | Own (non-marketplace) event vendors |
| EVENT_EXPENSES | `event_expenses` | Event spend/credits; RPC `event_expense_totals` |
| BOOKINGS | `bookings` | Quote → booking |
| QUOTATION_TEMPLATES | `quotation_templates` | Vendor quote message templates (`body_html` + `{{placeholders}}`; one `is_default` per vendor) |
| CERTIFICATES / CERTIFICATE_TEMPLATES / CERTIFICATE_TEMPLATE_VERSIONS | `certificates`, `certificate_templates`, `certificate_template_versions` | Issued certs (`data` jsonb, no `pdf_url`); JSON layout templates + immutable versions |
| PAYMENTS | `payments` | Paid registration / booking rows |
| BUDGET_ENTRIES | `budget_entries` | Org budget |
| REVIEWS / FEEDBACK | `reviews` | Reviews (ticket feedback; optional `registration_id`) |
| FEEDBACK_ANALYSES | `feedback_analyses` | Cached Gemini/local feedback analysis per organizer scope (`input_hash`, JSON result) |
| NOTIFICATIONS / NOTIFICATION_TEMPLATES | `notifications`, `notification_templates` | In-app + templates |
| EVENT_EMAIL_TEMPLATES | `event_email_templates` | Per-event `registration_received` / `registration_confirmed` / `custom`; partial unique `(event_id, kind)` where kind ≠ custom |
| ORGANIZER_EMAIL_CONNECTIONS | `organizer_email_connections` | Organizer Google outbound credentials (encrypted secrets; service-role only). SMTP connect UI removed; legacy SMTP rows still send until revoked. Required for attendee/cert/bulk; no Resend fallback |
| PLATFORM_ALERTS | `platform_alerts` | Admin dashboard plan/pricing/expiry alerts (`kind`, `read_at`); service-role writes |
| MODERATION_LOGS / EVENT_REPORTS / SUPPORT_TICKETS | matching names | Admin |
| SUBSCRIPTION_PLANS / PLAN_CHANGES / FEATURE_OVERRIDES / CUSTOM_PRICING_AGREEMENTS | matching names | SaaS owner plans & unlocks (docs 01). Plans are dynamic rows (price monthly/yearly, currency, `is_active`, `sort_order`); `organizer_profiles.plan_type` FK → `subscription_plans.key` |
| ORG_TENURES / ORG_MODULE_ACCESS / ORG_ANNOUNCEMENTS / ORG_REQUESTS | matching names | Department / club (docs 02–03) |
| HACKATHON_TASKS / COMPLETIONS / ASSIGNMENTS / TASK_SUBMISSIONS / CONFIG | matching names | Tasks + per-task submissions + config (`track_id` nullable = event-wide) |
| TEAM_ACTIVITY_PINGS / TEAM_INTEGRITY_EVENTS / HACKATHON_TEAM_TASK_STARTS / COMPETE_ACCESS_FAILURES | matching names | Compete monitoring, per-task timers, code-entry audit |
| BADGE_TIERS / USER_BADGES / BADGE_MEETUPS / ATTENDEES | matching names | Networking (doc 05) |
| SITE_SETTINGS / SITE_PAGES / SITE_BLOCKS / SITE_REVISIONS / SITE_MEDIA | matching names | Marketing CMS (docs/19) |
| SITE_PARTNERS / SITE_FAQS / SITE_TESTIMONIALS / SITE_STATS_SETTINGS | matching names | Marketing content |
| LEGAL_DOCUMENTS / LEGAL_DOCUMENT_VERSIONS | matching names | Privacy/Terms versions (immutable versions) |
| USER_CONSENTS / MARKETING_CONSENTS / CONTACT_MESSAGES | matching names | Consents + contact inbox |
| MODULE_CATALOG | `module_catalog` | Plan comparison / gating labels (seeded from `moduleKeys`) |

Also: `events.is_demo`, `organizations.is_demo` (exclude from public stats); `events.website_featured` (marketing showcase, partial index); `subscription_plans` display cols (`is_public`, `is_recommended`, badge/tagline/CTA/highlight_features, `email_daily_cap` / `email_monthly_cap`). RPC `get_public_stats()` (SECURITY DEFINER, anon-executable aggregates, demo excluded). Seeded CMS pages: home/about/partners/contact; public plans: `free`, `pro` (pro recommended).

**Clients**

- Cookie Auth: `createSupabaseServer()` in `data/supabase.ts` (`@supabase/ssr`).
- Service role: `supabaseAdmin` — Server Actions / services only (bypasses RLS).
- Auth admin helpers: `data/adminAuth.ts` (create/update/disable/delete Auth users). Data: typed `supabaseAdmin` only — **`data/admin_db.ts` and `data/db.ts` deleted**.
- RLS helpers: `is_platform_admin()`, `user_org_ids()`. New Auth users get a `public.users` row (and role profile) from trigger `on_auth_user_created` → `private.handle_new_user()`. Signup still upserts the same rows via `AuthService` (idempotent).

### Supabase Storage (`data/supabase.ts`)

- Public bucket `media` (`MEDIA_BUCKET`) — banners, galleries, logos, speaker avatars, service images. Anon/authenticated **SELECT** policy `media_public_read`. Uploads use the service role.
- Private bucket `certificates` (`CERTIFICATES_BUCKET`) — template assets, exports, payment proofs (`payment-proofs/`). **Do not store rendered certificate PDFs** (on-demand via `/certificate/[code]/download`). Store **storage keys**, sign with `getSignedUrl` at read time. No public SELECT.
- Private bucket `payment-screenshots` (`PAYMENT_SCREENSHOTS_BUCKET`) — reserved; registration proofs currently use `certificates`.
- Private bucket `expense-receipts` — expense receipt paths; signed URL ≤5m.
- Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Bucket setup script: `scripts/create-buckets.mjs` (`npm run setup:buckets`)
- SQL: `supabase/migrations/20260926120000_drop_fcm_storage_auth.sql`

---

## Document models (`src/services/models`)

| File | Main types |
| --- | --- |
| `user.type.ts` | `User`, `CurrentUserData`, `UserRole`, profile/location/preferences/security |
| `event.model.tsx` | `EventModel`, `EventStatus`, `EventVisibility`, `EventAccess`, schedule/location/pricing/speakers/agenda/capacity |
| `organizer.model.ts` + `organizer.interfaces.ts` | Organizer org profile |
| `vendor.model.ts` | `Vendor`, services, portfolio, packages |
| `reg.type.ts` | `Registration`, `RegistrationStatus`, payment/QR/check-in/certificate fields |
| `certificate.model.ts` | Digital + blockchain certs, `CERTIFICATE_ROLES` |
| `agenda.model.tsx` | Agenda session shapes (also `AgendaItem` on Event) |
| `notification.model.ts` | Notification records (legacy; also `src/lib/notifications.types.ts`) |
| `feedback.model.ts` | Reviews |
| `blockchain.model.ts` | On-chain cert fields |

Feature-local types (prefer these when implementing that domain):

- Access: `src/features/access/accessEngine.types.ts` — `AccessType`, `InviteLinkDoc`, `WaitlistDoc`, `EventTierDoc`
- Taxonomy: `src/features/taxonomy/categoryEngine.types.ts` — super categories, formats, field sets, requests, checklists
- Teams/orgs: `src/features/teams/teamEngine.types.ts` — `OrgDoc`, `TeamDoc`, `TeamMemberDoc`
- Organizations (sponsors): `src/features/organizations/types.ts`
- Hackathon: `src/features/hackathon/types.ts` (+ CTF in `ctf.service.ts`)
- Bookings: `src/features/bookings/types.ts`
- Admin: `src/features/admin/types.ts`
- Registration: `src/features/registration/types/index.ts`
- Dashboard widgets: `src/features/dashboard/types.ts`
- Exports: `src/features/exports/types.ts`
- Notifications: `src/lib/notifications.types.ts`

---

## Shared services (`src/services`)

| File | Responsibility |
| --- | --- |
| `user.service.ts` | `users` CRUD |
| `event.service.ts` | Events CRUD, publish, ownership helpers used with `src/features/events/ownership.ts` |
| `organizer.service.ts` | Organizer docs |
| `registeration.service.ts` | Older registration helpers (typo in filename). Newer flow: `src/features/registration/registration.service.ts` |
| `certificate.service.ts` | Issue / lookup certs |
| `certificate.template.services.ts` | Templates |
| `notification.services.ts` | Load notifications by user/role id |
| `feedback.service.ts` | Reviews |
| `blockchain.service.ts` | Mint / verify |
| `anaylService.ts` | Analytics (filename typo) |
| `ai.service.ts` | Organizer chatbot |

---

## Features (`src/features`)

Each feature owns its UI and mutations. Pages should import from here rather than duplicating table access.

### `access`

Event visibility: public / private / invite_only / hybrid / vip_tiered. Guest list, invite tokens, waitlist, approval.

- Service: `access.service.ts`
- Actions: `accessSettings.action.ts`, `guestList.action.ts` (whitelist + invite email via `sendEmail` / Resend), `inviteLinks.action.ts`, `markInviteOpened.action.ts`, `registrationDecision.action.ts`
- UI: `AccessSettingsForm` (one Access settings card), `AccessGate`, `AccessTypeSelector`, `GuestListPanel` (preview + CSV filename before commit), `TrackInviteOpen`
- Route: `/organizer/[organizer_id]/events/[eventId]/access`
- Tiers/promos: `TiersPromosOnAccess` — ticket tiers hidden on hackathons; promo `track_id` scoped to a competition; `ticket_tiers.active` + `available_until`
- Public short URL `/e/[eventId]` redirects to `/events/[eventId]` (invite query preserved)

### `saas`

Platform tenant/subscription admin (docs/01). Plan archive: `plans/2026-10-25-admin-tenants-redesign.md`.

- `tenantBoard.service.ts` (`getTenantBoardBundle` — batched reads, tab counts), `tenantBoard.filters.ts` / `tenantBoard.types.ts`
- Actions (safeAction + zod + `canTenantCap` + rateLimit): `createTenantAccountAction`, `decideTenantApprovalAction`, `changePlanAction`, `grantDenyClearAction`, `saveCustomPricingAction`, `bulkClearOverridesAction`, `resendFailedEmailAction`
- UI: `components/tenants/*` — `AdminTenantsBoard`, filters/cards, manage drawer, CreateTenantWizard (4-step), ChangePlan / GrantDeny / CustomPricing modals (form → preview → confirm), Approvals / Overrides / Pricing / Activity tabs
- Caps: `TENANT_CAPS` + `canTenantCap` in `admin/types.ts` (owner / `tenants:manage` ⇒ all); Platform staff editor exposes checkboxes
- Email: `tenantMail.service.ts` + `email_log` — **never** email passwords; temp password shown once in UI only; invite recommended
- Also: `saas.service.ts` (`listPlans`, `getPlanCounts`), `actions/plans.action.ts`
- Routes: `/admin/plans`, `/admin/tenants` (needs `holdsArea('tenants')`); `/admin/tenants/new` redirects
- Inactive plan ⇒ paid modules denied in `hasModuleAccess`; `free` plan can't be deleted/deactivated.

### `permissions`

`hasModuleAccess` + `LockedModulePanel`. Paid organizer surfaces: marketplace (`vendor_store`), certificates, designer (`ai_designer`), ushers (`ushers_ops`), hackathon (`hackathon_ops`).

### `department` extras

Tenures, club module toggles, announcements (notify club owner), request queue on `/department` (`src/features/department/actions/departmentOrg.action.ts`, scoped by `orgScope.ts`). Clubs + presidents: `src/features/teams/actions/department.action.ts` (`ensurePresidentCanOrganize` upgrades the president to organizer); `TeamEngineService.setOrgLead`.

### `clubs`

`org_requests` form + status list, announcements and module badges on `/clubs/[clubId]` (`src/features/clubs/actions/orgRequests.action.ts`; review notifies the requester).

### `networking`

`/network` directory + badge meetups (`src/features/networking/`). Badge-tier discount applied at paid registration.

### `website`

Marketing CMS + public contact (docs/19 W1–W5). Blocks/registry in `blocks/`; cached reads in `siteContent.service.ts`; draft sanitize in `blockSanitize.ts`; media gate in `media.logic.ts`; SEO helpers in `pageMetadata.ts` / `seo.logic.ts`.

- Contact: `contact.shared.ts` / `contact.logic.ts` (header sanitize, honeypot, hashed-IP rate limit, Turnstile-required helper); `actions/contact.action.ts` (`submitContactAction` → `TABLES.CONTACT_MESSAGES` + `sendPlatformEmail` notifications lane to `info@aroxes.com`, Reply-To visitor, optional auto-reply; Turnstile when `TURNSTILE_SECRET_KEY` set); UI `components/ContactForm.tsx` on `/contact`
- Admin shell: `/admin/website` + `WEBSITE_CAPS`
- Hardening: `npm run report:marketing` → `reports/marketing/`; `npm run test:sql:marketing` (needs `SUPABASE_DB_URL`); skip-to-content in `(marketing)/layout.tsx`

### `hackathon` extras

`hackathon_tasks` / completions / assignments (flag hashed server-side) / `hackathon_task_submissions` (per-task review; private bucket `hackathon-submissions`). Final project stays on team submission path. Settings via `getEffectiveConfig(trackId)`: event-wide `hackathon_config` rows (`track_id` null + `event_id`) overridden by track rows. Organizer Settings panel loads the same merge through `getHackathonConfigsForTracks` (so apply-all timers/integrity show as enabled). Matrix: `docs/hackathon-settings-matrix.md`. Track timing: `opens_at` / `closes_at` / `registration_closes_at` / `roster_locks_at` / `submission_deadline_at` (UTC timestamptz; UI in event TZ). Stubs: `docker_sandboxing`, `daily_shifts` = Not active yet. `anti_cheat_tab_close` = browser visibility logging only (not OS lockdown).

- Organizer: competitions modal (datetime + instructions), Submissions tab (`TaskSubmissionsPanel`), scoreboard (`LiveScoreboardTable` + second-precision / first-blood / track isolation), Settings conflict warnings. Phases & Tasks accordion; CTF via `CtfFilePick`. Staff with `teams_advanced_roles` get catalog permissions (legacy `page_*` normalized) + optional `team_positions.extra.trackIds`; `filterTracksForViewer` scopes competitions/tasks/scoreboard/submissions.
- Participant: `getParticipantAccess` reason UI on `/enter` + `/compete`; short-lived httpOnly compete cookie (6h) + `compete_access_failures` lockout audit; tabbed workspace (Instructions, Phases & Tasks, Scoreboard if `live_scoreboard` on for that track only, own Submissions, Team); rules ack on `hackathon_teams.rules_acknowledged_at`; heartbeat / integrity when settings on.

### `admin`

Platform panel (spec 9.1).

- `admin.service.ts` (`listOrganizers` excludes `department_admin`; `departmentOrgIdForUser`), `orgList.service.ts` (`getOrgListBundle`), `orgDetail.service.ts`, `platform.service.ts`, `guard.ts`
- Actions: `signin.action.ts`, `organizers.action.ts`, `departmentAccount.action.ts` (dept login suspend + optional club cascade), `vendors.action.ts`, `events.action.ts`, `admins.action.ts`, `support.action.ts`, `moderation.ts`, `tenancy.action.ts` (owner edit/delete + Auth purge via `purgeAccount.ts`; delete requires `confirmName`)
- UI: `OrgBoard`, `AdminSignInForm`, `AdminForms` (`PlatformStaffBoard`), `ModerationForm`, `DepartmentAccountForm`, `ReportEvent`, `SupportForms`, charts; billing: `BillingSettingsBoard`
- Routes under `src/app/admin/` (`layout.tsx` chrome; `signin` has no chrome)

### `agendas`

- `agenda.service.ts`, `actions/createAgenda.action.ts`
- UI: `AgendaClientContent`, `AgendaHeader`, `AgendaTimeline`, `CreateAgendaForm`
- Routes: `.../agenda`, `.../agenda/create-agenda`

### `analytics`

- URL filters + derive: `analytics.filters.ts`, `analyticsDerive.ts`; page `/organizer/[organizer_id]/analytics`
- Service: `src/services/anaylService.ts` (`getAnalyticsData` respects range/event; occupancy + local day series)
- Gemini feedback: `geminiFeedback.ts` / `geminiFeedback.logic.ts`; env `GEMINI_API_KEY` + `GEMINI_MODEL`; cache `TABLES.FEEDBACK_ANALYSES`
- Ticket UI: `components/TicketFeedbackForm.tsx`; seed `npm run seed:feedback`
- Legacy: `feedbackAnalysis.service.ts` (if still referenced)

### `auth`

See Auth section. Layouts wrap organizer with `RequireRole` for `platform_admin | department_admin | organizer`.

### `bookings`

Quote / counter-offer / accept / review. Reads/writes via typed `supabaseAdmin` + `TABLES.BOOKINGS` (snake_case columns; nested DTO fields in `extra`). CamelCase `BookingData` mapped at the boundary (`bookingRowToItem` / `bookingToRow`). Partial review stamps use `patchBookingFields`.

- `bookings.service.ts`, `bookingValue.ts`
- Actions: `reviewVendor.action.ts` (also patches `vendor_profiles` ratings)
- UI: `AcceptQuoteButton`, `OrganizerReviewForm`, `VendorPrepBookingClient`
- Organizer: quotes, booking-details, marketplace, view-vendor, event vendors
- Vendor: quotes, bookings, counter-offer, prep-quote

### `certificates`

JSON layout templates + on-demand SVG/PDF (`layout.types.ts`, `renderCertificate.ts`, `certificates.service.ts`). No blockchain; no stored cert PDFs.

- Actions: `issueCertificates.action.ts`, `template.action.ts`, `applyDesign.action.ts`, `downloadCertificate.action.ts`, `emailCertificates.action.ts`
- Email: `certificateEmail.ts` — link-first (primary CTA `/certificate/[code]/download`, secondary `/verify/[code]`); copy says certificate opens on Avoeline; `email_attach_pdf` defaults **false** (opt-in attach only)
- UI: `CertificateEditor` (Konva), `DesignPicker`, `DownloadCertificate`
- Routes: organizer certificates + `making-template`; `GET /api/certificates/[id]` (ETag); `/certificate/[code]/download`; public `/verify/[code]`

### `dashboard`

Organizer home (`/organizer/[organizer_id]/dashboard`): no plan banner (plan block on profile). Widgets: `UpcomingEvents`, `TodaysSchedule`, `RecentRegistrations`, `RegistrationTrendChart`. Occupancy + recent-reg derive: `dashboardDerive.ts` + `AnalyticsService.getDashboardData`. Ink `buttonClass` CTAs. Recent rows = occupying units (team collapsed); never `"Unknown attendee"`.

### `events`

Browse + wizard + ownership. My Events list: `organizerEvents.filters.ts` / `organizerEvents.stats.ts` / toolbar + row menu components; `EventThumb` `showTitle`; occupancy tallies; 20/page URL pagination.

- `browse.service.ts`, `event.controller.ts`, `ownership.ts`
- **Public DTO:** `publicEvent.service.ts` (`getPublicEventView`, `getPublicEventMeta`, `resolveRegisterButtonState`) + client-safe `types.ts` (`PublicEventDto` allowlist — no organizer contact, whitelist, meeting password, access codes, promo codes, bank, attendee/team secrets, sponsor contract/benefits). Columns `events.show_sponsors|show_collaborators|show_partners` (default false).
- Actions: `toggleChecklistItem.action.ts`, `updateEventBasics.action.ts`, `archiveEvent.action.ts`, `deleteEvent.action.ts`, `updatePublicShowToggles.action.ts`
- Public UI: `components/public/{PublicEventHero,PublicEventFacts,PublicRegisterCard,PublicAbout,PublicTiersAndDiscounts,PublicAgenda,PublicSpeakers,PublicCompetitions,PublicSponsorsStrip}` + `addToCalendar.ts`
- Wizard: `EventWizardLayout` (shell) + `wizard/steps/{Basic,ScheduleLocation,HackathonTracks,Registration,Review}Step`, widgets `DescriptionEditor`, `TimeField`, `MapPreview`, `FormBuilder`. Defaults: free tickets, PKT timezone (no TZ picker). Validates schedule order, named hackathon tracks, paid tiers before next/publish. Product rules: `docs/09-event-creation.md`. Full tab/flow inventory: `docs/10-events-and-hackathon-dashboards.md`.
- Extra columns: `events.map_url`, `events.requires_registration`, `events.show_sponsors|show_collaborators|show_partners`; `hackathon_tracks.image_url|policies|instructions|instructions_file_*|opens_at|closes_at|registration_closes_at|roster_locks_at|submission_deadline_at|discount_*|ended_at|status|kind|rules_text`; `hackathon_teams.rules_acknowledged_at`.
- Routes: `/organizer/.../events`, `create`, `[eventId]`, `pub-succ`; public `/events`, `/events/[eventId]` (allowlisted DTO; `/e/[eventId]` short redirect; sticky Register; Share in hero only; sponsor strips gated by show_*; SEO JSON-LD). Sponsors tab: “Show on public page” switches. Department/club create still uses the organizer wizard.
- Public helpers: `publicEventPresentation` / `trackRegistrationOpen` in `src/lib/publicEventStatus.ts`; `ShareEventLink`

### `email`

Platform Resend lanes + organizer **Google-only** outbound connections (SMTP UI deprecated).

- `platformMail.service.ts` — welcome/plan/invoice/announcement/support/staff/expiry via `sendPlatformEmail`
- `organizerEmailConnection.service.ts` / `organizerTransport.service.ts` — connect, encrypt secrets, send fail-closed; `buildGoogleAuthUrl(state, loginHint?)`; tenant_provisioned accounts must OAuth-match `users.email`
- Actions: `organizerEmailConnection.action.ts` (SMTP save/provision → DEPRECATED), `platformAnnouncement.action.ts`
- UI: `OrganizerEmailConnectPanel` (Google connect / disconnect / test only); routes `/organizer/[id]/email`, `GET /api/email/google/callback`
- Cron: `GET/POST /api/cron/plan-expiry` (`CRON_SECRET` Bearer or `?secret=`) — 5-day `plan_expires_at` reminders + `platform_alerts`
- Admin: `platformAlerts.service.ts` (`createPlatformAlert`, `listOpenPlatformAlerts`); dashboard Plan alerts count → `/admin/tenants`
- Docs: `docs/email-platform-setup.md`

### `event_attendee`

Organizer attendee list, check-in, team/member drawers, registration emails.

- `attendee.service.ts`, `roster.ts`, `emailTypes.ts`, `eventEmail.service.tsx` (sends via organizer Google connection, not Resend; `qr_code` include block + ticket-link QR in HTML)
- Actions: `checkIn.action.ts` (also revalidates Overview), `eventEmail.action.ts` (save template, member send, bulk preview→confirm + rateLimit), `updateAttendeeDetails.action.ts` (`safeAction`; name/email/phone/custom answers; optional resend confirmation)
- UI: `AttendeeClientSide`, `AttendeeListItem`, `SingleAttendeeView` (solo vs member; edit details form), `TeamGroupView`, `GroupedAttendeeList`, `AttendeeInput` (controlled search + filters), `EventEmailPanels` (`EmailConnectionRequiredBanner` → `/organizer/{id}/email`; IncludeChecklist injects body blocks live)
- Stats: occupancy = team/group seats; people = non-cancelled; checked-in = `checkIn.checkedIn` or status `checked_in`/`attended`
- Public ticket/status URL: `/events/{eventId}/ticket/{registrationId}`
- Auto mail: `maybeAutoEventEmail` → team lead only; `registration_confirmed` defaults include `team_members`, `ticket_url`, `qr_code`

### `event_speakers`

- Types/service: `types/speaker.ts`, `types/speakers.service.ts`
- UI: `CreateSpeakerForm`, `SpeakerCard`, `SpeakerSearchBar`
- Routes: `.../speakers`, `.../speakers/create-speaker`

### `event_vendors`

Vendor profile media + vendor CRUD used by marketplace. Typed `supabaseAdmin` + `TABLES.VENDOR_PROFILES` / `TABLES.VENDORS` (`vendor_profiles`). Row → camelCase `VendorData` at the boundary; services/contact/ratings live in `extra` (logo/cover/categories/ratings also have columns). Batch helpers: `getVendorsByIds`, `patchVendorProfile`.

- `event_venders.services.ts` (filename typo)
- Actions: logo/cover/portfolio updates
- Vendor routes that write profiles: `src/app/vendor/[vendor_id]/{profile,services,services/add-service,services/[service_id]/edit}/page.tsx`
- UI: `VendorLogoUpload`, `VendorCoverUpload`, `PortfolioImageManager`, `PortfolioVideoManager`

### `exports`

Excel/CSV event sheets (`exceljs`), private storage, signed download.

- `eventSheets.ts`, `writeSheet.ts`, `deliverFile.ts`
- Actions: `exportEventSheet.action.ts` — attendees xlsx is two sheets (Teams/leads + Members) when the event has teams or registration groups; otherwise one sheet plus ticket URLs. Kind `staff` exports roster members (and applicant pipeline when advanced roles are on).
- UI: `ExportPanel`, `ExportButton`
- Route: `.../exports`

### `hackathon`

Tracks, teams, submissions, judging, live announcements, CTF arena.

- `hackathon.service.ts`, `ctf.service.ts`, `teamWrite.ts` (team/registration patches), `judging.ts`, `live.ts`, `kinds.ts` — data via `supabaseAdmin` + `TABLES` (no `adminDb`)
- Actions: `tracks`, `teams`, `roster`, `judging`, `live`, `ctf`, `assignLeftover`
- Paid module `hackathon_ops`. There is no left-rail Hackathon tab — hackathons live on Events (`?kind=hackathon`). Create is `.../events/create?hackathon=1`. Dashboard is the unified event layout. Old `/hackathon/*` URLs redirect.
- Public: `/events/[eventId]/tracks`, `.../tracks/[trackId]` (competition detail; Register gated same as event + `registration_closes_at`), `.../tracks/[trackId]/leaderboard`, `.../mentors`, ticket team page, `/judge/[token]`, `/enter`, `/compete`
- Organizer hackathon tabs on `.../events/[eventId]`: competitions (Add modal + table thumbs), tasks (accordion + CTF file pick), teams (`?track=` pills; Join vs Enter codes), submissions, scoreboard (ranked table + expand; `trackTaskScoreboardDetail`; first blood; hint-used from `extra.hintsRevealed` with no reveal timestamp), settings (`hackathon_config` apply-all-or-tick, plus `max_attachment_mb`). Paid Staff (`teams_advanced_roles`) assigns `page_*` permissions and `team_positions.extra.trackIds`. Owner sees all tabs; staff see granted tabs only. Configure/track page is roster/fees/unlock/judging/prizes — no duplicate config toggles.
- Storage: `sponsor-logos` (public), `hackathon-challenge-files` (private, 50MB bucket cap; per-event `hackathon_settings.max_attachment_mb` default 10).

### `media`

`uploadMedia.action.ts`, `MediaUpload.tsx`, `MediaUploadField.tsx`, `compressImage.ts` (client JPEG ~0.72 / max 2400px before upload), `media.utils.ts`

### `vendor_quotes`

Quotation templates MVP (no Konva editor): `quotationTemplates.service.ts`, `actions/quotationTemplates.action.ts`, `interpolate.ts`, `components/QuotationTemplatesBoard.tsx`. Placeholders: `{{business_name}}`, `{{quote_total}}`, `{{event_name}}`, etc. Applied on prep-quote send when a template is selected (default pre-selected). Gated by `vendor_quotes`.

### `notifications`

- `NotificationsView.tsx`, `recipient.ts`
- Actions: `notification.actions.ts`, `markRead.action.ts`
- Bell: `src/shared_components/NotificationBell.tsx`
- Routes: organizer + vendor `.../notifications`
- Queue: `src/lib/notifications.ts` `sendNotification`. Email delivery: `dispatchNotification` → `sendPlatformEmail` + templates in `emails/` (`registration-confirmed`, `event-invite`, `certificate-ready`, `category-request-decided`, `waitlist-promoted`, `platform-*`). Missing `RESEND_API_KEY` → dry-run fail. Push/SMS/WhatsApp stay stubbed.

### `organizations`

Sponsors / collaborators / partners on an event.

- `organizations.service.ts`, `actions/organizations.action.ts`, `listPartnerTypes`
- UI: `OrganizationForm` (sponsor tier/benefits; collaborator contribution + terms; partner types + definitions; logo upload to `sponsor-logos`), `InviteCollaborator`, `AcceptCollaboration`, `SponsorStrip` (legacy), `PublicShowToggles` (Sponsors tab → `events.show_*`)
- Public credits: `PublicSponsorsStrip` only when matching `show_sponsors` / `show_collaborators` / `show_partners` (defaults off). No contract values/benefits/terms on the public page.
- Sponsor-only optional `track_id` dedication. Collaborators do **not** get dashboard access from this form.
- Routes: `.../sponsors`; public accept `/collaborate/[token]`

### `event_external_vendors`

Own vendors on an event (marketplace bookings stay in `event_vendors` / bookings).

- `externalVendors.service.ts`, `actions/externalVendors.action.ts`, `AddOwnVendorModal`
- Route: `.../events/[eventId]/vendors` (Marketplace / Own badges; expense shortcut)

### `event_expenses`

Per-event budget and expenses (SQL totals).

- `expenses.service.ts` (`listEventExpenses`, `getEventExpenseTotals` via RPC), `actions/expenses.action.ts`, `ExpensesClient`
- Route: `.../events/[eventId]/expenses` (nav after Sponsors). Staff keys: `page_expenses`, `expenses:manage`.

### `registration`

Public register, QR, form engine. Auto registration emails go to the team lead (or solo attendee) via `maybeAutoEventEmail` and `event_email_templates`. Extra members are not emailed those templates; certificates stay per person. Access-code mail is lead-only.

- `registration.service.ts`, `qr.ts`, `registrationEmail.ts` (access-code mail)
- Forms: `forms/formFields.types.ts`, `forms/formFields.service.ts`, `forms/buildRegistrationSchema.ts`, `forms/components/EventFormFieldsEditor.tsx`, `forms/components/RegistrationQuestionsCard.tsx`, `forms/actions/formFields.action.ts`
- Actions: `registerAttendee.action.ts`, `requestRegistrationUpload.action.ts`, `previewPromo.action.ts`
- UI: `RegistrationForm.tsx` (fields from `event_form_fields` via `CustomFieldsRenderer`; honeypot + rate limit). Hackathons pass open competitions; fee/proof follow the selected track (`trackDueAmount`).
- Ticket pages: `/events/[eventId]/ticket/[registrationId]`, `.../team`

### `taxonomy`

Admin-managed categories/formats, organizer requests, dynamic fields, checklist templates.

- `taxonomy.service.ts`, `categoryEngine.service.ts`
- Actions: `taxonomy.action.ts`, `categoryEngine.action.ts`
- UI: `CategoryStep`, `DynamicFieldRenderer`, `CategoryManagementView`, `CategoryRequestsView`, modals
- Admin: `/admin/categories`, `/admin/category-requests`
- Wizard uses `CategoryStep` / `DomainCategoryPicker`

### `teams`

One shared ops library (not hackathon occupancy). **Organizer page** `/organizer/[id]/teams` uses `OrganizerTeamsShell` with tabs Teams | Recruitment | Access (`organizerTeams.filters.ts`), stats RPC, stepped Add team/member modals, team drawer. Event tab label **Team** (href `/staff`) still uses `TeamsManager` + assign + event recruitment. Scopes: `organizer` | `event` | `club` | `department` | `platform`. Basic `teams_basic`; paid `teams_advanced_roles` (locked panels on Basic for paid tabs). Permission catalog + presets: `src/lib/permissions.ts`; `can()` unions grants + position permissions. Emails: `requireConnectedSender` → `sendViaOrganizerConnection` only (never platform sender / never email passwords); interview `.ics` fallback when disconnected.

- `teamEngine.service.ts`, `teamScope.ts`, `recruitmentEmail.ts`, `grants.service.ts` (under permissions)
- Actions: `teamEngine.action.ts`, `staffAdvanced.action.ts`, `exportTeams.action.ts`, `grants.action.ts`, `applyForm.action.ts`, `department.action.ts`
- UI: `OrganizerTeamsShell`, `OrganizerTeamsTab`, `OrganizerRecruitmentTab`, `OrganizerAccessTab`, Add/Edit team/member modals, `TeamDetailDrawer`, `TeamsManager` (event/club), `StaffRecruitmentSection`, `ExportTeamsModal`, `GrantInviteModal`, `FormBuilder` / `CustomFieldsRenderer`
- Actions: `teamEngine.action`, `organizerRecruitment.action`, `staffAdvanced.action`, `grants.action`, `exportTeams.action`
- Routes: `/organizer/[organizer_id]/teams?tab=`, event **Team** (`/staff`), `/clubs/[clubId]/teams`, public `/apply/[token]`
- Uniques: positions `(team_id, lower(title))`; applicants `(form_id, lower(email))`; members `source` manual|recruited

---

## App routes (`src/app/`)

Root layout: `src/app/layout.tsx` (fonts, theme FOUC script, `ToastProvider`, Speed Insights). Global CSS: `src/app/globals.css`. Errors: `src/app/error.tsx`, `src/app/global-error.tsx`, `src/app/not-found.tsx`.

### Public / marketing

Marketing lives in the `(marketing)` route group (`src/app/(marketing)/layout.tsx`): `marketing-shell` CSS tokens (docs/19 §2), optional `site_settings` announcement banner (graceful if table missing), `SiteHeader` + `AppFooter`, `robots: index`. App prefixes get `X-Robots-Tag: noindex, nofollow` in `next.config.ts` plus layout metadata on organizer/vendor/attendee/admin.

| Path | File |
| --- | --- |
| `/` | `src/app/(marketing)/page.tsx` — CMS blocks via `MarketingPageBlocks` + live stats/partners/events/plans/testimonials; JSON-LD |
| `/plans` | cards + module comparison + enterprise CTA + FAQ (`listPublicPlans` / `getModuleComparison`) |
| `/about` `/partners` | CMS blocks + granted partners by category (empty sections hidden) |
| `/contact` | `ContactForm` (`?topic=` maps enterprise→sales); CMS blocks when published |
| `/privacy` `/terms` | `getLegalDocument` + TOC/sanitized markdown (`legalMarkdown.ts`) |
| `sitemap.xml` / `robots.txt` | `src/app/sitemap.ts`, `src/app/robots.ts` |
| `/events` | `src/app/events/page.tsx` |
| `/apply/[token]` | public staff recruitment (token); legacy `staff-apply/[formId]` redirects here |
| `/e/[eventId]` | short redirect → `/events/[eventId]` (query preserved) |
| `/events/[eventId]` | public event via `getPublicEventView` (hero/facts/register/about/agenda/speakers/competitions/sponsors; SEO + `loading.tsx`) |
| `/events/[eventId]/ticket/[registrationId]` | ticket (hackathon: waiting + enter-code link) |
| `/events/[eventId]/ticket/[registrationId]/team` | hackathon extras; join-a-team is not the default |
| `/events/[eventId]/ticket/[registrationId]/tracks/[trackId]/tasks` | ticket-gated task board |
| `/events/[eventId]/enter` | access-code login |
| `/events/[eventId]/compete` | cookie-gated participant dashboard |
| `/events/[eventId]/tracks` | public competition list (Register gated by lifecycle) |
| `/events/[eventId]/tracks/[trackId]` | public competition detail |
| `/events/[eventId]/tracks/[trackId]/tasks` | redirects signed-in registrant to their ticket tasks page |
| `/events/[eventId]/tracks/[trackId]/leaderboard` | leaderboard |
| `/events/[eventId]/mentors` | mentors |
| `/verify/[code]` | certificate verify by `verification_code` (UUID param redirects to code) |
| `/certificate/[code]/download` | on-demand PDF stream |
| `/api/certificates/[id]` | mobile JSON + ETag (issued only) |
| `/support` | support tickets |
| `/collaborate/[token]` | accept collaborator invite |
| `/judge/[token]` | judge scoring |
| `/teams`, `/teams/join` | team join / list |
| `/clubs/[clubId]` | club detail |
| `/network` | networking directory |
| `/auth/change-password` | forced password reset |

### Auth

| Path | Notes |
| --- | --- |
| `/auth/signin` | `signinClient.tsx` |
| `/auth/signup` | `SignupPageClient.tsx` |
| `/auth/signup/organizerSetup` | organizer onboarding |
| `/auth/signup/vendorSetup` | vendor onboarding |
| `/admin/signin` | separate admin login |

Layouts: `src/app/auth/layout.tsx`. Shared steps: `src/shared_components/auth/*`.

### Attendee (`src/app/attendee/layout.tsx`)

| Path | Notes |
| --- | --- |
| `/attendee/[attendee_id]/dashboard` | registrations; not `DashboardNav` (no profile/notifications routes yet) |

### Organizer (`src/app/organizer/layout.tsx` → `DashboardNav`)

Slim left rail (`w-48`, `md:pl-52`) shared with vendor and department — same density as admin `AdminRail`. Nav items: Dashboard, Events, Analytics, Marketplace, Quotes, Designer, Ushers, Teams (hidden when the plan omits `teams_basic` and `teams_advanced_roles`). Profile + notifications in the rail.

| Path | Purpose |
| --- | --- |
| `/organizer/[organizer_id]` | index |
| `.../dashboard` | home widgets (occupancy tiles, recent regs); plan banner on profile only |
| `.../analytics` | URL `range`/`event` filters; occupancy tiles; local-day chart; Gemini feedback cache |
| `.../events` | My Events list/grid (`?kind=&status=&q=&sort=&view=&page=`); occupancy columns |
| `.../profile` | organizer profile + logo + **plan block** (modules / overrides / support) |
| `.../events/create` | wizard (`?hackathon=1` pre-sets hackathon) |
| `.../events/[eventId]` | unified dashboard |
| `.../attendees` | roster; grouped default for hackathon or group registration; `?team=` opens that team; email templates + bulk on the same page |
| `.../staff` | Event **Team** tab (label Team, href `/staff`) — assign library teams (`event_staff_assignments`); recruitment/onboard emails via Google; export kind `staff` |
| `.../access` | Access settings card, guest preview, whitelist vs invite rows; tiers hidden on hackathons; promo scope + lists |
| `.../agenda`, `.../agenda/create-agenda` | schedule + speaker picker |
| `.../speakers`, `.../speakers/create-speaker` | speakers + session picker |
| `.../vendors` | event vendor requirements |
| `.../sponsors` | orgs |
| `.../competitions` | hackathon tracks |
| `.../tasks` | Phases & Tasks |
| `.../teams` | Hackathon **Competitors** tab (href `/teams`) — occupancy (`hackathon_teams`), not the organizer ops library |
| `.../submissions` | submissions |
| `.../scoreboard` | task-completion scoreboard |
| `.../settings` | hackathon_config apply-to |
| `.../certificates`, `.../certificates/making-template` | certs |
| `.../exports` | Excel/CSV including `hackathon_teams` |
| `.../edit` | Edit basics (title, description, schedule, banner 4:5, gallery, seats, free/paid) |
| `.../tickets` | Hackathon → Attendees; else Access |
| `.../hackathon` | redirects to `.../events?kind=hackathon` |
| `.../hackathon/create` | redirects to `.../events/create?hackathon=1` |
| `.../hackathon/[eventId]/…` | redirects to matching `.../events/[eventId]/…` |
| `.../quotes` | quote inbox |
| `.../booking-details/[booking_id]` (+ `counter-offer`) | booking |
| `.../notifications` | inbox |
| `.../teams` | ops library tabs Teams/Recruitment/Access (`teams_basic` / `teams_advanced_roles`); assign from event Team tab |
| `.../chatbot` | AI assistant (`ChatBotClient.tsx`) |

Overview (`src/app/organizer/[organizer_id]/events/[eventId]/page.tsx`) is a visual system of `rounded-xl` cards: dark facts band (`bg-panel`, no duplicate banner — header uses `EventHeaderMedia`), one `MetricTile`/`Meter` stat row, then `Card` sections (Schedule, Location, Recent registrations, Capacity, Registration, Pricing, Certificate, Description). Status pills use `StatusBadge marker="dot"`. Owner header actions: Edit event, Archive/Restore, Delete. My Events uses URL filters + occupancy (not only Archived tab); list `EventThumb` uses `showTitle={false}` to avoid double titles.

Event section tabs are a slim horizontal strip in `src/app/organizer/[organizer_id]/events/[eventId]/layout.tsx`. Labels: **Team** (ops, href `/staff`), hackathon **Competitors** (occupancy, href `/teams`). Staff missing a tab grant redirects to overview (not `notFound`). When `events.requires_registration` is false, Attendees is omitted. There is no Tickets tab; paid SKUs and promos sit on **Access** (including paid hackathons; `promo_codes.track_id` can scope a code to one competition). Hackathons appear on the Events list (badge + `?kind=`). There is no separate left-rail Hackathon tab. Unified tabs add Competitions, Phases & Tasks, Competitors, Submissions, Scoreboard, Settings when `eventIsHackathon`; missing `hackathon_ops` shows `LockedModulePanel`. `hackathonDashPath` returns `/organizer/{id}/events/{eventId}/…`. Regular group events use `registration_groups` + `registrations.group_id` and `GroupedAttendeeList` (not `hackathon_teams`). Occupancy: one team/group = one seat (`occupyingHackathonRegs` / `occupyingGroupRegs`). Agenda/speakers share `event_agenda_speakers`. Team tab assigns organizer library teams (`event_staff_assignments`); named positions + applicants need `teams_advanced_roles`. Scoreboard joins completions to `hackathon_tasks.track_id`. Exports kind `hackathon_teams` is two xlsx sheets. Public enter/compete unchanged. `assertOwnedEvent` allows `department_admin` via `canManageOrg`. Docs: `docs/10-events-and-hackathon-dashboards.md`.

### Vendor (`src/app/vendor/layout.tsx` → `DashboardNav`)

Nav: Dashboard, Quotes, Services, Bookings.

| Path | Purpose |
| --- | --- |
| `/vendor/[vendor_id]` | index |
| `.../dashboard` | home |
| `.../quotes`, `.../quotes/[quote_detail_id]`, `.../quotes/prep-quote/[prep_quote_id]`, `.../quotes/templates` | quoting + quotation templates MVP |
| `.../services`, `.../add-service`, `.../[service_id]/edit` | catalog |
| `.../bookings`, `.../bookings/[booking_id]`, `.../counter-offer` | bookings |
| `.../profile`, `.../notifications` | account |

### Admin (`src/app/admin/layout.tsx` → left `AdminRail`)

Chrome: ThemeToggle, email, sign out. Nav is a slim **left rail** (`w-48`, `src/shared_components/AdminRail.tsx`). Organizer, vendor, and department use the same slim `DashboardNav`.

| Path | Purpose |
| --- | --- |
| `/admin` | platform dashboard — metrics (orgs/organizers/events/**vendors**); **Approvals and alerts** (pending vendors/organizers, support, categories, plan alerts). No Enter View. Flagged events live under Events only. |
| `/admin/orgs` | **Departments & clubs** — `OrgBoard` (metrics, search/filters, Hierarchy / Departments / Clubs tabs); data from `getOrgListBundle()`; no Add; create logins at Tenant accounts. Rail stays active on `/admin/departments/*` and `/admin/clubs/*`. |
| `/admin/orgs/[orgId]` | redirects by `org_type` → `/admin/departments/[id]` or `/admin/clubs/[id]` |
| `/admin/departments` | redirects → `/admin/orgs` |
| `/admin/departments/[id]` | name + plan editable; **Account** card (login email/status/plan/created/last active + Suspend/Reactivate with optional cascade to club owners); Club tenures list; moderation history; clubs → `/admin/clubs/[id]`; events → `/e/[id]` (no organizer dossier links) |
| `/admin/clubs/[id]` | fully read-only: logo header, parent dept link, tenure (president/execs + history) or empty copy; events → `/e/[id]` |
| `/admin/organizers`, `/admin/organizers/[organizerId]` | organizers — **card grid** (excludes `department_admin`); Approve/Reject when pending; Open → detail (dept tenants redirect to `/admin/departments/[orgId]`); no outbound email panel; owner delete |
| `/admin/vendors`, `/admin/vendors/[vendorId]` | vendors — **card grid** (business/email/status); Approve on pending; statuses `pending\|approved\|suspended\|rejected` |
| `/admin/events` | Events board (All / Flagged / Log): URL filters, keyset table, Moderate modal, report drawer; View → `/e/[id]`. Service `eventModeration.service.ts`; UI `components/events/*` |
| `/admin/support`, `/admin/support/[ticketId]` | ticket queue + thread/attachments |
| `/admin/audit` | global `moderation_logs` explorer (page kept; **not** in AdminRail — use per-entity history on detail pages) |
| `/admin/categories`, `/admin/category-requests` | taxonomy (**Seed defaults**); field/checklist help + preview |
| `/admin/plans` | plan cards + Create/Edit modal (`PlansBoard`, 90vh, currency select) |
| `/admin/website` | Marketing CMS (`?tab=` pages/plans/partners/stats/legal/faq/contact/nav/seo/media/community/insights); caps via `canWebsiteCap`; Community = `marketing_consents` only; Insights = `get_marketing_insights()`; organizer partner opt-in on profile |
| `/admin/support/registrations` | Staff registration PII viewer — required reason + `logModeration` (`registration_pii_access`); no platform bulk export |
| `/unsubscribe` | One-click marketing consent withdraw via signed token |
| `/admin/tenants` | **Tenant accounts** board — Tenants / Approvals / Overrides / Pricing / Activity; Create wizard; manage drawer; caps via `canTenantCap`; passwords never emailed; `/admin/tenants/new` → redirect |
| `/admin/admins` | **Platform staff** — staff card grid + Add staff multi-step modal; card opens preview (grants + revoke); owners read-only; emails on create/update/revoke |
| `/admin/settings/billing` | Platform bank / JazzCash / EasyPaisa **separate** cards (owner); single `platform_billing_settings` row |
| `/api/cron/plan-expiry` | 5-day plan expiry reminders (`CRON_SECRET`) |

### Department

Layout: `src/app/department/layout.tsx` — same left `DashboardNav` as organizer. Reads: `src/features/department/department.service.ts`.

| Path | Purpose |
| --- | --- |
| `/department` | Home + plan banner (“You are on {plan}”) |
| `/department/events` | `ScopedEventsTable` + All/Department/club chips; rows → public `/events/[id]` |
| `/department/marketplace` | Shown when the department plan includes `vendor_store` |
| `/department/analytics` | Club/event rollup + tenure filter |
| `/department/clubs` | Club cards; two-step modals: invite president (no password), grant/revoke modules, start tenure |
| `/department/clubs/[clubId]` | Tabs: Overview / Events / Teams / Tenures / Budget (tenure selector; past RO) |
| `/department/tenures` | Aggregated tenure view (committee + events) |
| `/department/announcements` | Compose (audience + channels) + recent sends |
| `/department/announcements/[id]` | Body + expandable delivery log |
| `/department/requests` | Approve/reject club requests (view/download attachments) |

**Tenures / announcements data:** `org_tenures` (one current + no overlap), `events.tenure_id`, `teams.tenure_id`, `start_org_tenure` RPC, `announcement_deliveries`. Actions: `tenure.action.ts`, `announcements.action.ts`, invite in `teams/actions/department.action.ts`.

### Club (`src/app/clubs/[clubId]/layout.tsx` → `DashboardNav` for presidents)

| Path | Purpose |
| --- | --- |
| `/clubs/[clubId]` | Dashboard (public announcement list if not president) |
| `/clubs/[clubId]/events` | Same organizer event list (by `organizer_id`, plus club `org_id`), when `events_dashboard` is granted |
| `/clubs/[clubId]/hackathon` | Redirects to club Events `?kind=hackathon` |
| `/clubs/[clubId]/analytics` | Snapshot when `analytics_basic` is granted |
| `/clubs/[clubId]/marketplace` | Vendor store when `vendor_store` is granted |
| `/clubs/[clubId]/designer` | AI Designer when `ai_designer` is granted (club grant, not personal plan) |
| `/clubs/[clubId]/ushers` | Ushers when `ushers_ops` is granted |
| `/clubs/[clubId]/teams` | Roster (`teams_basic` / `teams_advanced_roles`) |
| `/clubs/[clubId]/requests` | Department requests + file attachment |

Club presidents land on `/clubs/{id}` with the same slim left rail as department. Tabs: Dashboard, Requests, plus granted modules (Events, Hackathon, Analytics, Marketplace, Designer, Ushers, Teams). Profile and notifications stay on `/organizer/{userId}/…` with the club rail. If the person was already an organizer, `organizer_profiles.org_name` is the club (not their personal name) and `org_id` is the club. Requests can include a file; department review can view/download it. Basic Teams: name, lead, count, member name/id/email/phone/designation. `teams_advanced_roles` adds join code, extra leads, and remove. Department cannot edit club internals without the president login.

---

## Shared UI (`src/shared_components`)

- **Form primitives:** `src/components/ui` (Button, Input, Select, Card, Badge, Modal) via `@/components/ui`
- **Chrome:** `DashboardNav.tsx`, `chrome/SiteHeader.tsx`, `chrome/AppFooter.tsx`, `chrome/AnnouncementBanner.tsx`, `home/*`
- **Organizer:** `EventTab.tsx`, `OrganizerFooter.tsx`, `ProfileEventsTabs.tsx`, `OrganizerLogoUpload.tsx`, `updateOrganizerLogo.action.ts`
- **UI kit:** `ui/Card`, `PageHeader`, `MetricTile`, `DataTable`, `EmptyState`, `StatusBadge`, `FilterTabs`, `SearchField`, `ConfirmDialog`, `Toast`, `ThemeToggle`, `Skeleton`, `FormFeedback`, `Breadcrumbs`, `BrandMark`, charts (`TrendChart`, `MiniBars`, `Meter`)
- **Auth shells:** `auth/AuthShell.tsx`, setup steps
- **Misc:** `NotificationBell`, `DateField`, `SubmitButton`

Styling helpers: `src/lib/ui.ts` (`buttonClass`, etc.). Theme: `data-theme` on `<html>`, key `avoeline-theme`.

---

## `src/lib` helpers

| File | Use |
| --- | --- |
| `action.ts` | `ActionResult` |
| `appUrl.ts` | `signInPath`, absolute URLs |
| `eventState.ts` | derived lifecycle |
| `status.ts` | badge metadata |
| `datetime.ts` | `parseScheduleDateTime` (DD/MM/YYYY house format) |
| `email/lanes.ts` | Platform From lane aliases (`notifications@`, `billing@`, …) + Reply-To / archive Bcc defaults (`info@aroxes.com`) |
| `email/resend.ts` | Resend SDK. Prefer `sendPlatformEmail({ lane, … })` for SaaS (always Reply-To + Bcc). Low-level `sendEmail` supports `bcc`. Missing API key → `{ ok: false, dryRun: true }`. |
| `email.ts` | HTML helpers (`escapeHtml`, `sendEmail`/`sendBulkEmail`). Prefers Resend; Brevo only as fallback. Not for organizer attendee/cert (use organizer transport). |
| `email/secretCrypto.ts` | AES-GCM for organizer connection secrets (`EMAIL_CONNECTION_SECRET`) |
| `email/renderNotification.tsx` | maps notification `type` → React Email template |
| `notifications.ts` + `.types.ts` | queue + dispatch; email channel uses `sendPlatformEmail` (`notifications` / `support` lanes) |
| `csv.ts` | CSV parse/export |
| `customFields.ts` | custom form helpers |
| `money.ts` | currency |
| `search.ts` | text search |
| `ui.ts` | class builders |
| `notifications.ts` + `.types.ts` | notification helpers |
| `access.ts` | access helpers (also duplicated under `/lib`) |

---

## Config and ops

- `next.config.ts` — console stripping in prod, package import optimize (`recharts`, `react-icons`, `lucide-react`), 50mb uploads, image hosts; CSP allows `https://challenges.cloudflare.com` (`script-src` / `frame-src` / `connect-src`) for Turnstile
- `src/proxy.ts` — auth middleware
- Windows: PowerShell often blocks `npm.ps1`. Use Command Prompt, `npm.cmd install`, or `install.bat` / `dev.bat`. Cursor terminal is set to Command Prompt in `.vscode/settings.json`. Node **>=20.9**.
- `tailwind.config.js` / `.json`, `postcss.config.mjs`, `eslint.config.mjs`
- `package.json` scripts: `dev`, `build`, `start`, `lint`, `setup:buckets`, `seed:owners`, `seed:demo`, `reset:wipe-data` (`CONFIRM=YES`)
- Cursor MCP: `.cursor/mcp.json` — hosted Supabase MCP for project `pfepncjkjamukhvsfwkx` (`docs`, `account`, `database`, `debugging`, `development`, `functions`, `branching`). Enable/login via Cursor CLI: `agent mcp enable supabase`, `agent mcp login supabase`, `agent mcp list`.
- Agent skills: `.agents/skills/supabase`, `.agents/skills/supabase-postgres-best-practices` (from `npx skills add supabase/agent-skills`; lockfile `skills-lock.json`).
- **Plans archive:** [`plans/`](plans/) — README + INDEX; every agent plan copied as `YYYY-MM-DD-short-slug.md`. Cursor rule: `.cursor/rules/plans-archive.mdc`.
- `implementation_plan.md` — ticketing plan; first UI is `src/features/ticketing` + `/tickets` event tab
- Demo seed: `npm run seed:demo` (`scripts/seed-demo.mjs`). Mockdata / `seeding.js` removed with Firebase cutover.

Env (do not commit values): `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`, optional `PLATFORM_ADMIN_EMAILS`, `SAAS_OWNER_EMAILS` + `SAAS_OWNER_PASSWORD_N` (seed script only). **Platform email (Resend):** `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (default/fallback only), `RESEND_REPLY_TO`, `RESEND_ARCHIVE_BCC`, optional `RESEND_FROM_*` lane overrides — see `docs/email-platform-setup.md`. **Organizer email:** `EMAIL_CONNECTION_SECRET` (≥16), optional `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` (Google only; SMTP connect deprecated). **Contact Turnstile (optional):** `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` (secret unset → skip captcha verify). **Cron:** `CRON_SECRET` (≥16) for `/api/cron/plan-expiry`. Legacy `BREVO_API_KEY` + `MAIL_FROM` only if Resend unset. Configure Auth redirects in the Supabase project.

---

## Implementation playbook

1. Read this file; jump to the owning **feature** and **route**.
2. Pages stay thin: load via `*Service`, mutate via `actions/*.action.ts`.
3. New Postgres tables: update the model/types **and** `TABLES` in `data/collections.ts`, plus a SQL migration.
4. New organizer event section: add page under `src/app/organizer/.../events/[eventId]/`, add tab in event `layout.tsx`, icon in `EventTab.tsx` if needed.
5. New dashboard nav item: `src/app/organizer/layout.tsx` or `src/app/vendor/layout.tsx` (`DashboardNav` items).
6. Anything Client Component needs: put types in a file with no `supabaseAdmin` import chain.
7. After shipping: update this document’s tables and **Change log**.

---

## Known gaps / planned

- Nested mega-event UI for `events.parent_event_id` can be expanded later; the column is stored and filterable.
- Attendee area has dashboard only (no profile/notifications routes; `attendee/layout.tsx` comments this).
- `event.status` vs derived lifecycle — prefer `eventLifecycle()` for UI badges.
- Filename typos (shim targets): `registeration.service.ts`, `anaylService.ts`, `event_venders.services.ts`.
- Firebase packages and Firestore façade are gone. Do not re-add them.

---

## Change log

### 2026-11-01 — Marketing W5 hardening
- What: Sanitize `rich_text.markdown` / FAQ answers + require image/logo alts; legal preview `skipHtml`; security/SEO unit tests; FAQPage JSON-LD; Lighthouse script + a11y checklist; skip-link; remove `randomuser.me` CSP/images; optional marketing RLS npm/CI; docs/11 + docs/19 W5 shipped.
- Files: `src/features/website/{blockSanitize,media.logic,publishedContent.logic,seo.logic,contact.logic,__tests__/*}.ts`, `src/app/(marketing)/{layout,page,plans/page}.tsx`, `scripts/{marketing-lighthouse,test-marketing-rls}.mjs`, `reports/marketing/*`, `next.config.ts`, `.github/workflows/ci.yml`, `plans/2026-11-01-marketing-w5-hardening.md`
- Next: cookieless analytics decision (docs/19 §10); run `npm run report:marketing` against a local `next start` and fill the checklist.

### 2026-11-01 — Marketing W4 consent & privacy
- What: Legal accept + unticked community opt-in on signup/registration; `user_consents` / `marketing_consents` writes; `/unsubscribe`; Community tab (filter/export/send capped); Insights RPC with small-group suppression (<5); Privacy DSAR → support ticket; staff registration PII-with-reason audit.
- Files: `src/features/website/{consent.*,actions/consent.action,actions/dataRequest.action,components/Consent*,components/DataRequestForm,components/admin/Community*,components/admin/Insights*}.ts(x)`, `src/app/(marketing)/{unsubscribe,privacy}/**`, `src/app/admin/support/registrations/**`, `src/features/admin/{actions/registrationPii.action,components/RegistrationPiiViewer}.ts(x)`, `supabase/migrations/20261101180000_marketing_w4_consent.sql`, `plans/2026-11-01-marketing-w4-consent-privacy.md`
- Next: W5 hardening (Lighthouse, XSS, SEO pass).

### 2026-11-01 — Marketing W3 owner CMS
- What: Full `/admin/website` editors (pages reorder/publish/revisions, plans display flags, partners + organizer opt-in/revoke, stats raw+display, legal immutable publish + capped notify/diff, FAQ/testimonials consent gate, media WebP+alt, contact inbox, nav/SEO). Migration `site_media.tags` + `site_settings.stats`. Tests for caps/consent/notify cap/restore.
- Files: `src/app/admin/website/page.tsx`, `src/features/website/{actions/*,components/admin/*,*Cms.service,cms.logic,siteContent.service}.ts(x)`, `src/features/website/components/OrganizerPartnerOptIn.tsx`, `src/app/organizer/[organizer_id]/profile/page.tsx`, `supabase/migrations/20261101170000_marketing_w3_cms.sql`, `plans/2026-11-01-marketing-w3-admin-cms.md`
- Next: W4 community consents + insights aggregates.

### 2026-11-01 — Marketing W2 live services + public pages
- What: Live marketing reads (`marketingData.service` + pure `marketingData.logic`), `MarketingPageBlocks` (stats/partners/events/plans/testimonials from DB or hide), page metadata/legal TOC sanitize, home/plans/about/partners/contact/privacy/terms pages, sitemap/robots, improved 404 chrome; plan admin revalidates `SITE_PLANS` + `SITE_ALL`.
- Files: `src/features/website/{cacheTags,marketingData.*,pageMetadata,legalMarkdown,components/MarketingPageBlocks,PlansComparison,LegalDocumentView}.ts(x)`, `src/app/(marketing)/**`, `src/app/{sitemap,robots,not-found}.ts(x)`, `src/features/saas/actions/plans.action.ts`
- Next: W3 owner CMS editors; empty sections stay hidden until seed/content exists.

### 2026-11-01 — Marketing W2 seed + schema
- What: `events.website_featured` + partial index; `subscription_plans.email_daily_cap` / `email_monthly_cap`; seeded published `site_pages` (home/about/partners/contact) + 19 blocks from docs/19 §7/§3; `site_stats_settings` for `get_public_stats` keys; privacy/terms v1 from §8; `free`/`pro` `is_public` (pro recommended); types regenerated; `pricing_teaser.showRecommended` in block zod.
- Files: `supabase/migrations/20261101160000_marketing_w2_seed.sql`, `src/lib/database.types.ts`, `src/features/website/blocks/schemas.ts`
- Next: Wire remaining public marketing pages to CMS blocks + live stats/plans; featured events query.

### 2026-11-01 — Contact form (W2 §6)
- What: Public `/contact` form with honeypot, hashed-IP rate limit, optional Cloudflare Turnstile, `contact_messages` insert, platform notify to `info@aroxes.com` (notifications lane, Reply-To visitor) + auto-reply; CSP + env for Turnstile; unit tests for header sanitize / honeypot / rate limit.
- Files: `src/features/website/{contact.shared,contact.logic,actions/contact.action,components/ContactForm,__tests__/contact.logic.test}.ts(x)`, `src/app/(marketing)/contact/page.tsx`, `src/env.ts`, `.env.example`, `next.config.ts`, `package.json`
- Next: Remaining W2 marketing pages (home/plans/about/partners/legal/SEO); W3 contact inbox admin.

### 2026-11-01 — Marketing CMS building blocks (W1 §3)
- What: Typed block registry (zod `.strict()` schemas + renderers), `BlockRenderer`, lean `AdminBlockEditor`, `siteContent.service` with `unstable_cache` tags + `publishPage`/`saveDraftBlock` revalidation; unit tests for schemas and cache tags.
- Files: `src/features/website/{cacheTags,siteContent.service,blocks/**,components/**,__tests__/**}.ts(x)`, `package.json` (`test:unit`)
- Next: W2 public pages consume `getPublishedPage` / blocks; W3 full CMS CRUD on `/admin/website`.

### 2026-11-01 — Marketing website foundation (W1 complete)
- What: `(marketing)` chrome + headers; CMS schema/RLS/`get_public_stats`; block registry + tagged content service; `/admin/website` tab shell + caps; unit + SQL smoke tests; plan archived.
- Files: `src/app/(marketing)/**`, `src/features/website/**`, `src/app/admin/website/page.tsx`, `supabase/migrations/20261101150000_marketing_website_foundation.sql`, `plans/2026-11-01-marketing-website-foundation.md`
- Next: W2 public pages from CMS; W3 full admin editors.

### 2026-11-01 — Admin website shell + caps (W1 §4)
- What: `website` admin area + `WEBSITE_CAPS` / `canWebsiteCap` / `requireWebsiteCap`; `/admin/website` tab shell; `saveDraftBlockAction` / `publishPageAction`; unit tests; rail nav.
- Files: `src/features/admin/{types,guard}.ts`, `src/features/website/**`, `src/app/admin/website/page.tsx`, `src/app/admin/layout.tsx`, `src/shared_components/AdminRail.tsx`, `src/features/permissions/can.ts`
- Next: W3 CMS editors per tab; block editor shell already mounts `AdminBlockEditor`.

### 2026-11-01 — Marketing website DB foundation (W1)
- What: docs/19 CMS/consent/legal/contact tables + public-read RLS; `module_catalog` seeded from module keys; plan display columns; `events`/`organizations`.`is_demo` + demo backfill; `get_public_stats()`; TABLES keys; seed-demo sets `is_demo`; regenerated types; RLS smoke SQL.
- Files: `supabase/migrations/20261101150000_marketing_website_foundation.sql`, `supabase/tests/marketing_website_rls.sql`, `data/collections.ts`, `scripts/seed-demo.mjs`, `src/lib/database.types.ts`
- Next: Wire marketing pages to CMS tables; set `subscription_plans.is_public` when publishing plans; owner CMS CRUD via service role.

### 2026-11-01 — Marketing route group + chrome (W1)
- What: `(marketing)` layout with `marketing-shell` tokens, announcement banner (`site_settings`), indexable metadata; home moved under the group (no double header/footer; invented hero stats removed); CMS stubs for plans/about/partners/contact/privacy/terms; SiteHeader/AppFooter marketing links; app-route `X-Robots-Tag` + layout `robots: noindex`.
- Files: `src/app/(marketing)/**`, `src/shared_components/chrome/{SiteHeader,AppFooter,AnnouncementBanner}.tsx`, `next.config.ts`, `src/app/globals.css`, organizer/vendor/attendee/admin `layout.tsx`
- Next: Covered by DB foundation entry above; then W2 public pages from CMS.

### 2026-10-25 — Fix DataTable RSC break (organizer events)
- What: Restored `DataTable` as a Server Component (removed `"use client"` / `onRowClick`). Added `ClientDataTable` for OrgBoard row navigation. Guardrail test prevents regressing DataTable to client.
- Files: `src/shared_components/ui/DataTable.tsx`, `ClientDataTable.tsx`, `OrgBoard.tsx`, `dataTableRsc.guardrails.test.ts`
- Next: Reload `/organizer/{id}/events` — table should render without DashboardBoundary serialization errors.

### 2026-10-25 — Admin events moderation redesign
- What: Redesigned `/admin/events` (All / Flagged / Log) with URL filters, server bundle + keyset, Moderate modal + undo toast, report review drawer, rate-limited/deduped `reportEvent`, `moderation_unpublished` + report `decided_by`/`admin_note`. EventThumb `wide` + gradient fallback; host labels no longer repeat dept as club; categories from `event_categories` by id.
- Files: `src/features/admin/eventModeration.{types,filters,service}.ts`, `src/features/admin/components/events/*`, `src/features/admin/actions/events.action.ts`, `src/app/admin/events/page.tsx`, `src/shared_components/ui/EventThumb.tsx`, `supabase/migrations/20261025163000_admin_events_moderation_unpublished.sql`, `docs/11-events-and-hackathon-complete-spec.md`, `plans/2026-10-25-admin-events-redesign.md`
- Next: Open `/admin/events` as owner; exercise Unpublish→Undo, Flagged Review/Dismiss, and a public report from `/events/[id]`.

### 2026-10-27 — Organizer Teams tabbed manager
- What: `/organizer/.../teams` rebuilt as Teams | Recruitment | Access with stats RPC, plan-gated locked tabs, stepped Add team/member modals, team drawer, FormBuilder recruitment + interview/onboard, Access grants with hashed invites + `requireConnectedSender`, export scopes/columns; event tab label remains **Team** (`/staff`).
- Files: `src/features/teams/**`, `src/app/organizer/.../teams/**`, `src/features/email/organizerTransport.service.ts`, `src/lib/permissions.ts`, `supabase/migrations/20261027211700_organizer_teams_rebuild.sql`, `docs/11-events-and-hackathon-complete-spec.md`, `plans/2026-10-27-organizer-teams-rebuild.md`
- Next: Smoke Add team → drawer Make lead; Recruitment form → `/apply/[token]`; Grant without email connected (copy link); Basic plan locked Recruitment/Access.

### 2026-10-25 — Organizer Dashboard / My Events / Analytics cleanup
- What: Dashboard occupancy tiles + fixed recent regs (no Unknown; team collapse); plan banner moved to Profile; My Events URL toolbar/list-grid/`EventThumb showTitle`; Analytics URL date/event filters, local-day chart, ticket feedback + Gemini `feedback_analyses` cache; unit tests; docs 11 Part 3A.
- Files: `src/features/dashboard/**`, `src/features/events/organizerEvents.*`, `src/features/analytics/**`, `src/features/registration/occupancy.ts`, `src/services/anaylService.ts`, `src/app/organizer/.../{dashboard,events,analytics,profile}/**`, `src/app/events/.../ticket/**`, `supabase/migrations/20261025210000_feedback_analyses.sql`, `docs/11-events-and-hackathon-complete-spec.md`, `plans/2026-10-25-organizer-dash-events-analytics.md`
- Next: Smoke dashboard recent team row → attendees `?team=`; My Events filters/pagination; analytics range + export; ticket feedback + Refresh analysis with/without `GEMINI_API_KEY`.

### 2026-10-25 — Admin orgs + public event (Phases 1–5 complete)
- What: Full plan shipped — `OrgBoard` list; dept Account/suspend + club tenures + `/e/[id]` links; organizers exclude `department_admin` + redirect; `show_*` migration + Sponsors/wizard toggles; allowlisted `getPublicEventView`; rebuilt public page; unit/guardrail tests; docs 11 + plan archive.
- Files: `src/features/admin/{orgList.service,components/OrgBoard,actions/departmentAccount.action}.ts(x)`, `src/features/events/{publicEvent.service,publicEvent.logic,types,components/public/*}`, `src/app/admin/{orgs,departments,clubs,organizers}/**`, `src/app/events/[eventId]/**`, `supabase/migrations/20261025120000_event_public_show_toggles.sql`, `docs/11-events-and-hackathon-complete-spec.md`, `plans/2026-10-25-admin-orgs-public-event.md`
- Next: Smoke `/admin/orgs` hierarchy delete; private event gate; flip Sponsors toggles and confirm public strips; register with seeded name/email/phone.

### 2026-10-25 — Phase 3–4 public event DTO + page rebuild
- What: Allowlisted `getPublicEventView` / `PublicEventDto`; `show_sponsors|collaborators|partners` on EventModel + Sponsors tab toggles (`updatePublicShowToggles`); rebuilt `/events/[eventId]` with public components (hero Share + .ics, sticky Register without shareable link, agenda/speakers/tiers/sponsors strips, SEO JSON-LD, loading skeleton); seed form fields when empty; hide “Your details” when no fields.
- Files: `src/features/events/{types,publicEvent.service,actions/updatePublicShowToggles.action}.ts`, `components/public/*`, `src/app/events/[eventId]/{page,loading}.tsx`, `sponsors/page.tsx`, `PublicShowToggles.tsx`, `event.model.tsx`, `event.service.ts`, `RegistrationForm.tsx`, `completeContext.md`
- Next: Covered by Phases 1–5 complete entry above.

### 2026-10-25 — Phase 2 admin identity split (dept/club detail)
- What: Department detail Account card (suspend/reactivate + optional club cascade, moderation history, Club tenures); club detail tenure/leadership; event thumbs → `/e/[id]`; `listOrganizers` excludes `department_admin`; organizer detail redirects dept tenants and drops `OrganizerEmailConnectPanel`.
- Files: `src/app/admin/departments/[id]/page.tsx`, `src/app/admin/clubs/[id]/page.tsx`, `src/app/admin/organizers/[organizerId]/page.tsx`, `admin.service.ts`, `orgDetail.service.ts`, `departmentAccount.action.ts`, `DepartmentAccountForm.tsx`, `completeContext.md`
- Next: Phase 3 public event DTO/show_* toggles; Phase 1 orgs list polish if still open.

### 2026-10-24 — Event tab 404s + hydration note
- What: Nested `/events/[eventId]/*` tabs 404 under Turbopack when child routes fail to register (known Next 16 race) or when `making-template` used `next/dynamic` in a Server Component (build break). Moved dynamic editor to `CertificateEditorLazy` (client). Default `npm run dev` uses `--webpack`; `dev:turbo` kept. Hydration `bis_skin_checked` is a browser extension (Bitdefender/Kaspersky), not app code.
- Files: `CertificateEditorLazy.tsx`, `making-template/page.tsx`, `package.json`
- Next: Stop/restart with `npm run dev`; hard-refresh; disable page-modifying extensions when debugging hydration.

### 2026-10-24 — Organizer event overhaul (phases 1–5)
- What: Wizard (rich desc, 4:5, dates, CTF checkbox, seats/tiers/access); edit/archive; email QR inject + edit attendee; cert link emails; public event/competition pages; compete scoreboard/settings; Staff→Team / Teams→Competitors; recruitment via Google.
- Files: `src/features/events/**`, `event_attendee/**`, `certificates/**`, `hackathon/**`, `teams/**`, `src/app/events/**`, `src/app/organizer/.../events/**`, `docs/TESTING.md`, `plans/2026-10-24-organizer-event-overhaul.md`
- Next: Smoke create free+hackathon; Google connect → register → confirmation with QR; archive tab; public Register after end date; compete scoreboard per track.

### 2026-10-24 — Phase 5 Team/Competitors rename + recruitment Google mail
- What: Event dashboard tab **Staff** → label **Team** (href `/staff` unchanged). Hackathon occupancy tab **Teams** → **Competitors**. Event team empty states/copy say “Event team”. Shortlist + onboard + grant invites send via organizer Google (`recruitmentEmail.ts`); optional subject/body on forms; fail closed with Connect Google.
- Files: `layout.tsx` (event tabs), `staff/page.tsx`, `teams/page.tsx` (organizer), `HackathonWorkspace.tsx`, `TeamsManager.tsx`, `OrganizerTeamsBoard.tsx`, `TeamCreator.tsx`, `StaffRecruitmentSection.tsx`, `GrantInviteModal.tsx`, `staffAdvanced.action.ts`, `grants.action.ts`, `recruitmentEmail.ts`, `teamEngine.service.ts`, `completeContext.md`
- Next: Connect Google, shortlist an applicant (custom subject), accept/onboard without Google and confirm fail message; confirm tab labels Team vs Competitors.

### 2026-10-24 — Phase 4 compete + organizer settings / staff tracks
- What: Compete scoreboard stays track-scoped (session competition), Scoreboard tab hidden when `live_scoreboard` off (deep-link falls back), Instructions / Phases / empty boards use `EmptyState`. Settings UI merges event-wide `hackathon_config` into per-track rows (timers / integrity show after apply-all). Anti-cheat copy: monitoring/warn only, not OS lockdown. Staff: `staffMayOpenTab` honors position pages; positions normalize legacy `page_*`; submissions/final projects filtered by `filterTracksForViewer` trackIds.
- Files: `src/app/events/[eventId]/compete/page.tsx`, `src/features/hackathon/{tasks.service,configKeys,staffEventAccess,components/{CompeteMonitoring,HackathonWorkspace}}.ts(x)`, `src/features/teams/teamEngine.service.ts`, `docs/hackathon-settings-matrix.md`, `completeContext.md`
- Next: Smoke compete tabs with live_scoreboard off; save hackathon_timer all-competitions and reload Settings; staff with `extra.trackIds` on competitions/tasks/submissions.

### 2026-10-25 — Admin orgs list redesign (Phase 1)
- What: `/admin/orgs` uses enriched `getOrgListBundle()` + `OrgBoard` (metric tiles, search/status/plan filters, collapsible hierarchy, department/club DataTables, typed-name delete). `/admin/departments` redirects to orgs. Long explainer banner removed.
- Files: `src/features/admin/orgList.service.ts`, `src/features/admin/components/OrgBoard.tsx`, `src/app/admin/orgs/page.tsx`, `src/app/admin/departments/page.tsx`, `src/features/admin/actions/tenancy.action.ts`, `src/shared_components/ui/DataTable.tsx`, `src/features/teams/components/OrgManagementView.tsx`
- Next: Open `/admin/orgs`, expand a department, filter by status, quick-edit name/plan, owner delete with typed name.

### 2026-10-24 — Phase 2 emails + edit attendee
- What: Google-only connection banner CTA → `/organizer/{id}/email`. Compose IncludeChecklist injects/removes marked body blocks live (`qr_code` + ticket-link QR via `qrcode` / hosted door QR). Confirmed template defaults include `team_members`, `ticket_url`, `qr_code`. Bulk preview→confirm polish. `updateAttendeeDetails.action` + drawer edit form (optional resend confirmation).
- Files: `emailTypes.ts`, `eventEmail.service.tsx`, `EventEmailPanels.tsx`, `eventEmail.action.ts`, `updateAttendeeDetails.action.ts`, `SingleAttendeeView.tsx`, `organizerTransport.service.ts`, `completeContext.md`
- Next: Connect Google, toggle include blocks on Registration emails, confirm auto lead mail has members+QR; edit an attendee and optional resend.

### 2026-10-24 — Phase 3 cert link emails + public event/competition pages
- What: Certificate emails are link-first (`/certificate/[code]/download` + verify); `email_attach_pdf` defaults false. Public `/events/[eventId]` has shareable `/e/[id]` copy UI, Register only when lifecycle + registration dates allow (hidden when completed/cancelled/archived), `Promise.all` loads, 4:5 competition cards. Added `/events/[eventId]/tracks/[trackId]` detail (respects `registration_closes_at`); tracks list Register CTA gated. Browse/event cards use `aspect-[4/5]`.
- Files: `certificateEmail.ts`, `emailCertificates.action.ts`, `publicEventStatus.ts`, `ShareEventLink.tsx`, `src/app/events/[eventId]/{page,tracks/page,tracks/[trackId]/page}.tsx`, `EventCard.tsx`, `src/app/events/page.tsx`, `CertificateEditor.tsx`, `completeContext.md`
- Next: Smoke public event share copy, ended-event Register hidden, competition detail Register vs closed dates; email a cert and confirm download CTA (no attach unless toggled).

### 2026-10-24 — Phase 1 dashboard archive / edit / not-found

- What: Overview drops duplicate square banner (header `EventHeaderMedia` only, wider bar). Archive/Restore via `archiveEvent.action` + list Archived tab (excluded from All/live). Edit basics at `.../events/[eventId]/edit` (`EditBasicsForm` + `updateEventBasics`). Create persists accessType visibility/waitlist/approval, `extra.access.gatedTiers`, whitelist/invite guest rows, paid `ticket_tiers`. Staff missing tab grant redirects to overview. Promo fee calc: promo XOR track/student/group/badge (no stacking).
- Files: `src/app/organizer/.../events/{page,[eventId]/{page,layout,edit/page,staff/page}}.tsx`, `EventHeaderMedia.tsx`, `archiveEvent.action.ts`, `ArchiveEventForm.tsx`, `updateEventBasics.action.ts`, `EditBasicsForm.tsx`, `event.service.ts`, `registration.service.ts`, `previewPromo.action.ts`, `completeContext.md`
- Next: Smoke archive → Archived tab → restore; Edit event save; create private/invite with whitelist; register with promo vs track discount.

### 2026-10-24 — Phase 1 event wizard core

- What: Richer description toolbar (underline, lists with visible bullets, link, fore/highlight color) + sanitize on blur; list styles in `RichDescription`. Removed timezone UI from schedule/review (PKT default kept). Client schedule end≥start validation. Wizard blocks next/publish without named hackathon tracks or paid tiers when required. CTF checkbox (else `business`), 4:5 competition/banner uploads, unlimited seats, default free tickets.
- Files: `src/features/events/components/wizard/DescriptionEditor.tsx`, `EventWizardLayout.tsx`, `wizardUtils.ts`, `steps/{Basic,ScheduleLocation,HackathonTracks,Registration,Review}Step.tsx`, `src/shared_components/ui/RichDescription.tsx`, `src/lib/sanitizeHtml.ts`, `completeContext.md`
- Next: Open create-event wizard — free default, schedule errors, CTF checkbox, unlimited seats, paid needs a tier.

### 2026-10-22 — SaaS admin UX overhaul (phases 1–4)
- What: Owner dashboard (vendors metric, approvals/alerts; audit off rail); orgs cards (no Add); tenant create modal + one-time password welcome; organizers/vendors/staff/banks cards; Google-only email + tenant email lock; plan/staff emails + platform_alerts + plan-expiry cron; self-serve pending review; vendor free 5-services/no video + marketing module; quotation templates MVP; image compress on upload.
- Files: `src/app/admin/**`, `OrgManagementView.tsx`, `CreateTenantModal.tsx`, `AdminForms.tsx`, `BillingSettingsBoard.tsx`, `OrganizerEmailConnectPanel.tsx`, `platformAlerts.service.ts`, `vendor_quotes/**`, `compressImage.ts`, migrations `welcome_email_*`, `platform_alerts`, `quotation_templates`, `docs/TESTING.md`, `plans/2026-10-22-saas-admin-ux-overhaul.md`
- Next: Schedule `/api/cron/plan-expiry` with `CRON_SECRET`; smoke tenant create modal + Google connect same-email; approve a self-serve organizer from cards.

### 2026-10-22 — Phase 4 quotation templates + image compress
- What: Client-side image compress before media upload; `quotation_templates` table + vendor CRUD UI; mustache apply on prep-quote send; module-gated quotes/templates/prep-quote.
- Files: `src/features/media/compressImage.ts`, `MediaUpload.tsx`, `src/features/vendor_quotes/**`, `src/app/vendor/.../quotes/**`, `supabase/migrations/20261022142000_quotation_templates.sql`, `data/collections.ts`, `src/lib/database.types.ts`
- Next: Create a default template at `/vendor/{id}/quotes/templates`, prepare a quote and confirm placeholders fill; upload a large photo and confirm smaller JPEG lands in Storage.

### 2026-10-22 — Phase 3 organizer review + vendor free limits + taxonomy checklist
- What: Self-serve organizers get `review_status: pending` (tenant-created stay approved); proxy + organizer/vendor layouts + sign-in/callback gate pending profiles to `/auth/signup/awaiting-approval`. Free vendors capped at 5 services; portfolio videos require `vendor_portfolio`; added `vendor_event_marketing` module (on vendor_pro). Checklist template sanitize helpers + unit test; field-set duplicate-key validation.
- Files: `src/features/auth/authService.ts`, `src/features/onboarding/**`, `src/proxy.ts`, `src/app/{organizer,vendor}/layout.tsx`, `src/app/auth/signup/**`, `src/features/permissions/moduleKeys.ts`, `src/app/vendor/**/services/add-service`, `src/features/event_vendors/actions/updateVendorPortfolio.action.ts`, `src/features/taxonomy/**`, `scripts/seed-demo.mjs`, `supabase/migrations/2026102214*`, `package.json`, `completeContext.md`
- Next: Smoke self-serve free organizer/vendor → awaiting-approval → approve from `/admin/organizers` or `/admin/vendors`; confirm free vendor service cap + Pro portfolio videos; save a checklist template on `/admin/categories`.

### 2026-10-22 — Phase 1 lists / staff / banks UI
- What: Organizers and vendors list pages use responsive card grids (filters/search kept; `buttonClass` CTAs; pending Approve/Reject or Approve). Platform staff is a card grid with side “Add staff” multi-step modal and card preview (grants + revoke confirm); create accepts optional avatar URL. Billing settings split into bank / JazzCash / EasyPaisa cards with section-aware save (still one settings row).
- Files: `src/app/admin/organizers/page.tsx`, `src/app/admin/vendors/page.tsx`, `src/app/admin/admins/page.tsx`, `src/features/admin/components/AdminForms.tsx`, `src/features/admin/actions/{organizers,admins}.action.ts`, `src/features/admin/{types,admin.service}.ts`, `src/app/admin/settings/billing/page.tsx`, `src/features/billing/{components/BillingSettingsBoard.tsx,actions/billing.action.ts}`
- Next: Smoke `/admin/organizers`, `/admin/vendors`, `/admin/admins`, `/admin/settings/billing` as owner.

### 2026-10-22 — Phase 1 orgs cards + department detail
- What: Admin orgs list is card-only (no Add Department/Club). Empty state points to Tenant accounts; clubs are added by departments. Cards show name/type/club count or parent + optional plan. Department detail edits name/plan only, shows linked organizer dossier, drops Verify UI; contact/logo read-only. Club detail stays view-only.
- Files: `src/features/teams/components/OrgManagementView.tsx`, `src/app/admin/orgs/page.tsx`, `src/app/admin/departments/[id]/page.tsx`, `src/app/admin/clubs/[id]/page.tsx`, `src/features/admin/actions/department.action.ts`, `src/features/saas/saas.service.ts`
- Next: Open `/admin/orgs`, confirm no Add buttons, Open a department, edit name/plan, check linked account card.

### 2026-10-22 — Demo seed cap default 2
- What: `seed-demo.mjs` defaults to `DEMO_SEED_CAP=2` (departments, clubs, orgs, vendors, attendees, event tab rows, hackathon tracks/tasks/teams, bookings). Override with `DEMO_SEED_CAP=5` for the older fuller cast.
- Files: `scripts/seed-demo.mjs`, `docs/TESTING.md`, `completeContext.md`
- Next: After wipe + `seed:owners`, run `npm run seed:demo` and smoke admin/organizer/vendor/attendee tabs.

### 2026-10-20 — Full data wipe script (delete only)
- What: `npm run reset:wipe-data` (`CONFIRM=YES`) empties Storage objects, truncates all `public` table rows via `reset_wipe_all_public_data()`, deletes all Auth users. No export/move. Re-seed with `npm run seed:owners` yourself.
- Files: `scripts/reset-wipe-data.mjs`, `supabase/migrations/20261020120000_reset_wipe_all_public_data.sql`, `package.json`, `docs/TESTING.md`, `plans/2026-10-20-reset-wipe-data.md`
- Next: Run wipe only when intentionally resetting the linked Supabase project; then seed owners + categories.

### 2026-10-19 — Hackathon + events E2E audit (demo)
- What: Live Demo Spring audit (organizer tabs + enter/compete); P0/P1 fixes for enter membership, compete session fail-closed, CTF flag leak / unauth submit, staff track-scoped mutations; seed timers + Cyber CTF Lead `trackIds`; Playwright enter→compete when `E2E_EVENT_ID`/`E2E_ENTER_CODE` set; report + TESTING pointers.
- Files: `src/features/hackathon/{competeSession,accessCodes.service,ctf.service,hackathon.service,staffEventAccess}.ts`, `actions/{ctf,tasks,taskSubmissions}.action.ts`, `compete/page.tsx`, `scripts/seed-demo.mjs`, `e2e/smoke.spec.ts`, `docs/hackathon-e2e-audit-2026-10-19.md`, `docs/TESTING.md`, `plans/2026-10-19-hackathon-e2e-audit.md`
- Next: Adversarial IDOR suite; residual `select('*')` burn-down; toggle-only settings remain deferred.

### 2026-10-19 — Audit P0/P1 + onboarding smoke
- What: Project audit remediations from `docs/full-audit-2026-10-18.md`: rateLimit on public sign-in / Google OAuth / uploadMedia; 10 event-tab `loading.tsx`; Attendees ACL∥regs overlap; `select('*')` burn-down in teamEngine/hackathon/categoryEngine (+ plans list); onboarding unit + optional live DB smoke (`npm run test:smoke:onboarding`) and Playwright route smoke.
- Files: `src/app/auth/signin/page.tsx`, `src/features/auth/actions/googleAuth.action.ts`, `src/features/media/uploadMedia.action.ts`, `src/app/organizer/.../events/[eventId]/{competitions,scoreboard,submissions,teams,settings,tickets,speakers,vendors,exports,hackathon}/loading.tsx`, `attendees/page.tsx`, `src/features/{teams,hackathon,taxonomy}/*.service.ts`, `src/features/onboarding/**`, `e2e/smoke.spec.ts`, `scripts/smoke-onboarding.mjs`, `package.json`
- Next: Enable Auth HIBP in Supabase Dashboard; approve Next ≥16.4 for sharp CVEs; continue `safeAction` migration (P2); residual `select('*')` outside hottest services.

### 2026-10-19 — Onboarding/billing ENGINEERING_RULES compliance
- What: Closed onboarding/billing gaps vs ARCHITECTURE + ENGINEERING_RULES: no `select('*')`, MIME allowlist + UUID upload keys, zod/safeAction boundaries, moderation audit on approve/reject, parallel fetches on pending queue + approve path, logger instead of console, partial indexes for pending subscriptions.
- Files: `src/features/onboarding/**`, `src/features/billing/**`, `src/app/admin/billing/pending/page.tsx`, `src/app/auth/signup/{organizer,vendor}Setup/page.tsx`, `src/features/email/organizerEmailConnection.service.ts`, `supabase/migrations/20261019130000_onboarding_billing_indexes.sql`
- Next: Smoke free/paid onboarding; enable HaveIBeenPwned leaked-password protection in Supabase Auth (Advisor WARN).

### 2026-10-19 — Onboarding, plans, bank checkout (organizer + vendor)
- What: Google + email signup; verified-email gate; organizer/vendor setup → plan step; free→dashboard / paid bank+screenshot→owner approval; vendor `plan_type` + plan audience; platform billing settings; pending payments queue; emails via platform lanes.
- Files: `src/app/auth/**`, `src/features/onboarding/**`, `src/features/billing/**`, `src/proxy.ts`, `src/features/permissions/moduleKeys.ts`, `supabase/migrations/20261019120000_onboarding_plans_billing.sql`, `docs/onboarding-plans-checkout.md`, `plans/2026-10-19-onboarding-plans-checkout.md`
- Next: Enable Google provider in Supabase; fill bank details under `/admin/settings/billing`; smoke self-signup free + paid paths.

### 2026-10-22 — Phase 2 Google-only email + plan/staff notifications
- What: SMTP UI removed (actions return DEPRECATED); Google connect with `login_hint` + tenant_provisioned email match lock; plan/pricing/override → email + in-app notification + `platform_alerts`; staff create/update/revoke emails; cron `/api/cron/plan-expiry` (5-day reminder, dupe via alerts); admin Plan alerts count.
- Files: `OrganizerEmailConnectPanel.tsx`, `organizerEmailConnection.{action,service}.ts`, `api/email/google/callback`, `subscriptions.action.ts`, `admins.action.ts`, `platformMail.service.ts`, `platformAlerts.service.ts`, `api/cron/plan-expiry`, `admin/page.tsx`, `supabase/migrations/20261022130000_platform_alerts.sql`, `database.types.ts`, `.env.example`, `src/env.ts`
- Next: Set `CRON_SECRET`; schedule daily hit to `/api/cron/plan-expiry`; connect Google on a provisioned tenant and confirm mismatch redirect.

### 2026-10-22 — Tenant create modal + welcome password email
- What: Create-account modal on `/admin/tenants` (department/organizer/vendor); `/admin/tenants/new` redirects. Welcome email always includes temporary password once (`users.welcome_email_sent_at`); `users.tenant_provisioned` set on create; department contact phone; grant/deny uses org Select instead of free-text UUID.
- Files: `src/features/saas/components/CreateTenantModal.tsx`, `src/features/saas/actions/tenants.action.ts`, `src/app/admin/tenants/{page,new/page}.tsx`, `emails/platform-welcome.tsx`, `src/features/email/platformMail.service.ts`, `supabase/migrations/20261022120000_welcome_email_sent.sql`, `src/lib/database.types.ts`
- Next: Create a department tenant from the modal; confirm one welcome email with password; grant a module to a club via the org Select.

### 2026-10-18 — Enterprise email system (platform + organizer)
- What: Platform Resend lanes (`sendPlatformEmail`) with Reply-To + Bcc `info@`; lifecycle templates (welcome/plan/invoice/announcement/support); `organizer_email_connections` + Google/SMTP transport fail-closed for attendee/cert/guest mail; owner provision UI; docs + unit tests. Plan archived.
- Files: `src/lib/email/{lanes,resend,secretCrypto}.ts`, `src/features/email/**`, `emails/platform-*.tsx`, `supabase/migrations/20261018120000_organizer_email_connections.sql`, `docs/email-platform-setup.md`, `plans/2026-10-18-enterprise-email-system.md`, `.env.example`, `src/env.ts`
- Next: Verify Resend domain aliases + Hostinger Bcc; set `EMAIL_CONNECTION_SECRET` / Google OAuth; connect an organizer and send test attendee mail.

### 2026-10-18 — Full project audit (report + backlog)
- What: Fresh audit re-diffing Phase 0/10 — security Advisors, unused/knip, DB/`select('*')`, parallel-fetch waterfalls, schema INVESTIGATE, design tokens change-once map, dual UI kits, P0–P3 backlog. No remediations in this pass.
- Files: `docs/full-audit-2026-10-18.md`, `plans/2026-10-18-full-project-audit.md`, `plans/INDEX.md`, IDE canvas `full-project-audit-2026-10-18.canvas.tsx`

### 2026-10-18 — Phase 10 + schema gap closure
- What: Advisors refresh + extended RLS smoke; hot-path `select('*')` → column lists (attendee/expenses/accessCodes/ctf); keyset for moderation + announcements; loading.tsx for expenses/agenda/staff/tasks; Capacity Overview live seats math; fee `unpaid`→`fee_pending`; Playwright warm smoke; phase10 report + Part 6 items 1–2 closed. Plan archived to `plans/2026-10-18-phase10-schema-gaps.md`.
- Files: `supabase/tests/phase10_rls_isolation.sql`, `src/features/event_attendee/attendee.service.ts`, `src/features/event_expenses/expenses.service.ts`, `src/features/hackathon/{accessCodes,ctf,hackathon}.service.ts`, `src/features/admin/admin.service.ts`, `src/features/department/announcements.service.ts`, `src/app/organizer/.../events/[eventId]/{page,expenses,agenda,staff,tasks}/`, `e2e/smoke.spec.ts`, `docs/phase10-hardening-report.md`, `docs/11-events-and-hackathon-complete-spec.md`, `docs/schema.md`, `plans/2026-10-18-phase10-schema-gaps.md`, `plans/INDEX.md`

### 2026-10-12 — Schema optimization Steps 6–9 shipped
- What: Non-destructive hardening (money scales, date-order CHECK, events.status+cancelled, RLS initplan, duplicate indexes, FK indexes, grants revoke, set_updated_at); scream-test then DROP `solo_participants`, `hackathon_mentor_slots`, `hackathon_team_phases`, `badge_meetup_attendees`; types regen; statusConstraints CI; `docs/schema.md`.
- Files: `supabase/migrations/2026101223*`, `docs/{schema,schema-report,schema-inventory}/**`, `src/lib/__tests__/statusConstraints.test.ts`, `data/collections.ts`, `.github/workflows/ci.yml`, `plans/2026-10-12-schema-optimization.md`
- Next: Resolve remaining INVESTIGATE (submissions vs team.extra, access_tiers, hackathon_settings, category SoT, prize amount text, HIBP, OTHER_REPOS).

### 2026-10-12 — Phase 10 hardening
- What: Security re-audit (closed Phase 0 criticals); CSP enforced; DEFINER anon revoke; hot indexes + `mv_event_registration_counts`; keyset pagination helpers; compete/enter loading; EventCard `next/image`; HMAC flags; removed newrelic/typography; Playwright smoke; ARCHITECTURE/CHANGELOG/phase10 report; deleted docs 10/10-v2.
- Files: `supabase/migrations/20261012220000_phase10_hardening_indexes_security.sql`, `supabase/tests/phase10_rls_isolation.sql`, `next.config.ts`, `src/lib/keyset.ts`, `src/features/hackathon/tasks.service.ts`, `docs/{ARCHITECTURE,CHANGELOG,phase10-hardening-report,11-*}.md`, `plans/2026-10-12-phase10-hardening.md`, `e2e/smoke.spec.ts`
- Next: Enable Auth leaked-password protection in dashboard; Next/sharp bump when ready; paste Lighthouse numbers; expand Playwright with seed.

### 2026-10-12 — Phase 8–9 hackathon organizer + participant
- What: Competition timestamptz dates + TZ helpers (fix create-competition `formatDate` bug); `hackathon_task_submissions` + bucket + organizer Submissions UI; scoreboard second-precision / isolation; `getEffectiveConfig` + settings matrix + enforcement; competition instructions; `getParticipantAccess`; short-lived compete cookie + lockout audit; tabbed compete workspace (rules ack, Active rules, monitoring, own scoreboard/submissions).
- Files: `supabase/migrations/20261012200000_phase8_hackathon_ops.sql`, `20261012210000_phase9_team_rules_ack.sql`, `src/lib/datetime.ts`, `src/features/hackathon/**`, `src/app/events/[eventId]/{enter,compete}/page.tsx`, `docs/11-events-and-hackathon-complete-spec.md`, `docs/hackathon-settings-matrix.md`, `plans/2026-10-12-phase8-9-hackathon.md`
- Next: Manual smoke — create competition with dates; submit/review task work; toggle live_scoreboard; enter with bad code (lockout); compete tabs + rules ack.

### 2026-10-12 — Phase 7 B+C close (team checkbox + archived-with-data)
- What: Optional “Register as a team” checkbox when group registration is allowed (solo default). Attendee drawer + export columns include active fields and archived fields only when responses still have data; file signed URLs follow the same filter.
- Files: `src/features/registration/components/RegistrationForm.tsx`, `src/app/organizer/.../attendees/page.tsx`, `src/features/exports/actions/exportEventSheet.action.ts`
- Next: Manual smoke — solo vs team register; archive a field with existing answers; export columns; Access promo usage/discount.

### 2026-10-12 — Phase 7 registration form engine
- What: `event_form_fields` app layer — FormFieldsService, zod `buildRegistrationSchema`, wizard + Access `EventFormFieldsEditor` / `RegistrationQuestionsCard`, create_event seeds defaults + group columns, public `RegistrationForm` renders definitions (no hardcoded name/email/phone), signed registration uploads, `redeem_promo` + `previewPromo`, attendee/export columns from field defs (archived + file signed downloads).
- Files: `src/features/registration/forms/**`, `src/features/registration/actions/{registerAttendee,requestRegistrationUpload,previewPromo}.action.ts`, `src/features/registration/components/RegistrationForm.tsx`, `src/features/events/components/{CustomFieldsRenderer,wizard/steps/RegistrationStep}.tsx`, `src/services/event.service.ts`, `src/features/ticketing/**`, `src/features/event_attendee/**`, `src/features/exports/**`, `docs/11-events-and-hackathon-complete-spec.md`, `plans/2026-10-12-phase7-registration-forms.md`
- Next: Create an event with custom questions; register solo + group; confirm Access promo usage/discount totals; export attendees with form columns.

### 2026-10-12 — Phase 6 TeamsManager + access_grants
- What: Unified `TeamsManager` (organizer/event/club scopes); `access_grants` + `src/lib/permissions.ts` + `can()`; FormBuilder recruitment + `/apply/[token]`; export modal; grant invite (no password email); position/applicant uniques; doc 11 Staff closed duplicate-row audit.
- Files: `supabase/migrations/20261012180000_phase6_teams_access.sql`, `src/lib/permissions.ts`, `src/features/permissions/{can,grants.service}.ts`, `src/features/teams/**`, `src/app/apply/[token]/page.tsx`, `src/app/organizer/.../{teams,staff}/page.tsx`, `src/app/clubs/.../teams/page.tsx`, `docs/11-events-and-hackathon-complete-spec.md`, `plans/2026-10-12-phase6-teams.md`
- Next: Manual verify assign→recruit→apply→accept invite; grant revoke hides tabs; export xlsx; Basic upsell.

### 2026-10-12 — Phase 5 certificates (JSON templates, on-demand render, no blockchain)
- What: Dropped blockchain/ethers/pinata/`pdf_url`; versioned JSON templates + `certificate_template_versions`; layout → SVG/pdf-lib; Konva editor; bulk issue = row inserts; `GET /api/certificates/[id]` ETag; `/certificate/[code]/download`; `/verify/[code]`; optional email PDF attach; module gate unchanged. Doc 11 Certificates rewritten.
- Files: `supabase/migrations/20261012170000_phase5_certificates_json.sql`, `src/features/certificates/**`, `src/app/api/certificates/[id]/route.ts`, `src/app/certificate/[code]/download/route.ts`, `src/app/verify/[code]/page.tsx`, `src/app/organizer/.../certificates/**`, `docs/11-events-and-hackathon-complete-spec.md`, `plans/2026-10-12-phase5-certificates.md`
- Next: Manual verify issue→download→verify-by-code; editor publish bumps version; re-render-all; email attach toggle; orphan PDF cleanup optional.

### 2026-10-12 — Phase 4 event tabs (location, emails, access, sponsors, vendors, expenses)
- What: `maps_url` + drop coordinates; Open in Maps + CSP `frame-src`; attendee email modals (tokens/preview/confirm), free hides payment, Resend test banner; Access How-it-works + sample CSV; collaborator contribution/terms + partner_types; own vendors; Expenses tab + `event_expense_totals` RPC; doc 11 Part 10.
- Files: `supabase/migrations/20261012160000_phase4_event_tabs.sql`, `src/lib/mapsUrl.ts`, `src/features/event_attendee/**`, `src/features/access/components/HowAccessWorks.tsx`, `src/features/organizations/**`, `src/features/event_external_vendors/**`, `src/features/event_expenses/**`, `src/app/organizer/.../events/[eventId]/{layout,vendors,expenses,access,attendees,page}.tsx`, `docs/11-events-and-hackathon-complete-spec.md`, `plans/2026-10-12-phase4-event-tabs.md`
- Next: Manual verify maps button, bulk email → Resend, free-event payment hide, sample CSV, collaborator without role, own vendor → expense totals from SQL, Expenses after Sponsors in nav.

### 2026-10-12 — Phase 3 department clubs tenures announcements
- What: Scoped department events table + chips; invite-only club presidents; two-step club/access/tenure modals; per-club tenure constraints + `events.tenure_id` + `start_org_tenure`; club detail tabs; announcement audience/channels/delivery log; analytics tenure filter; doc 11 Part 9.
- Files: `supabase/migrations/20261012150000_phase3_tenures_announcements.sql`, `src/features/department/**`, `src/features/events/components/ScopedEventsTable.tsx`, `src/app/department/{events,clubs,tenures,announcements,analytics}/**`, `src/services/event.service.ts`, `docs/11-events-and-hackathon-complete-spec.md`, `plans/2026-10-12-phase3-department-clubs-tenures.md`
- Next: Manual verify invite email, tenure overlap rejection, announcement delivery log, analytics tenure chips.

### 2026-10-12 — Phase 2 SaaS owner & platform staff dashboard
- What: Removed Enter View; admin department/club detail routes; EventThumb on admin/organizer/department lists; public event status banners (draft preview only for owner/admin); vendor `approved` enum + dossier; support threads/attachments + notify; category help/preview; PlansBoard 90vh + currency + `formatCurrency`; staff `area:view|manage` via `can()`; `/admin/audit`; doc 11 Part 8.
- Files: `src/app/admin/{departments,clubs,support,audit}/**`, `src/features/admin/{actions/support.action,supportThread.service,components/SupportThread}.ts*`, `src/lib/publicEventStatus.ts`, `src/features/saas/components/PlansBoard.tsx`, `src/components/ui/Modal.tsx`, `supabase/migrations/20261012140000_phase2_support_threads_attachments.sql`, `docs/11-events-and-hackathon-complete-spec.md`, `plans/2026-10-12-phase2-saas-owner-dashboard.md`
- Next: Manual verify completed-event public page, approved vendor (no Approve), staff view-only, support reply+attachment.

### 2026-10-12 — Phase 1 B+C tooling + shared primitives
- What: Zod env (`src/env.ts`); `server-only` on `data/supabase`, Resend, compete session; CSP report-only + security headers; ESLint/Prettier/husky/lint-staged/knip/CI scripts; `safeAction` + schemas; `rateLimit` + `logger`; `can()`; C3 UI (`EventCard`/`EventThumb`/`CompetitionFilter`/`FileUploadField`); migrated admin sign-in, enter-compete, mark-invite-opened, submit-flag onto zod/rateLimit; browse events uses `EventCard`.
- Files: `src/env.ts`, `src/lib/{safeAction,rateLimit,logger,action}.ts`, `src/features/permissions/can.ts`, `src/features/auth/auth.schema.ts`, `src/features/hackathon/compete.schema.ts`, admin/compete/ctf/invite actions, `shared_components/ui/Event*.tsx`, `next.config.ts`, `package.json`, `knip.json`, `.github/workflows/ci.yml`, `plans/2026-10-12-phase1-bc-tooling-primitives.md`
- Next: Pause for review before Phase 1 D (Firebase/blockchain unused removals). Full ActionResult migration and remaining action zod still open.

### 2026-10-12 — Phase 1A critical/high security fixes
- What: Auth-gated media/vendor/organizer/review writes; support-preview mutations refused; compete secret required; CERT_GEN logs scrubbed; invite register + team insert no longer public Server Actions; ticketing mutates scoped by `event_id`; RLS: dropped open certificates SELECT + notifications INSERT; scoped `hackathon_tasks` SELECT; revoked anon EXECUTE on helpers; signed URL TTL 5m; `.env*` gitignore.
- Files: `src/features/media/uploadMedia.action.ts`, vendor/organizer logo actions, `reviewVendor.action.ts`, `ownership.ts`, `supportPreview.ts`, `competeSession.ts`, `teamWrite.ts`, `access.service.ts`, ticketing service/actions, `data/supabase.ts`, `supabase/migrations/20261012120000_phase1a_security_rls_tighten.sql`, `.gitignore`, `.env.example`
- Next: Phase 1 B+C shipped (see above). Deferred later: DB-002 full policies, P-001 indexes, F-002/F-003.

### 2026-10-12 — Phase 0 read-only audit report
- What: Full secrets/authz/Supabase/unused/perf/drift audit vs `docs/ENGINEERING_RULES.md` + doc 11. No app code changed.
- Files: `docs/audit-report.md`
- Next: Pause for review — pick must-fix-before-launch items from the report.

### 2026-10-11 — Owner sign-in credentials + public Auth error map
- What: Re-ran `seed:owners` so Gmail SaaS owners match `SAAS_OWNER_PASSWORD_*` (not demo `AvoelineDemo1!`). Public `/auth/signin` uses `mapSignInAuthError`. TESTING.md warns owners must not use the demo password.
- Files: `src/app/auth/signin/page.tsx`, `docs/TESTING.md`, `completeContext.md`
- Next: Sign in at `/admin/signin` with `SAAS_OWNER_PASSWORD_1` / `_2` from `.env.local`.

### 2026-10-11 — Admin sign-in + Supabase hardening audit
- What: Admin sign-in maps Supabase AuthError codes via `mapSignInAuthError` (no more Firebase-only codes → generic failure). `assertOwnedEvent` is owner/manager only; staff use `assertEventActor(eventId, tab)`. `userIsEventStaff` respects assignment `member_ids`. Registration cancel/waitlist promote auth-gated; `revokeAdmin` writes `account_status=suspended`. Purged empty root junk (`agent`/`list`/`mcp`), stale Firestore comments under `src/`, README/completeContext Firebase/`db.ts` claims.
- Files: `src/features/auth/authErrors.ts`, `src/features/admin/actions/signin.action.ts`, `src/features/events/ownership.ts`, `src/features/hackathon/staffEventAccess.ts`, `src/features/access/actions/registrationDecision.action.ts`, `src/features/admin/actions/admins.action.ts`, staff-gated actions/pages, `README.md`, `plans/2026-10-11-admin-auth-and-audit.md`, `completeContext.md`
- Next: ESLint debt, dual UI kits — tracked in `plans/INDEX.md`.

### 2026-10-11 — Resend-first email (fix dry-run “sent”)
- What: Unified outbound mail on Resend. `RESEND_API_KEY` missing no longer returns success (event emails / notifications no longer mark fake “sent”). Default From `onboarding@resend.dev` when From unset. HTML helpers in `src/lib/email.ts` prefer Resend over Brevo. Clearer attendee email action errors. `.env.example` + `.env.local` placeholders for `RESEND_*`.
- Files: `src/lib/email/resend.ts`, `src/lib/email.ts`, `src/lib/notifications.ts`, `src/features/event_attendee/{eventEmail.service.tsx,actions/eventEmail.action.ts}`, `.env.example`, `completeContext.md`
- Next: Paste `RESEND_API_KEY=re_…` into `.env.local`, keep `RESEND_FROM_EMAIL=onboarding@resend.dev` for testing, **restart** `npm run dev`, send a test to the email on your Resend account.

### 2026-10-11 — Event shell 404 + ThemeToggle hydration
- What: Organizer event layout no longer `Promise.all`s `cookies()`/`getCurrentUser` with `headers()` (that race 404’d event pages for club presidents). Staff tab ACL only `notFound`s when `grant.isStaff`; ungated tabs (agenda/speakers/…) allow. `getCurrentUser` awaits profile conversion. ThemeToggle uses stable SSR label + `suppressHydrationWarning`.
- Files: `src/app/organizer/[organizer_id]/events/[eventId]/layout.tsx`, `src/features/hackathon/staffEventAccess.ts`, `src/features/auth/authService.ts`, `src/shared_components/ui/ThemeToggle.tsx`, `completeContext.md`
- Next: Prefer incognito when debugging remaining `bis_skin_checked` hydration noise (browser extension).

### 2026-10-11 — Plans archive + verification + page-load parallelization
- What: Added repo `plans/` archive (README, INDEX, cutover retrospective, standardization snapshot, verification plan) and `.cursor/rules/plans-archive.mdc`. Verified `tsc` / `test:unit` / `build` and no live `admin_db` imports. Parallelized/batched hot page loads: event layout tab ACL, organizer overview, attendees signed URLs, staff/teams members+positions+applicants+forms, vendor event titles (`getEventTitlesByIds`), compete + public event, hackathon workspace configs, speakers sessions. Documented RBAC smoke + page-load notes in `docs/TESTING.md`.
- Files: `plans/**`, `.cursor/rules/plans-archive.mdc`, `data/supabase.ts`, `src/services/event.service.ts`, `src/features/teams/teamEngine.service.ts`, `src/features/hackathon/{staffEventAccess.ts,tasks.service.ts,components/HackathonWorkspace.tsx}`, `src/features/agendas/agendaSpeakers.service.ts`, organizer/vendor/events page loaders, `docs/TESTING.md`, `completeContext.md`
- Next: ESLint debt, dual UI kits — tracked in `plans/INDEX.md`.

### 2026-10-07 — adminDb → supabaseAdmin (certificates + admin)
- What: Removed all `adminDb` from certificates and admin domains. Typed `supabaseAdmin` + `TABLES`; snake_case at the Postgres boundary with camelCase DTOs (`mapToCertificate` / template `layout_fields`+`extra`); cert generation uses `Promise.all` inserts instead of BulkWriter; emailedAt / download counters merge into `certificates.extra`.
- Files: `src/services/certificate.{service,template.services}.ts`, `src/features/certificates/{actions/{downloadCertificate,emailCertificates}.action.ts,designs.ts}`, `src/features/admin/{admin.service.ts,platform.service.ts,types.ts,actions/{events,vendors,organizers,support,moderation}.{ts,action.ts}}`, `completeContext.md`
- Next: Remaining `adminDb` under `access/` and leftover `src/services/` (registration, feedback, analytics). Then delete `data/admin_db.ts`.

### 2026-10-07 — adminDb → supabaseAdmin (hackathon)
- What: Removed all `adminDb` / `FieldValue` / `DocumentReference` from the hackathon feature. Reads/writes use typed `supabaseAdmin` + `TABLES`; camelCase DTOs at the boundary; team partials via `teamWrite.ts` (`patchHackathonTeam` / `insertHackathonTeamRow` / `patchRegistration`); CTF daily submissions and team phase progress live in `hackathon_teams.extra`; fee_status maps DTO ↔ DB (`unpaid`|`fee_paid`).
- Files: `src/features/hackathon/{hackathon.service.ts,ctf.service.ts,accessCodes.service.ts,teamWrite.ts,types.ts,actions/{teams,roster,live,judging,tracks,ctf,assignLeftover}.action.ts}`, `completeContext.md`
- Next: Remaining `adminDb` under `access/` and any leftover `src/services/` greps. Then delete `data/admin_db.ts`.

### 2026-10-07 — adminDb → supabaseAdmin (bookings + event_vendors)
- What: Removed all `adminDb` from bookings and event_vendors (plus vendor profile/services pages). Typed `supabaseAdmin` + `TABLES.BOOKINGS` / `TABLES.VENDOR_PROFILES`; camelCase DTOs at the boundary; batched `.in("user_id"|"id", ids)` for organizer booking list vendors/events; `patchBookingFields` / `patchVendorProfile` for partial extra merges.
- Files: `src/features/bookings/{bookings.service.ts,actions/reviewVendor.action.ts}`, `src/features/event_vendors/{event_venders.services.ts,actions/updateVendor{Logo,Cover,Portfolio}.action.ts}`, `src/app/vendor/[vendor_id]/{profile,services,services/add-service,services/[service_id]/edit}/page.tsx`, `completeContext.md`
- Next: Remaining `adminDb` under `access/`, `certificates/`, `admin/` (and any leftover `src/` greps). Then delete `data/admin_db.ts`.

### 2026-10-07 — adminDb → supabaseAdmin (non-owned folders)
- What: Removed Firestore-shaped `adminDb` / `adminAuth` from registration, attendees, notifications, access gate, organizer logo, feedback/analytics, agendas, organizations, taxonomy actions, department/tenant auth user creation, and related shared services. Writes use typed `supabaseAdmin` + `TABLES` with snake_case ↔ camelCase at boundaries and `regStatusToDb` / `payStatusToDb` for registrations.
- Files: `src/services/{registeration,feedback,anaylService}.ts`, `src/features/{registration,event_attendee,notifications,organizations,taxonomy,analytics,agendas}/**`, `src/lib/access.ts`, `src/shared_components/organizer/updateOrganizerLogo.action.ts`, `src/features/teams/actions/department.action.ts`, `src/features/saas/actions/tenants.action.ts`, `completeContext.md`
- Next: Remaining `adminDb` under `access/`, `certificates/`, and `admin/` (`hackathon/` + `bookings/` + `event_vendors/` done). Re-grep `adminDb` under `src/` after those land, then delete `data/admin_db.ts`.

### 2026-10-07 — Firebase→Supabase cutover complete
- What: Every feature migrated off the Firestore-shaped `adminDb` façade to `supabaseAdmin` + `TABLES`. Deleted `data/admin_db.ts`, `data/db.ts`, `seeding.js`, `src/mockdata/`, `event.controller.ts`. Auth helpers in `data/adminAuth.ts`. Status maps in `data/statusMaps.ts`. Regenerated `database.types.ts`. ESLint bans `admin_db`. Boot requires `SUPABASE_SERVICE_ROLE_KEY`. Naming shims: `registration.service`, `analytics.service`, `eventVendors.service`, `auth.service`, etc. CI workflow + `npm run test:unit` (`eventState`, `bookingValue`).
- Files: `data/{supabase,adminAuth,statusMaps,collections,pg}.ts`, migrated `src/features/**` + `src/services/**`, `eslint.config.mjs`, `.cursor/rules/supabase-only.mdc`, `.github/workflows/ci.yml`, `completeContext.md`
- Next: Prefer canonical import paths; gradually delete typo filenames once call sites move.

### 2026-10-07 — Firebase→Supabase cutover (guards)
- What: Typed `supabaseAdmin` / `createSupabaseServer` as `SupabaseClient<Database>`; boot fails without `SUPABASE_SERVICE_ROLE_KEY`. Canonical standards section + `.cursor/rules/supabase-only.mdc`. Script `npm run types:db`.
- Files: `data/supabase.ts`, `completeContext.md`, `.cursor/rules/supabase-only.mdc`, `package.json`, `eslint.config.mjs`
- Next: Domain waves then delete façade (done — see cutover complete entry).

### 2026-10-06 — Demo seed (5-cap tenants)
- What: `npm run seed:demo` (`scripts/seed-demo.mjs`) creates Auth users `*@avoeline.demo` (password `AvoelineDemo1!` or `DEMO_SEED_PASSWORD`) plus up to 5 of each dashboard list across platform staff, 5 departments, 5 clubs, 5 organizers (free/pro/enterprise), 5 vendors, 5 attendees, events/speakers/agenda/regs, hackathon tracks/teams, staff library, bookings. Tagged `extra.demo_seed = avoeline-demo`. Re-runnable. Logins: `docs/TESTING.md` § 0b.
- Files: `scripts/seed-demo.mjs`, `package.json`, `docs/TESTING.md`, `completeContext.md`
- Next: Run `npm run seed:demo`, then sign in as `org.enterprise@avoeline.demo` / `dept1@avoeline.demo` / `club1@avoeline.demo` / a vendor / an attendee.

### 2026-10-06 — Enter/compete after event ends; /organizer CTA
- What: `/events/{id}/enter` and `/compete` load the event even when registration is closed (`getPublicEvent` was 404ing completed hackathons). `/organizer` redirects via `landingPathFor`. Staff/Teams lock CTAs go to dashboard.
- Files: `src/app/events/[eventId]/{enter,compete}/page.tsx`, `src/app/organizer/page.tsx`, `src/app/organizer/[organizer_id]/{teams,events/[eventId]/staff}/page.tsx`, `src/features/teams/components/OrganizerTeamsBoard.tsx`, `completeContext.md`
- Next: Open a completed hackathon `/enter` with a team access or join code; click Back to dashboard on a locked module.

### 2026-10-06 — Organizer Teams library + event Staff assign
- What: One staff-team UI (`TeamCreator` / `TeamRosterView`) everywhere. Left-rail Teams is the library (create, read, add members on `teams_basic`; rename/delete team, remove/promote, edit details on `teams_advanced_roles`). Event Staff (regular + hackathon) only picks which teams/members apply (`event_staff_assignments`); no join codes. Hackathon occupancy Teams tab is unchanged. `user_is_event_staff` respects assignments + optional member subset.
- Files: `src/app/organizer/layout.tsx`, `src/app/organizer/[organizer_id]/teams/page.tsx`, `src/app/organizer/[organizer_id]/events/[eventId]/staff/page.tsx`, `src/features/teams/{teamEngine.service.ts,teamEngine.types.ts,actions/teamEngine.action.ts,components/{TeamCreator,TeamRosterView,OrganizerTeamsBoard}.tsx}`, `src/features/hackathon/staffEventAccess.ts`, `data/collections.ts`, `supabase/migrations/20261006200000_organizer_staff_library.sql`, `completeContext.md`
- Next: Open left-rail Teams, create a roster, assign it on an event Staff tab; confirm basic cannot rename/delete; confirm hackathon occupancy Teams still uses join/access codes.

### 2026-10-06 — Phases accordion, Teams/scoreboard, enter codes, staff grants
- What: Phases & Tasks default collapsed (competition/phase accordion, search auto-expand, Add Phase/Task modals, styled CTF file pick). Teams: `?track=` pills, occupancy stats, Join vs Enter codes, Manage only. Scoreboard: ranked table, expand phases/tasks, first blood, hint-used flag (no reveal time), tie-break caption, empty copy. `/enter` matches `access_code_hash` without extra plaintext and falls back to `join_code`; compete layout gates the cookie and stays on that team's track. Paid Staff: `page_*` keys + `extra.trackIds`; `assertOwnedEvent` + layout hide ungranted tabs; actions refuse off-grant tracks. Attendee staff reach owner event URLs via `user_is_event_staff`. Hydration: countdown/scoreboard relative times wait for mount; header media + status badge suppress mismatch.
- Files: `src/features/hackathon/{components/HackathonPhasesTasksPanel.tsx,CtfAttachmentFields.tsx,LiveScoreboardTable.tsx,HackathonWorkspace.tsx,HackathonCountdown.tsx,tasks.service.ts,accessCodes.service.ts,staffEventAccess.ts,actions/*}`, `src/features/teams/**`, `src/features/events/ownership.ts`, `src/app/organizer/.../events/[eventId]/{layout,attendees,staff}.tsx`, `src/app/events/[eventId]/compete/layout.tsx`, `src/proxy.ts`, `supabase/migrations/20261006180000_team_positions_extra.sql`, `supabase/migrations/20261006190000_user_is_event_staff.sql`, `completeContext.md`
- Next: Expand a phase; Add Task CTF file pick; Teams All vs one competition; scoreboard expand + hint-used; `/enter` with access **and** join code; assign Competition Lead to one track as paid Staff.

### 2026-10-06 — Sponsors polish, competitions modal, CTF files, staff add-member
- What: Sponsors form hides financial fields by Type (Role + competition scope for Collaborator, Partnership kind for Partner). Logo upload to `sponsor-logos` with URL fallback. Hackathon optional `track_id` dedication. Benefit chips preserve delivered state. Income card shows per-tier totals and benefits fulfillment. List cards have logo, badges, inline benefit checkboxes. Competitions: Add/Edit modal with sectioned TrackForm; table 48–64px thumbs; `hackathon_track_prizes`; CTF challenge/hint files on Phases & Tasks with `max_attachment_mb` (default 10, bucket cap 50MB). Configure page lost duplicate `hackathon_config` toggles (Settings tab only). Staff Basic: no join code/copy link; extra members by name/email/phone; Paid keeps codes + recruitment (`teams_advanced_roles`).
- Files: `src/features/organizations/**`, `src/features/hackathon/**`, `src/features/teams/**`, `src/app/organizer/.../sponsors/page.tsx`, `src/app/events/[eventId]/tracks/page.tsx`, `supabase/migrations/20261006140000_prizes_challenge_files_staff_roster.sql`, `data/supabase.ts`, `completeContext.md`
- Next: Open a hackathon Sponsors tab (Collaborator/Partner/upload/dedication). Competitions: Add modal, two prize rows, CTF oversized file, Configure without settings toggles. Staff without `teams_advanced_roles`.

### 2026-10-06 — Staff gating + Access tiers/promos/email
- What: Staff Basic keeps the roster and shows an Advanced Team Management upsell; Paid gets position cards, shared `DynamicFieldBuilder` recruitment forms, public apply links, grouped applicant pipeline, and `staff` export. Jawad was 3 real `applicants` inserts (same name/note within 23s); extras deleted, unique `(team_id, lower(email))` added. Three Registration Lead rows are real position inserts — cards now show permissions/counts/slot. Accept writes `team_members` when the email matches a user. Access: one Access settings card; whitelist/CSV preview; invite vs whitelist guest rows; opened counts invites only; hackathon hides ticket tiers; promo expiry/active/competition scope + lists; guest emails go through Resend `sendEmail`.
- Files: `src/app/organizer/[organizer_id]/events/[eventId]/{staff,access}/page.tsx`, `src/features/teams/**`, `src/features/access/**`, `src/features/ticketing/**`, `src/features/exports/**`, `src/shared_components/DynamicFieldBuilder.tsx`, `src/app/events/[eventId]/staff-apply/[formId]/page.tsx`, `supabase/migrations/20261006120000_staff_recruitment_and_tier_active.sql`, `src/lib/database.types.ts`, `completeContext.md`
- Next: Open Staff without `teams_advanced_roles` (upsell), then with it (positions/pipeline). Access: preview a CSV, add a whitelist + invite, open the invite URL, confirm `openedAt`.

### 2026-10-06 — Attendees filter bar, team cards, drawer tabs
- What: Filter selects are compact pills with removable chips (search × stays in the input). Team cards show either No fee or an amount, never both (`teamFeeDisplay`). Drawer is Details / Communication; compose is a Send email button, not a permanent form. Bulk email fields have labels. `sendEmail` reads `RESEND_FROM_EMAIL` then `RESEND_FROM` / `MAIL_FROM`. Bulk send still resolves recipients from current filter query params on the server.
- Files: `src/features/event_attendee/components/{AttendeeInput,GroupedAttendeeList,SingleAttendeeView,TeamGroupView,EventEmailPanels,DrawerTabs,AttendeeClientSide}.tsx`, `src/features/event_attendee/roster.ts`, `src/app/organizer/[organizer_id]/events/[eventId]/attendees/page.tsx`, `src/lib/email/resend.ts`, `completeContext.md`
- Next: Open Attendees, apply a status/competition filter, confirm chips, open a team then Communication tab.

### 2026-10-05 — Attendees roster, two-sheet export, Teams Manage, event emails
- What: Attendees stats use occupancy vs people and real check-in (`checkIn.checkedIn` or status). Search/filters are query-param controlled. Team cards open a team drawer (payment/proof); members open a personal drawer (QR/check-in, no duplicated payment). Attendees xlsx is two sheets when teams/groups exist. Teams tab stays; Manage → `attendees?team=`. Organizer `event_email_templates` (received vs confirmed); auto mail to lead/solo; member + bulk send from current filters. Public ticket URL is the status link. `hackathon_teams.access_code_hash` remains in generated types.
- Files: `src/features/event_attendee/**`, `src/app/organizer/[organizer_id]/events/[eventId]/attendees/page.tsx`, `src/features/exports/{eventSheets.ts,actions/exportEventSheet.action.ts}`, `src/features/hackathon/components/HackathonWorkspace.tsx`, `src/features/registration/actions/registerAttendee.action.ts`, `src/features/hackathon/accessCodes.service.ts`, `src/features/access/actions/registrationDecision.action.ts`, `supabase/migrations/20261005120000_event_email_templates.sql`, `src/lib/database.types.ts`, `completeContext.md`
- Next: Open Attendees, check tiles vs a real check-in, search/clear, click a team then a member, export xlsx, Teams Manage, save a received template and send to filtered leads.

### 2026-10-04 — Resend email dispatch for notifications
- What: Email channel in `dispatchNotification` sends via Resend + React Email templates. Trigger/queue unchanged. No API key → previous console stub. Other channels still stubbed. Brevo `src/lib/email.ts` unchanged.
- Files: `src/lib/email/resend.ts`, `src/lib/email/renderNotification.tsx`, `src/lib/notifications.ts`, `src/lib/notifications.types.ts`, `emails/*`, `package.json`, `completeContext.md`
- Next: Set `RESEND_API_KEY` and a verified `RESEND_FROM`/`MAIL_FROM`. Confirm a registration or invite writes `notifications` as `sent`.

### 2026-10-04 — Event Overview visual pass
- What: Restyled organizer Event Overview only (hero fade, larger title + dot status, stat tiles, section cards, empty ticket tiers). Tabs, fetches, and field order unchanged. Shared kit: `StatusBadge.marker`, `MetricTile.iconTone`, empty `Meter` track, tab underline contrast.
- Files: `src/app/organizer/[organizer_id]/events/[eventId]/{page,layout}.tsx`, `src/shared_components/ui/{StatusBadge,MetricTile}.tsx`, `src/shared_components/ui/charts/Meter.tsx`, `src/shared_components/organizer/EventTab.tsx`, `completeContext.md`
- Next: Open an event Overview (e.g. Softec). Check hero, stats empty track, section cards, and Recent registrations hover.

### 2026-10-01 — Drop left-rail Hackathon tab
- What: Removed the Hackathon item from organizer and club left nav. Hackathons stay on Events (`?kind=hackathon`). Event `id` mapping prefers the Postgres uuid so event detail URLs resolve. Regenerated Next route types (corrupt `routes.d.ts` was causing TS parse errors).
- Files: `src/app/organizer/layout.tsx`, `src/features/clubs/club.service.ts`, `src/services/models/event.model.tsx`, `src/services/event.service.ts`, `src/features/hackathon/components/ConfigToggleRow.tsx`, `completeContext.md`
- Next: Open Events, then a hackathon row. Confirm the left rail has no Hackathon tab and the overview loads.

### 2026-10-01 — Unified Events + Hackathon dashboard (v2)
- What: One event layout and tab bar; hackathon pages live under `/events/{id}/…`; rail + `/hackathon` redirect to `?kind=hackathon`. Regular group registration via `registration_groups`. Wizard hackathon toggle + Single/Group + `askOnce`. Promos on paid hackathons (`promo_codes.track_id`). Agenda/speakers join. Staff advanced roles + pipeline. Tasks filter/search; scoreboard track isolation; two-sheet team export.
- Files: `src/app/organizer/[organizer_id]/events/**`, `src/features/registration_groups/`, `src/features/event_attendee/components/GroupedAttendeeList.tsx`, `src/features/events/components/wizard/**`, `src/features/ticketing/**`, `src/features/agendas/agendaSpeakers.service.ts`, `src/features/teams/**`, `src/features/hackathon/{tasks.service.ts,components/HackathonPhasesTasksPanel.tsx}`, `src/features/exports/**`, `supabase/migrations/20261001120000_unified_event_hackathon_v2.sql`, `docs/10-events-and-hackathon-dashboards.md`, `docs/09-event-creation.md`, `docs/TESTING.md`
- Next: Open Events list with `?kind=hackathon`. Toggle hackathon in the wizard. Register a regular group. Confirm Access promos on a paid hackathon. Filter Phases & Tasks. Export hackathon teams xlsx.

### 2026-10-01 — Events and hackathon dashboard inventory
- What: Added a single inventory of every Events and Hackathon dashboard tab, what it does, and the public register / enter / compete flows.
- Files: `docs/10-events-and-hackathon-dashboards.md`, `completeContext.md`
- Next: Use that doc when changing a tab; keep it in the same session as the code.

### 2026-09-30 — Hackathon tickets 404, team code, chrome
- What: Removed Tickets tabs. Hackathon `/tickets` redirects to attendees (never re-exports the events tickets page). Paid event SKUs live on Access. One **team** access code after pay+confirm (`hackathon_teams.access_code_hash`). Attendees grouped by team; per-member QR includes email. Headers show banner beside the title. Description is sanitized HTML. FormBuilder has image type. Enter URL is `/events/{id}/enter`.
- Files: `src/app/organizer/[organizer_id]/{events,hackathon}/[eventId]/{layout,tickets,access}/**`, `src/features/hackathon/accessCodes.service.ts`, `src/features/event_attendee/components/AttendeeClientSide.tsx`, `src/features/registration/qr.ts`, `supabase/migrations/20260930120000_team_dashboard_access_code.sql`, `docs/TESTING.md`, `docs/09-event-creation.md`
- Next: Open a hackathon `/tickets` URL (should land on Attendees). Confirm a paid team; copy the **team** code from the team card; sign in at `/events/{id}/enter`.

### 2026-09-30 — Hackathon 404 and team occupancy
- What: Hackathon workspace tabs no longer 404 when the event exists (`assertOwnedEvent` now allows club presidents; layout does not require a format match). A team booking counts as one capacity unit (lead only); extra members stay on Attendees as people.
- Files: `src/features/events/ownership.ts`, `src/app/organizer/[organizer_id]/hackathon/[eventId]/layout.tsx`, `src/features/hackathon/components/HackathonWorkspace.tsx`, `src/features/registration/registration.service.ts`
- Next: Open Teams/Tasks on a hackathon as a club president. Register a 3-person team and confirm capacity / "Team registrations" is 1.

### 2026-09-29 — Team-lead register and code dashboard
- What: Hackathon register is team lead + members (shared custom form, one payment proof). Creates a team and one registration each. Access codes mint after payment+confirmation (`hackathon_access_code_hash`). Login at `/events/{id}/enter`; dashboard `/events/{id}/compete` (tasks, phases, scoreboard, timer, flag or 1MB/link submit). Ticket waits for codes. Organizers assign leftover people on Attendees.
- Files: `src/features/registration/**`, `src/features/hackathon/accessCodes.service.ts`, `src/features/hackathon/competeSession.ts`, `src/app/events/[eventId]/enter/page.tsx`, `src/app/events/[eventId]/compete/**`, `src/features/hackathon/actions/assignLeftover.action.ts`, `supabase/migrations/20260929120000_hackathon_access_codes.sql`
- Next: Register a team under min size, confirm payment on Attendees, copy codes, open `/enter` → `/compete`. Assign an unteamed attendee.

### 2026-09-29 — Hackathon register form competitions
- What: Public `/events/{id}` registration picks a competition. Details, price (free vs due after track discount), payment screenshot, and custom questions follow that choice. Server stores `hackathonTrackId` and charges the track fee, not the leftover event ticket.
- Files: `src/features/registration/components/RegistrationForm.tsx`, `src/app/events/[eventId]/page.tsx`, `src/features/registration/registration.service.ts`, `src/features/registration/actions/registerAttendee.action.ts`, `src/features/hackathon/types.ts`
- Next: Open a published hackathon register URL. Switch between paid and free competitions. Confirm ticket lists the competition.

### 2026-09-29 — Hackathon pages, unified phases/tasks/settings
- What: Dashboards open for format/title/tracks + department admins. One Tasks tab persists phase windows participants already query. Settings apply to selected competitions (CTF keys skip non-CTF). Organizer scoreboard and participant live card use task completions + 15s refresh.
- Files: `src/features/hackathon/hackathon.service.ts`, `src/features/events/ownership.ts`, `src/services/models/event.model.tsx`, `src/features/hackathon/actions/tasks.action.ts`, `src/features/hackathon/components/HackathonWorkspace.tsx`, `src/features/hackathon/components/HackathonPhasesTasksPanel.tsx`, `src/features/hackathon/components/ConfigToggleRow.tsx`, `src/app/events/**/ticket/**`, `docs/TESTING.md`, `docs/09-event-creation.md`
- Next: Grant `hackathon_ops`, create a hackathon, open Tasks/Settings/Scoreboard, then register in incognito and confirm phase visibility + matching points.

### 2026-09-28 — Hackathon as a paid plan module
- What: Paid `hackathon_ops` left-rail module (list, create wizard, dashboard tabs). Hackathon format hidden from Events. Old event hackathon URLs redirect. Tracks store `kind` + `rules_text`; CTF config keys only on CTF competitions. Club grant + nav wrappers.
- Files: `src/features/permissions/moduleKeys.ts`, `src/app/organizer/layout.tsx`, `src/app/organizer/[organizer_id]/hackathon/**`, `src/features/hackathon/**`, `src/features/clubs/club.service.ts`, `src/app/clubs/[clubId]/hackathon/**`, `supabase/migrations/20260928140000_hackathon_track_kind.sql`, `docs/04-organizer.md`, `docs/09-event-creation.md`, `completeContext.md`
- Next: Unlock `hackathon_ops` on a plan. Create a hackathon from the rail. Confirm Events no longer lists it. Open CTF vs Business competitions and check settings keys.

### 2026-09-28 — Hackathon tab load (settings PK)

- What: The Hackathon tab crashed because `hackathon_settings` is keyed by `event_id`, and the Postgres façade always queried `id`. Reads/writes now use `event_id`. Missing settings no longer take down the page.
- Files: `data/admin_db.ts`, `src/features/hackathon/hackathon.service.ts`, `completeContext.md`
- Next: Open an event → Hackathon. Tracks, CTF, and settings should load.

### 2026-09-28 — Event delete, agenda, speakers, tickets

- What: Organizers can delete an event from the list and the event header; `admin_purge_event` removes child events and related rows in Postgres. Agenda items persist in `event_agenda_items` (with `extra.agenda` fallback so older saves still show). Speaker photos are in colour with initials if the image fails. Tickets tab is only for paid, registration-on events (SKUs/promos for Register); free events hide it. Hackathon config keys match docs 07, including startsAt / category list / attendance interval.
- Files: `src/features/events/actions/deleteEvent.action.ts`, `src/features/events/components/DeleteEventForm.tsx`, `src/features/agendas/agenda.service.ts`, `src/services/event.service.ts`, `src/features/event_speakers/components/{SpeakerCard,SpeakerPhoto}.tsx`, `src/app/organizer/[organizer_id]/events/**`, `src/features/hackathon/configKeys.ts`, `supabase/migrations/20260928120000_admin_purge_event_children.sql`, `completeContext.md`
- Next: Open Events → Delete (confirm). Add an agenda session and reload Agenda. Check Speakers photos. On a paid event, Tickets should list tiers; on a free event the tab is gone.

### 2026-09-28 — Club Events list shows organizer events

- What: Club Events was filtering only `events.org_id = club`, so events created as a personal organizer (profile count) never appeared. The tab now uses the organizer events dashboard for the president, counts include those rows, and untagged events get `org_id` when the president profile syncs.
- Files: `src/app/clubs/[clubId]/events/page.tsx`, `src/features/clubs/club.service.ts`, `src/app/clubs/[clubId]/{page,analytics}/page.tsx`, `completeContext.md`
- Next: Open club Events. Existing events should list. Create another and confirm it stays on the list.

### 2026-09-28 — Club nav, president profile standing

- What: Club rail always shows the **club name**. Opening Events (including an event detail/create URL) keeps that name and highlights Events. Presidents who were already organizers get `organizer_profiles.org_id` + `org_name` synced to the club (personal plan is kept). Profile is available from the club rail and explains personal name vs public club name.
- Files: `src/features/clubs/club.service.ts`, `src/app/clubs/[clubId]/layout.tsx`, `src/app/organizer/layout.tsx`, `src/app/organizer/[organizer_id]/profile/page.tsx`, `src/features/teams/actions/department.action.ts`, `src/shared_components/DashboardNav.tsx`, `completeContext.md`
- Next: Sign in as an organizer who was later assigned club president. Open Events and a specific event — rail should show the club. Open View profile.

### 2026-09-27 — Publish retry, form rows, track end

- What: Publish no longer dies on a stale `org_id`, a non-ISO date, or a follow-up track insert. Custom form options stay one stacked row (circle/square + text). Track discount expiry saves as ISO into `discount_expires_at`. End on the Hackathon tab marks `status=ended`; joins and new teams are refused.
- Files: `src/services/event.service.ts`, `src/features/events/components/wizard/{FormBuilder,EventWizardLayout}.tsx`, `src/features/hackathon/**`, `src/app/events/[eventId]/tracks/page.tsx`, `completeContext.md`
- Next: Publish again from the wizard. Add a multiple-choice and checkbox question. On a hackathon, edit Discount expires and press End.

### 2026-09-27 — Wizard publish, form options, track end

- What: Publish no longer dies on a certificate template write (that used the event id as `organizer_id`) or a `visibility = tiered` check. Custom form options are one editable row each, with radio (multiple choice) and checkboxes. Tracks store `discount_expires_at` and can be ended from the Hackathon tab.
- Files: `src/services/event.service.ts`, `src/features/events/components/wizard/FormBuilder.tsx`, `src/features/registration/components/RegistrationForm.tsx`, `src/features/hackathon/**`, `supabase/migrations/20260927180000_hackathon_track_discount_end.sql`, `completeContext.md`
- Next: Publish an event again. Build a checkboxes/radio question. End a competition from the Hackathon tab.

### 2026-09-27 — Event dashboard Phase 2

- What: Slim event section tabs to rail density with a full icon map. Hide Attendees/Tickets (and Overview registration chrome) when `requires_registration` is false; typed URLs redirect to Overview. Ticket add forms now `finishForm` so errors show. Hackathon hub has a per-track Configure link to `#settings`; config rows restyled; docker stays toggle-only.
- Files: `src/shared_components/organizer/EventTab.tsx`, `src/app/organizer/[organizer_id]/events/[eventId]/{layout,page,attendees,tickets,hackathon}/**`, `src/features/ticketing/actions/ticketing.action.ts`, `src/features/hackathon/components/ConfigToggleRow.tsx`, `docs/09-event-creation.md`, `completeContext.md`
- Next: Sign in as an organizer. Open a registration-on event and click each tab. Open a no-registration event and confirm Attendees/Tickets are gone. On a hackathon track, save a config toggle.

### 2026-09-27 — Event creation wizard upgrade

- What: Split the create-event wizard into reusable steps. Times are native inputs (12h/24h display only). “Same as start date” copies the start date. Duration is computed. Location uses a map share URL (no visible coordinates) with OSM preview. Hackathon format adds a competitions step (single or multi-track: fee, image, policies, instructions, discounts). Registration can be skipped (`requires_registration`). Google Forms-style `FormBuilder` writes `custom_form`. `create_event` persists `map_url`, `requires_registration`, dates, and tracks. Public event page hides Register when registration is off.
- Files: `src/features/events/components/wizard/**`, `src/services/event.service.ts`, `src/services/models/event.model.tsx`, `src/features/registration/components/RegistrationForm.tsx`, `src/app/events/[eventId]/page.tsx`, `supabase/migrations/20260927170000_event_wizard_map_reg_tracks.sql`, `docs/09-event-creation.md`, `docs/07-hackathon-organizer-config.md`, `completeContext.md`
- Next: Open `/organizer/{id}/events/create`. Create a webinar, a no-registration talk, and a multi-track hackathon. Phase 2: restyle event dashboard tabs and add `hackathon_config` toggles from docs 07.

### 2026-09-27 — Club grants beat a weaker personal plan

- What: A club president whose organizer profile is still Free now sees the department plan name and the modules the department granted the club. `hasModuleAccess` checks presidency/ownership, not only `organizer_profiles.org_id`. Designer and Ushers open under `/clubs/{id}/…` instead of bouncing to the club home.
- Files: `src/features/permissions/permissions.service.ts`, `src/features/department/department.service.ts`, `src/features/clubs/club.service.ts`, `src/app/clubs/[clubId]/{page,designer,ushers}/`, `src/features/department/components/PlanStatusBanner.tsx`, `completeContext.md`

### 2026-09-27 — Club dashboard rail, request files, teams

- What: Club presidents get a dashboard rail (`/clubs/{id}` plus Events/Analytics/Marketplace/Teams/Requests). Granted `org_module_access` keys become left tabs. Requests accept an attachment; department Requests and club inspect can download it. Teams basic stores roster details; advanced roles add lead/remove/join code. Organizer chrome is replaced by the club rail for presidents.
- Files: `src/app/clubs/[clubId]/**`, `src/features/clubs/**`, `src/app/organizer/layout.tsx`, `src/app/department/{requests,clubs/[clubId]}/`, `src/shared_components/DashboardNav.tsx`, `data/collections.ts`, `supabase/migrations/20260927160000_club_dashboard_requests_roster.sql`, `completeContext.md`

### 2026-09-27 — Department event create stays on department chrome

- What: Creating or opening a department event no longer swaps the left rail to the organizer dashboard. Department-only pages (dashboard, events list, analytics, organizer marketplace URL) redirect back to `/department…`. Marketplace appears on the department rail only when the plan includes `vendor_store`. New events store `org_id` from the department profile. Publish “Go to dashboard” returns to `/department`.
- Files: `src/app/organizer/layout.tsx`, `src/app/department/{layout,marketplace}/`, `src/features/department/department.service.ts`, `src/app/organizer/[organizer_id]/events/[eventId]/{layout,pub-succ}/`, `src/services/event.service.ts`, `completeContext.md`

### 2026-09-27 — Slim dashboard rails + club-create await fix

- What: Club create no longer `await`s inside `.map()`. Organizer, vendor, and department `DashboardNav` is the same slim `w-48` left rail as admin (`md:pl-52`, compact rows).
- Files: `src/features/teams/actions/department.action.ts`, `src/shared_components/DashboardNav.tsx`, `src/app/{organizer,vendor,department}/layout.tsx`, `completeContext.md`

### 2026-09-27 — Department dashboard, president logins, club feature grants

- What: Department uses organizer-style left nav (Dashboard, Events, Analytics, Clubs, Announcements, Requests). Adding a club creates a president Auth login (password reset on first sign-in). Department plan is labeled with an upgrade note (same banner on organizer dashboard). Clubs only receive checked features from that plan; organizer nav hides the rest. Department lists club events/teams as read-only.
- Files: `src/app/department/**`, `src/features/department/department.service.ts`, `src/features/teams/actions/department.action.ts`, `src/features/department/actions/departmentOrg.action.ts`, `src/features/permissions/permissions.service.ts`, `src/app/organizer/layout.tsx`, `src/shared_components/DashboardNav.tsx`, `completeContext.md`, `docs/TESTING.md`
- Next: Sign in as a department tenant. Create a club with email + password and tick features. Sign in as the president, reset password, confirm only granted tabs show. Check department Events for own vs read-only club rows.

### 2026-09-27 — Staff login fix, full staff tabs, customizable plan/tenant features

- What: Creating platform staff now writes `user_type = platform_admin` (the `admin` value was rejected by Postgres, so Auth existed but login said “not an admin”). Re-submitting the same email repairs a leftover Auth user. Staff permissions include Departments, Tenants, and Plans. `isOwner` is only `users.is_owner`. Plans can tick or untick every module, including the old “always include” set. Tenants can grant or deny any feature.
- Files: `src/features/admin/actions/admins.action.ts`, `src/features/admin/types.ts`, `src/services/user.service.ts`, `src/app/admin/layout.tsx`, `src/features/permissions/permissions.service.ts`, `src/features/saas/{actions,components}`, `src/app/admin/{tenants,plans,orgs}/`, `supabase/migrations/20260927140000_staff_and_feature_denies.sql`, `completeContext.md`
- Next: On Platform staff, add the person again with the same email (or tick the new areas) and sign in at `/admin/signin`. Edit the free plan’s feature checkboxes; grant/deny a tenant feature.

### 2026-09-27 — Admin left rail + owner CRUD / Auth delete

- What: Admin nav moved to a slim left rail (`w-48`). SaaS owner can edit departments, clubs, organizers, and vendors (name, parent, plan). Owner delete calls `admin_purge_org` / `admin_purge_user` then `auth.admin.deleteUser`, so the Auth login is removed too. Platform owners are never purged.
- Files: `src/shared_components/AdminRail.tsx`, `src/app/admin/layout.tsx`, `src/features/admin/purgeAccount.ts`, `src/features/admin/actions/tenancy.action.ts`, `src/features/admin/components/AdminCrudForms.tsx`, `src/features/teams/components/OrgManagementView.tsx`, `src/app/admin/{orgs,organizers,vendors}/`, `supabase/migrations/20260927120000_admin_purge_tenant.sql`, `data/admin_db.ts`, `completeContext.md`, `docs/TESTING.md`
- Next: Sign in as owner. Confirm the rail is on the left. Edit a department name/plan, then delete a throwaway tenant and check they cannot sign in and are gone from Auth.

### 2026-09-27 — Admin support preview, theme, plans, right rail

- What: Platform admins stay signed in as themselves and open department/organizer/vendor dashboards in support preview (proxy no longer bounces them; layouts use the URL id; banner + Back to admin). `assertOwnedEvent` allows platform admins. Admin nav is a right rail; ThemeToggle on the admin header. Category taxonomy UI uses `paper`/`ink`/`line` tokens. Plans page is a card list with Create/Edit modal. Orgs / Tenants / Admins keep three jobs, with “What this page is” copy. Proxy reads `users` with the JWT (not service role); matcher includes `/department` and `/clubs`. Support entity list is a slim Supabase select.
- Files: `src/proxy.ts`, `src/app/admin/layout.tsx`, `src/shared_components/AdminRail.tsx`, `src/shared_components/SupportPreviewBanner.tsx`, `src/app/organizer/layout.tsx`, `src/app/vendor/layout.tsx`, `src/app/department/layout.tsx`, `src/features/events/ownership.ts`, `src/features/saas/components/PlansBoard.tsx`, `src/features/admin/platform.service.ts`, `src/features/taxonomy/components/`, `completeContext.md`, `docs/TESTING.md`
- Next: Sign in as owner, click Enter View on a department and an organizer; toggle theme on Categories; create/edit a plan from the modal.

### 2026-09-26 — Admin tabs 404 after SaaS owner login

- What: Admin pages lived under `src/app/admin/(panel)/`. Dev routing only registered `/admin` and `/admin/signin`, so Plans/Tenants/Organizers and the other tabs returned the root 404 page. Moved those pages to `src/app/admin/*`. `requireAdmin` now treats `platform_admin` / owner rows as admin (not only `userType === "admin"`) and always loads permissions. Missing-admin checks redirect to sign-in instead of `notFound()`.
- Files: `src/app/admin/layout.tsx`, `src/app/admin/plans/page.tsx`, `src/app/admin/tenants/`, `src/features/auth/authService.ts`, `src/proxy.ts`, `completeContext.md`
- Next: Hard-refresh `/admin` after `next dev` reloads. Then open each tab (Plans, Tenants, Categories, Orgs).

### 2026-09-26 — SaaS owner setup, dynamic plans, tenant routing, hackathon config

- What: Hydration warning suppressed on `<body>`; organizer dashboard reviews now fetched by event ids; `adminDb` merge-set preserves `extra` and updates existing rows. SaaS owner seed script. Dynamic subscription plans (`/admin/plans`, FK from `organizer_profiles.plan_type`). Taxonomy ids converted to text slugs; `categoryType` written on every create; Seed defaults button. Tenant creation for department (org + `department_admin` membership) / organizer / vendor with plan + password; role derived from memberships with `landingPathFor`. Department/club scope checks, president upgrade, request/announcement notifications. Hackathon: typed per-track config enforced via `trackConfig`, rich task form, ticket-based participant task board, submission-link requirement, owner checks on phase/challenge/schedule actions. Form actions converted to `finishForm` redirects. Step-by-step role walkthrough in `docs/TESTING.md`.
- Files: `supabase/migrations/20260926140000_adminDb_filter_columns.sql`, `20260926150000_dynamic_subscription_plans.sql`, `20260926151000_taxonomy_text_ids.sql`, `data/admin_db.ts`, `scripts/seed-saas-owners.mjs`, `src/lib/formRedirect.ts`, `src/services/user.service.ts`, `src/features/saas/`, `src/features/department/orgScope.ts`, `src/features/department/actions/departmentOrg.action.ts`, `src/features/clubs/actions/orgRequests.action.ts`, `src/features/teams/actions/department.action.ts`, `src/features/taxonomy/actions/`, `src/features/hackathon/{configKeys.ts,tasks.service.ts,actions/tasks.action.ts,actions/ctf.action.ts}`, `src/app/admin/(panel)/{plans,tenants,categories}/`, `src/app/department/page.tsx`, `src/app/clubs/[clubId]/page.tsx`, `src/app/events/[eventId]/ticket/[registrationId]/tracks/[trackId]/tasks/page.tsx`, `docs/TESTING.md`
- Next: Fill `SAAS_OWNER_PASSWORD_1/2` in `.env.local` and run `npm run seed:owners`, then follow `docs/TESTING.md`. Participant-side CTF arena actions (`submitFlagAction`, sandbox, attendance) still trust the passed team id; move them to ticket-based auth like `tasks.action.ts`.

### 2026-09-26 — Docs 01–07 first implementation pass

- What: Subscription/tenant admin (plans, overrides, custom pricing, create-tenant + forced password reset). Organizer `hasModuleAccess` + locked panels. Department tenures/module access/announcements/request queue. Club `org_requests`. Hackathon tasks + hashed flag submit + `hackathon_config` toggles (existing `hackathon_phases` extended, not duplicated). Networking directory, badge tiers, registration badge discount. Implemented sequentially on this working tree (docs 01→04→02/03→06/07→05) rather than three parallel branches.
- Files: `supabase/migrations/20260926130000_docs_01_to_07_tables.sql`, `src/features/permissions/`, `src/features/saas/`, `src/features/department/`, `src/features/clubs/`, `src/features/hackathon/tasks.service.ts`, `src/features/networking/`, `completeContext.md`
- Next: Per-module polish (AI designer generation, docker infra, materialized department analytics). Plan before coding each follow-up.

### 2026-09-26 — Remove Firebase; Auth trigger + Storage policies

- What: Deleted Firestore rules/indexes and `firebase.json`. Dropped leftover `fcm_tokens`. Storage: public `media` SELECT, private `certificates` and `payment-screenshots`. Auth signup trigger writes `public.users` + role profile (never `platform_admin` from metadata). `adminAuth.updateUser({ disabled })` maps to Supabase `ban_duration`. Revoked RPC on `rls_auto_enable`.
- Files: `supabase/migrations/20260926120000_drop_fcm_storage_auth.sql`, `supabase/migrations/20260926120100_revoke_rls_auto_enable_rpc.sql`, `data/supabase.ts`, `data/admin_db.ts`, `scripts/create-buckets.mjs`, `completeContext.md`
- Next: In the Supabase dashboard, confirm Auth Site URL / redirect URLs for the Vercel app. Enable leaked-password protection if desired.

### 2026-09-20 — Supabase Auth + Postgres cutover

- What: Landed the complete Postgres schema (plus CTF, speakers, checklists, access tiers, admin permissions, ticketing). Replaced Firebase Auth/Firestore with Supabase Auth cookies and `supabaseAdmin`. Tickets tab, payments on paid registration/booking, waitlist as registration status, hackathon_scores writes, pending_invites for club owners without accounts.
- Files: `supabase/migrations/20260920120000_complete_schema.sql`, `data/supabase.ts`, `data/admin_db.ts`, `data/collections.ts`, `src/proxy.ts`, `src/features/auth/authService.ts`, `src/features/ticketing/`, `src/features/payments/`, `src/lib/database.types.ts`, `package.json` (removed `firebase` / `firebase-admin`)
- Next: Optional Firestore export script if old documents must be imported. Confirm Auth URL/redirects in the Supabase dashboard.

### 2026-10-25 — Admin tenants redesign (Phases 1–5)
- What: `/admin/tenants` rebuilt as Tenants/Approvals/Overrides/Pricing/Activity board; `TENANT_CAPS` + `canTenantCap`; safeAction create/plan/grant/pricing/approval; manage drawer; passwords never emailed; unit tests for filters/caps/sanitize.
- Files: `src/app/admin/tenants/page.tsx`, `src/features/saas/tenantBoard.*`, `src/features/saas/components/tenants/*`, `src/features/saas/actions/{tenants,subscriptions}.action.ts`, `src/features/admin/types.ts`, `AdminForms.tsx`, `plans/2026-10-25-admin-tenants-redesign.md`
- Next: Smoke Create (invite + temp-password once dialog); grant/deny preview; Approvals reject with reason; cron feature-override-expiry.

### 2026-09-20 — Supabase MCP + agent skills

- What: Added hosted Supabase MCP client config, approved and authenticated the `supabase` server (CLI reports `ready`). Installed Cursor CLI (`agent`) on Windows. Installed official Supabase agent skills (Postgres best practices + Supabase).
- Files: `.cursor/mcp.json`, `.agents/skills/supabase/`, `.agents/skills/supabase-postgres-best-practices/`, `skills-lock.json`
- Next: If this chat still has no `supabase` MCP tools, start a new Agent session after Cursor reloads MCP. Storage work still starts at `data/supabase.ts`.

### 2026-09-20 — Next.js `src/` layout + Windows npm

- What: Moved routes to `src/app/`, UI kit to `src/components/`, middleware to `src/proxy.ts`, mocks to `src/mockdata/`; removed duplicate root `lib/`. Installed deps via `npm.cmd`. Added `install.bat`, `dev.bat`, and Cursor terminal default to Command Prompt so PowerShell cannot block `npm.ps1`.
- Files: `src/app/`, `src/components/`, `src/proxy.ts`, `src/mockdata/`, `tsconfig.json`, `tailwind.config.js`, `package.json`, `.vscode/settings.json`, `install.bat`, `dev.bat`

### 2026-09-20 — initial complete context snapshot

- What: First full map of stack, auth, collections, models, every `src/features/*` module, app routes, shared UI, and conventions. Added Cursor rule `.cursor/rules/complete-context.mdc` (always apply).
- Files: `completeContext.md`, `.cursor/rules/complete-context.mdc`
