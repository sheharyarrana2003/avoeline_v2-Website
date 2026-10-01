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

## 1. SaaS owner

Sign in at **/admin/signin** with an owner email.

### 1.1 Plans — `/admin/plans`

- The page lists every plan as a card (price, active flag, free + paid module chips).
- **Create plan** opens a modal. **Edit** on a card opens the same form. Tick paid modules; free modules are always included.
- Deactivate a plan to hide it from selection; organizers still on an inactive plan lose its paid modules. The `free` plan can't be deleted or deactivated, and a plan in use can't be deleted.

**Enter View** on the dashboard opens that department or organizer **while you stay signed in as the owner**. You should see “Viewing as support” and **Back to admin**. This is not their login.

**Three admin pages (do not mix them):**

| Tab | Creates | Password? |
| --- | --- | --- |
| Departments & clubs | Org tree; edit name/parent/plan; owner can delete (Auth too) | No |
| Tenant accounts | A person who can sign in (and a department org if that type) | Yes |
| Platform staff | Someone who uses `/admin`, with ticked areas (departments, tenants, plans, …) | Yes |

### 1.2 Categories and formats — `/admin/categories`

- Click **Seed defaults** once. This creates the super categories and formats, including the **Hackathon** format with id `hackathon`, which is what switches on the hackathon tab for an event.
- Add your own categories/formats, edit them, and approve organizer requests at `/admin/category-requests`.

### 1.3 Tenants — `/admin/tenants`

The list shows each tenant, their plan, and verification. Per organizer you can change the plan, grant a single module override, or save custom pricing. **Edit plans** jumps to `/admin/plans`.

### 1.4 Create tenants — `/admin/tenants/new`

Create one of each. Use real inboxes you can read, or type a password.

| Type | What gets created | Where they land after sign-in |
| --- | --- | --- |
| Department | Auth user (organizer type), a verified `department` organization, a `department_admin` membership, organizer profile on the chosen plan | `/department` |
| Organizer | Auth user + organizer profile on the chosen plan | `/organizer/{id}/dashboard` |
| Vendor | Auth user + approved vendor profile | `/vendor/{id}/dashboard` |

New tenants must change their password on first sign-in (`/auth/change-password`).

Organizers and vendors can also sign up on their own at `/auth/signup`. They start on the Free plan; you can upgrade them from `/admin/tenants`.

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
2. **Create an event** at `.../events/create`. Tick **Is this a hackathon?** only if `hackathon_ops` is granted (`?hackathon=1` from the Hackathon rail).
3. Open the event. Shared tabs: Attendees, Staff, Access, Agenda, Speakers, Vendors, Sponsors, Certificates, Exports. Hackathon events also show Competitions, Phases & Tasks, Teams, Submissions, Scoreboard, Settings (lock panel if `hackathon_ops` is missing).

### 4.1 Hackathon module — `.../events?kind=hackathon`

**Unlock:** `/admin/tenants` → grant `hackathon_ops` (or include it on the plan). Sign in as that organizer. The left rail **Hackathon** opens the Events list filtered to hackathons.

1. **Create:** `/organizer/{id}/hackathon/create` redirects to `.../events/create?hackathon=1`. Publish. The event appears in Events (badge) and in `?kind=hackathon`.
2. **Open the dashboard** at `.../events/{eventId}`: Overview plus shared tabs, then Competitions, Phases & Tasks, Teams, Submissions, Scoreboard, Settings. Department admins who can manage the organizer can open inner tabs. Old `/hackathon/{eventId}/…` bookmarks redirect here.
3. **Competitions:** add tracks with a kind (CTF, business, …).
4. **Phases & Tasks:** filter All vs one competition; search phase/task names. Create a phase (open/close times). Attach tasks or add independent tasks (`phase_id` null).
5. **Settings:** event-level online mode at the top. Each competition toggle applies to selected competitions or all. CTF-only keys skip non-CTF tracks. Turn on `live_scoreboard` and `phased_structure` for selected competitions only.
6. **Scoreboard:** points for the picked competition only (completions joined to that track’s tasks) and refreshes every 15 seconds. Public `/events/{eventId}/tracks/{trackId}/leaderboard` is **judge** scores and only if online mode is on.
7. **Access:** on a paid hackathon, add promo codes as whole-event or one competition.
8. **Exports:** hackathon teams workbook (two sheets) plus the usual attendee/check-in/financial/sponsor files.
9. **Staff:** add/remove members and a lead on the free path; named positions and applicant pipeline need `teams_advanced_roles`.

Settings marked *toggle-only* in the panel (docker sandboxing, staff shifts, tab-close detection, day-wise calendar, team attendance, activity check, team collaboration) are stored but not enforced by the app yet. Docker remains toggle-only (`docs/07-hackathon-organizer-config.md`).

---

## 5. Hackathon participant

1. In a fresh window, open `/events/{eventId}`. Choose a **competition**. Enter a **team name**. You are the team lead. Fill the organiser questions, then **Add team member** for extras (same questions, up to max team size). One payment screenshot for the team if the competition is paid. Bookmark `/events/{eventId}/ticket/{registrationId}` — it is a waiting page until the organizer confirms.
2. As organizer, on **Attendees**: expand the **team** row, mark payment completed and confirm the lead. The team gets **one access code** (copy from the team card; emailed to members if mail is configured). The code is hidden until payment is complete and a registration is confirmed. People with no team can be assigned from the leftover panel. Extra members do not use extra seats. Open a member to see payment screenshot, check-in, and that member’s QR.
3. Open `/events/{eventId}/enter` (example: `http://localhost:3000/events/{eventId}/enter`), paste the **team** code. That sets a cookie `{registrationId, eventId, teamId}` and opens `/events/{eventId}/compete`: tasks, phases, countdown, live scoreboard (if on), CTF flags, or a link/file ≤ 1MB for non-flag tasks.
4. Optional: the old ticket team URL still exists for project submit / arena, but joining a team yourself is no longer the default path.

A signed-in user visiting `/events/{eventId}/tracks/{trackId}/tasks` is still sent to their ticket tasks page. The code dashboard does not use `/attendee`.

---

## 6. Vendor

Sign in as the vendor tenant (or sign up at `/auth/signup` and complete vendor setup).

1. `/vendor/{id}/dashboard`, then add services at `.../services`.
2. As an organizer on a plan with the marketplace, request a quote from the vendor via **Marketplace**.
3. Back as the vendor, answer it under **Quotes**, then follow the booking under **Bookings**.

---

## Troubleshooting

- **"Hydration failed" mentioning `<body>` attributes:** a browser extension. Use incognito.
- **Sent to `/access-denied`:** the account lacks the role for that area. Owners use `/admin/signin`; everyone else uses `/auth/signin` and is routed automatically.
- **Hackathon rail missing:** grant `hackathon_ops` on the organizer plan or as a club/department override. Inner tabs show a lock panel without the module; `assertOwnedEvent` still applies (department admins of that org are allowed).
- **Form shows an error banner:** the message comes from the server action via `?e=` in the URL, so fix the input and resubmit.
