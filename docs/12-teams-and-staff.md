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

## Not this document

Hackathon **occupancy** teams (`hackathon_teams`), the removed **Competitors** tab, and competition date fields (Phase 8 / A7) are **not** covered here. See:

- [`docs/11-events-and-hackathon-complete-spec.md`](11-events-and-hackathon-complete-spec.md) — Competitions + Attendees
- [`docs/07-hackathon-organizer-config.md`](07-hackathon-organizer-config.md) — keep-list fields + `registration_closes_at` auto roster lock
- [`docs/removal-inventory.md`](removal-inventory.md) — A7 removals

**Phase 8 date fields (post-A7):** only optional `hackathon_tracks.registration_closes_at` remains editable. Roster locks when that timestamp passes (per-team unlock still allowed). Participant work windows are `hackathon_phases.opens_at` / `closes_at` (always gate submit/flag for phased tasks; O6). Deprecated track columns (`opens_at`, `closes_at`, `roster_locks_at`, `submission_deadline_at`) are retained in Postgres but not written by the app.

## Related

- UI rules: `docs/11-events-and-hackathon-complete-spec.md` (Teams / Staff sections)
- Engineering: `docs/ENGINEERING_RULES.md` S2, S6, S7
- Coverage matrix: `docs/20-feature-coverage.md`
