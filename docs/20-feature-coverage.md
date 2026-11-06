# 20 — Feature coverage matrix

**Status:** Restored stub (audit AUD-1-003). Section 6 is the sign-off matrix for role × plan × implementation × tests. Expand as Passes 4–6 complete.

## 1. Roles (columns used below)

| Code | Role |
|------|------|
| PO | Platform owner |
| PS | Platform staff (area/cap grants) |
| DA | Department admin |
| CP | Club president / executive |
| OF | Organizer free plan |
| OP | Organizer paid plan |
| TL | Team lead with access grant |
| V | Vendor |
| A | Logged-in attendee |
| G | Guest |

## 2. Plans / modules

Source of truth: `src/features/permissions/moduleKeys.ts` + `subscription_plans.included_modules` + `feature_overrides`.

## 3–5. (Reserved)

Routes, tables, and third parties: see `docs/audit/01-inventory.md` and `completeContext.md`.

## 6. Feature coverage matrix

Legend: **I** implemented in tree · **T** automated tests present · **U** untested / Pass pending · **—** N/A

| Feature | Roles | Free/Paid | I | T | Notes |
|---------|-------|-----------|---|---|-------|
| Events dashboard / CRUD | OF OP DA CP | free `events_dashboard` | I | Partial | docs/11 |
| Registrations / ticketing / promo | OF OP A G | free `registrations` | I | Partial | Pass 4 |
| Access control / invites | OF OP | free `access_control` | I | U | |
| Teams basic | OF OP | free `teams_basic` | I | Partial | docs/12 |
| Teams advanced / recruitment / grants | OP TL | paid `teams_advanced_roles` | I | Partial | docs/12 |
| Hackathon ops | OP A G | paid `hackathon_ops` | I | Partial | docs/11 |
| Certificates | OP G | paid `certificates` | I | Partial | |
| Analytics | OF OP | free `analytics_basic` | I | Partial | |
| Vendor store / quotes | OP V | paid `vendor_store` / vendor modules | I | Partial | |
| Ushers | OP | paid `ushers_ops` | I | U | |
| AI designer / planner | OP | keys in catalog | I | U | |
| Sponsors | OF OP | free/paid keys | I | U | |
| Platform email (Resend) | PO PS | n/a | I | Partial | docs/16 |
| Connections Google | OF OP V DA | email caps docs/18 | I | Partial | docs/17 |
| Marketing website + CMS | G PO PS | website caps | I | Partial | docs/19 |
| Consent / legal | G A PO | n/a | I | Partial | |
| Custom Forms library | OF OP G | **free** (default until priced) | I | U | `/forms`, `/f/[token]` |
| Attendee Excel/Sheets import | OF OP | n/a | I | U | via Connections C6 server |
| Departments / clubs / tenures | DA CP PO | org modules | I | U | |
| SaaS tenants / plans / overrides | PO PS | n/a | I | Partial | |
| Badges / networking | A | — | Partial | U | docs/05 legacy |
| API access / website_builder | OP | paid keys | Keys only | U | product surface TBD |

Update this table when behavior or gating changes; keep `completeContext.md` in sync.
