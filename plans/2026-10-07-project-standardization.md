# Project standardization plan (archived snapshot)

**Status:** archived — work completed; see [cutover retrospective](2026-10-07-firebase-supabase-cutover.md).  
**Original intent:** Standardize the product on Supabase-only data access, remove Firebase-era façades, and set CI/test gates.

## Scope (as planned)

1. **Guards** — Require service role; document canonical standards; ban re-import of `admin_db`.
2. **Domain waves** — Migrate features off `adminDb` / `FieldValue` / Firestore-shaped APIs:
   - access, hackathon, certificates, admin, bookings, event_vendors
   - registration, attendees, orgs, taxonomy, analytics, agendas, notifications
3. **Delete façade** — Remove `data/admin_db.ts`, mockdata, dead controllers.
4. **Standards** — Naming shims for typo paths; CI workflow; unit tests for pure helpers.
5. **Docs** — Keep `completeContext.md` current after each wave.

## Non-goals (at the time)

- Full ESLint zero
- Redis / CDN redesign
- Dual UI kit merge

## Outcome

All waves shipped. Façade deleted. Demo seed (`npm run seed:demo`) remains the primary multi-role walkthrough (`docs/TESTING.md` § 0b).
