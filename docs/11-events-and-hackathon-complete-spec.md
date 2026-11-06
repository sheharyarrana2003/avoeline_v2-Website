# Avoeline — Events & Hackathon: Complete System Spec

> **Organizer Google mail / Connections:** use [`docs/17-connections-system.md`](17-connections-system.md) + [`docs/18-email-send-limits-and-scheduling.md`](18-email-send-limits-and-scheduling.md). This file remains the source of truth for event/hackathon UI and tabs; do not treat its older email-connection notes as authoritative.

This is the single source of truth for the unified Event/Hackathon dashboard. It replaces `10-events-and-hackathon-dashboards.md` AND `10-events-and-hackathon-dashboards-v2.md` — stop reading those two, read only this one. Everything agreed across the UI/UX cleanup rounds is folded in here. When working on any one tab, you only need this file plus the actual code — don't also pull the two superseded docs into context.

---

## Part 1 — Architecture & Philosophy

**One event entity, two kinds of data.** Events and Hackathons are not separate systems. `isHackathon` is a flag on an event (true if format/type/title contains "hackathon," or the event already has `hackathon_tracks` rows). This flag controls which TABS are visible in one unified dashboard — it does not create a separate dashboard, layout, route tree, or event list.

- **One list**: `/organizer/{orgId}/events` shows everything, with a "Hackathon" badge chip and filter toggle. No separate hackathon list route.
- **One wizard**: one Create flow with an early "Is this a hackathon?" toggle that inserts a Competitions step when on.
- **One dashboard shell**: `/events/{eventId}` with one tab bar. Hackathon-only tabs render conditionally, gated by the `hackathon_ops` module.
- **Separate underlying entities where genuinely needed**: `hackathon_tracks`, `hackathon_teams`, `hackathon_tasks`, etc. stay as their own tables — the unification is at the UI/navigation layer, not forcing every domain object into one table.

---

## Part 2 — Global Design System Rules (apply to every tab, no exceptions)

These are the cross-cutting rules established across every cleanup round. Any new tab or feature built from here on must follow these by default — don't re-derive them per feature.

1. **"Add X" forms are buttons that open a modal, never a permanently-rendered form taking up page space.** This applies to: Add Competition, Add Phase, Add Task, Add Sponsor (exception: Sponsors' add form is compact enough to stay inline — keep as-is), Add Staff Position. If a form has more than ~4 fields, it opens in a modal with sectioned/divided groups, not one long flat scroll.
2. **Lists default to collapsed, expand on click (accordion-style, no navigation away).** Competitions, Phases, Tasks, Teams (when detail-heavy) all show a compact summary row by default; clicking expands in place. Don't render every nested detail open by default — this was the single biggest mess across every page reviewed.
3. **Every input has a real label above it, never placeholder-only text.** Placeholder text as the only label reads as broken/unfinished at a glance.
4. **File inputs get custom styling**, never the bare browser default (`Choose File / No file chosen` sitting unstyled). Build one reusable `<FileUploadField />` (button + filename + remove, with optional preview thumbnail for images) and use it everywhere: logos, competition images, challenge files, hint files, rules/problem statement documents, CSV uploads.
5. **Status/state badges are consistent pills everywhere** — same shape, weight, and color logic for CONFIRMED, ROSTER OPEN, paid/unpaid, active/inactive, etc. Don't let different tabs invent different badge styles for the same semantic meaning.
6. **Competition-scoping uses one consistent control**: a row of filter pills (or a dropdown where pills don't fit) with "All" as the default/first option, populated live from this event's `hackathon_tracks`. Used identically on: Phases & Tasks (competition filter), Teams (competition filter + stats), Scoreboard (competition pills), Access tab promo code scope. Build this once as a shared component, don't reimplement per tab.
7. **Search auto-expands and scrolls to matches**, non-matches stay visible but de-emphasized (collapsed), never hidden entirely — preserves context while narrowing focus.
8. **All cards share one rounded-xl / border / divider / spacing language**, matching what Overview already established as the baseline. Any tab that looks like "an earlier design pass" relative to Overview needs to be brought up to that same standard.
9. **Every multi-query page screen fires independent queries via `Promise.all`**, not sequential awaits (stat tiles + list + recent activity should load concurrently).
10. **Timestamps shown for fairness/audit purposes** (scoreboard, check-in logs, applicant status changes) show precise date+time to the second, available on hover/detail even if the primary display is relative ("12m ago").

### Marketing website (docs/19)

Public marketing lives in the `(marketing)` route group (`/`, `/plans`, `/about`, `/partners`, `/contact`, `/privacy`, `/terms`) with CMS editors under `/admin/website` gated by `WEBSITE_CAPS` (edit vs publish vs legal vs contact vs community). Live stats/partners/testimonials/FAQs hide when empty — **no invented metrics**. Consent rules: community list = `marketing_consents` only. Local Lighthouse gate: `npm run report:marketing` → `reports/marketing/` (+ `CHECKLIST.md`). Optional RLS smoke: `npm run test:sql:marketing` when `SUPABASE_DB_URL` is set (also an optional CI job).

---

## Part 3 — Tab-by-Tab Complete Spec

Tab order in the unified bar: **Overview · Attendees · Team · Access · Agenda · Speakers · Vendors · Sponsors · [Competitions · Phases & Tasks · Competitors · Submissions · Scoreboard · Settings — hackathon only] · Certificates · Exports**

---

### Overview

**Purpose:** At-a-glance event health. One implementation for every event, hackathon or not.

**Data:** `events` row, aggregated `registrations`/`hackathon_teams` counts for stats.

**Contents:** Hero (banner, title, status badge, tags, when/where/tickets/programme), stat cards (registrations or team registrations, seats/capacity, checked in, revenue), Schedule, Location, Recent registrations, Timestamps, Capacity, Registration window, Pricing & tickets, Certificate config, Description.

**UI/UX:** Dark hero card with gradient-blended banner image. Stat cards: icon in tinted circle, bold large number, muted label, consistent card weight across the row. Info sections: icon+title+divider header, tight label/value pairs, dashed-border designed empty states (not bare "No ticket tiers" text). One consistent card system across hero/stats/info sections.

**Capacity (fixed 2026-10-18):** Overview Capacity uses live occupying registration count for reserved seats; available = total − reserved when capacity is set.

---

### Attendees

**Purpose:** Every registration for this event — tickets, payment, QR, check-in. Not team/competition ops (that's Teams, hackathon-only).

**Data:** `registrations` (+ `custom_responses` keyed by `event_form_fields.key`), grouped via `registration_groups` (regular group events) or `hackathon_teams`/`hackathon_team_members` (hackathons) through one shared adapter into a common `{id, name, members}[]` shape. Organizer drawer answers come from field definitions (including archived fields that still have data); file answers use signed downloads from `payment-screenshots`.

**View modes:** Flat list (default, non-group events) / Grouped by team (default for group events and all hackathons) — toggle at top. **No separate "Teams" tab for regular group events** — this grouped view IS the team view for non-hackathon events. The hackathon `Teams` tab stays separate only because of its genuine extra ops complexity (join codes, cross-competition, leftover assignment).

**Stats (compute from full attendee set, not search subset):**
- Team/Group registrations: from `occupyingHackathonRegs`/`occupyingGroupRegs`
- People on list: non-cancelled registrations
- Checked in: `checkIn.checkedIn === true` OR status in (`checked_in`, `attended`) — not just status alone
- Pending: registered, not cancelled, not checked in
- Cancelled: `cancelled`/`rejected`/`no_show`

After check-in action: `revalidatePath` both Attendees AND Overview (shared occupancy/check-in tiles), plus `router.refresh()` so metric tiles update immediately without a hard reload.

**Search:** controlled input bound to `searchParams` (not uncontrolled — fix the "clear leaves `?value=` in URL" bug). Matches name, email, phone, registration id, team/group name, competition/track name, ticket tier, payment/registration status, custom-form answers.

**Filters:** compact pill row (not stacked full-width dropdowns), with removable filter chips below search + one "Clear all" action. Filters: registration status, payment status, check-in, competition/track. A filtered team stays visible if the team OR any member matches.

**Team card (collapsed):** name, competition, member count, ONE combined payment status, team amount, proof thumbnail + download, one access code (hackathons only, shown only once minted — no "code after pay+confirm" placeholder text). Fee badge and amount must never contradict (`mapFeeStatus` maps DB `unpaid` → `fee_pending`; `teamFeeDisplay` hides "No fee" when amount > 0).

**Team drawer (click header):** payment once, proof download, lead contact, team status — never per-member payment.

**Member drawer (click a member):** name/email/phone from system fields / profile, only form answers that have real values (drop empty placeholders; include archived fields when data exists; files as signed download links), competition name, check-in + personal QR, personal ticket URL. No price/proof/payment controls here. Restructure into two tabs: **Details** (ticket, check-in, form answers, QR, certificate) and **Communication** (send email + history) — not one long equal-weight stack. "Send email" is a clear action/button opening a focused compose state, not a permanently inline form.

**Solo attendees:** keep the current combined drawer including payment (no team to separate payment from).

**Export:** two-sheet workbook when the event has teams/groups — Sheet 1 (Teams/leads: name, competition, lead contact, member count, checked-in count, payment status, amount, public ticket URL, registration status, access code) + Sheet 2 (Members: all custom-form columns + name/email/phone/role/team/competition/check-in/registration id/personal ticket URL). Flat events: one sheet with custom-form columns + public ticket URL.

---

### Team

**Purpose:** Event-organizing ops (ushers, desk, leads) — never participant / hackathon occupancy teams. **One shared feature** with the organizer left-rail Teams page. Event tab label is **Team** (href `/staff` unchanged). Organizer library: `/organizer/{id}/teams`. Also `club` / `department` / `platform` scopes. Hackathon **Competitors** (`/teams`) is a different feature (`hackathon_teams`).

**Data:** `teams` (`event_staff` / `club_committee`), `team_members` (`source` manual|recruited; contact extras in `extra`), `team_positions` (paid), `recruitment_forms` (`public_token`, FormBuilder fields), `applicants` (incl. `withdrawn`), `access_grants` (`invite_token_hash`, `invite_sent_at`), `event_staff_assignments` (event scope). Stats RPC: `organizer_teams_stats`.

**Plan gating:** Basic = `teams_basic` (CRUD + single lead + export). Paid = `teams_advanced_roles` (Recruitment + Access tabs, positions, interviews, grants). Effective access = plan **and** `can(user, permission, scope)`. On Basic, paid tabs show `LockedModulePanel` (not empty chrome); advanced stats show `"—"`.

**Organizer UI (`OrganizerTeamsShell`):** Header — Add team (primary), Add member, Export. Stats row. Tabs **Teams | Recruitment | Access** (`?tab=&q=&team=&role=&access=&page=`). Teams tab: cards → side drawer (members, Edit/Remove/Make lead/Grant). Add team is a stepped Modal (team → lead → members → preview). Delete uses `ConfirmDialog` with impact. Recruitment (paid): FormBuilder forms list, applicants table/kanban, interview + onboard. Access (paid): grant list + Grant modal (presets + custom permissions, preview). Event `/staff` keeps assign-library + event-scoped recruitment via shared `TeamsManager`.

**Recruitment / apply:** Same event-creation `FormBuilder` + `CustomFieldsRenderer`. Public `/apply/[token]` (rate-limited, honeypot, ≥128-bit token); closed forms polite message; legacy `staff-apply` → token URL. Pipeline UI: Applied / Shortlisted / Interview scheduled / **Onboarded** (`accepted`) / Rejected / Withdrawn. Onboard creates member; interview/access emails use organizer connected account only (`requireConnectedSender` / `sendViaOrganizerConnection`) — **never platform Resend, never email passwords**. No connection → copy link / `.ics`, Connect email prompt.

**Permissions:** Catalog + presets in `src/lib/permissions.ts` (Registration lead, Marketing lead, Check-in desk, Viewer, …). `access_grants` hashed invite tokens; revoke immediate. Audit grant/edit/revoke.

**Uniques / indexes:** `(team_id, lower(title))` on positions; `(form_id, lower(email))` on applicants; `(team_id, lower(btrim(email)))` on members where email present.

**Export:** modal — all / selected teams / one form’s applicants; column picker; xlsx or csv; lead on every member row.

---

### Access

**Purpose:** Who can see/register for the event, plus pricing/discounts.

**Data:** `events.visibility`, `event_invites`, `ticket_tiers`, `promo_codes`, `promo_redemptions`, `event_form_fields`, `events.allow_group_registration` / `group_min_size` / `group_max_size`.

**Access type:** Public / Private / Invite only / Hybrid / VIP-Tiered — radio selection consolidated into one card with the approval/waitlist checkboxes and a single "Save access settings" button at the bottom (not visually disconnected).

**Registration questions:** `RegistrationQuestionsCard` on Access edits live `event_form_fields` (add / reorder / archive; system name/email/phone; payment screenshot locked when paid; group toggle writes allow_group + min/max). Soft-archive only — never hard-delete when responses exist.

**Add Guests:** Whitelist or Invite-only mode. Pasting addresses or uploading a CSV shows a validation preview before committing ("8 valid · 1 duplicate skipped · 1 invalid") — never a silent partial success. CSV path feeds the same preview as pasted addresses, with filename confirmation once chosen.

**Guest list:** visually distinguish whitelist entries (email/name/tier/registered) from invite-link entries (email/name/status: pending/opened/registered/expiry) — different lifecycles, different row shapes. "Opened" count only applies to invite-link entries.

**Tiers & Promos:**
- **Ticket Tiers: hidden entirely on hackathon events** (fees live per-competition, not on the event ticket) — show a note pointing to Competitions instead.
- Tiers get Active/Inactive toggle + optional "Available until" date. Once created, show as a real list (name, price, seats sold/available, active toggle, edit/delete) — not a permanent "No tiers yet."
- Promo codes get Expiry + Active toggle in addition to Code/Type/Value. **Scope dropdown is dynamic**: non-hackathon events default to/hide-as "Whole event"; hackathon events populate the dropdown with "Whole event" + one option per competition (live from `hackathon_tracks`), writing to `promo_codes.track_id`.
- Once created, show codes as a real list: code, type+value, scope (resolved competition name or "Whole event"), usage (`X/limit` or `X used`), **total discounted** (sum of `promo_redemptions.discount_amount`), expiry, active toggle, delete.
- Redeem via atomic `redeem_promo` RPC after registration/group insert; public form can `previewPromo` for original/discount/total.
- **Active auto-expires on read** (check `expires_at` whenever the list renders) — don't rely on a cron job that doesn't exist yet.

**Email delivery audit:** confirm whitelist adds and invite-link generation both actually trigger `sendEmail()` via Resend, not just a silent DB write. Confirm the full invite lifecycle (link → `opened_at` → `registered_at`/`registration_id`) works end to end.

---

### Agenda

**Purpose:** Session schedule.

**Data:** `event_agenda_items`, joined to speakers via `event_agenda_speakers`.

**Sync with Speakers:** adding/editing a session includes a multi-select "Speakers" field pulling from this event's existing Speakers roster — never free-text names. Writes to the shared join table so Speakers stays in sync automatically.

---

### Speakers

**Purpose:** Speaker roster.

**Data:** `event_speakers` (or equivalent), joined via `event_agenda_speakers`.

**Sync with Agenda:** adding/editing a speaker includes a multi-select "Sessions" field from this event's Agenda items, writing to the same join table as above. A speaker's card shows their linked session(s) inline. Editing from either side (Agenda or Speakers) keeps both views correct — one join table, two entry points.

---

### Vendors

**Purpose:** Vendor booking/marketplace interaction for this event. Unchanged from existing behavior — no outstanding cleanup items from this thread.

---

### Sponsors

**Purpose:** Sponsors, Collaborators, and Partners for this event (and, for hackathons, optionally dedicated to a specific competition).

**Data:** `event_sponsors_partners`.

**Type-adaptive form:**
- **Sponsor** (default): Name/Website/Logo/Contact, Tier, Contract Value, Benefits Owed.
- **Collaborator**: hide Tier/Contract Value/Benefits, show Role (Co-organizer / Full access / Track-limited) and, on hackathon events with a track-limited role, a competition selector scoping their dashboard access.
- **Partner**: Name/Website/Logo/Contact + Partnership Kind (Media/Venue/Community) only — no financial fields.
- Switching Type smoothly shows/hides the relevant fields.

**Logo:** real upload control (drag-and-drop/click), to the `sponsor-logos` storage bucket, with preview + remove/replace. URL paste stays available as a collapsed fallback option, not the primary path.

**Hackathon competition dedication:** Sponsor/Collaborator types get a "Dedicate to a competition (optional)" dropdown, populated from `hackathon_tracks`, writing to `event_sponsors_partners.track_id`. Hidden entirely on non-hackathon events.

**Benefits Owed:** chip/tag input (type + Enter to add a removable chip) instead of a newline-per-benefit textarea — preserve existing delivered/ticked-off state when benefits are re-edited.

**Sponsor income card:** once sponsors exist, add contract-value breakdown by tier, plus an overall benefits-fulfillment indicator ("12 of 20 delivered").

**Show on public page (required):** three switches on this tab (and on wizard Review) map to `events.show_sponsors` / `show_collaborators` / `show_partners` (default **false**). Logos never appear on `/events/[eventId]` until the matching toggle is on. Contract value, benefits, and contact stay organizer-only.

**Populated list:** card per sponsor/collaborator/partner — logo thumbnail, name, type badge, tier badge (sized/colored by tier, sponsors only), contract value (sponsors only), contact info, inline-checkable benefits list (no re-opening the edit form just to mark delivered), track-dedication label if applicable, edit/delete.

**Open item to verify:** whether a Collaborator's track-scoped dashboard access is actually enforced anywhere yet, or just stored and unread by the permission check.

---

### Public event page (`/events/[eventId]`, short `/e/[eventId]`)

**Purpose:** Guest-facing event surface. Never pass a raw `EventModel` or `select('*')` to the client.

**Data:** `getPublicEventView` in `src/features/events/publicEvent.service.ts` returns an allowlisted `PublicEventDto` (or gated / unavailable). Forbidden on the DTO: organizer contact, whitelist, meeting password/link, access codes, promo codes, bank/IBAN, attendee/team secrets, tasks/flags, sponsor contract/benefits.

**Access:** published + public → full DTO; private/invite → title + `AccessGate` until server-validated code/token (rate-limited); draft/archived/cancelled → unavailable for guests; owner/staff/dept/club/support → full + Admin preview banner.

**Layout:** hero (Share + .ics only here); desktop two-column sticky Register / mobile Register first; facts (no truncated venue/date); Register card without shareable link; form fields from `event_form_fields` (seed defaults if empty); about/gallery/video; tiers + automatic discounts only; agenda; speakers; competitions; sponsors strips only when toggles on; footer organizer chip + Report. SEO: `generateMetadata`, OG, schema.org Event JSON-LD, `loading.tsx`.

---

### Competitions *(hackathon only)*

**Purpose:** Define the tracks/competitions under this hackathon.

**Data:** `hackathon_tracks`, `hackathon_track_prizes`, `hackathon_judges`, `hackathon_mentors`, `hackathon_announcements` (`hackathon_mentor_slots` dropped 2026-10-12).

**Timing (timestamptz UTC):** optional `registration_closes_at`, `roster_locks_at`, `opens_at`, `submission_deadline_at`, `closes_at`. UI uses `datetime-local` in the event timezone with the zone label; server validates order when set (`registration_closes ≤ roster_locks ≤ opens ≤ submission_deadline ≤ closes`). Phase opens/closes use the same helpers.

**Instructions:** sanitized rich text + optional attachment on the competition modal (`instructions`, `instructions_file_*`); shown on the participant Instructions tab.

**Add/Edit:** button opens a modal (not a permanent form), sectioned: Basics (name, description, type, image upload via `<FileUploadField />`), Team & Timing (min/max size + datetime fields above), Pricing (entry fee, dedicated sponsor, discount %/expiry/note), Prizes (structured, see below), Instructions, Rules (rules text + file upload).

**Table:** small consistent thumbnail (48–64px square, not a banner-sized image breaking row height), Track/Teams/Fee/Deadline/Roster/Actions columns, ROSTER OPEN as a consistent status pill.

**Configure → track management page:** roster, fee status, unlock, judging — operational management only. **No settings/config-toggle controls here** — all hackathon-wide config lives exclusively on the Settings tab (apply-to-all-or-tick-specific-competitions pattern). If something only existed on the old Configure settings page with no Settings-tab equivalent, add it to Settings scoped per-track via `hackathon_config.track_id`, don't leave it orphaned on Configure.

**Structured prizes:** `hackathon_track_prizes` table (position_label as free text — "1st"/"Best Design"/etc., amount, description, order_index), repeatable "Add another prize" rows, plus a separate optional "Additional prize notes" free-text field for anything that doesn't fit a clean row. Shown on the public competition page and the track management page, not buried in the edit form only.

**CTF flags/hints/challenge files:** live on Phases & Tasks (see below), not in the Competitions form — a "Manage flags & challenge files →" link deep-links from a CTF-type competition's row into Phases & Tasks, pre-filtered to that competition.

**Judges, Announcements, Online mode, Mentors:** functionally fine as built — just bring visual consistency (card header/divider styling, confirmed field labels) in line with the rest of the dashboard.

---

### Phases & Tasks *(hackathon only)*

**Purpose:** Define phases and their tasks per competition, including CTF-specific flag/hint/file handling.

**Data:** `hackathon_phases`, `hackathon_tasks`, `hackathon_task_completions` (read-only here), challenge/hint files in a dedicated storage bucket (`hackathon-challenge-files`).

**Structure (collapsed by default — this was the single biggest mess in testing):**
- Competition filter pills ("All" default) + search bar at top, per the global competition-scoping rule.
- "All competitions" shows one collapsed row per competition (phase count, task count, submitted count); picking one shows that competition's phases as collapsed rows.
- Each phase row collapsed: name, date range, task count/progress. Click to expand in place (accordion) — shows task checklist + "+ Add Task" button for that phase. Multiple phases can be expanded at once.
- Independent tasks (no phase) get their own collapsed section per competition, same expand pattern.
- Search auto-expands and scrolls to matches; non-matches stay collapsed, not hidden.

**Add Phase:** button → modal (Competition selector, "apply to every competition" checkbox, Name, Opens, Closes).

**Add Task:** button on each phase card → modal pre-scoped to that phase (separate "+ Add Independent Task" at competition level for phase-less tasks). Fields adapt by competition type: standard gets Title/Points/Brief; CTF additionally gets Description, Flag (hashed server-side on save, never exposed to client), Challenge File upload (any format, size-capped — see below), repeatable Hint rows each with optional Hint File.

**File handling:** every file input uses the shared `<FileUploadField />` component, never the bare browser control. Max attachment size configurable on hackathon settings (default 10MB), enforced client-side (reject + clear error before upload) AND server-side (Storage policy/Edge Function check) — storage cost stays predictable. Flag values and hashes never reach the client in any form.

---

### Teams *(hackathon only)*

**Purpose:** Cross-competition team ops — join codes, roster management, leftover-member assignment. This is NOT a duplicate of Attendees' grouped view; it exists because hackathons have real extra complexity Attendees can't carry.

**Data:** `hackathon_teams`, `hackathon_team_members`.

**Filtering:** competition filter pills ("All" default, one pill per competition) drive BOTH the team list below AND the three stat cards (Tracks, Team Registrations, Submitted) — selecting a competition recomputes all three to that competition's scope, not just filtering the visible rows.

**Row:** team name, competition · member count · join code as a distinct monospace pill (not plain inline text), small identity avatar/icon, single "Manage" button (no redundant second link to the same destination — remove any duplicate "Competition" link once confirmed it points nowhere new).

**Stats audit:** confirm Team Registrations counts exclude cancelled/rejected teams; confirm Submitted checks `hackathon_submissions` existence per team, not an unrelated field like fee_status.

---

### Submissions *(hackathon only)*

**Purpose:** Per-task submissions for organizer review (final project submissions stay separate).

**Data:** `hackathon_task_submissions` (`status`: submitted|accepted|rejected|late); private bucket `hackathon-submissions`. Final project remains on team/`hackathon_submissions` path.

**UI:** Competition pills, phase/task/status filters, team search, date range; table with team, competition, phase, task, type, `submitted_at` to the second, status. Row opens preview drawer (images/PDF/text only — never HTML/SVG inline); otherwise short-lived signed download with attachment disposition. Review: accept/reject/note/points. Export CSV.

---

### Scoreboard *(hackathon only)*

**Purpose:** Live, auditable ranking per competition.

**Data:** `hackathon_scores`, `hackathon_task_completions`, aggregated per `hackathon_team_id` scoped strictly to the selected `track_id`.

**Main table (not a flat list):** Rank, Team Name, Points, Tasks Solved (`3/8`), Phases Completed (`2/3`), Last Submission (relative time with exact stamp to the second on hover), expand chevron. Sorted by points descending; **tie-break:** more tasks solved, then earlier last solve (caption on the board). Competition filter pills drive which competition's board is shown. 15-second live refresh. Aggregation is isolated per `track_id` (see unit test).

**Per-team expanded detail (click row, accordion):** phase-by-phase completion with exact timestamp (to the second); task-by-task table (task name — deep-links to its Phases & Tasks definition —, points available, solved y/n, points earned, exact solve timestamp); "First blood" badge for first-to-solve per task (cheap to compute from existing timestamps).

**Known gap to flag, not fabricate:** hint-usage-per-task tracking does not currently exist in the data model. Note it as a gap when building this tab rather than inventing fake data — worth a follow-up decision on whether to add it given its fairness impact.

**Correctness requirement (carried from earlier audit):** the points-aggregation query must be fully isolated per `track_id` — verify no join leaks another competition's completions into a team's total, and the 15s refresh only re-polls the selected competition.

**Empty state:** when a competition genuinely has zero solves, show a clear message ("No submissions yet — scores will appear as teams solve tasks"), not a flat zero row indistinguishable from a loading/broken state.

---

### Settings *(hackathon only)*

**Purpose:** The single control surface for every configurable hackathon behavior.

**Data:** `hackathon_config` (flexible key-value: `track_id` nullable = applies to all, or ticked specific competitions).

**This tab already works correctly** — one settings list, each `config_key` toggled on/off with "apply to all competitions" or "tick specific ones." This is the model every other per-competition setting should follow; it should never be duplicated as a second settings surface anywhere else (specifically: not on the Competitions tab's Configure/track page — see that section above).

Config keys in use: `live_scoreboard`, `ctf_flags`, `task_hints`, `per_task_timer`, `hackathon_timer`, `random_tasks`, `task_categories`, `docker_sandboxing` (**Not active yet**), `day_wise_calendar`, `day_wise_tasks`, `link_submissions` (domain allowlist), `daily_shifts` (**Not active yet**), `team_attendance`, `activity_check_interval`, `anti_cheat_tab_close` (flagged signals only — never automatic punishment), `phased_structure`, `phase_lock_no_revisit`, `team_collaboration`.

**Enforcement:** server-side via `getEffectiveConfig(trackId)` (event-wide `track_id` null overridden by track row). Matrix: [`docs/hackathon-settings-matrix.md`](hackathon-settings-matrix.md). Settings UI lists which competitions have each toggle and warns on conflicts (e.g. per-task timer with no tasks).

---

### Certificates

**Purpose:** Issue/verify certificates. Same UI for every event regardless of `isHackathon`, gated by the `certificates` module.

**Templates:** Versioned JSON layouts (`certificate_templates` + immutable `certificate_template_versions`). Konva editor at `making-template`: draft autosave, publish bumps `version`, gallery seeds, token insert (`{{recipientName}}`, `{{field:<key}}`, etc.), curated fonts, `email_attach_pdf` toggle, “Re-render all with latest” (updates `template_version` on issued rows only — no stored PDFs).

**Issue:** Bulk insert certificate rows only (`data` jsonb + `verification_code` / `certificate_number`). Lazy render on download/verify/email. Cap + rate limit. One cert per registration (team members each get their own).

**Render:** Layout JSON → SVG (web/verify/preview) and pdf-lib PDF (no Chromium). Never persist rendered PDFs. Private storage holds **template assets** only (logo/signature/background).

**Surfaces:**
| Surface | Path |
| --- | --- |
| Mobile/data | `GET /api/certificates/[id]` → `{ templateLayout, version, assets, data }` + `ETag` / 304 |
| PDF download | `GET /certificate/[code]/download` by `verification_code` |
| Public verify | `/verify/[code]` (legacy UUID redirects to code when resolvable) |
| Email | Default link to download; optional in-memory PDF attach when `email_attach_pdf` |

**No blockchain / IPFS / NFT / stored certificate PDFs.**

---

### Exports

**Purpose:** Download structured data about the event.

**Kinds:** Attendee list (two-sheet when teams/groups exist, per the Attendees spec above), Check-in log, Financial summary, Sponsors and partners, and (hackathon events, now included since Exports is part of the unified dashboard) the Hackathon team export — two sheets: Team summary (team name, competition, member count, registration status, payment status, access-code-revealed status, submitted y/n) + Member detail (team name repeated, member name/email/phone, is_lead, individual registration status, checked-in + timestamp, custom-form answers).

---

## Part 3A — Organizer home (Dashboard, My Events, Analytics)

Shared rules across these three pages (cleanup 2026-10-25):

- **Primary CTAs** use ink `buttonClass("primary")` from `src/lib/ui.ts` — not indigo `@/components/ui/Button`.
- **Registration occupancy** matches the Attendees tab: one team/group booking = one unit via `occupyingHackathonRegs` / `occupyingGroupRegs` (`src/features/registration/occupancy.ts`). Revenue counts payment once per occupying registration.
- Parallel loads via `Promise.all` + batched `.in()`; designed empty states / skeletons.

### Dashboard — `/organizer/{id}/dashboard`

- No plan banner here (plan block lives on **Profile**). Welcome header; Create event + Chat with AI.
- Tiles: Registrations (occupancy + “N teams · M people” or active-events sub-line), Active events, Revenue, Avg rating as `—` when no reviews.
- Body: Today’s schedule | Upcoming (EventThumb) | chart **Registrations this week** | Recent registrations (latest 8 occupying rows; team/group collapsed; never `"Unknown attendee"`; row → Attendees `?team=`).
- Derive: `src/features/dashboard/dashboardDerive.ts` + `AnalyticsService.getDashboardData` (`anaylService.ts`).

### My Events — `/organizer/{id}/events`

- Header “My Events” with `{live} live · {archived} archived`.
- `EventThumb` supports `showTitle={false}` so list cells do not double-render the title beside `CellStack`.
- URL toolbar (`organizerEvents.filters.ts`): `kind`, `status`, `q`, `sort`, `view`, `page` (20/page); chips + Clear all.
- List/grid: occupancy `N / capacity`, checked-in, revenue; Manage + public eye + ⋯ (Duplicate / Archive / Delete with typed-title confirm when regs > 0).
- Occupancy bundle: `organizerEvents.stats.ts` (one regs query + batched teams/groups).

### Analytics — `/organizer/{id}/analytics`

- URL filters: `range=7|30|90|year|all|custom` (default 30), `event=<id>`, custom `from`/`to`. Export xlsx (tiles + daily series + event table).
- Tiles vs previous period; chart uses **local** day keys, full series (no 8-point downsample ≤90 days; weekly beyond); stacked top-5 + Other.
- Event performance table (thumb, type, regs, check-in, satisfaction, revenue, costs, net); row sets event filter.
- Feedback: ticket form → `reviews` + `feedback_submitted`; Gemini analysis (`GEMINI_API_KEY` / `GEMINI_MODEL`) with zod schema, PII strip, cache table `feedback_analyses`, ≤5 refresh/day/organizer, ≥3 comments; no-key fallback (distribution / avg / words). Pure helpers: `analyticsDerive.ts`, `geminiFeedback.ts`.
- Dev seed: `npm run seed:feedback` (refuses production).

---

## Part 4 — Registration & Public Flows

**Form engine:** Definitions live in `event_form_fields` (not hardcoded name/email/phone on the public form). System seeds: `name`, `email`, `phone` (+ `payment_screenshot` when paid). Types: text/textarea/number/email/phone/url/date/dropdown/radio/checkbox/file. Scope `per_member` | `per_group`. Public UI renders via `CustomFieldsRenderer`; validation via `buildRegistrationSchema` (zod + honeypot `website`). When group registration is allowed, public form offers an optional **Register as a team** checkbox (solo default). File fields use signed upload to `payment-screenshots` under `registration/{eventId}/…` (`requestRegistrationUpload`). Rate-limited register. Duplicate email → clear error. Drawer/export columns: active fields + archived fields that still have answers.

**Wizard create:** Draft fields in form state → `create_event` writes group columns, `seedDefaultsForEvent`, inserts non-system custom fields, `syncPaymentField`.

**Regular event, single registration:** Browse/link → access gate if required → registration form (all fields from definitions) → optional promo preview → ticket/QR at `/events/{eventId}/ticket/{registrationId}`. After the event, the ticket page offers a minimal feedback form (rating 1–5, comment, optional tags) → `reviews` + `registrations.feedback_submitted` (rate-limited; once per registration).

**Regular event, group registration:** Browse/link → access gate → group name (lead) → per-group questions once → Add member (per-member questions) up to max → ONE payment screenshot for the whole group if paid (`payment_screenshot` / per_group file) → each member gets their own registration row (via `registration_groups`) and their OWN ticket/QR → promo redeemed once against `group_id` → no team access code, no compete workspace.

**Hackathon:** Browse/link → pick competition → team name (lead) → per-team + per-member questions, add members up to max → ONE payment screenshot for the team if paid → ONE team access code (emailed to lead only) → `/events/{eventId}/enter` → `/events/{eventId}/compete`.

**Participant dashboard (`/enter` → `/compete`):** `getParticipantAccess` returns friendly reason codes (payment pending, waitlisted, competition not open with countdown, etc.). Code exchange → short-lived httpOnly team cookie (lockout/backoff + failure audit). Workspace tabs: Instructions, Phases & Tasks, Scoreboard (if enabled), Submissions (own team), Team; Active rules panel; first entry requires rules acknowledgement. Heartbeat / tab-visibility only when settings on. Scoreboard is read-only and highlights the participant's team.

**Who gets automatic email (all flows):** team/group registration → lead only (not extra members — they still get their own certificate email later, just not the registration confirmation). Solo → the attendee. Access code → lead only.

**Automatic email kinds (organizer-editable per event via `event_email_templates`):** `registration_received` (submitted, not yet admitted/paid) and `registration_confirmed` (confirmed + paid, or free+auto-confirm skips straight to confirmed). Fired from one shared helper across every admission path (initial register, payment verify, waitlist promote) to avoid double-sends. Tokens: `attendeeName`, `eventTitle`, `eventWhen`, `eventVenue`, `teamName`, `teamMembers`, `competitionName`, `ticketUrl`, `paymentStatus` — unknown tokens render empty, all values HTML-escaped.

**Send limits & scheduling (docs/18):** Organizer outbound mail uses Connections capacity — rolling 24h provider limit (Gmail 400 / Workspace 1500), plan daily/monthly caps, 20% reserve for time-sensitive kinds (`registration_confirmed`, ticket, access code, interview/guest invite). Bulk compose shows `CapacityStrip`; overflow opens a capacity dialog (send-now + schedule, selection cap, spread days, cancel). Batches live at `/organizer/[id]/settings/email-batches`; minute cron `/api/cron/email-outbox` drains `email_outbox` with priority, per-minute throttle, send-time revalidation, and Google rate-limit circuit breaker. Non-transactional mail gets organizer-scoped unsubscribe → `email_suppressions`. Admin edits plan caps on PlansBoard and per-tenant overrides/pause on Tenants → Email.

---

## Part 5 — Plan Gating Reference (full list, see `04-organizer.md` for the canonical source)

| Free (Foundation) | Paid (per module_key) |
|---|---|
| Events Dashboard, AI Planner, Analytics (basic), Registrations, Access control, Sponsors (basic management), Teams (basic CRUD: add/remove, single Lead) | Teams advanced roles (`teams_advanced_roles`), Vendor Store, Certificates, API access, Website Builder, AI Designer, Ushers/on-ground ops, Sponsors invoicing with custom templates |

Hackathon-specific: the whole hackathon tab set (Competitions/Phases & Tasks/Competitors/Submissions/Scoreboard/Settings) is gated behind `hackathon_ops` as a single module — Overview/Attendees/Team/Access/Agenda/Speakers/Vendors/Sponsors/Certificates/Exports work normally on a hackathon event even without it.

---

## Part 6 — Known Bugs / Audit Items Still Open

Carry these forward until explicitly resolved — don't let them silently drop out of scope just because the UI around them got cleaned up:

1. ~~Overview Capacity section: `TOTAL SEATS 0` / `AVAILABLE SEATS 0` but `RESERVED SEATS 10`~~ — **Closed (gap pass 2026-10-18):** Overview uses live occupying registration count for reserved; available = total − reserved when total > 0, else "Not set" / "—".
2. ~~Team card fee display: "NO FEE" badge shown alongside a real amount~~ — **Closed (gap pass 2026-10-18):** `mapFeeStatus` maps Postgres `unpaid` → `fee_pending`; `teamFeeDisplay` still suppresses "No fee" when amount > 0.
3. ~~Staff page: duplicate position/applicant rows~~ — **Closed (Phase 6):** deduped + unique `(team_id, lower(title))` / `(form_id, lower(email))`.
4. Red "N · 1 Issue ×" overlay pill in screenshots — **Closed (Phase 10):** treated as Next.js / browser extension overlay, not product UI; not present in shipped chrome.
5. Scoreboard hint-usage timestamp fairness — **Explicitly deferred (Phase 8–9):** hint-used flag only; no reveal timestamp. Keep gap note on LiveScoreboardTable.
6. ~~Sponsors: Collaborator track-scoped dashboard access~~ — **Closed (Phase 4):** collaborators no longer get dashboard access via Sponsors; contribution + collaboration terms only. Team grants stay in Phase 6 / Staff.
7. ~~Create competition timestamptz slash-date failure~~ — **Closed (Phase 8):** `fromEventLocalInput` + ordering validation.
8. ~~Open certificates SELECT / notifications INSERT~~ — **Closed (Phase 10 re-audit):** deny-default certificates; notifications insert self-only.
9. ~~Compete cookie secret fallback~~ — **Closed:** `HACKATHON_COMPETE_SECRET` required via `requireCompeteSecret`.

---

## Part 7 — File/Data Placement Quick Reference

| Concern | Lives in |
|---|---|
| Event core data, `parentEventId` tenancy, `isHackathon` flag | `events` |
| Category taxonomy | `event_categories` (super_category / event_format rows) |
| Access control | `events` visibility fields, `event_invites` |
| Pricing (non-hackathon) | `ticket_tiers`, `promo_codes`, `promo_redemptions`, RPC `redeem_promo` |
| Pricing (hackathon) | `hackathon_tracks.fee`/discount fields, `promo_codes.track_id` for competition-scoped codes |
| Registration form defs | `event_form_fields` (+ `events.allow_group_registration` / min/max); legacy `custom_form` kept for rollback |
| Regular event groups | `registration_groups` (thin — no join codes/locks) |
| Hackathon teams | `hackathon_teams` (rich — join codes, locks, track scoping) |
| Agenda/Speaker sync | `event_agenda_items`, `event_speakers`, join table `event_agenda_speakers` |
| Sponsors/Collaborators/Partners | `event_sponsors_partners` (sponsor `track_id` dedication; collaborator `contribution_*` + `collaboration_terms`; partner `partnership_kind` + `partner_types`) |
| Own vendors | `event_external_vendors` |
| Event expenses | `events.budget_total`, `event_expenses`, RPC `event_expense_totals`, bucket `expense-receipts` |
| Team / Teams (shared ops) | `teams`/`team_members`/`team_positions`/`recruitment_forms`/`applicants`/`access_grants`/`event_staff_assignments`; public `/apply/[token]`; RPC `organizer_teams_stats` |
| Phases/Tasks/CTF | `hackathon_phases`, `hackathon_tasks`, `hackathon_task_assignments` (+ legacy CTF tables); challenge files in `hackathon-challenge-files`. Dropped unused: `solo_participants`, `hackathon_mentor_slots`, `hackathon_team_phases`, `badge_meetup_attendees` (2026-10-12 schema opt). |
| Scores | `hackathon_scores`, `hackathon_task_completions` — always joined/filtered by `track_id` |
| Prizes | `hackathon_track_prizes` (`amount` is text today — schema pass may tighten) |
| Config toggles | `hackathon_config` (flexible key-value, `track_id` nullable = event-wide; track overrides via `getEffectiveConfig`); older `hackathon_settings` row is INVESTIGATE vs config |
| Per-task submissions | `hackathon_task_submissions` + private bucket `hackathon-submissions`; team task links via `hackathon_task_assignments` |
| Final project | Prefer clarifying in schema pass: `hackathon_submissions` table vs `hackathon_teams.extra.submission` |
| Compete monitoring | `team_activity_pings`, `team_integrity_events`, `hackathon_team_task_starts`, `compete_access_failures` |
| Category fields (debt) | Both IDs (`super_category_id`, `event_format_id`) and strings (`event_type`, `format`, `category`) exist — single SoT TBD |
| Analytics counters | materialized view `mv_event_registration_counts` (refresh hourly / after bulk jobs) |
| Email templates | `event_email_templates` (per-event, falls back to code defaults if no row exists) |
| Certificates | `certificates` (`data` jsonb), `certificate_templates` (layout/assets/status/`email_attach_pdf`), `certificate_template_versions`; on-demand PDF/SVG; no blockchain |

---

## Part 8 — SaaS owner / platform staff

Canonical admin product rules (Phase 2). Prefer this over older “Enter View” / impersonation notes.

### No impersonation (S9)

- Platform staff work only inside `/admin/*`. There is no Enter View into organizer/vendor/department shells.
- Tenant layouts may still bounce suspended accounts; admins do not deep-link into foreign dashboards as a product path.
- Oversight destinations are admin detail routes only.

### Detail routes

| Route | Behavior |
| --- | --- |
| `/admin/organizers/[organizerId]` | Read/edit organizer standing; no live-dashboard CTA |
| `/admin/departments/[id]` | Editable department profile, clubs, events, tenure, status |
| `/admin/clubs/[id]` | Read-only club profile (owner cannot rename clubs) |
| `/admin/vendors/[vendorId]` | Full vendor dossier + status-only Approve/Reject/Suspend/Reinstate |
| `/admin/orgs/[orgId]` | Redirects by `org_type` to department or club detail |
| `/admin/support/[ticketId]` | Ticket thread + attachments |
| `/admin/audit` | Global `moderation_logs` explorer |

Clubs list under Departments & clubs is grouped by department. Manage → club detail, not “Create club committee”.

### Public event status

- Visitors always load an existing non-draft event. Completed / cancelled / archived show a status banner; Register is disabled when not open.
- Draft → public 404 unless authenticated owner/organizer or platform admin preview.
- Unpublish moderation sets status `draft` (same preview rules).

### Vendor statuses

Postgres: `pending | approved | suspended | rejected`. App maps legacy `active` → `approved` on read; never write `active`. Approve only when pending.

### Support threads

- Tables: `support_ticket_messages`, `support_ticket_attachments`; private bucket `support-attachments` (≤10MB, signed URL ≤5m).
- Admin and requester reply on the thread; other party notified in-app + email.
- Status help: Open / In progress / Resolved; requester may reopen.

### Staff view / manage

- `users.admin_permissions` encodes `area:view` | `area:manage` per admin area.
- Owner = all areas. Staff = grants only (`can()` must not short-circuit all `platform_admin`).
- Route entry: view. Mutations: manage. Same list/detail components; hide manage actions when view-only.

### Admin Events moderation (`/admin/events`)

- Tabs: **All events** · **Flagged** (amber count when open reports &gt; 0) · **Moderation log**.
- Filters live in the URL (`tab`, `q`, `pub`, `timing`, `access`, `cat`, `from`/`to`, `org`, `dept`, `hasRegs`, `sort`, `cursor`, plus log/flagged cursors). Publication and Timing are separate multi-selects.
- Table uses `EventThumb` size `wide` (16:9) with category gradient + letter fallback when `banner_image` is empty/broken. Actions: View (`/e/[id]`), Moderate (modal), ⋯ menu — **no** per-row reason/unpublish forms.
- Moderate modal: Unpublish / Restore / Remove (owner + title confirm). Reason ≥10 chars; optional notify (in-app + platform email). Unpublish sets `events.moderation_unpublished` and marks open reports `actioned`. Toast Undo (10s) calls restore.
- Permissions map: `events:view` → `holdsArea(..., "events")`; `events:moderate` → `canManageArea`; Remove → `isOwner`.
- Flagged aggregates open `event_reports` (created from public `ReportEvent`). Public reports: one per email/IP key per event per day.
- Code: `eventModeration.{types,filters,service}.ts`, `components/events/*`, `actions/events.action.ts`.

### Plans / categories

- Plans modal: max-h 90vh, scrollable body, sticky footer; currency select PKR/USD/EUR/GBP/AED/SAR; `formatCurrency`.
- Category custom fields + checklist modals: inline help + organizer-facing preview.

---

## Part 9 — Department / clubs / tenures / announcements

Canonical department portal rules (Phase 3). Prefer this over older password-on-create and date-only tenure notes in `02-department.md`.

### Events

- `/department/events` uses shared `ScopedEventsTable` (`EventThumb`, lifecycle badge, dates, registrations).
- Filter chips: All / Department / each club. Row → public `/events/[id]` (status banners from Part 8). Manage remains available for department-owned events only.

### Clubs

- Header actions (two-step modals): Add club + President, Grant/revoke access, Add tenure.
- President onboarding: Supabase **invite link** emailed via Resend — **never** a password (S11).
- Club cards: logo, name, president, current tenure, event count, status.
- Club detail tabs: Overview, Events (read-only cards), Teams (selected tenure), Tenures, Budget.

### Tenures

- `org_tenures` per **club**: exactly one `is_current` (partial unique index); no overlapping date ranges (`btree_gist` exclusion).
- `events.tenure_id` set to the club’s current tenure at create; department may patch.
- `teams.tenure_id` scopes committee teams; `start_org_tenure` RPC closes current, opens new, optionally copies roster as draft.
- `/department/tenures` aggregate selector (Ongoing + history); past = read-only.
- Analytics supports a tenure filter.

### Announcements

- Compose with audience (`all_clubs` | `selected_clubs` | `presidents_only` | `all_members`) and channels (`in_app` | `email`).
- Recipients resolved server-side; cap 500; rate-limited per department.
- `announcement_deliveries` log with expandable recipient rows; deep link opens the announcement.

---

## Part 10 — Event location, emails, access help, orgs, vendors, expenses

Shipped Phase 4. Prefer this over older Collaborator/Partner bullets elsewhere in this file.

### Location

- No lat/lng columns. `events.coordinates` dropped; `map_url` renamed to `maps_url` (https share links only).
- Wizard: Venue, Address, City, Country, Google Maps link + hint. Validate https on save (`src/lib/mapsUrl.ts`).
- Public + Overview: **Open in Maps** when set; iframe embed only for Google embed URLs. CSP report-only includes `frame-src` for Google/OSM.

### Attendee emails

- Entry points: **Email these results** and **Registration emails** modals (not inline cards).
- Tokens insert menu, include checklist, sandboxed HTML preview (server-built), confirm before bulk send.
- Recipients resolved server-side from roster filters; rate-limited bulk send.
- Free events hide payment UI/tokens. Resend test-sender banner when From is `onboarding@resend.dev`.

### Access help

- Collapsible **How access works** on Access tab; sample CSV `email, name, tier` (copy + download).
- Tooltips on access types; guest list legend (whitelist vs invite statuses).

### Sponsors / Collaborators / Partners

- **Sponsor:** tier, contract value, benefits (unchanged); optional competition dedication.
- **Collaborator:** contribution kind (+ custom) and required collaboration terms. No role / track dashboard access.
- **Partner:** expanded kinds + custom `partner_types` per organizer with definitions list.

### Vendors

- Marketplace bookings + **Add my own vendor** (`event_external_vendors`). Badges Marketplace / Own.
- Shortcut: create expense prefilled with `external_vendor_id`.

### Expenses

- Tab after Sponsors: `.../events/[eventId]/expenses` (free all plans; staff `page_expenses` / `expenses:manage`).
- `events.budget_total` + `event_expenses`; totals only via RPC `event_expense_totals` (no client math).
- Receipts in private `expense-receipts` (signed URL ≤5m). xlsx export via existing sheet util.

---

### How to use this file in Cursor

Reference this whole file when touching any tab in the unified dashboard — it's dense by design so one file covers the whole system instead of needing six. If a change here conflicts with something already built differently, flag the conflict rather than silently picking one side; several of the items in Part 6 exist precisely because earlier passes didn't do that.
