# Admin sign-in fix + Supabase hardening audit

**Status:** done  
**Date:** 2026-10-11

## Summary

Fixed admin sign-in failing with a generic error because Firebase Auth error codes were still checked against Supabase AuthError. Hardened event staff ACL (`assertOwnedEvent` vs `assertEventActor`), gated registration cancel/waitlist promote, fixed `revokeAdmin` status enum, and purged leftover Firebase surface (comments, junk files, outdated README).

## Root cause (admin sign-in)

[`adminSignIn`](../src/features/admin/actions/signin.action.ts) only recognized Firebase codes. [`loginWithEmail`](../src/features/auth/authService.ts) throws Supabase codes (`invalid_credentials`, etc.), which collapsed into "Could not sign you in. Please try again."

Fix: [`src/features/auth/authErrors.ts`](../src/features/auth/authErrors.ts) `mapSignInAuthError`.

## Shipped

1. Supabase Auth error mapping for `/admin/signin`
2. `assertOwnedEvent` = owner/collab/dept/president/platform admin; staff via `assertEventActor(eventId, tab)`
3. `userIsEventStaff` respects staff assignment `member_ids`
4. `cancelRegistrationAction` requires owner of registration or attendees grant; waitlist promote helpers internal / gated
5. `revokeAdmin` → `account_status: suspended`
6. Deleted empty `agent` / `list` / `mcp`; Firestore comment + README/`db.ts` doc cleanup

## Verify

- `npm run test:unit` green; `tsc --noEmit` green
- Seed owner/demo admin → `/admin/signin` → `/admin`
- Wrong password → credential message; non-admin → "not an admin account"

## Follow-ups (not this tranche)

- ESLint debt, dual UI kits, typo service shim renames
