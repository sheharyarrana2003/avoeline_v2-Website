# Event module overhaul: answers, decisions and Cursor prompts

Covers every item in your notes. Part A answers your questions and records the decisions. Part B has nine prompts (O0 to O8) to run in order, one fresh chat each. Attach `@docs/ENGINEERING_RULES.md` and this file. It builds on the Connections module (docs/17: C1 foundation and C4 Drive) and the send limits (docs/18). If those aren't built yet, build them first.

---

## Part A. Answers and decisions

### A1. What the "Programme" tile is
It is the **agenda summary** on the Overview hero. It says "Nothing scheduled" when the event has no agenda items. Rename it **Agenda**, show "N sessions · Day 1 starts 10:00 AM" (or the next session), link it to the Agenda tab, and hide it when there are no items.

### A2. How the Access tab works (each type, start to finish)

| Type | Who can see the event | Who can register | What the organizer sets up | What each person gets |
|---|---|---|---|---|
| **Public** | Everyone, listed and searchable | Anyone | Nothing | The same public link |
| **Private** | Not listed. Only people with the link | Only people who pass the gate: their email is on the **whitelist**, or they enter the **access code** | Whitelist and/or a code | The same event link. Their email (or the code) is checked at registration |
| **Invite only** | Not listed | Only people with **their own invite link** | Invitees (email, name, optional tier), expiry, single-use | A **personal link** `…/e/<event>?invite=<token>`, unique to them, tracked as pending, opened, registered |
| **Hybrid** | Listed publicly | Anyone for the open tiers. Gated tiers (VIP, Speaker) need the whitelist or code | Which tiers are gated and the whitelist/code | The public link, plus access to gated tiers if they pass |
| **VIP / Tiered** | Listed publicly | Anyone, but every attendee gets a tier (General, VIP, …) | Tiers and, optionally, a guest list that assigns tiers | The public link. Their tier decides price, perks and what the agenda shows them |

- **Whitelist = a permission list.** "These emails may register" through the normal link. It sends nothing by itself and gives no personal link.
- **Invite link = a personal key.** One per person, trackable, expirable, usable once if you want.
- The tab must show **only the tools that apply to the chosen type** (invites for Invite only, whitelist and code for Private and Hybrid, tiers for Hybrid and Tiered) and a short "How this works" panel with this table.
- **Tiers and promos** (not for hackathons, whose fees live on each competition): the public event page shows only active tiers inside their availability window, with seats left if tracked. Automatic discounts (student, group, early-bird) are shown. **Promo codes are never shown publicly.**
- **Access emails:** an "Email guests" action composes invites or reminders (to all pending, to selected, to those who haven't opened or registered) from the organizer's connected account, with the guest link inserted for each person.

### A3. Why a custom form appeared in Access
It doesn't belong there. The registration form (custom questions, team registration) controls the data in the **Attendees** list, so it moves behind a **"Registration form"** button on the Attendees tab (reusing the same builder as event creation). The Access tab keeps only: who may join, approvals, waitlist, guest lists, tiers and promos.

### A4. What "Files" is and its flow
Files is the event's **library of Google Drive files**. Flow: connect Google Drive → the app creates an `Avoeline` folder in the organizer's Drive → the event gets its own folder (below) → the Files tab shows (1) the event folder with its auto-sorted sub-folders and (2) **Linked files** (Docs, Sheets, Slides) you add by picking from Drive or creating a blank one from the platform → open any file in Google, search across them, and attach them to events, teams or clubs. The platform sees only files it created or you picked (the non-sensitive `drive.file` permission). It cannot browse the rest of your Drive.

### A5. The "API developer key is invalid" error when connecting Drive
That message comes from **Google Picker**, not from Drive. The Picker needs a valid **API key**, and it renders inside an iframe on `docs.google.com`. Fix, in this order:
1. In Google Cloud (the same project as your OAuth client), enable **Google Picker API** and **Google Drive API**.
2. Credentials → create or open an **API key**. Use that exact key as the Picker developer key. A client secret, client ID or project number will not work.
3. Application restrictions: **Websites (HTTP referrers)** and allow `http://localhost:3000/*`, your production domain `/*` **and `https://docs.google.com/*`** (the Picker runs there).
4. API restrictions: restrict the key to **both Google Picker API and Google Drive API**.
5. The app ID passed to the Picker must be the **project number** of the same project.
6. Confirm the key reaches the browser: the Picker config endpoint must return it (empty or undefined values cause this error). Wait a few minutes after changing restrictions.

### A6. Storage decision: Drive first, small temporary fallback
Your goal is to avoid paying for Supabase storage, so uploads go to the **organizer's Drive**. Reality to design for:
- If an organizer disconnects, the token expires (every 7 days while the Google app is in Testing), or the Drive is full, **attendee uploads would fail**. So: **Drive first, with a private Supabase fallback** (short retention, per-plan quota) that a background job moves into Drive when it's healthy again and then deletes.
- **Attendees are the public.** Anything they upload lands in the organizer's Drive, which may sync to their computer. Public uploads are therefore limited to images and PDFs, are re-encoded (images), size-capped, renamed with random ids, and never made public.
- Vercel functions accept only about 4.5 MB request bodies, so images are compressed in the browser before upload. Larger files (presentations, zips) upload **directly from the browser to Drive** through a resumable session the server creates.
- Add to your **privacy policy and organizer terms** that registration files (payment proofs, submissions) are stored in the organizer's Google Drive.
- **Required or optional?** Recommended: Drive is required only for events that collect files (paid proofs, file submissions) or archive certificates; otherwise optional.

**Never stored:** QR codes (generated on demand), certificate PDFs (rendered on demand, optional Drive archive).

**Drive folder layout:** `Avoeline / <Event title> / Payment proofs · Submissions / <Competition> / <Team> · Certificates · Media · Exports`.

### A7. What gets removed (and where it goes)

| Remove entirely | Replacement |
|---|---|
| Online mode (spectator pages, livestream) | Nothing |
| Mentors (sign-up page, slots, booking) | Nothing |
| Announcements | Nothing (organizers email participants through the composer) |
| Judging rubric in competition configure | Judges give points per submission (see O5) |
| Public leaderboard | The **Scoreboard** tab |
| **Competitors** (Teams) tab | Team cards in **Attendees**, with the join code shown after checks |
| Competition dates: roster locks, submission deadline, "participants may work from" | Phases control working time. Keep one optional **registration closes** date per competition |
| Competition type dropdown | A **"This is a CTF"** checkbox |
| Separate Rules and Instructions | One field: **Rules & instructions** |

Removal means: code, routes, actions, services, emails, config keys, tests and docs. Database tables and columns are only **hidden and marked deprecated** now and dropped later in the schema optimization pass.

### A8. Where Expenses numbers come from
| | Source | Status |
|---|---|---|
| **Income** | Ticket revenue (verified payments, net of discounts, refunds negative) | Received |
| | Competition entry fees (verified team payments) | Received |
| | Sponsorships | Expected = contract value, Received = amount marked received |
| | Manual income (donations, merchandise) | Received |
| **Expense** | Vendor bookings (confirmed, completed) | Planned, then Paid |
| | Own vendors (budget) | Planned, then Paid |
| | Manual expenses (stationery, food, transport) | Planned or Paid |
Rules: automatic lines are read-only and link back to their source. A manual expense linked to a vendor booking counts as payment of that booking, not a second cost. **Net = received − paid. Projected net = expected − planned.** Budget vs actual per category.

### A9. New tab order
Overview · Attendees · Team · Access · Agenda · Speakers · Vendors · Sponsors · Expenses · *[hackathon only:]* Competitions · Phases & Tasks · Submissions · Scoreboard · Settings · Certificates · Files · Exports.

---

## Part B. Prompts

### O0. Removals (do this first, it shrinks everything else)

````text
Read @docs/ENGINEERING_RULES.md and docs/22 Part A7. Remove these features completely from the event module: online mode (spectator pages, livestream), mentors, hackathon announcements, the judging rubric in competition configure, the public leaderboard, the "Competitors" (Teams) tab, the competition-type dropdown, the competition fields roster lock, submission deadline and "participants may work from/to" (and the separate Rules and Instructions fields).
1. FIRST write docs/removal-inventory.md listing every reference (routes, pages, components, server actions, services, emails/templates, nav links, config keys in hackathon_config and configKeys.ts, tables and columns, tests, docs). Stop for my approval of the list.
2. After approval: delete the code, routes, nav items, settings keys, emails, tests and doc sections. Redirect old URLs to the closest tab (Competitors → Attendees). Do NOT drop tables or columns: mark them deprecated with a comment and stop writing to them. Run typecheck, lint, knip and the tests to prove nothing references removed code.
3. Competitions keep: name, description, image, entry fee, team size min and max, discount (percent, note, expiry), structured prizes, one "Rules & instructions" field (rich text plus an optional file), a "This is a CTF" checkbox (replaces the type dropdown), an optional dedicated sponsor, and ONE optional "Registration closes" date-time. Migrate existing rules and instructions into the single field and the old type into the checkbox.
4. Roster lock now happens automatically when the competition's registration closes (organizers can still lock or unlock a single team). Phases control when participants work.
5. Update docs/11, docs/07, docs/12 (Phase 8 date fields) and completeContext.md.
Pause after step 1 and again after step 5.
````

### O1. File storage: Drive first, fallback, and the Picker fix

````text
Read @docs/ENGINEERING_RULES.md, docs/17 (Connections, sections 8 and 10), docs/22 Part A4-A6. Build one FileStore used by every upload in the product.
1. FileStore interface (put, get, stream, delete, link) with DriveStore (the organizer's connection, scope drive.file, files created by the app) and SupabaseStore (private bucket, TTL, per-plan quota) as the fallback. DB tables store only: provider, file id, name, size, mime, category, linked entity, checksum, uploaded_at (no file bytes). Create the Drive folder layout from A6 lazily per event.
2. Public attendee uploads (payment proofs): compress in the browser, then upload through an API route. The server validates (magic bytes, allowlist images and PDF, size cap, dimension cap), re-encodes images to strip metadata, renames to a random id, rate-limits by IP and event, uploads to the organizer's Drive, and saves the registration only after success. If Drive is unavailable, save to the fallback bucket, flag it, and let a background job move it to Drive and delete the temporary copy.
3. Larger files (submissions, presentations, organizer media): the server creates a resumable Drive upload session (with the app origin so the browser can upload directly), the browser uploads, and the server verifies the file exists, its size and mime before recording it. Block executable and script types.
4. Viewing: /api/files/[id] checks the caller's permission on the linked record, streams from Drive using the organizer's token (never expose tokens or Drive URLs), inline only for images and PDF, attachment otherwise, with nosniff. Files are never shared publicly in Drive.
5. QR codes are never stored: /api/qr/[token].png renders on demand with cache headers, and emails embed QR codes inline. Remove any stored QR image columns and files.
6. Health: Drive status per organizer (active, needs reconnect, full, blocked), banners on affected tabs, and a clear organizer message when the fallback is in use.
7. Required only for events that collect files or archive certificates: prompt to connect Drive before publishing those. Otherwise optional.
8. FIX the Drive connect error "The API developer key is invalid": serve the Picker config (API key, project-number app ID, short-lived token) from a server endpoint, validate at startup that the key and app ID exist, and add an admin-only diagnostics check (presence and format only, never show the key). Document the Google Cloud steps from docs/22 A5.
9. Tests: type and size rejection, executable blocked, re-encoding strips EXIF, Drive down uses the fallback and later moves the file, permission check on /api/files, tokens never reach the client, QR endpoint caches.
Pause after items 1-4, again after 5-9.
````

### O2. Overview and Attendees

````text
Read @docs/ENGINEERING_RULES.md, docs/22 Part A1, A6 and docs/16, 18 for email rules. Redesign two tabs.

OVERVIEW
1. Hero tiles: for hackathons, the ticket tile lists each competition's fee (range with an expandable per-competition list and each competition's registration close); for other events show the tier range or Free. The "Programme" tile becomes "Agenda" (A1). Show the Google Maps link as "Open in Maps" (no coordinates). Hide "Seats left" when capacity is unlimited or not set. Fix capacity logic: unlimited = no capacity, never show reserved or available seats then.
2. Show every key detail: dates, registration window, venue and address, format, category, visibility, description, tiers or competitions summary, and agenda summary, in the shared card design.

ATTENDEES
3. Toolbar buttons: "Registration form" (opens the form builder in a drawer, moved out of Access), "Email", "Export".
4. Exports: participants (one row per person), teams (one row per team plus a members sheet), for hackathons by competition, with form-field columns. "Export to Google Sheets" creates a Sheet in the event's Drive Exports folder and shows "Open sheet"; "Keep in sync" updates it (docs/17 C5 rules, sanitize cells against formula injection).
5. Participant drawer: all submitted answers, tier, payment (only when the event is paid), status history, check-in details (time, method, who), team and competition, QR rendered on demand, personal ticket link. Remove the "Location" block unless it shows a real value from the form.
6. Team cards show the **join code** only after the team is confirmed and any fee is verified and the team isn't cancelled, with the note "Valid until <last phase closes, or event end>". Enforce the expiry on the server at code entry. Allow revoke and regenerate.
7. Emails go from the organizer's connected sender (requireConnectedSender). Registration received: the data the attendee entered. Registration confirmed (after payment and approval): event details, map link, ticket link, and each participant's QR (inline images). For team events both go to the **lead**, with the competition, team name, every member's details and **every member's QR**; beyond 10 members, link to the ticket page instead of inline. Optional toggle "also email each member their own QR" (default off). No payment lines on free events. If no sender is connected, follow the blocked and fallback behavior in docs/16.
8. Fix the composer so every checkbox works and changes the preview: team name, team members, competition, event date and venue, ticket link. Verify with tests.
9. Tests: capacity display, unlimited hides seats, join code visibility rules and expiry, QR inline in the lead's email, free-event payment hiding, composer options, export columns, sheet sync.
Pause after 1-4, again after 5-9.
````

### O3. Access tab

````text
Read @docs/ENGINEERING_RULES.md and docs/22 Part A2-A3. Rebuild the Access tab around the access type.
1. Layout: a type selector as cards (Public, Private, Invite only, Hybrid, VIP/Tiered), a "How this works" panel using the table in A2, then ONLY the tools relevant to the chosen type: Private and Hybrid → whitelist and access code; Invite only → invites; Hybrid → choose which tiers are gated; VIP/Tiered → tiers and an optional guest list assigning tiers. Approval and waitlist switches and one Save button.
2. Remove the custom form from this tab (it moved to the Attendees "Registration form" drawer). Remove anything that has no function.
3. Guest list: separate tables for whitelist entries and invite links with statuses (invite: pending, opened, registered, expired, revoked), a validation preview before saving (valid, duplicate, invalid), CSV upload with filename and the same preview, and a sample of the exact format.
4. "Email guests": compose from the organizer's connected sender with {{inviteLink}} (personal link for Invite only) or {{eventLink}}, recipients (all pending, selected, not opened, not registered), preview, schedule through the send-limits system (docs/18), status tracking and resend. Copy-link fallback when no sender is connected.
5. Tiers and promos (not shown for hackathons; fees are per competition): list with active toggle, availability window and seats; promo codes with scope, expiry and usage. Expired items turn inactive at read time.
6. Public event page: show only active tiers inside their window with seats left (if tracked) and the automatic discounts. Never show promo codes. The private, invite-only and Hybrid gates behave exactly as in A2 and are enforced on the server.
7. Tests: each access type end to end, invite token single-use and expiry, whitelist match, code gate rate limit, tier visibility on the public page, promo codes never in the public DTO.
Pause after 1-3, again after 4-7.
````

### O4. Agenda, Sponsors, Speakers, Expenses, Team tab

````text
Read @docs/ENGINEERING_RULES.md and docs/22 Part A8-A9.

AGENDA
1. Day-by-day view: day tabs, a timeline per day with time ranges, type badges (Opening, Talk, Panel, Workshop, Competition, Break, Networking, Closing, Other), room or location, speakers as avatars, and a list/timeline toggle. "Add item" modal: title, type, date, start and end time, location, speakers (multi-select, synced with Speakers), a linked competition (for Competition items), description. Warn about overlapping items in the same location or with the same speaker. The public page shows the same schedule.

SPEAKERS
2. Check that nothing regressed: sync with Agenda both ways, the card shows linked sessions.

SPONSORS
3. List-first: cards or a table showing each sponsor, collaborator and partner (logo, name, type, tier, details). "Add" opens a modal with the type-adaptive form and a PREVIEW step showing the public card before saving. A "Preview public section" button and the three "Show on public page" switches (sponsors, collaborators, partners) with a preview. No expanding forms on the page.

EXPENSES
4. Ledger per A8: a SQL view unions automatic lines (verified ticket and competition payments, sponsor expected and received, vendor bookings, own vendors) with manual lines. Automatic lines are read-only with a link to their source. Manual lines have full CRUD (income, expense, credit). Sponsor payment tracking (pending, partial, received with amount and date). Summary: income received and expected, expenses paid and planned, net and projected net, budget vs actual by category, filters, export. All totals computed in SQL, no double counting when a manual expense is linked to a vendor booking.

TEAM TAB
5. Event Team tab shows the teams and members assigned to THIS event from the organizer's Teams page: "Assign team", choose members, per-event lead, remove from event, read-only member details, and a "Manage in Teams" link. Recruitment, access grants and editing members live only on the Teams page. Changes there appear here immediately (same tables).
6. Tests: agenda overlap warnings, speaker sync, sponsor preview and visibility switches, ledger totals and no double counting, assignments sync.
Pause after 1-3, again after 4-6.
````

### O5. Competitions

````text
Read @docs/ENGINEERING_RULES.md, docs/22 Part A7, docs/12 Phase 8. Prerequisite: O0 is done.
1. FIX the "Add competition" modal: it shows through to the page behind it. Use the shared Modal with a solid surface, a dimmed overlay, scroll lock and correct z-index. Sections: Basics (name, description, image, "This is a CTF" checkbox), Team and pricing (team size, entry fee, discount, dedicated sponsor), Prizes (structured list plus notes), Rules & instructions (one field plus an optional file), and Registration closes (optional date-time).
2. Effective registration close = the competition's own date if set, otherwise the event's. The public "Register team" button follows it per competition (open, closed, full).
3. Judges: invite through the composer (organizer's connected sender) with a private link. The link opens an invitation page with Accept and Decline, and the organizer sees statuses (invited, opened, accepted, declined) with resend. Without a rubric, an accepted judge scores each submission with points from 0 up to the task or phase's max, plus an optional comment. Judge points feed the scoreboard.
4. Public event page: a Competitions section with each competition's image, name, CTF badge, description, team size, fee, discount, prizes, expandable rules and instructions, its effective registration close and its own Register button.
5. Tests: modal opacity and focus trap, effective close date logic, judge invite lifecycle, judge scoring bounds, the public DTO excludes tasks, flags, hints and judge links.
Pause for review.
````

### O6. Phases and Tasks, Submissions, Scoreboard, Settings

````text
Read @docs/ENGINEERING_RULES.md, docs/12 Phase 8-9, docs/22 Part A6-A7. Everything is per competition.

PHASES AND TASKS
1. Organizers can attach files to phases and tasks (stored through FileStore, downloaded by participants only through the permission-checked proxy). Phase open and close times control working time.
2. Participant side: a submission form per phase and task with details text, link(s) and file upload (any allowed type, presentations included), size caps, upload direct to the organizer's Drive through FileStore, server-side verification, timestamps to the second, resubmission per settings.

SUBMISSIONS
3. Always show the submissions list below the filters (empty state when none). Each row: team, competition, phase, task, type (file, link, text), file name and size, submitted at (to the second), status, points. Preview and download through the proxy. Filters stay (competition, phase, task, team, status, date).

SCOREBOARD
4. Per competition: rank, movement (▲▼ versus one hour ago, computed from completion timestamps, no snapshot table), team name, points, phases completed x/y, tasks solved x/y, last activity, expandable per-team detail. Auto-refresh every 15 seconds. Isolation per competition proven by a test.

SETTINGS
5. Remove the online mode setting and any removed feature's keys. Apply docs/12 Phase 8 item 4: every remaining setting is enforced on the server for the competitions it applies to, with a settings matrix document and a test per setting.
6. Tests: file attach and download permissions, submission validation, list visibility, movement calculation, per-setting enforcement.
Pause after 1-3, again after 4-6.
````

### O7. Certificates and Files

````text
Read @docs/ENGINEERING_RULES.md, docs/12 Phase 5, docs/17 sections 8 and 10, docs/22 Part A4-A6.
CERTIFICATES
1. Certificates stay rendered on demand from the JSON template. Add "Save a copy to my Drive": PDFs are created in the event's Drive "Certificates" folder (default on when Drive is connected, otherwise skipped). Drive copies are an archive and are not shared by default.
2. The certificate email (sent from the organizer's connected sender) contains the website link /certificate/[code], which renders the certificate with the template and offers PDF download. The organizer may choose "include Drive link", which needs a share-by-link setting with a clear warning that anyone with the link can view that file.
3. Bulk issuing creates records only. Drive archiving and emails run in throttled batches through docs/18.
FILES TAB
4. Implement the flow in docs/22 A4: connect Drive, the event folder with its sub-folders, linked files (pick or create), search, open in Google, attach to event, team or club. Show Drive health and the fallback banner.
5. Tests: certificate link works with Drive down, Drive archive and email link behavior, sharing warning, Files flow and permissions.
Pause for review.
````

### O8. QA and docs

````text
Run end-to-end Playwright flows on local demo data and fix regressions found (not new features): create event, open registration, register (single, team with files), proof upload to Drive and to the fallback, approve, email lead with QR codes, check in, access types (all five), hackathon (competition, phases, submission with file, scoreboard movement, judge invite), expenses ledger totals, certificate issue and link. Confirm no references remain to removed features, update docs/11, docs 07 and 12, the settings matrix and completeContext.md, and list anything not done.
````

---

## Decisions for you
1. **Drive required or optional?** I recommended required only for events that collect files or archive certificates.
2. **Judges without a rubric:** I defaulted to points per submission. Say if judges should only review, or if you want a lighter scoring form.
3. **Certificate link in email:** website link by default (always works, access-controlled by the code), Drive link only if the organizer opts in and shares the file.
4. **Fallback storage limits:** how many MB per plan, and how many days before a fallback file expires.
5. **Privacy policy:** add that payment proofs and submissions are stored in the organizer's Google Drive, and update the organizer terms to cover it.
