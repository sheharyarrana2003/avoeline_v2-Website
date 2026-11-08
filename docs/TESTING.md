# End-to-end testing walkthrough

Follow the steps in order: each role builds on data the previous step created. Test in an incognito window (browser extensions inject attributes into `<body>` and cause hydration warnings), and use a separate incognito window or browser profile per role so sessions don't collide.

Start the app with `npm run dev` and open http://localhost:3000.

---

## 0. One-time setup: SaaS owner accounts

1. Open `.env.local` and fill in the two passwords (at least 8 characters). Never commit this file.

   ```
   SAAS_OWNER_EMAILS=sheharyarshahzad628@gmail.com,aroxes.group@gmail.com
   SAAS_OWNER_PASSWORD_1=...
   SAAS_OWNER_PASSWORD_2=...
   ```

   Password 1 belongs to the first email and password 2 to the second.

2. Run `npm run seed:owners`. For each email it creates the Supabase Auth user (or resets its password if it already exists), marks it confirmed, and writes a `users` row with `user_type = platform_admin`, `is_owner = true`, and every admin area. It never prints the passwords.
3. Re-run it any time to reset a forgotten owner password.

Optional: set `BREVO_API_KEY` and `MAIL_FROM` so new tenants receive their temporary password by email. Without them, you must type a password for each tenant yourself (step 1.4).

---

## 0a. Full data wipe (delete only)

Deletes **all** public table rows, Storage objects, and Auth users (including SaaS owners). Does **not** export or move data; schema and Storage bucket shells stay. Irreversible.

```
# PowerShell
$env:CONFIRM="YES"; npm run reset:wipe-data
npm run seed:owners
```

Then sign in at `/admin/signin`, Seed defaults on `/admin/categories` if empty, check `/admin/plans`, optional `npm run seed:demo`.

---

## 0b. Demo seed (capped lists)

Fills Auth + dashboards with **up to `DEMO_SEED_CAP` of each list** (default **2**): departments, clubs, organizers, vendors, attendees, events, speakers, agenda, registrations, tracks, teams, vendor packages, bookings. Safe to re-run. Use `DEMO_SEED_CAP=5` for the older fuller cast.

```
npm run seed:demo
```

Default password for every `*@avoeline.demo` account: **`AvoelineDemo1!`**. Override with `DEMO_SEED_PASSWORD` in `.env.local`.

**Do not use `AvoelineDemo1!` for SaaS owner Gmail addresses** (`SAAS_OWNER_EMAILS`). Those passwords are only `SAAS_OWNER_PASSWORD_1` / `_2` from `.env.local` after `npm run seed:owners`. Wrong password → Supabase `invalid_credentials`.

Sign in at **/admin/signin** for staff/owner (or `/auth/signin` — owners land on `/admin`). Demo roles use the public sign-in page.

| Role | Email (CAP=2) | Plan / notes | After login |
| --- | --- | --- | --- |
| Platform staff (not owner) | `staff.demo@avoeline.demo` | Admin areas except Platform staff | `/admin` |
| Department | `dept1@avoeline.demo`, `dept2@avoeline.demo` | enterprise / pro | `/department` |
| Club president | `club1@avoeline.demo`, `club2@avoeline.demo` | Under dept1 / dept2. Club 1 has all modules | `/clubs/{id}` |
| Organizer (free) | `org.free@avoeline.demo` | Free modules only | `/organizer/{id}/dashboard` |
| Organizer (enterprise) | `org.enterprise@avoeline.demo` | Full modules; Product Summit + Demo Spring Hackathon | `/organizer/{id}/dashboard` |
| Vendor | `vendor.catering@avoeline.demo`, `vendor.av@avoeline.demo` | 2 packages each; bookings on the summit | `/vendor/{id}/dashboard` |
| Attendee | `attendee1@avoeline.demo`, `attendee2@avoeline.demo` | Registered on demo events | `/attendee/{id}/dashboard` |

**Hero organizer (`org.enterprise@avoeline.demo`)** events (CAP=2): Product Summit (tiers + sponsors), Demo Spring Hackathon. Each has CAP speakers / agenda / registrations.

**Hackathon occupancy (Demo Spring Hackathon):** CAP teams (Alpha…). Join `HT01`… Enter `AV-DEMO001`…. Flags `FLAG{demo1}`…. Cyber CTF: `live_scoreboard`, `phased_structure`, `ctf_flags`, `per_task_timer`, `hackathon_timer`, `anti_cheat_tab_close`. Event UUID changes per seed.

Staff **Ops Desk Demo** on hero events; **Cyber CTF Lead** → `attendee1@avoeline.demo`. Club 1 has **Executive Board**. Depts get a sample event each.

**Playwright (optional):** after seed, set `E2E_EVENT_ID` to Demo Spring’s UUID and `E2E_ENTER_CODE=AV-DEMO001`, then `npm run test:e2e -- e2e/smoke.spec.ts`. Latest live audit: [`docs/hackathon-e2e-audit-2026-10-19.md`](hackathon-e2e-audit-2026-10-19.md).

---

## 1. SaaS owner

Sign in at **/admin/signin** with an owner email.

### 1.1 Plans — `/admin/plans`

- The page lists every plan as a card (price, active flag, free + paid module chips).
- **Create plan** opens a modal. **Edit** on a card opens the same form. Tick paid modules; free modules are always included.
- Deactivate a plan to hide it from selection; organizers still on an inactive plan lose its paid modules. The `free` plan can't be deleted or deactivated, and a plan in use can't be deleted.

There is **no Enter View**. Open tenant detail pages inside `/admin/*` only.

**Three admin pages (do not mix them):**

| Tab | Creates | Password? |
| --- | --- | --- |
| Departments & clubs | View org tree (cards); edit dept name/plan; clubs read-only; owner can delete | No — create logins under Tenant accounts |
| Tenant accounts | A person who can sign in (and a department org if that type) via **Create** wizard | Invite/account-ready email; password never emailed |
| Platform staff | Someone who uses `/admin`, with ticked areas | Yes — emailed on create/update/revoke |

Dashboard metrics: Organizations, Organizers, Events, **Vendors**. Queues: pending vendors/organizers, support, category requests, plan alerts. Flagged events are under **Events → Flagged** only.

### 1.2 Categories and formats — `/admin/categories`

- Click **Seed defaults** once. This creates the super categories and formats, including the **Hackathon** format with id `hackathon`, which is what switches on the hackathon tab for an event.
- Add your own categories/formats, edit field sets and checklist templates, and approve organizer requests at `/admin/category-requests`.

### 1.3 Tenants — `/admin/tenants`

Board tabs: **Tenants** | **Approvals** | **Access overrides** | **Custom pricing** | **Activity**.

1. **Create** (wizard): type → details (department: institute combobox / add new) → access (invite recommended, or temp password shown **once** in UI — **never emailed**) → preview → confirm.
2. Card **Manage** drawer: Plan / Features (segmented Plan default|Grant|Deny + expiry; department scope) / Pricing / History → Review changes opens Grant/Deny preview.
3. Secondary actions: Change plan, Grant/deny, Custom pricing — each form → preview → confirm; Email tenant on by default.
4. Approvals: three tiles with pending counts (never “None flagged”); Reject requires reason; emails decision.
5. Activity: moderation + `email_log`; Resend on failed/bounced.

Staff need `holdsArea('tenants')` plus the write cap (`tenants:create`, `plans:change`, …) unless they have `tenants:manage`.

### 1.4 Tenant types

| Type | What gets created | Where they land after sign-in |
| --- | --- | --- |
| Department | Auth user, department org, `department_admin` membership, organizer profile on plan (`tenant_provisioned`) | `/department` |
| Organizer | Auth user + approved organizer profile on plan | `/organizer/{id}/dashboard` |
| Vendor | Auth user + approved vendor profile | `/vendor/{id}/dashboard` |

Tenant-provisioned accounts must connect **Google** outbound mail with the **same email** used at create (SMTP connect removed).

Self-serve organizers and vendors at `/auth/signup` land on **pending review** → `/auth/signup/awaiting-approval` until you Approve on Organizers/Vendors cards (or Tenants queue). Paid plans also wait on `/admin/billing/pending`.

---

## 2. Department

Sign in at **/auth/signin** as the department tenant, change the password, and you'll arrive at `/department`. The chrome is the same left rail as organizer, plus a **Clubs** tab.

1. The home page shows **You are on the {plan} plan**. Upgrade is done by the platform owner on Tenant accounts.
2. **Events** — create department events (opens the organizer create flow). Club events appear as read-only public links.
3. **Clubs** — create a club with president name, email, and a temporary password. Tick features from the department plan. That creates a Supabase Auth user; they must reset the password on first sign-in.
4. Grant or revoke those features for one club or every club. Saving with none ticked removes access.
5. Open a club row for read-only events, teams, announcements, and requests. Do not use this to edit the club's workspace.
6. **Announcements** and **Requests** stay on their own tabs.

---

## 3. Club president

Sign in as the president created in step 2. Change the temporary password. You'll land on `/clubs/{clubId}`.

1. You see the club, announcements, and only the features the department granted.
2. Organizer tabs (Events, Analytics, Marketplace, …) match that grant list.
3. Submit a request; it appears on `/department/requests`.
4. If Event Dashboard was granted, create club events from `/organizer/{id}/events`. The department can read them but not edit them as the president.

---

## 4. Organizer

Sign in as the organizer tenant (or a self-signed-up organizer).

1. `/organizer/{id}/dashboard` shows widgets, reviews and analytics. Paid modules (Marketplace, Designer, Ushers, Certificates) show a locked panel unless the plan or an override unlocks them. Change the plan in `/admin/tenants` and refresh to confirm.
2. **Create an event** at `.../events/create`. Tick **Is this a hackathon?** only if `hackathon_ops` is granted (`?hackathon=1` from the Hackathon rail). Description supports lists/colors; banner is **4:5**; no timezone picker; end date ≥ start; free default with **Unlimited seats** checkbox; paid needs ≥1 tier; hackathon needs ≥1 named competition (CTF checkbox, not type dropdown). Connect **Google** under Organizer → Email before attendee mail works.
3. Open the event. Header has one banner bar + **Edit event** / **Archive** / Delete. Shared tabs: Attendees, **Team** (ops), Access, Agenda, Speakers, Vendors, Sponsors, Certificates, Files, Exports. Hackathon also: Competitions, Phases & Tasks, Submissions, Scoreboard, Settings. **No Competitors tab** (roster on Attendees). List has an **Archived** filter. Public page `/events/{id}` (share `/e/{id}`) hides Register when ended; competitions at `/events/{id}/tracks/[trackId]`.

### 4.1 Hackathon module — `.../events?kind=hackathon`

**Canonical checklist:** [`docs/O8-full-flow-checklist.md`](O8-full-flow-checklist.md) (O0–O7 tabs + cross-flows). This section is a short path only.

**Unlock:** `/admin/tenants` → grant `hackathon_ops` (or include it on the plan). Sign in as that organizer. The left rail **Hackathon** opens the Events list filtered to hackathons.

1. **Create:** `/organizer/{id}/hackathon/create` redirects to `.../events/create?hackathon=1`. Publish.
2. **Open** `.../events/{eventId}`: Overview + shared tabs + Competitions, Phases & Tasks, Submissions, Scoreboard, Settings. `.../events/{id}/teams` → Attendees. Old `/hackathon/{eventId}/…` bookmarks redirect here.
3. **Competitions:** CTF checkbox; single Rules & instructions; optional `registration_closes_at`; judge invites.
4. **Phases & Tasks:** phase windows + FileStore; windows gate submit.
5. **Settings:** matrix toggles only — no online mode / mentors / announcements.
6. **Scoreboard:** per-competition; ▲▼; `live_scoreboard` gate. Public `/tracks/.../leaderboard` redirects to competition detail.
7. **Access / Attendees / Team / Exports / Certificates / Files:** follow O8 checklist (registration form on Attendees; cert viewer `/certificate/[code]`).

Settings enforcement: [`docs/hackathon-settings-matrix.md`](hackathon-settings-matrix.md). Historical Demo Spring audit: [`docs/hackathon-e2e-audit-2026-10-19.md`](hackathon-e2e-audit-2026-10-19.md). Playwright: `npm run test:e2e` after `seed:demo`.

---

## 5. Hackathon participant

1. In a fresh window, open `/events/{eventId}`. Choose a **competition**. Enter a **team name**. You are the team lead. Fill the organiser questions, then **Add team member** for extras (same questions, up to max team size). One payment screenshot for the team if the competition is paid. Bookmark `/events/{eventId}/ticket/{registrationId}` — it is a waiting page until the organizer confirms.
2. As organizer, on **Attendees**: expand the **team** row, mark payment completed and confirm the lead. The team gets **one access code** (copy from the team card; emailed to members if mail is configured). The code is hidden until payment is complete and a registration is confirmed. People with no team can be assigned from the leftover panel. Extra members do not use extra seats. Open a member to see payment screenshot, check-in, and that member’s QR.
3. Open `/events/{eventId}/enter` (example: `http://localhost:3000/events/{eventId}/enter`), paste the **team** enter code (`AV-DEMO001` on Demo Spring) or join code (`HT01`). That sets a cookie `{registrationId, eventId, teamId}` (path `/events/{eventId}`) and opens `/events/{eventId}/compete`: Instructions, Phases & Tasks, Scoreboard (if `live_scoreboard`), Submissions, Team. CTF: Start timer when required, then flag submit. Monitoring banner appears when `anti_cheat_tab_close` is on.
4. Optional: the old ticket team URL still exists for project submit / arena, but joining a team yourself is no longer the default path.
5. Smoke automation: `E2E_EVENT_ID` + `E2E_ENTER_CODE` against `e2e/smoke.spec.ts` (see §0b).

A signed-in user visiting `/events/{eventId}/tracks/{trackId}/tasks` is still sent to their ticket tasks page. The code dashboard does not use `/attendee`.

---

## 6. Vendor

Sign in as the vendor tenant (or sign up at `/auth/signup` and complete vendor setup).

1. `/vendor/{id}/dashboard`, then add services at `.../services`.
2. As an organizer on a plan with the marketplace, request a quote from the vendor via **Marketplace**.
3. Back as the vendor, answer it under **Quotes**, then follow the booking under **Bookings**.

---

## 0c. RBAC smoke (demo seed)

Use **incognito** (extensions off). Password for all `*@avoeline.demo` accounts: `AvoelineDemo1!`.

| Check | Sign in as | Action | Expect |
| --- | --- | --- | --- |
| Free modules | `org.free@avoeline.demo` | Open left-rail **Teams** (basic OK); open a hackathon event **Competitions** / paid modules | Teams basic works; `hackathon_ops` / advanced teams / certs locked or absent |
| Enterprise modules | `org.enterprise@avoeline.demo` | Open **Teams** + a hackathon event (Competitions, Phases & Tasks) | Pages load; no lock panel |
| Cross-role organizer URL | `attendee1@avoeline.demo` | Visit `/organizer/{enterpriseUserId}/events/...` | Redirect to attendee dashboard (proxy) |
| Cross-role vendor | `vendor.catering@avoeline.demo` | Visit `/organizer/{anyId}/dashboard` | Redirect to vendor dashboard |
| Event staff | Staff on **Ops Desk Demo** (seed assignment) | Open an assigned hero event URL under the owner’s `/organizer/{owner}/events/{id}` | Allowed via `user_is_event_staff` |
| Unassigned attendee | `attendee1@avoeline.demo` (not on staff roster) | Same owner event URL | Redirect away (not staff) |

Proxy gates: `src/proxy.ts`. Module gates: `hasModuleAccess`. Event ownership: `assertOwnedEvent`. Follow-ups (not required for this smoke): adversarial IDOR suite, staff mutation grant hardening — see `plans/INDEX.md`.

---

## Page load performance

Hot server pages should load with **`Promise.all` of independent reads** and **batched `.in()`** — never sequential `for` + `await` per id on the critical path. Spot regressions with ripgrep for `for (` + `await` in `page.tsx` / layout loaders, or per-id `getEventByID` / `getTeamMembers` loops.

Parallelized / batched in the 2026-10-11 tranche (see `plans/2026-10-11-plans-archive-and-verification.md`):

- Event shell tab ACL (`tabAllowedByGrant` once per grant)
- Organizer event overview, attendees (deduped signed URLs), staff + Teams library
- Vendor dashboard / profile / view-vendor titles via `EventService.getEventTitlesByIds`
- Public register + compete waterfalls
- Hackathon workspace settings configs + judge invite URLs
- Speakers session titles via `sessionsBySpeakerIds`

---

## Troubleshooting

- **"Hydration failed" mentioning `<body>` attributes:** a browser extension. Use incognito.
- **Sent to `/access-denied`:** the account lacks the role for that area. Owners use `/admin/signin`; everyone else uses `/auth/signin` and is routed automatically.
- **Hackathon rail missing:** grant `hackathon_ops` on the organizer plan or as a club/department override. Inner tabs show a lock panel without the module; `assertOwnedEvent` still applies (department admins of that org are allowed).
- **Form shows an error banner:** the message comes from the server action via `?e=` in the URL, so fix the input and resubmit.
