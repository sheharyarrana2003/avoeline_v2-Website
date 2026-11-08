# O2 Overview and Attendees — one build

**Status:** done  
**Date:** 2026-11-08

## Goal

Close remaining docs/22 O2 Overview + Attendees gaps in one pass (no mid-pause).

## Shipped

- Overview: `ticket_tiers` fee source, full registration window + description in Key details, Day-1 Agenda copy, empty-tracks hackathon tile, `hasLimitedCapacity`.
- Attendees: check-in actor display names; join valid-until = later of last phase close and event end (UI + `joinTeam`).
- Email: `requireConnectedSender`; maps link; form answers on received; inline member QRs when team size ≤ 10 else ticket links; free payment strip; composer live preview on registration + member forms.
- Tests: overviewFacts, roster visibility, joinCodeValidity, canJoin, emailCompose.logic, eventSheets columns; C5 sanitize remains green.
- Docs: `completeContext.md`, `docs/22-o2-o8-status.md`, this plan.

## Follow-ups

- Playwright O8 matrix on demo data.
- Resolve maps when only address text exists (still https-only paste links).
