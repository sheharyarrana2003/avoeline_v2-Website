# Phase 6 — Teams module (one shared feature) + role-based access

**Status:** done  
**Source plan:** `.cursor/plans/phase_6_teams_843d1d54.plan.md`

## Interpretation

Left-rail **Teams** and event **Staff** are the same staff/ops library (`TeamsManager`). Hackathon participant **Teams** (`hackathon_teams`) stays separate.

## Shipped

- Migration `20261012180000_phase6_teams_access.sql`: `access_grants`, `recruitment_forms.public_token`, `team_members.source`, position/applicant uniques, legacy `page_*` remap
- `src/lib/permissions.ts` + `can()` via grants ∪ positions; `staffEventAccess` uses `TAB_PERMISSION`
- `TeamsManager` on organizer teams, event Staff, club teams
- Export modal → xlsx Teams + Members
- Recruitment on event `FormBuilder`; public `/apply/[token]`; legacy staff-apply redirects
- Grant invite UI; SaaS tenant create no longer emails passwords
- Doc 11 Staff + completeContext; duplicate-Staff audit closed

## Key paths

| Area | Path |
| --- | --- |
| Migration | `supabase/migrations/20261012180000_phase6_teams_access.sql` |
| Catalog | `src/lib/permissions.ts` |
| UI | `src/features/teams/components/TeamsManager.tsx` |
| Apply | `src/app/apply/[token]/page.tsx` |

## Follow-ups

- Platform/department org surfaces can embed `TeamsManager` more deeply where old OrgManagementView still owns CRUD
- Interview email timezone UX polish
