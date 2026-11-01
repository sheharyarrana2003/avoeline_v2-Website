# Plans index

| Date | Slug | Status | Summary |
| --- | --- | --- | --- |
| 2026-10-07 | [firebase-supabase-cutover](2026-10-07-firebase-supabase-cutover.md) | done | Full cutover off Firestore façade to `supabaseAdmin` + `TABLES` |
| 2026-10-07 | [project-standardization](2026-10-07-project-standardization.md) | archived | Original standardization plan snapshot (waves, gates, delete façade) |
| 2026-10-11 | [plans-archive-and-verification](2026-10-11-plans-archive-and-verification.md) | done | Plans archive + CI/RBAC verification + page-load parallelization |
| 2026-10-11 | [admin-auth-and-audit](2026-10-11-admin-auth-and-audit.md) | done | Admin AuthError mapping, staff `assertEventActor`, registration auth, revokeAdmin status, Firebase surface purge |
| 2026-10-12 | [phase1-bc-tooling-primitives](2026-10-12-phase1-bc-tooling-primitives.md) | done | Env/zod/safeAction/rateLimit/CSP/knip/husky + C3 UI; pause before Phase D |
| 2026-10-12 | [phase2-saas-owner-dashboard](2026-10-12-phase2-saas-owner-dashboard.md) | done | No Enter View; admin dept/club detail; EventThumb; public status banners; vendor approved; support threads; staff view/manage; audit |
| 2026-10-12 | [phase3-department-clubs-tenures](2026-10-12-phase3-department-clubs-tenures.md) | done | Dept events chips; invite presidents; tenure constraints/RPC; announcements delivery; analytics tenure filter |
| 2026-10-12 | [phase4-event-tabs](2026-10-12-phase4-event-tabs.md) | done | maps_url; email modals; access help; collaborator/partner model; own vendors; Expenses tab + SQL totals |
| 2026-10-12 | [phase5-certificates](2026-10-12-phase5-certificates.md) | done | JSON templates + versions; on-demand SVG/PDF; no blockchain; Konva editor; API ETag + verify-by-code |
| 2026-10-12 | [phase6-teams](2026-10-12-phase6-teams.md) | done | TeamsManager + access_grants; FormBuilder apply; can() tabs; uniques; no password email |
| 2026-10-12 | [phase7-registration-forms](2026-10-12-phase7-registration-forms.md) | done | event_form_fields engine; wizard/Access editor; public form from defs; redeem_promo; exports |
| 2026-10-12 | [phase8-9-hackathon](2026-10-12-phase8-9-hackathon.md) | done | Organizer dates/submissions/scoreboard/settings enforcement + participant compete workspace |
| 2026-10-12 | [phase10-hardening](2026-10-12-phase10-hardening.md) | done | Security re-audit, indexes, CSP, keyset, knip/dep cleanup, tests/docs, final report |
| 2026-10-12 | [schema-optimization](2026-10-12-schema-optimization.md) | done | Inventory→Step6 harden→scream→DROP 4 unused tables; schema.md + status CI |
| 2026-10-18 | [phase10-schema-gaps](2026-10-18-phase10-schema-gaps.md) | done | Gap closure: advisors/RLS, hot selects, loaders/keyset, capacity+fee, docs; no new DROPs |
| 2026-10-18 | [full-project-audit](2026-10-18-full-project-audit.md) | done | Full audit report + backlog: security, unused, DB, parallel load, tokens/UI kits |
| 2026-10-18 | [enterprise-email-system](2026-10-18-enterprise-email-system.md) | done | Platform Resend lanes + Bcc info@; organizer Google/SMTP fail-closed; lifecycle templates |
| 2026-10-19 | [onboarding-plans-checkout](2026-10-19-onboarding-plans-checkout.md) | done | Self-serve organizer/vendor onboarding + vendor plans + bank checkout approval |
| 2026-10-19 | [hackathon-e2e-audit](2026-10-19-hackathon-e2e-audit.md) | done | Demo Spring live E2E; enter/CTF/security P0–P1; seed leads/timers; Playwright + report |
| 2026-10-20 | [reset-wipe-data](2026-10-20-reset-wipe-data.md) | done | CONFIRM=YES wipe: all public rows + Storage + Auth; no export; re-seed owners manually |
| 2026-10-22 | [saas-admin-ux-overhaul](2026-10-22-saas-admin-ux-overhaul.md) | done | Owner dashboard/cards/tenant modal; Google-only email; plan alerts; pending self-signup; vendor free limits; quotation templates; image compress |
| 2026-10-24 | [organizer-event-overhaul](2026-10-24-organizer-event-overhaul.md) | done | Event wizard/edit/archive; 4:5 media; emails+QR; cert links; public pages; compete; Team/Competitors rename |
| 2026-10-25 | [admin-events-redesign](2026-10-25-admin-events-redesign.md) | done | `/admin/events` All/Flagged/Log board; Moderate modal; moderation_unpublished; report rate-limit |
| 2026-10-25 | [admin-orgs-public-event](2026-10-25-admin-orgs-public-event.md) | done | Admin OrgBoard + dept/club identity split; show_* toggles; allowlisted public DTO + rebuilt /events/[id] |
| 2026-10-25 | [public-event-dto-rebuild](2026-10-25-public-event-dto-rebuild.md) | archived | Subset notes for Phases 3–4 (superseded by admin-orgs-public-event) |
| 2026-10-25 | [admin-tenants-redesign](2026-10-25-admin-tenants-redesign.md) | done | `/admin/tenants` board + caps + drawer + preview modals; passwords never emailed |
| 2026-10-25 | [organizer-dash-events-analytics](2026-10-25-organizer-dash-events-analytics.md) | done | Dashboard occupancy/recent regs + plan on profile; My Events URL toolbar; Analytics filters/chart + ticket feedback/Gemini cache |
| 2026-10-27 | [organizer-teams-rebuild](2026-10-27-organizer-teams-rebuild.md) | done | Tabbed Teams/Recruitment/Access; stats RPC; FormBuilder apply; grants + requireConnectedSender; event tab label Team |
| 2026-11-01 | [marketing-website-foundation](2026-11-01-marketing-website-foundation.md) | done | W1: (marketing) chrome + headers; CMS tables/RLS/stats RPC; block registry; /admin/website caps |
| 2026-11-01 | [marketing-w2-public-pages](2026-11-01-marketing-w2-public-pages.md) | done | W2: live marketingData + public pages, metadata/legal/sitemap; empty sections hide |
| 2026-11-01 | [marketing-w3-admin-cms](2026-11-01-marketing-w3-admin-cms.md) | done | W3: /admin/website editors, partner opt-in, legal notify cap, media WebP, contact inbox |
| 2026-11-01 | [marketing-w4-consent-privacy](2026-11-01-marketing-w4-consent-privacy.md) | done | W4: consents, unsubscribe, Community/Insights, DSAR, audited registration PII |
| 2026-11-01 | [marketing-w5-hardening](2026-11-01-marketing-w5-hardening.md) | done | W5: sanitize/XSS, security+SEO tests, Lighthouse script, CSP scrub, docs |

## Open follow-ups (not blocking this tranche)

| Item | Notes |
| --- | --- |
| ESLint debt | Large pre-existing issue count; `no-console` is warn-only |
| Dual UI kits | `components/ui` + `shared_components/ui` — prefer shared for new UI |
| Full safeAction migration | Remaining actions still on legacy `ActionResult` |
| Phase 1 D | Firebase surface gone; blockchain cert path removed in Phase 5 — re-knip for any leftover dead exports |
| Typo service shims | `registeration` / `anayl` / `event_venders` — leave re-exports; no mass rename |
| CDN / Redis caching | Out of scope for page-speed / audit tranches |
| Playwright browsers + seed e2e | Install chromium when CDN reachable; full reg/payment/check-in/cert suite needs seed |
| Auth HIBP | Enable leaked-password protection in Supabase Auth dashboard |
| Next / sharp bump | Residual npm audit high/critical via Next-pinned sharp — approve Next 16.4+ separately |
| Schema INVESTIGATE | C2/C3/C9/C10 KEEP until product answers — then scream→DROP if approved |
| Full audit P0 | HIBP dashboard; rateLimit on public sign-in + uploadMedia; Next bump for sharp — see `docs/full-audit-2026-10-18.md` |
| Marketing analytics | docs/19 §10 cookieless vs GA still undecided |
| Marketing Lighthouse | Run `npm run report:marketing` locally and fill `reports/marketing/CHECKLIST.md` |
