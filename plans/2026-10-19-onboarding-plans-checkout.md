# Onboarding, plans, and bank checkout

**Status:** done (2026-10-19)  
**Source:** `.cursor/plans/onboarding_plans_checkout_8c9c70a5.plan.md`

## Shipped

- Auth: Google OAuth + email/password; `/auth/callback`; choose-role for Google users without `user_type`
- Funnel: verify email → profile → plan (organizer + vendor); free activates immediately; paid uploads screenshot
- Schema: `onboarding_status`, `pending_plan_key`, `subscription_plans.audience`, `vendor_profiles.plan_type`, `platform_billing_settings`, `plan_changes.vendor_id`
- Admin: `/admin/settings/billing`, `/admin/billing/pending`; PlansBoard audience
- Proxy gates incomplete setup and awaiting payment
- Docs: `docs/onboarding-plans-checkout.md`

## Follow-ups

- Configure Google provider in Supabase dashboard
- Seed real bank details in production
- Optional: vendor plan change UI on admin vendor detail (tenants path covers approve payments)
