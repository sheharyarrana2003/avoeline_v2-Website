# 15 — Security baseline (cross-cutting)

**Status:** Restored stub (audit AUD-1-003). Detailed Connections hardening remains in `docs/connections-security-review.md` and `docs/17-connections-system.md`. This file is the product-wide checklist that maps to `docs/ENGINEERING_RULES.md` §1.

## Non-negotiables

1. **S2** on every server action and route handler: session → ownership → `hasModuleAccess` → `can()` → zod.
2. **S3** RLS on every public table; private storage via short-lived signed URLs.
3. **S6** `rateLimit` on login, registration, promo, access-code, flag submit, invite open, support, bulk email, public apply.
4. **S7** invite/apply tokens ≥128-bit; access codes hashed; lockout on failures.
5. **S9** no impersonation / “Enter view”.
6. **S12** ticket and status pages use unguessable tokens; public DTOs omit organizer contact, meeting links, access codes, promo secrets, attendee/team PII.
7. **S16** lockfile committed; `npm audit` clean for high/critical.
8. **S19** leak scan (gitleaks/trufflehog) including history before launch.

## Proxy vs page auth

`src/proxy.ts` matches organizer/vendor/attendee/admin/department/clubs (+ selected auth paths). Tokenized public routes (`/events/.../ticket`, `/judge`, `/apply`, `/f`, `/collaborate`) rely on page/action checks — Pass 2 of the project audit must prove each one.

## Related

- Connections: `docs/17-connections-system.md`, `docs/connections-security-review.md`
- Platform email: `docs/16-platform-email.md`
- Engineering rules: `docs/ENGINEERING_RULES.md`
