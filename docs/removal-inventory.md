# O0 removal inventory (docs/22 Part A7)

**Status:** approved — steps 2–5 executed 2026-11-07.  
**Source:** [`docs/22-event-module-overhaul.md`](22-event-module-overhaul.md) A7 / O0; [`docs/ENGINEERING_RULES.md`](ENGINEERING_RULES.md) §6 (no guess-deletes).  
**Date:** 2026-11-07

Phase B (2026-11-07) already hard-removed most organizer/public UI. This inventory is the formal list for **finishing leftovers**, deprecating DB (no drops), migrating competition fields, and aligning docs.

---

## Status legend

| Status | Meaning |
| --- | --- |
| `ALREADY_GONE` | UI/file deleted in Phase B; no further code delete needed (may still need doc cleanup) |
| `DELETE` | Remove code/export/import in step 2 |
| `STUB_DELETE` | Server action stubs still exported; delete in step 2 |
| `REDIRECT_KEEP` | Keep thin redirect route for bookmarks |
| `DEPRECATE_DB` | Do **not** drop table/column; comment deprecated; stop product writes |
| `STOP_WRITE` | Stop writing / seeding this field |
| `MIGRATE_THEN_STOP` | One-time data/shape migrate, then stop dual-write or legacy values |
| `DOCS_UPDATE` | Spec/TESTING/context still describe removed product |
| `TEST_UPDATE` | Unit/e2e expectations still cover removed fields |

---

## Out of scope (do not remove)

- Organizer ops library `/organizer/[id]/teams` (staff Recruitment/Access)
- Event dashboard **Team** tab (`.../events/.../staff`) — ops assignments
- Organizer **Scoreboard** tab + `live_scoreboard` + `LiveScoreboardTable`
- `/judge/[token]` invite accept/decline (Phase E; not rubric UI)
- Department `org_announcements`, marketing site announcement banner, platform SaaS announcement email
- Connections `EmailSendKind: "announcement"` (generic send lane)
- CTF schedule field `leadMentorOrJudge` (copy only; not hackathon mentors product)
- Calendar entity enum value `mentor_slot` (keep enum; no creators remain)

---

## Summary: Phase B vs O0 remaining

| Area | Phase B | O0 remaining |
| --- | --- | --- |
| Online / spectator / livestream UI | Gone | Dead helpers, seed write, deprecate columns, docs |
| Mentors / announcements UI | Gone; redirects | Stub actions, dead service reads, deprecate tables |
| Rubric configure UI | Gone | Orphan `judging.action` / `judging.ts`, deprecate `rubric` |
| Public leaderboard | Redirect stub | Docs; drop stale `revalidatePath` with judging purge |
| Competitors tab | Redirect → Attendees | Docs; keep redirects + `page_teams` map |
| Type dropdown | CTF checkbox on TrackForm | Wizard still defaults non-CTF to `business`; labels for legacy kinds |
| Track dates | Form cleared roster/opens/submission | Still shows submission/roster in places; **TrackForm still has `closesAt`**; auto-lock on reg close (step 4) |
| Rules / instructions | Single field on TrackForm | Dual-write both columns; wizard still split |

---

## 1. Online mode / spectator / livestream

| Ref | Path / symbol | Status |
| --- | --- | --- |
| DB columns | `hackathon_settings.online_mode`, `livestream_url` | `DEPRECATE_DB` |
| Generated types | `src/lib/database.types.ts` | leave generated; no drop |
| Column inventory | `data/tableColumns.ts` (`hackathon_settings`) | note deprecate in comments / step 2 |
| Settings select | `src/features/hackathon/hackathon.service.ts` — `HACKATHON_SETTINGS_COLS` includes online/livestream | `STOP_WRITE` / stop mapping into product types where unused |
| Settings save | `src/features/hackathon/actions/live.action.ts` — re-upserts existing `online_mode` / `livestream_url` unchanged | `STOP_WRITE` (do not preserve forever; stop selecting/writing once deprecated) |
| Types / helpers | `src/features/hackathon/live.ts` — `HackathonSettings.onlineMode`, `livestreamUrl`, `onlineSessionStart`/`End`, `embedUrl`, `livestreamUnsupported`, `EMPTY_SETTINGS` | `DELETE` unused exports |
| Form leftover | `src/features/hackathon/components/LiveForms.tsx` — `void settings.onlineMode` | `DELETE` |
| Seed | `scripts/seed-demo.mjs` — `online_mode: true` | `STOP_WRITE` |
| Public spectator LB route | `src/app/events/[eventId]/tracks/[trackId]/leaderboard/page.tsx` | `REDIRECT_KEEP` → `/events/{eventId}/tracks/{trackId}` |
| Stale revalidate | `src/features/hackathon/actions/judging.action.ts` — `revalidatePath(.../leaderboard)` | remove with judging stubs (step 2) |
| Docs | `docs/TESTING.md`, `docs/11-events-and-hackathon-complete-spec.md`, `docs/hackathon-settings-matrix.md`, `completeContext.md`, plans | `DOCS_UPDATE` |
| Tests | none for `onlineMode` / livestream | — |

**Replacement:** none (A7).

---

## 2. Mentors

| Ref | Path / symbol | Status |
| --- | --- | --- |
| Public route | `src/app/events/[eventId]/mentors/page.tsx` | `REDIRECT_KEEP` → `/events/{eventId}/tracks` |
| Component | `src/features/hackathon/components/MentorForms.tsx` | `ALREADY_GONE` |
| Action stubs | `signUpMentor`, `bookMentorSlot`, `cancelMentorSlot`, `removeMentor` in `src/features/hackathon/actions/live.action.ts` | `STUB_DELETE` |
| Service reads | `listMentors`, `mapToMentor`, `HACKATHON_MENTOR_COLS`, slot mapping in `hackathon.service.ts` | `DELETE` (no callers) |
| Domain types | `HackathonMentor`, `MentorSlot`, `MENTOR_EXPERTISE`, slot parsers in `live.ts` | `DELETE` |
| Table | `hackathon_mentors` (`TABLES.HACKATHON_MENTORS` in `data/collections.ts`) | `DEPRECATE_DB` |
| Table | `hackathon_mentor_slots` | `ALREADY_GONE` (dropped 2026-10-12) |
| Column inventory | `data/tableColumns.ts` — `hackathon_mentors` | note deprecate |
| Calendar enum | `mentor_slot` in connections types / `calendar_links` / UI label | keep enum; note only (no creators) |
| Docs | docs/11, docs/17 mentor-slot copy, settings matrix, completeContext | `DOCS_UPDATE` |
| Tests | none | — |
| Emails | no dedicated mentor templates under `emails/` | — |

**Replacement:** none (A7).

---

## 3. Hackathon announcements

| Ref | Path / symbol | Status |
| --- | --- | --- |
| Competitions / live UI composer | — | `ALREADY_GONE` |
| Action stubs | `postAnnouncement`, `removeAnnouncement` in `live.action.ts` | `STUB_DELETE` |
| Service reads | `listAnnouncements`, `mapToAnnouncement`, `HACKATHON_ANNOUNCEMENT_COLS` | `DELETE` |
| Types | `HackathonAnnouncement`, `announcementsFor` in `live.ts` | `DELETE` |
| Table | `hackathon_announcements` (`TABLES.HACKATHON_ANNOUNCEMENTS`) | `DEPRECATE_DB` |
| Column inventory | `data/tableColumns.ts` — `hackathon_announcements` | note deprecate |
| Docs | docs/11, settings matrix, completeContext | `DOCS_UPDATE` |
| Emails | no hackathon-announcement templates under `emails/` | — |

**Replacement:** organizer email composer (Connections).  
**Out of scope:** `org_announcements`, marketing banner, platform announcement email.

---

## 4. Judging rubric (configure + orphaned judge-score path)

| Ref | Path / symbol | Status |
| --- | --- | --- |
| UI | `JudgingForms`, `ScoreForm`, configure rubric card | `ALREADY_GONE` |
| Column | `hackathon_tracks.rubric` (jsonb) | `DEPRECATE_DB` |
| Create write | `tracks.action.ts` / event clone sets `rubric: []` | `STOP_WRITE` once deprecated (or keep empty insert until schema pass) |
| Read/map | `hackathon.service.ts` — `mapToRubric`, select `rubric` | stop mapping into product API |
| Logic | `src/features/hackathon/judging.ts` — `rubricMax`, `scoreCard`, `parseRubricLines`, `formatRubricLines`, `judgingReady`, `rankTeams` | `DELETE` after actions gone |
| Actions | `saveRubric`, `submitScore`, `advanceRound` in `judging.action.ts` | `STUB_DELETE` / `DELETE` (no UI callers) |
| Types | `RubricCategory`, `HackathonTrack.rubric` in `types.ts` | remove or mark deprecated |
| Keep | `/judge/[token]` invite accept; Scoreboard / points-per-submission (O5) | **not** removed |
| Incidental strings | taxonomy checklist “judging rubric…”, CTF schedule placeholder | leave or soften copy (not product rubric) |
| Docs | docs/22 A7, settings matrix, docs/11 | `DOCS_UPDATE` |

**Replacement:** judges score submissions with points 0…max + optional comment (O5); standings = Scoreboard.

---

## 5. Public leaderboard

| Ref | Path / symbol | Status |
| --- | --- | --- |
| Component | `Leaderboard.tsx` | `ALREADY_GONE` |
| Route | `src/app/events/[eventId]/tracks/[trackId]/leaderboard/page.tsx` | `REDIRECT_KEEP` |
| Replacement | organizer `.../scoreboard`, participant compete `live_scoreboard` | keep |
| Stale revalidate | `judging.action.ts` → `/leaderboard` | delete with judging purge |
| Docs | `docs/TESTING.md` §6 (still describes public judge LB when online) | `DOCS_UPDATE` |

---

## 6. Competitors (Teams) tab

| Ref | Path / symbol | Status |
| --- | --- | --- |
| Nav | `src/app/organizer/[organizer_id]/events/[eventId]/layout.tsx` — no Competitors | `ALREADY_GONE` |
| Redirect | `.../events/[eventId]/teams/page.tsx` (+ `loading.tsx`) → attendees | `REDIRECT_KEEP` |
| Legacy redirect | `.../hackathon/[eventId]/teams` → events `.../teams` → attendees | `REDIRECT_KEEP` |
| Permissions | `src/lib/permissions.ts` — `LEGACY_PERMISSION_MAP.page_teams` → `registrations:manage` | keep map + comment |
| DB migration map | `20261012180000_phase6_teams_access.sql` still maps `page_teams` → `hackathon:manage` | runtime uses `permissions.ts`; leave migration history |
| Replacement | Attendees grouped teams + join / dashboard codes | keep |
| Docs | docs/11, `docs/TESTING.md`, completeContext history | `DOCS_UPDATE` |

**Do not confuse with:** `/organizer/.../teams` ops library, event **Team**/staff tab, `/teams` join for ops members.

---

## 7. Competition type dropdown → “This is a CTF” checkbox

| Ref | Path / symbol | Status |
| --- | --- | --- |
| TrackForm / CompetitionModal | CTF checkbox → `kind` `ctf` \| `other` | mostly done |
| Wizard | `src/features/events/components/wizard/steps/HackathonTracksStep.tsx` — checkbox; unchecked → `DEFAULT_NON_CTF_KIND` (`business`) | `MIGRATE_THEN_STOP`: write only `ctf` \| `other` |
| Save | `src/features/hackathon/actions/tracks.action.ts` | already checkbox |
| Event create | `src/services/event.service.ts` — `parseHackathonKind` | accept legacy; persist `other` for non-ctf going forward |
| Labels | `HACKATHON_KINDS` / `HACKATHON_KIND_LABELS` in `kinds.ts`; displays in Workspace, public competitions, registration | map non-`ctf` → generic “Competition”; no dropdown |
| DB check | `hackathon_tracks.kind` allows `ctf \| business \| web_dev \| design \| data \| other` | `DEPRECATE_DB` unused values (no check change in O0) |
| Docs | `docs/09-event-creation.md` kind list | `DOCS_UPDATE` |
| Tests | no dedicated dropdown tests; `settingsResolver` CTF key scoping stays | — |

---

## 8. Track dates (roster lock, submission deadline, opens / work from–to)

| Ref | Path / symbol | Status |
| --- | --- | --- |
| Form fields removed | roster lock, opens, submission deadline on TrackForm | `ALREADY_GONE` |
| Form leftover | TrackForm **`closesAt`** (`name="closesAt"`) **in addition to** `registrationClosesAt` | **step 3 remove** — A7 keep-list = **one** optional registration closes only; column `closes_at` → `DEPRECATE_DB` |
| Columns | `hackathon_tracks.roster_locks_at`, `opens_at`, `submission_deadline_at`, `closes_at` | `DEPRECATE_DB` |
| Keep | `hackathon_tracks.registration_closes_at` | **active** |
| Writes | `tracks.action.ts` already nulls roster/opens/submission on save | keep nulling; stop writing `closes_at` after step 3 |
| Helpers | `competitionDates.ts` five-field order | `TEST_UPDATE` / shrink to kept fields |
| Domain | `types.ts` — `rosterLocked()`, `deadlinePassed()`, track date fields | step 4: auto-lock when registration closes; per-team lock/unlock remains |
| Access | `participantAccess.ts` — leftover copy/void for open/roster; still surfaces `opensAt` | clean in step 2–4 |
| Cutoff | `tasks.action.ts` — `taskCutoff` using track submission deadline | stop using deprecated column; phases / `hackathon_timer` |
| Join | `teams.action.ts` — `rosterLocked(track, team)` if legacy `roster_locks_at` set | replace with registration-closes + per-team lock (step 4) |
| Displays | public tracks pages, ticket team, Workspace table, `HackathonTrackManagePage` submission/roster metrics, `publicEvent.service` submissionDeadline | remove in step 2–3 |
| Seed | `scripts/seed-demo.mjs` sets track `opens_at` / `closes_at` | `STOP_WRITE` |
| Config copy | `configKeys.ts` — `hackathon_timer` help cites track submission deadline | rewrite (phases / timer config) |
| Phase dates | `hackathon_phases.opens_at` / `closes_at` | **keep** — phases control when participants work |
| Tests | `src/features/hackathon/__tests__/competitionDates.test.ts` | `TEST_UPDATE` |
| Docs | docs/11, docs/12 Phase 8 date fields, docs/07 | `DOCS_UPDATE` (step 5) |

**Step 4 (after approval):** roster locks automatically when competition `registration_closes_at` passes; organizers can still lock/unlock a single team; phases own work windows.

---

## 9. Separate Rules and Instructions → one “Rules & instructions”

| Ref | Path / symbol | Status |
| --- | --- | --- |
| TrackForm | single textarea + optional file | mostly done |
| Dual write | `tracks.action.ts` mirrors HTML to `rules_text` + `instructions` and both file column pairs | `MIGRATE_THEN_STOP` |
| Wizard | `HackathonTracksStep.tsx` — separate Policies / Instructions / Rules | align to single field (step 3) |
| Event create | `event.service.ts` persists `policies`, `instructions`, `rules_text` | migrate then single field |
| Columns | `policies`, `instructions`, `instructions_file_*`, `rules_text`, `rules_file_*` | deprecate extras; pick one canonical pair in step 3 (prefer `instructions` + `instructions_file_*` or `rules_*` — decide at implement time, migrate other into it) |
| Display | `HackathonTrackManagePage` — `rulesText` / files | single field |
| Team ack | `hackathon_teams.rules_acknowledged_at` | keep (ack of rules; not the dual-field UI) |
| Docs | docs/07, docs/09, docs/11 | `DOCS_UPDATE` |

---

## 10. `configKeys` / `hackathon_config`

| Ref | Notes | Status |
| --- | --- | --- |
| `src/features/hackathon/configKeys.ts` | No keys for online / mentors / announcements / rubric / roster dates | no key deletes required for A7 |
| `hackathon_config` table | Event/track toggles (scoreboard, CTF, timers, …) | keep |
| `docs/hackathon-settings-matrix.md` | Already lists Phase B removals | refresh after purge |

---

## 11. Emails / templates

| Ref | Notes | Status |
| --- | --- | --- |
| `emails/` | No hackathon-mentor or hackathon-announcement templates | nothing to delete |
| Docs mentioning “email announcements” to participants | point to Connections composer | `DOCS_UPDATE` |

---

## 12. Docs to update (step 5)

| Doc | What to fix |
| --- | --- |
| `docs/11-events-and-hackathon-complete-spec.md` | Remove online/mentors/announcements/Competitors/public LB/rubric/full track date model; CTF checkbox; single rules field; registration closes only |
| `docs/07-hackathon-organizer-config.md` | Track fields + settings align with keep-list |
| `docs/12-teams-and-staff.md` | Phase 8 date fields / competitors language |
| `completeContext.md` | Routes, feature tree, changelog |
| Also stale | `docs/TESTING.md`, `docs/09-event-creation.md` (wizard kinds / split rules) |

---

## Routes to keep as redirects

| URL | Redirect target |
| --- | --- |
| `/events/[eventId]/mentors` | `/events/[eventId]/tracks` |
| `/events/[eventId]/tracks/[trackId]/leaderboard` | `/events/[eventId]/tracks/[trackId]` |
| `/organizer/[id]/events/[eventId]/teams` | `/organizer/[id]/events/[eventId]/attendees` |
| `/organizer/[id]/hackathon/[eventId]/teams` | chain → events `/teams` → attendees |

---

## Tables / columns to deprecate (not drop)

| Object | Notes |
| --- | --- |
| `hackathon_settings.online_mode`, `livestream_url` | — |
| `hackathon_mentors` (table) | — |
| `hackathon_announcements` (table) | — |
| `hackathon_tracks.rubric` | — |
| `hackathon_tracks.roster_locks_at`, `opens_at`, `submission_deadline_at`, `closes_at` | keep `registration_closes_at` |
| `hackathon_tracks.kind` values other than `ctf` / `other` | deprecate values, not column |
| Dual rules/instructions/policies columns | after migrate, one pair remains live; others deprecated |

---

## Approval gate

**Pause here.** Approve or amend this inventory before:

1. **Step 2** — delete stubs/dead code; keep redirects; deprecate DB comments; stop writes; `typecheck` / `lint` / `knip` / tests  
2. **Step 3** — competition keep-list; rules merge; CTF-only kinds; remove TrackForm `closesAt`  
3. **Step 4** — auto roster lock when registration closes; phases own work time  
4. **Step 5** — update docs/11, docs/07, docs/12, completeContext — then pause again
