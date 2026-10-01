# Events and Hackathon dashboards

Shipped unified dashboard (Oct 2026). This is the inventory for Events + Hackathon organizer UI. The older split-dashboard snapshot is gone.

---

## Changelog — what changed and why

| # | Change | Why |
|---|---|---|
| 1 | **Events and Hackathon dashboards merge into one layout, one tab bar, one list, one wizard.** Hackathon-only tabs (Competitions, Phases & Tasks, Teams, Submissions, Scoreboard, Settings) appear conditionally when `isHackathon` is true. Underlying data stays in separate tables (`hackathon_tracks`, `hackathon_teams`, etc.) — only the UI/navigation unifies. | Eliminates the remount duplication and the gap where hackathons lacked Staff, Agenda, Speakers, Vendors, Sponsors, Exports. |
| 2 | **Group/team registration is now available on regular (non-hackathon) events**, not just hackathons. Wizard Registration step gets a Single/Group toggle, group size min/max, and per-group vs per-member custom form fields. | Team-size-driven forms are not hackathon-exclusive. |
| 3 | **No new "Teams" tab for regular group events.** Reuse the Attendees tab's grouped view. Thin `registration_groups` table, separate from `hackathon_teams`. | Same UI pattern, different entity. |
| 4 | **One payment screenshot per team/group; each member keeps their own personal QR for check-in.** | Same rule for regular groups as hackathons. |
| 5 | **Staff tab is plan-gated**: Basic → add/remove member, assign a lead. Paid (`teams_advanced_roles`) → named positions + recruitment pipeline. | Matches `04-organizer.md`. |
| 6 | **Agenda ↔ Speakers sync** via `event_agenda_speakers`. | One join table, pickers on both forms. |
| 7 | **Promo codes on paid hackathons**, scoped whole event or one competition (`promo_codes.track_id`). | Reuses Access SKUs. |
| 8 | **Hackathon Settings apply-to** stays as-is. | Already correct. |
| 9 | **Phases & Tasks** filter (All / one competition) and search. | Cleaner CRUD without splitting tabs. |
| 10 | **Scoreboard** counts only completions whose `task_id` belongs to the selected track. | No cross-track leakage. |
| 11 | **Hackathon team export** — one xlsx, two sheets (team summary + member detail). | Exports lives on the unified dashboard. |

---

## Design decision — Teams tab vs grouped Attendees

- `registration_groups` (regular group events): thin, no join codes.
- `hackathon_teams` unchanged.
- `registrations.group_id` only for non-hackathon group events.
- Shared `<GroupedAttendeeList />`.

Hackathon **Teams** tab stays for join codes, leftover assign, and cross-competition ops.

---

## How something becomes a hackathon

`isHackathon` / `eventIsHackathon`: format, type, or title contains "hackathon," or the event has `hackathon_tracks`. That flag drives **tabs**, not a second dashboard.

- **List:** `/organizer/{orgId}/events` includes hackathons; `?kind=hackathon|event|all`. Rail Hackathon (if `hackathon_ops`) opens `.../events?kind=hackathon`. `/organizer/{id}/hackathon` redirects there.
- **Create:** one wizard. Basic step **"Is this a hackathon?"** (`?hackathon=1` pre-sets it). `/hackathon/create` redirects to `.../events/create?hackathon=1`.
- **Dashboard:** `/organizer/{id}/events/{eventId}/…`. Old `/hackathon/{eventId}/…` redirects. `hackathonDashPath` writes events URLs.

`hackathon_ops` gates Competitions, Phases & Tasks, Teams, Submissions, Scoreboard, Settings (lock panel, not hidden). Certificates still needs `certificates`.

---

# Unified Event Dashboard

**Layout:** `src/app/organizer/[organizer_id]/events/[eventId]/layout.tsx`

Tabs in order: Overview, Attendees (if registration on), Staff, Access, Agenda, Speakers, Vendors, Sponsors, then hackathon-only Competitions / Phases & Tasks / Teams / Submissions / Scoreboard / Settings, then Certificates, Exports.

No Tickets tab. `/tickets` → Attendees on hackathons, Access otherwise.

Public enter/compete and `hackathon_tracks` / `hackathon_teams` are unchanged.

---

# File map

| Area | Open these |
|---|---|
| Unified tabs | `src/app/organizer/[organizer_id]/events/[eventId]/layout.tsx` |
| Attendees | `AttendeeClientSide.tsx`, `GroupedAttendeeList.tsx` |
| Regular groups | `src/features/registration_groups/` |
| Occupancy | `occupyingHackathonRegs`, `occupyingGroupRegs` in `registration.service.ts` |
| Staff | `teamEngine.service.ts`, `staffAdvanced.action.ts` |
| Promos | `TiersPromosOnAccess.tsx`, `TicketingService.applyPromo` |
| Agenda/Speaker join | `agendaSpeakers.service.ts` |
| Phases & Tasks | `HackathonPhasesTasksPanel.tsx` |
| Scoreboard | `trackTaskScoreboard` in `tasks.service.ts` |
| Exports | `eventSheets.ts` kind `hackathon_teams` |
| Wizard | `EventWizardLayout.tsx` (`isHackathon` on the form, not `intent`) |
| Public group register | `RegistrationForm.tsx`, `registerAttendee.action.ts` |
