---
name: Event Module Phase E
overview: "Hackathon Phase E: judge Gmail invites + accept page; public competition prizes/registration gates; task briefs/Drive + organizer notes; submissions scoreboard polish; settings matrix doc for Phase B removals."
status: done
---

# Event Module Phase E

## Shipped

- Judge invites via `sendViaOrganizerConnection`; track configure invite panel; `/judge/[token]` accept-only (no ScoreForm).
- Public `PublicCompetition` prizes, discounts, `trackRegistrationOpen` vs event close.
- Task `extra` organizer brief + Drive file; submission `organizer_notes`; `TaskSubmissionsPanel` always lists timestamped rows.
- `LiveScoreboardTable` shows teams at zero points.
- Migrations: judge/task `extra`, submission `organizer_notes`, judges `updated_at`.
- `docs/hackathon-settings-matrix.md` Phase B removal table; `completeContext.md` updated.

## Follow-ups

- Apply `supabase/migrations/2026110712*.sql` on remote; run `npm run types:db` if schema drifts.
