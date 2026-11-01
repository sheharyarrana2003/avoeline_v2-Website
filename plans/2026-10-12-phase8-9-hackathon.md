# Phase 8-9 Hackathon organizer and participant

**Status:** done  
**Source:** Cursor plan `phase8-9-hackathon`

Prompt wins over `docs/11-events-and-hackathon-complete-spec.md`. Follow `docs/ENGINEERING_RULES.md`.

## Locked defaults

- Timezone helpers on `src/lib/datetime.ts`; inputs in event timezone, store UTC.
- Track columns: `opens_at`, `closes_at`, `registration_closes_at`, `roster_locks_at`, `submission_deadline_at`.
- Ordering when set: registration_closes ≤ roster_locks ≤ opens ≤ submission_deadline ≤ closes.
- Late policy: `flag` (default) or `reject`.
- Instructions: sanitized HTML + optional attachment.
- Keep `hackathon_task_assignments`; final project separate from per-task submissions.
- Stubs: docker_sandboxing / daily_shifts = Not active yet.
- **Config scope:** migrate `hackathon_config.track_id` to nullable + `event_id`; null = all competitions; track row overrides. (Today track_id is NOT NULL and “apply to all” duplicates rows.)

## Phase 8

1. Fix `saveTrack` `formatDate` → slash dates into timestamptz; datetime-local + ordering; phase windows; regression test.
2. `hackathon_task_submissions` + bucket; organizer Submissions tab (filters, drawer, review, export). Also pings/integrity/task_starts tables.
3. Scoreboard: second-precision, tie-break caption, first-blood; track isolation test.
4. `getEffectiveConfig` + server enforcement; `docs/hackathon-settings-matrix.md`; Settings conflict warnings.
5. Competition instructions in modal; update doc 11 + completeContext.

## Phase 9

1. `getParticipantAccess` reason UI on enter/compete.
2. Short-lived httpOnly cookie; lockout audit; cookie-gated actions.
3. Tabbed compete workspace; rules ack; Active rules panel.
4. Task submit panel (text/link/file/flag); signed uploads; own submissions.
5. Heartbeat + tab visibility when settings on.
6. Read-only scoreboard; own team highlight; no peer private data.

## Key paths

- Organizer: `HackathonWorkspace.tsx`, `tracks.action.ts`, `tasks.service.ts`, `configKeys.ts`
- Participant: `competeSession.ts`, `enterCompete.action.ts`, `compete/page.tsx`
