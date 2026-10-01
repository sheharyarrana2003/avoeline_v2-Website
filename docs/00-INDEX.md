# Avoeline — Docs Index & Context File

**Read this file first, always.** It tells you which other doc to open for a given task — do not load every doc in this folder into context for every request, only the one(s) relevant to what's being built. This is deliberate: each doc below is self-contained so a single feature request only needs a single file's worth of context.

## Stack & Conventions (apply everywhere, don't re-derive)

- Next.js 14+ App Router, TypeScript, Tailwind CSS
- Supabase: Postgres + Auth + Storage + Realtime (see `Avoeline_Supabase_Complete_Schema.md` for the full table reference — that file is the source of truth for every table/column name used across all docs below)
- Reuse existing components rather than rebuilding: `<DynamicFieldRenderer />` (dynamic forms — used for category custom fields, recruitment forms, AND now department/club budget request forms), `<InviteByEmail />` (used for department invites, club president invites, AND now organizer/vendor onboarding), the three-tier RLS pattern (`is_platform_admin()` → own-resource → org-membership).
- Module/plan gating pattern: every paid feature checks a `feature_overrides` or `organizer_profiles.plan_type` before rendering — see `04-organizer.md` for the exact gating table.

## Which doc to open, by task

| Working on... | Open only this file |
|---|---|
| SaaS owner subscriptions, tenant approvals, admin-created accounts | `01-saas-owner.md` |
| Department dashboard, club oversight, tenures, budgets | `02-department.md` |
| Club president portal, club team roles, requests to department | `03-club-president.md` |
| Organizer dashboard, any paid vs free feature question | `04-organizer.md` |
| Badges, networking, meetups, discounts | `05-networking-badges.md` |
| Participant-facing hackathon screens (scoreboard, submissions, tasks) | `06-hackathon-participant.md` |
| Organizer-facing hackathon setup/config (CTF flags, Docker, phases) | `07-hackathon-organizer-config.md` |
| Build order, parallelizing work, database performance | `08-build-flow-and-optimization.md` |

## Cross-cutting rule for this whole batch of features

Every new "who can see/do what" feature below (dashboard tab access, plan gating, department→club permission, badge unlocks) should route through the SAME permission-check function, not a new one per feature. If you're about to write a new `if (user.role === ...)` check, stop and check whether `checkPermission(userId, permissionKey)` (built in the RBAC module) already covers it — extend that function's permission key list instead of adding a parallel check elsewhere.
