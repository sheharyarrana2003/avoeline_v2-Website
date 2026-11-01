# Admin Tenant accounts redesign

**Status:** done (Phases 0–5)  
**Date:** 2026-10-25

## Summary

Rebuild `/admin/tenants` as a multi-tab board with batched reads, fine-grained `TENANT_CAPS`, safeAction writes, manage drawer, and form→preview→confirm modals. Passwords are never emailed.

## Phases

| Phase | Scope | Outcome |
| --- | --- | --- |
| 0 | Migration, TABLES, email kinds/log/templates, cron | Applied |
| 1 | Shell + Tenants tab + `getTenantBoardBundle` | Shipped |
| 2 | Manage drawer (Plan / Features / Pricing / History) | Shipped |
| 3 | Create / Change plan / Grant-deny / Pricing actions + modals | Shipped |
| 4 | Approvals / Overrides / Pricing / Activity tabs | Shipped |
| 5 | Unit tests + docs + plans archive | Shipped |

## Key paths

- Page: `src/app/admin/tenants/page.tsx`
- Service/filters: `src/features/saas/tenantBoard.*`
- UI: `src/features/saas/components/tenants/*`
- Actions: `src/features/saas/actions/{tenants,subscriptions}.action.ts`
- Caps: `src/features/admin/types.ts` (`TENANT_CAPS`, `canTenantCap`)
- Mail: `src/features/email/tenantMail.service.ts`, `docs/16-platform-email.md`

## Constraints honored

- safeAction + zod + rateLimit; no `select('*')` on board reads
- Promise.all batched queries; no per-card round trips
- Never email passwords; never roll back domain write on email failure
- `buttonClass`, StatusBadge, EmptyState, ConfirmDialog, Modal, FilterTabs
