# 12 — Teams, staff, recruitment, and access grants

**Status:** Restored stub (audit AUD-1-003). Expand from `plans/2026-10-12-phase6-teams.md` and live code under `src/features/teams/`.

## Scope

- Organizer **Teams** rail: team cards, members, roles, export
- Event **Staff** assign-library + event-scoped recruitment
- Paid **Recruitment** forms, applicants, interviews, onboard
- Paid **Access** grants (presets + custom permissions) and revocation
- Public apply links (`/apply/[token]`, `/events/.../staff-apply/...`)

## Plan gating

| Surface | Module key |
|---------|------------|
| Team list / basic roster | `teams_basic` (free) |
| Recruitment + Access grants + advanced roles | `teams_advanced_roles` (paid) |

Enforce on the server (`hasModuleAccess`) then mirror in the UI. See `src/features/permissions/moduleKeys.ts`.

## Auth

- Organizer (or platform admin) owns teams for their events
- Grants are scoped; never trust client-supplied permission lists without server allowlist
- Apply tokens ≥128-bit random, hashed at rest (ENGINEERING_RULES S7)

## Related

- UI rules: `docs/11-events-and-hackathon-complete-spec.md` (Teams / Staff sections)
- Engineering: `docs/ENGINEERING_RULES.md` S2, S6, S7
- Coverage matrix: `docs/20-feature-coverage.md`
