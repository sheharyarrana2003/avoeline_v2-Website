# N7 Connections page redesign

**Status:** done  
**Date:** 2026-11-10  
**Spec:** docs/23 N7 + A2–A3; docs/17; docs/18; ENGINEERING_RULES

## Summary

Rebuilt organizer Connections into a single page: one Google account card per connected account, then Email / Calendar and Meet / Drive and Files / Sheets cards. Removed the Accounts/Library/Calendar/Sheets/Sent tab bar and the Back to profile · Custom Forms links. Fixed the false “OAuth not configured” UX (rows can exist while `googleConnectionsConfigured()` is false), added admin-only env diagnostics, specific safe errors, and create-then-cleanup smoke tests per integration.

## Shipped

- Structure: `GoogleAccountCard` + four capability cards in `ConnectionsHub` (no tabs).
- Incremental **Enable** via existing `startOAuthConnect` + `requiredScopesForCapability`.
- Smoke actions: calendar event, Meet link, Drive folder, sheet (create + delete); Email test only on Email card.
- `diagnoseGoogleConnectionsEnv()` + `ConnectionsOAuthStatus` (organizer copy + admin panel).
- `formatConnectionUserError` / sanitized `mapGoogleApiError` `other`.
- Redirects: library → `?section=drive`, email-batches → `?section=email`, legacy `?tab=` remapped.
- Tests: `n7ConnectionsHub.test.ts`, `n7SmokeActions.test.ts`.

## Key paths

- `src/features/connections/components/{ConnectionsHub,GoogleAccountCard,CapabilityIntegrationCards,ConnectionsOAuthStatus,ConnectDialog,ScrollToConnectionSection}.tsx`
- `src/features/connections/server/connectionSmoke.service.ts`
- `src/features/connections/lib/{connectionUserErrors,connectionCardHelpers}.ts`
- `src/env.ts` — `diagnoseGoogleConnectionsEnv`
- `src/app/organizer/[organizer_id]/settings/connections/page.tsx`
