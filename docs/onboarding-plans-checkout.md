# Onboarding, plans, and bank checkout

## Self-serve funnel (organizer + vendor)

1. **Sign up** — email/password or Continue with Google (`/auth/signup`, `/auth/signin`).
2. **Verify email** — required before profile/plan (Google accounts are verified by Auth).
3. **Profile** — organizer org/logo details or vendor business details.
4. **Plan** — free → dashboard; paid → bank details + screenshot → awaiting approval.
5. **Owner approves** — `/admin/billing/pending` → plan activated + email.

Admin-created tenants (`/admin/tenants/new`) still support department / organizer / vendor and assign plans immediately.

## Google OAuth setup

1. Supabase Dashboard → Authentication → Providers → Google: enable and add Client ID/Secret.
2. Authorized redirect URL: `https://<your-domain>/auth/callback` (and local `http://localhost:3000/auth/callback`).
3. Optional: pass preferred role via signup “Continue with Google” (uses selected account type).

## Bank details

Owner edits platform bank / JazzCash / EasyPaisa at `/admin/settings/billing`. Those values appear on paid-plan checkout.

## Plans

- `/admin/plans` — audience `organizer` | `vendor` | `both`, modules, pricing.
- Vendor starter keys: `vendor_free`, `vendor_pro` (edit anytime).
- Organizer plans keep existing keys (`free`, etc.).

## Env

No new required secrets beyond existing Supabase + Resend. Google Auth is configured in the Supabase project, not only in `.env`.
