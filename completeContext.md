# Avoeline — complete implementation context

**Purpose:** Living map of the codebase. Agents and humans should read this file first, then open only the files named here. After any page/feature change, update this document in the same session (see Change log).

**Product:** End-to-end event platform (Pakistan education / corporate training). Organizers create events, attendees register, vendors quote/book, admins moderate. Live: https://avoeline-website.vercel.app/

**Stack:** Next.js **16.2.6** App Router, React **19**, TypeScript, Tailwind **4**, **Supabase Auth + Postgres**, Supabase Storage, Vercel. Related libs: `pdf-lib`, `exceljs`, `qrcode`, `ethers` (blockchain certs), `pinata`, `recharts`, `lucide-react`.

**Path alias:** `@/*` → repo root (`tsconfig.json`). `@/components/*` → `src/components/*`.

---

## How work is layered

| Layer | Location | Role |
| --- | --- | --- |
| Routes (thin) | `src/app/**` | Pages, layouts, loading/error. Fetch + compose feature UI. **No `src/app/api/**`.** |
| Features | `src/features/<name>/` | Domain logic: `*.service.ts` (reads, often `adminDb`), `actions/*.action.ts` (`"use server"` writes), `components/`, `types.ts` (client-safe). |
| Shared services | `src/services/` | Cross-cutting Postgres services + document models. |
| Shared UI | `src/shared_components/` | Chrome, dashboards, design system. |
| Form UI kit | `src/components/ui/` | Badge/Button/Card/Input/Modal/Select (`@/components/ui`). Prefer `src/shared_components/ui` for new dashboard chrome. |
| Mock fixtures | `src/mockdata/` | Local mock lists used by a few services. |
| Data clients | `data/` | Table constants, `supabaseAdmin` / SSR Auth, Postgres façade (`adminDb`) over `supabaseAdmin`. |
| Helpers | `src/lib/` | Action result shape, dates, status, email, CSV, money, UI classes. |
| Edge auth | `src/proxy.ts` | Next 16 middleware (session cookie + role prefix). Matcher: `/organizer`, `/vendor`, `/attendee`, `/admin`, `/department`, `/clubs`. Profile read uses the user JWT (own row), not the service role. Platform admins are not bounced off tenant dashboards (support preview). |

**Conventions**

- Server Actions return `ActionResult` (`src/lib/action.ts`: `ok()` / `fail()`). Do not throw to the client.
- Actions bound directly to a plain `<form action>` must return `void` (React 19). Pattern: keep an `xImpl(): Promise<ActionResult>` and export `x(fd)` that calls `finishForm(fd, fallbackPath, await xImpl(fd), okMsg)` from `src/lib/formRedirect.ts`. It redirects to a safe `returnTo` hidden field (or the fallback) with `?e=` / `?ok=`; pages render those with `FormFeedback`.
- `adminDb` `set(obj, { merge: true })` on an existing row is an `update` that merges the stored `extra` jsonb (`mergeStoredExtra`), so unmapped fields survive partial writes.
- Types imported by Client Components must not transitively import `adminDb` (`data/admin_db.ts`). Keep types in `types.ts`; reads in `*.service.ts`; writes in `actions/`.
- Request-cached reads use React `cache()` (see AuthService, EventService).
- Event **lifecycle** (upcoming / ongoing / completed) is **derived** from schedule + now in `src/lib/eventState.ts`. Stored `event.status` is mostly creation intent (`draft` / `published`) and is not cron-updated.
- Organizer and vendor URLs use **user UUID** (`/organizer/{userId}/...`, `/vendor/{userId}/...`). Attendee dashboard uses the same id.
- Uploads: `src/features/media/uploadMedia.action.ts` → Supabase. Body limits are **50mb** in `next.config.ts` (`serverActions.bodySizeLimit` **and** `proxyClientMaxBodySize` — both required).
- Images: Next `images.remotePatterns` allow `randomuser.me` and Supabase public objects.
- Paid organizer modules: `hasModuleAccess` / `checkPermission` in `src/features/permissions/permissions.service.ts`. Do not add new `if (user.role === …)` gates for modules.

---

## Auth, roles, and gates

**User types (session / `userType`):** `attendee` | `organizer` | `vendor` | `admin`

**Fine roles (`User.role`):** `platform_admin` | `department_admin` | `organizer` | `team_lead` | `attendee`

**Files**

- Client + session: `src/features/auth/authService.ts` (Supabase Auth cookies, `getCurrentUser`, `requireAdmin`, signup/setup). New Auth users also get `public.users` + profile via `private.handle_new_user`.
- RBAC: `src/features/auth/rbac.service.ts` (`requireRole`, `getAuthenticatedUser`, team-lead check).
- Module gating: `hasModuleAccess` uses the plan's `included_modules` (every key is optional, including the usual free set) plus grant/deny rows in `feature_overrides`. Keys in `src/features/permissions/moduleKeys.ts`.
- Forced password reset: `users.must_reset_password` → `/auth/change-password` (`src/proxy.ts` + sign-in).
- UI guard: `src/features/auth/components/RequireRole.tsx`
- Sign-out: `src/features/auth/actions/signOut.action.ts`
- Promote admin: `src/features/auth/actions/promoteToAdmin.action.ts`
- Middleware: `src/proxy.ts` — verifies session; wrong role redirected to `/{userType}/{roleId|userId}/dashboard`. Platform admins may open `/organizer/{id}`, `/vendor/{id}`, `/department` in **support preview** (session stays the owner). Public exception: `/admin/signin`. Banner: `src/shared_components/SupportPreviewBanner.tsx`. `assertOwnedEvent` allows `platform_admin`.
- Suspended accounts: `accountIsLive` in `src/features/admin/types.ts` → `/suspended`
- Access denied: `src/app/access-denied/page.tsx`

**Roles from memberships:** department and club roles are not stored on `users`. `withOrgStanding` in `src/services/user.service.ts` derives them from `org_memberships`: a `department_admin` row sets `role = department_admin`, `orgId`, and `managedOrgIds` (department + its clubs); `president` rows fill `presidentOfOrgIds`. `landingPathFor(user)` picks the post-login page (admin → `/admin`, department → `/department`, president → `/clubs/{id}`, then organizer / vendor / attendee dashboards); used by sign-in, change-password, and access-denied. Scope checks: `canManageOrg` / `canLeadClub` in `src/features/department/orgScope.ts`.

**SaaS owners:** `npm run seed:owners` (`scripts/seed-saas-owners.mjs`) creates or resets the Auth users listed in `SAAS_OWNER_EMAILS` with `SAAS_OWNER_PASSWORD_1..N` from `.env.local`, as `platform_admin` + `is_owner`. Walkthrough for every role: `docs/TESTING.md`.

Admin panel identity: `src/features/admin/types.ts` — areas `orgs | organizers | events | vendors | support | categories | tenants | plans`. Owner (`is_owner`) has all areas + Platform staff. Staff are `user_type = platform_admin` with `is_owner = false`. Bootstrap via `PLATFORM_ADMIN_EMAILS` is documented on `AdminIdentity.viaBootstrap`.

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
| EVENTS | `events` | Events (`parent_event_id`, `org_id`; lifecycle still derived) |
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
| TICKET_TIERS | `ticket_tiers` | Paid SKUs (Access tab “Tiers & promos”, plus the create wizard) |
| PROMO_CODES | `promo_codes` | Promo codes |
| REGISTRATIONS / WAITLIST | `registrations` | Tickets; waitlist is `status = waitlisted`. Door QR JSON: name, email, registrationId, eventId |
| HACKATHON_TEAMS | `hackathon_teams` | One occupancy per team. Dashboard login: `access_code_hash` (plaintext `accessCode` in extra after pay + confirm) |
| TEAMS / TEAM_MEMBERS / TEAM_POSITIONS | `teams`, `team_members`, `team_positions` | Staff / club committee |
| HACKATHON_* | tracks, teams, members, scores, judges, mentors, CTF, phases, sandboxes, anomalies, schedules, attendance | Hackathon + CTF |
| EVENT_SPONSORS_PARTNERS | `event_sponsors_partners` | Sponsors / collaborators |
| BOOKINGS | `bookings` | Quote → booking |
| CERTIFICATES / CERTIFICATE_TEMPLATES | `certificates`, `certificate_templates` | Issued certs + templates |
| PAYMENTS | `payments` | Paid registration / booking rows |
| BUDGET_ENTRIES | `budget_entries` | Org budget |
| REVIEWS / FEEDBACK | `reviews` | Reviews |
| NOTIFICATIONS / NOTIFICATION_TEMPLATES | `notifications`, `notification_templates` | In-app + templates |
| MODERATION_LOGS / EVENT_REPORTS / SUPPORT_TICKETS | matching names | Admin |
| SUBSCRIPTION_PLANS / PLAN_CHANGES / FEATURE_OVERRIDES / CUSTOM_PRICING_AGREEMENTS | matching names | SaaS owner plans & unlocks (docs 01). Plans are dynamic rows (price monthly/yearly, currency, `is_active`, `sort_order`); `organizer_profiles.plan_type` FK → `subscription_plans.key` |
| ORG_TENURES / ORG_MODULE_ACCESS / ORG_ANNOUNCEMENTS / ORG_REQUESTS | matching names | Department / club (docs 02–03) |
| HACKATHON_TASKS / COMPLETIONS / ASSIGNMENTS / CONFIG | matching names | Hackathon tasks + per-track config (docs 06–07) |
| BADGE_TIERS / USER_BADGES / BADGE_MEETUPS / ATTENDEES | matching names | Networking (doc 05) |

**Clients**

- Cookie Auth: `createSupabaseServer()` in `data/supabase.ts` (`@supabase/ssr`).
- Service role: `supabaseAdmin` — Server Actions / services only (bypasses RLS).
- Compatibility façade: `data/admin_db.ts` (collection/doc API → Postgres). Do not import from Client Components.
- Client stub: `data/db.ts` (`app`/`db`/`auth` are null; unused).
- RLS helpers: `is_platform_admin()`, `user_org_ids()`. New Auth users get a `public.users` row (and role profile) from trigger `on_auth_user_created` → `private.handle_new_user()`. Signup still upserts the same rows via `AuthService` (idempotent).

### Supabase Storage (`data/supabase.ts`)

- Public bucket `media` (`MEDIA_BUCKET`) — banners, galleries, logos, speaker avatars, service images. Anon/authenticated **SELECT** policy `media_public_read`. Uploads use the service role.
- Private bucket `certificates` (`CERTIFICATES_BUCKET`) — PDFs, exports, payment proofs (`payment-proofs/`). Store **storage keys**, sign with `getSignedUrl` at read time. No public SELECT.
- Private bucket `payment-screenshots` (`PAYMENT_SCREENSHOTS_BUCKET`) — reserved; registration proofs currently use `certificates`.
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
- Actions: `accessSettings.action.ts`, `guestList.action.ts`, `inviteLinks.action.ts`, `markInviteOpened.action.ts`, `registrationDecision.action.ts`
- UI: `AccessSettingsForm`, `AccessGate`, `AccessTypeSelector`, `CsvWhitelistUploader`, `GuestListPanel`, `TrackInviteOpen`
- Route: `/organizer/[organizer_id]/events/[eventId]/access`
- Public short URL `/e/[eventId]` redirects to `/events/[eventId]` (invite query preserved)

### `saas`

Platform tenant/subscription admin (docs/01).

- `saas.service.ts` (`listPlans`, `getPlanCounts`), `actions/plans.action.ts`, `actions/tenants.action.ts` (`createTenantAccount`: department / organizer / vendor, optional plan + password), `actions/subscriptions.action.ts`
- Routes: `/admin/plans`, `/admin/tenants`, `/admin/tenants/new` (Tenants + Plans tabs need the `organizers` area)
- Inactive plan ⇒ paid modules denied in `hasModuleAccess`; `free` plan can't be deleted/deactivated.

### `permissions`

`hasModuleAccess` + `LockedModulePanel`. Paid organizer surfaces: marketplace (`vendor_store`), certificates, designer (`ai_designer`), ushers (`ushers_ops`), hackathon (`hackathon_ops`).

### `department` extras

Tenures, club module toggles, announcements (notify club owner), request queue on `/department` (`src/features/department/actions/departmentOrg.action.ts`, scoped by `orgScope.ts`). Clubs + presidents: `src/features/teams/actions/department.action.ts` (`ensurePresidentCanOrganize` upgrades the president to organizer); `TeamEngineService.setOrgLead`.

### `clubs`

`org_requests` form + status list, announcements and module badges on `/clubs/[clubId]` (`src/features/clubs/actions/orgRequests.action.ts`; review notifies the requester).

### `networking`

`/network` directory + badge meetups (`src/features/networking/`). Badge-tier discount applied at paid registration.

### `hackathon` extras

`hackathon_tasks` / completions / assignments (flag hashed server-side). Per-track settings in `hackathon_config`, described by `configKeys.ts` (typed fields; `toggleOnly` = stored, not enforced) and read via `trackConfig(trackId)` in `tasks.service.ts` (`on` / `value` / `num`). Enforced: ctf_flags, live_scoreboard, task_hints (+penalty), per_task_timer, hackathon_timer, random_tasks, task_categories, phased_structure / day_wise_tasks, phase_lock_no_revisit, link_submissions (in `teams.action.ts` `submitProject`). Per-team task state (hints revealed, task start times) lives in `hackathon_teams.extra`.

- Organizer track page: task create/edit/delete + `ConfigToggleRow` settings (`actions/tasks.action.ts`, guarded by `assertOwnedEvent`). Phases on the event hackathon page (`ctf.action.ts` `savePhaseAction` / `lockPhaseAction`, owner-checked via `organizerMayEdit`).
- Participant dashboard: `/events/[eventId]/enter` (code) then `/events/[eventId]/compete` (cookie). Ticket tasks page still exists.

### `admin`

Platform panel (spec 9.1).

- `admin.service.ts`, `platform.service.ts`, `guard.ts`
- Actions: `signin.action.ts`, `organizers.action.ts`, `vendors.action.ts`, `events.action.ts`, `admins.action.ts`, `support.action.ts`, `moderation.ts`, `tenancy.action.ts` (owner edit/delete + Auth purge via `purgeAccount.ts`)
- UI: `AdminSignInForm`, `AdminForms`, `ModerationForm`, `ReportEvent`, `SupportForms`, charts
- Routes under `src/app/admin/` (`layout.tsx` chrome; `signin` has no chrome)

### `agendas`

- `agenda.service.ts`, `actions/createAgenda.action.ts`
- UI: `AgendaClientContent`, `AgendaHeader`, `AgendaTimeline`, `CreateAgendaForm`
- Routes: `.../agenda`, `.../agenda/create-agenda`

### `analytics`

- `feedbackAnalysis.service.ts`
- Organizer page: `/organizer/[organizer_id]/analytics` (also `src/services/anaylService.ts`)

### `auth`

See Auth section. Layouts wrap organizer with `RequireRole` for `platform_admin | department_admin | organizer`.

### `bookings`

Quote / counter-offer / accept / review.

- `bookings.service.ts`, `bookingValue.ts`
- Actions: `reviewVendor.action.ts`
- UI: `AcceptQuoteButton`, `OrganizerReviewForm`, `VendorPrepBookingClient`
- Organizer: quotes, booking-details, marketplace, view-vendor, event vendors
- Vendor: quotes, bookings, counter-offer, prep-quote

### `certificates`

PDF render (`renderCertificatePdf.ts`), designs, email, public verify.

- Actions: `applyDesign.action.ts`, `downloadCertificate.action.ts`, `emailCertificates.action.ts`
- UI: `DesignPicker`, `DownloadCertificate`
- Routes: organizer certificates + `making-template`; public `/verify/[certificateId]`

### `dashboard`

Organizer home widgets: `UpcomingEvents`, `TodaysSchedule`, `RecentRegistrations`, `RegistrationTrendChart`

### `events`

Browse + wizard + ownership.

- `browse.service.ts`, `event.controller.ts`, `ownership.ts`
- Actions: `toggleChecklistItem.action.ts`
- Wizard: `EventWizardLayout` (shell) + `wizard/steps/{Basic,ScheduleLocation,HackathonTracks,Registration,Review}Step`, widgets `TimeField`, `MapPreview`, `FormBuilder`. Product rules: `docs/09-event-creation.md`. Full tab/flow inventory: `docs/10-events-and-hackathon-dashboards.md`.
- Extra columns: `events.map_url`, `events.requires_registration`; `hackathon_tracks.image_url|policies|instructions|discount_percent|discount_note|discount_expires_at|ended_at|status|kind|rules_text`.
- Routes: `/organizer/.../events`, `create`, `[eventId]`, `pub-succ`; public `/events`, `/events/[eventId]`. Department/club create still uses the organizer wizard.

### `event_attendee`

Organizer attendee list, check-in.

- `attendee.service.ts`, `actions/checkIn.action.ts`
- UI: `AttendeeClientSide`, `AttendeeListItem`, `SingleAttendeeView`, `AttendeeInput`

### `event_speakers`

- Types/service: `types/speaker.ts`, `types/speakers.service.ts`
- UI: `CreateSpeakerForm`, `SpeakerCard`, `SpeakerSearchBar`
- Routes: `.../speakers`, `.../speakers/create-speaker`

### `event_vendors`

Vendor profile media + vendor CRUD used by marketplace.

- `event_venders.services.ts` (filename typo)
- Actions: logo/cover/portfolio updates
- UI: `VendorLogoUpload`, `VendorCoverUpload`, `PortfolioImageManager`, `PortfolioVideoManager`

### `exports`

Excel/CSV event sheets (`exceljs`), private storage, signed download.

- `eventSheets.ts`, `writeSheet.ts`, `deliverFile.ts`
- Actions: `exportEventSheet.action.ts`
- UI: `ExportPanel`, `ExportButton`
- Route: `.../exports`

### `hackathon`

Tracks, teams, submissions, judging, live announcements, CTF arena.

- `hackathon.service.ts`, `ctf.service.ts`, `judging.ts`, `live.ts`, `kinds.ts`
- Actions: `tracks`, `teams`, `roster`, `judging`, `live`, `ctf`
- Paid module `hackathon_ops`. There is no left-rail Hackathon tab — hackathons live on Events (`?kind=hackathon`). Create is `.../events/create?hackathon=1`. Dashboard is the unified event layout. Old `/hackathon/*` URLs redirect.
- Public: `/events/[eventId]/tracks`, `.../tracks/[trackId]/leaderboard`, `.../mentors`, ticket team page, `/judge/[token]`, `/enter`, `/compete`
- Organizer hackathon tabs on `.../events/[eventId]`: competitions, tasks, teams, submissions, scoreboard, settings. `/tickets` redirects to attendees when the event is a hackathon.

### `media`

`uploadMedia.action.ts`, `MediaUpload.tsx`, `MediaUploadField.tsx`, `media.utils.ts`

### `notifications`

- `NotificationsView.tsx`, `recipient.ts`
- Actions: `notification.actions.ts`, `markRead.action.ts`
- Bell: `src/shared_components/NotificationBell.tsx`
- Routes: organizer + vendor `.../notifications`

### `organizations`

Sponsors / collaborators / partners on an event.

- `organizations.service.ts`, `actions/organizations.action.ts`
- UI: `OrganizationForm`, `InviteCollaborator`, `AcceptCollaboration`, `SponsorStrip`
- Routes: `.../sponsors`; public accept `/collaborate/[token]`

### `registration`

Public register, QR, confirmation email.

- `registration.service.ts`, `qr.ts`, `registrationEmail.ts`
- Action: `registerAttendee.action.ts`
- UI: `RegistrationForm.tsx` (used on public event page). Hackathons pass open competitions; fee/proof follow the selected track (`trackDueAmount`).
- Ticket pages: `/events/[eventId]/ticket/[registrationId]`, `.../team`
- Ticket pages: `/events/[eventId]/ticket/[registrationId]`, `.../team`

### `taxonomy`

Admin-managed categories/formats, organizer requests, dynamic fields, checklist templates.

- `taxonomy.service.ts`, `categoryEngine.service.ts`
- Actions: `taxonomy.action.ts`, `categoryEngine.action.ts`
- UI: `CategoryStep`, `DynamicFieldRenderer`, `CategoryManagementView`, `CategoryRequestsView`, modals
- Admin: `/admin/categories`, `/admin/category-requests`
- Wizard uses `CategoryStep` / `DomainCategoryPicker`

### `teams`

Orgs (`department` | `club`), teams (`hackathon_track` | `club_committee` | `event_staff`), join codes.

- `teamEngine.service.ts`, `teamScope.ts`
- Actions: `teamEngine.action.ts`, `department.action.ts`
- UI: `TeamCreator`, `TeamRosterView`, `JoinTeamModal`, `ClubDetailView`, `OrgManagementView`, `DepartmentDashboardView`
- Routes: `/teams`, `/teams/join`, `/clubs/[clubId]`, `/department`, `/admin/orgs`, event **Staff** tab

---

## App routes (`src/app/`)

Root layout: `src/app/layout.tsx` (fonts, theme FOUC script, `ToastProvider`, Speed Insights). Global CSS: `src/app/globals.css`. Errors: `src/app/error.tsx`, `src/app/global-error.tsx`, `src/app/not-found.tsx`.

### Public / marketing

| Path | File |
| --- | --- |
| `/` | `src/app/page.tsx` |
| `/events` | `src/app/events/page.tsx` |
| `/events/[eventId]` | `src/app/events/[eventId]/page.tsx` |
| `/e/[eventId]` | short redirect → `/events/[eventId]` |
| `/events/[eventId]/ticket/[registrationId]` | ticket (hackathon: waiting + enter-code link) |
| `/events/[eventId]/ticket/[registrationId]/team` | hackathon extras; join-a-team is not the default |
| `/events/[eventId]/ticket/[registrationId]/tracks/[trackId]/tasks` | ticket-gated task board |
| `/events/[eventId]/enter` | access-code login |
| `/events/[eventId]/compete` | cookie-gated participant dashboard |
| `/events/[eventId]/tracks/[trackId]/tasks` | redirects signed-in registrant to their ticket tasks page |
| `/events/[eventId]/tracks/[trackId]/leaderboard` | leaderboard |
| `/events/[eventId]/mentors` | mentors |
| `/verify/[certificateId]` | certificate verify |
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

Slim left rail (`w-48`, `md:pl-52`) shared with vendor and department — same density as admin `AdminRail`. Nav items: Dashboard, Events, Analytics, Marketplace, Quotes, Designer, Ushers (hidden when the plan/club grant omits them). Profile + notifications in the rail.

| Path | Purpose |
| --- | --- |
| `/organizer/[organizer_id]` | index |
| `.../dashboard` | widgets |
| `.../events` | list (`?kind=hackathon\|event\|all`) |
| `.../events/create` | wizard (`?hackathon=1` pre-sets hackathon) |
| `.../events/[eventId]` | unified dashboard |
| `.../attendees` | roster; grouped default for hackathon or group registration |
| `.../staff` | event_staff; advanced positions need `teams_advanced_roles` |
| `.../access` | access engine; tiers/promos on paid events including hackathons |
| `.../agenda`, `.../agenda/create-agenda` | schedule + speaker picker |
| `.../speakers`, `.../speakers/create-speaker` | speakers + session picker |
| `.../vendors` | event vendor requirements |
| `.../sponsors` | orgs |
| `.../competitions` | hackathon tracks |
| `.../tasks` | Phases & Tasks |
| `.../teams` | hackathon teams |
| `.../submissions` | submissions |
| `.../scoreboard` | task-completion scoreboard |
| `.../settings` | hackathon_config apply-to |
| `.../certificates`, `.../certificates/making-template` | certs |
| `.../exports` | Excel/CSV including `hackathon_teams` |
| `.../tickets` | Hackathon → Attendees; else Access |
| `.../hackathon` | redirects to `.../events?kind=hackathon` |
| `.../hackathon/create` | redirects to `.../events/create?hackathon=1` |
| `.../hackathon/[eventId]/…` | redirects to matching `.../events/[eventId]/…` |
| `.../quotes` | quote inbox |
| `.../booking-details/[booking_id]` (+ `counter-offer`) | booking |
| `.../profile` | organizer profile + logo action |
| `.../notifications` | inbox |
| `.../chatbot` | AI assistant (`ChatBotClient.tsx`) |

Event section tabs are a slim horizontal strip in `src/app/organizer/[organizer_id]/events/[eventId]/layout.tsx`. When `events.requires_registration` is false, Attendees is omitted. There is no Tickets tab; paid SKUs and promos sit on **Access** (including paid hackathons; `promo_codes.track_id` can scope a code to one competition). Hackathons appear on the Events list (badge + `?kind=`). There is no separate left-rail Hackathon tab. Unified tabs add Competitions, Phases & Tasks, Teams, Submissions, Scoreboard, Settings when `eventIsHackathon`; missing `hackathon_ops` shows `LockedModulePanel`. `hackathonDashPath` returns `/organizer/{id}/events/{eventId}/…`. Regular group events use `registration_groups` + `registrations.group_id` and `GroupedAttendeeList` (not `hackathon_teams`). Occupancy: one team/group = one seat (`occupyingHackathonRegs` / `occupyingGroupRegs`). Agenda/speakers share `event_agenda_speakers`. Staff named positions + applicants need `teams_advanced_roles`. Scoreboard joins completions to `hackathon_tasks.track_id`. Exports kind `hackathon_teams` is two xlsx sheets. Public enter/compete unchanged. `assertOwnedEvent` allows `department_admin` via `canManageOrg`. Docs: `docs/10-events-and-hackathon-dashboards.md`.

### Vendor (`src/app/vendor/layout.tsx` → `DashboardNav`)

Nav: Dashboard, Quotes, Services, Bookings.

| Path | Purpose |
| --- | --- |
| `/vendor/[vendor_id]` | index |
| `.../dashboard` | home |
| `.../quotes`, `.../quotes/[quote_detail_id]`, `.../quotes/prep-quote/[prep_quote_id]` | quoting |
| `.../services`, `.../add-service`, `.../[service_id]/edit` | catalog |
| `.../bookings`, `.../bookings/[booking_id]`, `.../counter-offer` | bookings |
| `.../profile`, `.../notifications` | account |

### Admin (`src/app/admin/layout.tsx` → left `AdminRail`)

Chrome: ThemeToggle, email, sign out. Nav is a slim **left rail** (`w-48`, `src/shared_components/AdminRail.tsx`). Organizer, vendor, and department use the same slim `DashboardNav`.

| Path | Purpose |
| --- | --- |
| `/admin` | dashboard + Enter View (support preview links) |
| `/admin/orgs`, `/admin/orgs/[orgId]` | **Departments & clubs** — create/edit/delete (delete is owner-only; also removes Auth logins for department_admin/president) |
| `/admin/organizers`, `/admin/organizers/[organizerId]` | organizers — edit name/plan; owner can delete including Auth |
| `/admin/vendors`, `/admin/vendors/[vendorId]` | vendors — edit name; owner can delete including Auth |
| `/admin/events` | event moderation |
| `/admin/support` | tickets |
| `/admin/categories`, `/admin/category-requests` | taxonomy (**Seed defaults**); UI uses paper/ink/line tokens |
| `/admin/plans` | plan cards + Create/Edit modal (`PlansBoard`) |
| `/admin/tenants`, `/admin/tenants/new` | **Tenant accounts** — logins + plans |
| `/admin/admins` | **Platform staff** — `/admin` users only |

### Department

Layout: `src/app/department/layout.tsx` — same left `DashboardNav` as organizer. Reads: `src/features/department/department.service.ts`.

| Path | Purpose |
| --- | --- |
| `/department` | Home + plan banner (“You are on {plan}”) |
| `/department/events` | Own events + club events (public/read-only). Create/manage uses organizer event tools **with the department rail** (not organizer Dashboard/Marketplace). |
| `/department/marketplace` | Shown when the department plan includes `vendor_store` |
| `/department/analytics` | Club/event rollup |
| `/department/clubs` | Create club + president Auth login (`must_reset_password`); grant/revoke plan features per club or all clubs |
| `/department/clubs/[clubId]` | Read-only events, teams, announcements, requests + feature checkboxes |
| `/department/announcements` | Post to a club |
| `/department/requests` | Approve/reject club requests (view/download attachments) |

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
- **Chrome:** `DashboardNav.tsx`, `chrome/SiteHeader.tsx`, `chrome/AppFooter.tsx`, `home/*`
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
| `email.ts` | outbound email |
| `csv.ts` | CSV parse/export |
| `customFields.ts` | custom form helpers |
| `money.ts` | currency |
| `search.ts` | text search |
| `ui.ts` | class builders |
| `notifications.ts` + `.types.ts` | notification helpers |
| `access.ts` | access helpers (also duplicated under `/lib`) |

---

## Config and ops

- `next.config.ts` — console stripping in prod, package import optimize (`recharts`, `react-icons`, `lucide-react`), 50mb uploads, image hosts
- `src/proxy.ts` — auth middleware
- Windows: PowerShell often blocks `npm.ps1`. Use Command Prompt, `npm.cmd install`, or `install.bat` / `dev.bat`. Cursor terminal is set to Command Prompt in `.vscode/settings.json`. Node **>=20.9**.
- `tailwind.config.js` / `.json`, `postcss.config.mjs`, `eslint.config.mjs`
- `package.json` scripts: `dev`, `build`, `start`, `lint`, `setup:buckets`, `seed:owners`
- Cursor MCP: `.cursor/mcp.json` — hosted Supabase MCP for project `pfepncjkjamukhvsfwkx` (`docs`, `account`, `database`, `debugging`, `development`, `functions`, `branching`). Enable/login via Cursor CLI: `agent mcp enable supabase`, `agent mcp login supabase`, `agent mcp list`.
- Agent skills: `.agents/skills/supabase`, `.agents/skills/supabase-postgres-best-practices` (from `npx skills add supabase/agent-skills`; lockfile `skills-lock.json`).
- `seeding.js` — seed data
- `implementation_plan.md` — ticketing plan; first UI is `src/features/ticketing` + `/tickets` event tab
- `src/mockdata` — mock fixtures

Env (do not commit values): `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`, optional `PLATFORM_ADMIN_EMAILS`, `SAAS_OWNER_EMAILS` + `SAAS_OWNER_PASSWORD_N` (seed script only), `BREVO_API_KEY` + `MAIL_FROM` (tenant welcome email; without them a tenant password must be typed). Configure Auth redirects in the Supabase project.

---

## Implementation playbook

1. Read this file; jump to the owning **feature** and **route**.
2. Pages stay thin: load via `*Service`, mutate via `actions/*.action.ts`.
3. New Postgres tables: update the model/types **and** `TABLES` in `data/collections.ts`, plus a SQL migration.
4. New organizer event section: add page under `src/app/organizer/.../events/[eventId]/`, add tab in event `layout.tsx`, icon in `EventTab.tsx` if needed.
5. New dashboard nav item: `src/app/organizer/layout.tsx` or `src/app/vendor/layout.tsx` (`DashboardNav` items).
6. Anything Client Component needs: put types in a file with no `adminDb` import chain.
7. After shipping: update this document’s tables and **Change log**.

---

## Known gaps / planned

- Nested mega-event UI for `events.parent_event_id` can be expanded later; the column is stored and filterable.
- Attendee area has dashboard only (no profile/notifications routes; `attendee/layout.tsx` comments this).
- `event.status` vs derived lifecycle — prefer `eventLifecycle()` for UI badges.
- Filename typos to keep in mind when searching: `registeration.service.ts`, `anaylService.ts`, `event_venders.services.ts`.
- Remaining domain services still use the `adminDb` Postgres façade rather than hand-written SQL for every query.
- Firebase is gone (`firebase.json`, `firestore.rules`, `firestore.indexes.json` deleted). Do not re-add them.

---

## Change log

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
