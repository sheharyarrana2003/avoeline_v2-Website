# Phase 2 — SaaS Owner & Platform Staff Dashboard

**Status:** done (2026-10-12)

Follow `docs/ENGINEERING_RULES.md`, `docs/01-saas-owner.md`. Where this conflicts with doc 11, **this plan wins**; doc 11 Part 8 updated at ship. Supabase-only; new schema via migrations + types; actions use `safeAction`/`can()`; no reintroduction of Enter View.

## Shipped

1. **No impersonation** — Enter View / `getSupportEntities` UI removed; admin deep-links to detail routes only.
2. **Detail routes** — `/admin/departments/[id]` (editable), `/admin/clubs/[id]` (read-only), org redirect by type; clubs list grouped by department.
3. **Events** — Admin columns + `EventThumb`; public page banners for closed/archived; draft preview for owner/admin; Register disabled when closed.
4. **Vendors** — Normalize `approved` (not `active`); status-only actions; expanded dossier.
5. **Support** — `support_ticket_messages` / `support_ticket_attachments` + private `support-attachments` bucket; thread UI; notify on reply.
6. **Categories** — Custom fields + checklist help + organizer preview.
7. **Plans** — Modal max-h 90vh, sticky footer, currency select, `formatCurrency`.
8. **Staff `can()`** — `area:view` / `area:manage`; no blanket `platform_admin` bypass.
9. **Audit** — `/admin/audit` from `moderation_logs`.
10. **Docs** — Part 8 in doc 11; `completeContext.md`; this archive.

## Verification

- `npm run typecheck`, `test:unit`
- Manual: Enter View gone; club Manage ≠ committee creator; completed event URL renders with banner + disabled register; approved vendor has no Approve; staff view-only cannot moderate; support reply + attachment + notify; plans modal scrolls in viewport.
