# Public event DTO + page rebuild (Phases 3–4)

**Status:** done (Phases 3–4 of admin orgs + public event plan)  
**Date:** 2026-10-25

## Shipped

### Phase 3 — DTO + toggles

- Migration `supabase/migrations/20261025120000_event_public_show_toggles.sql` (`show_sponsors|collaborators|partners`, default false).
- `src/features/events/publicEvent.service.ts` — `getPublicEventView` allowlisted `PublicEventDto`; gated/unavailable/full+preview; `resolveRegisterButtonState`; `getPublicEventMeta` for SEO.
- EventModel + `EventService.update_event` map `show_*`.
- Sponsors tab: `PublicShowToggles` + `updatePublicShowToggles` safeAction.
- `/e/[eventId]` short redirect unchanged (query preserved).

### Phase 4 — Public page

- Rebuild `src/app/events/[eventId]/page.tsx` on DTO only.
- Components under `src/features/events/components/public/`.
- RegistrationForm hides “Your details” when no fields; empty fields → `seedDefaultsForEvent` once.
- SEO: `generateMetadata`, JSON-LD, `loading.tsx`, `revalidate = 60`.

## Gaps / follow-ups

- Wizard show_* switches not wired (Sponsors tab only).
- Public tracks/mentors pages still use `getEventForVisitor` (full EventModel).
- Phase 5 Vitest (DTO leak, register matrix, toggles) + docs/11 Part 2 polish.
- Share control in hero reuses light `ShareEventLink` styling on dark gradient.
