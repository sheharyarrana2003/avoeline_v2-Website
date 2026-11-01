# Phase 3 — Department, Clubs, Tenures, Announcements

**Status:** done (2026-10-12)

Follow `docs/ENGINEERING_RULES.md`. This prompt wins over doc 11 / `02-department.md` on conflicts (invite-only presidents; `events.tenure_id`).

## Shipped

1. Migration: tenure one-current + no-overlap, `events.tenure_id`, `start_org_tenure` RPC, announcement columns + `announcement_deliveries`.
2. Department events: `ScopedEventsTable`, filter chips, public row links, tenure on create.
3. Clubs: cards + three two-step modals; invite link (no password); grant/revoke; start tenure.
4. Club detail tabs + `/department/tenures` aggregate.
5. Announcements: audience/channels, resolve recipients, notify, delivery log, rate limit + 500 cap.
6. Analytics tenure filter; doc 11 Part 9; `completeContext.md`.

## Verification

- `npm run typecheck`
- Manual: invite email has no password; tenure overlap rejected; announcement log expandable; past tenure RO.
