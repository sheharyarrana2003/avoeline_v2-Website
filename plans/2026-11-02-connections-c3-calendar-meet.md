# Connections C3 — Calendar and Meet

**Status:** done (2026-11-02) — pause for review before C4.

## Scope lock

**In:** docs/17 §§2, 7 and C3 prompt items 1–5.

**Out:** Drive/Picker (C4), live sheets (C5), reading existing Google calendars’ full contents, changing Google sharing, AI use of Calendar data.

**Locked defaults:**
- Scope: `https://www.googleapis.com/auth/calendar.events` only; incremental consent via `include_granted_scopes`.
- Catalog `calendar` and `meet` active; connecting either enables both capabilities when scope granted.
- `sendUpdates=none` except interview opt-in → `all`.
- Entity types: `interview` | `mentor_slot` | `judging_session` | `hackathon_session` | `agenda_item` | `event`.

## Shipped

1. Migration `supabase/migrations/20261103210000_calendar_links.sql` + `TABLES.CALENDAR_LINKS` + `event_agenda_items.add_to_calendar`.
2. `GoogleCalendarClient` — list/create/update/delete + Meet conference + pending poll + 429 backoff.
3. `calendarSync.service` — idempotent upsert/delete; `calendar.action` + `CalendarPicker` / `CalendarSyncControls`.
4. Hooks: recruitment interview, EditBasics event dates, agenda create, mentor booked slots, hackathon judging window + online session.
5. Fallbacks: `calendarFallbacks.ts`; public hero + ticket `.ics` + Google TEMPLATE.
6. Tests: `src/features/connections/__tests__/c3Calendar.test.ts` (wired in `test:unit`).

## Key paths

- `src/features/connections/providers/google/calendar.ts`
- `src/features/connections/server/calendarSync.service.ts`
- `src/features/connections/lib/calendarFallbacks.ts`
- `src/features/connections/components/CalendarSyncControls.tsx`
- `docs/17-connections-system.md` (C3 status)
