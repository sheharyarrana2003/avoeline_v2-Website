# O2 Attendees audit follow-up

**Status:** done  
**Date:** 2026-11-07

## Goal

Close Attendees gaps called out after the O2 audit: toolbar Email/Sheets IA, drawer status history and check-in actor, join-code lifecycle, email preview / member QR, and visibility tests.

## Shipped

- Toolbar **Email** dropdown (`AttendeeEmailMenu`) wrapping registration + bulk composers; **Exports/Sheets** always linked.
- `setCheckIn` records the acting user in `checked_in_by`.
- Participant drawer: status history list; check-in method + who; phase/event validity copy.
- Organizer `rotateTeamJoinCode` revoke/regenerate; `joinCodeRevoked` enforced in `canJoin`.
- Registration email live preview; optional `email_members_qr` fan-out.
- Unit tests: `roster.visibility.test.ts`, `canJoin` revoked case.

## Follow-ups

- Full Playwright O8 matrix still deferred.
- Resolve `checked_in_by` UUID to display name in the drawer when a user lookup is cheap.
