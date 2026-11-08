# Hackathon settings enforcement matrix

`getEffectiveConfig(trackId)` merges event-wide (`hackathon_config.track_id` null) then track-specific rows (track wins).

**Status (2026-11-08 / O8):** Enforcement rows unchanged from O6; removed-surface table below remains accurate. Manual QA: `docs/O8-full-flow-checklist.md`.

## Phase B + O0 (2026-11-07) — removed from organizer UI

These are **not** configurable toggles anymore (no dedicated blocks/forms in Competitions, Settings, or track configure):

| Removed surface | Notes |
| --- | --- |
| Online / livestream mode | Columns deprecated; app no longer selects/writes them |
| Mentors | Public `/events/.../mentors` redirects; stubs/services deleted |
| Announcements | Composer removed; table deprecated |
| Spectator / external leaderboard | Track `/leaderboard` redirects; rubric `judging.action` paths deleted |
| Embedded rubric / advance-round | Removed; standings = task **Scoreboard** only |
| Judge portal | `/judge/[token]` invite accept only |
| Track dates except registration closes | `opens_at` / `closes_at` / `roster_locks_at` / `submission_deadline_at` nulled on save; roster locks when `registration_closes_at` passes |
| Type dropdown / split rules | CTF checkbox; single Rules & instructions field |

Organizer Settings: attachment MB + judging window + config toggles. Competitions modal: A7 keep-list only. Track configure: tasks, roster, fees, judge invites. Inventory: `docs/removal-inventory.md`.

| config_key | Enforced in | Participant-visible effect | Test |
| --- | --- | --- | --- |
| `live_scoreboard` | compete Scoreboard tab + organizer scoreboard fetch/UI (`HackathonWorkspace`) | Tab/board hidden or locked when off; board is current competition only | `settingsEnforcement.test.ts` · live_scoreboard; `scoreboardIsolation.test.ts` |
| `ctf_flags` | `submitTaskFlag` in `tasks.action.ts` | Flag input rejected when off | `settingsEnforcement.test.ts` · ctf_flags |
| `task_hints` | `revealHint` in `tasks.action.ts` | Hints omitted / rejected when off | `settingsEnforcement.test.ts` · task_hints |
| `per_task_timer` | `hackathon_team_task_starts` + submit path; Settings via `getHackathonConfigsForTracks` merge | Late → `late` status or reject per `latePolicy` | `settingsEnforcement.test.ts` · per_task_timer |
| `hackathon_timer` | `taskCutoff` + submit gates (server `now`); Settings merge same as above | Submissions refused after end | `settingsEnforcement.test.ts` · hackathon_timer |
| `random_tasks` | `visibleTasksForTeam` + `hackathon_task_assignments` | Only pinned random tasks shown | `settingsEnforcement.test.ts` · random_tasks |
| `day_wise_tasks` | `visibleTasksForTeam` / phase open | Tasks hidden before release | `settingsEnforcement.test.ts` · day_wise_tasks / phased_structure |
| `link_submissions` | `submitTaskWork` + `allowedDomains` | Link required; domain allowlist | `settingsEnforcement.test.ts` · link_submissions; `submissionValidation.test.ts` |
| `phase_lock_no_revisit` | UI lock messaging; **open/close always refuse submits** for phased tasks | Writes rejected when phase closed | `settingsEnforcement.test.ts` · phase_lock_no_revisit; `submissionValidation.test.ts` |
| `allow_resubmission` | `submitTaskWork` (default **on** when row missing) | Second `hackathon_task_submissions` row rejected when off | `settingsEnforcement.test.ts` · allow_resubmission; `submissionValidation.test.ts` |
| `team_attendance` | `team_activity_pings` heartbeat action | Gaps flagged for organizer | `settingsEnforcement.test.ts` · team_attendance |
| `activity_check_interval` | heartbeat expected interval | Same as attendance | `settingsEnforcement.test.ts` · activity_check_interval |
| `anti_cheat_tab_close` | `team_integrity_events` (flagged only) | Monitoring / warn only — not OS or browser lockdown; no auto-punish | `settingsEnforcement.test.ts` · anti_cheat_tab_close |
| `docker_sandboxing` | UI only — **Not active yet** | Badge in Settings | — (toggleOnly) |
| `daily_shifts` | UI only — **Not active yet** | Badge in Settings | — (toggleOnly) |
| `phased_structure` | `visibleTasksForTeam` | Phase-gated task list | `settingsEnforcement.test.ts` · phased_structure |
| `task_categories` | compete task filter | Category chips | `settingsEnforcement.test.ts` · task_categories |
| `team_collaboration` | any member may submit via cookie session | Shared team session | — (toggleOnly) |
| `day_wise_calendar` | toggleOnly (schedule UI elsewhere) | Calendar mark | — (toggleOnly) |

Scoreboard isolation: `src/features/hackathon/__tests__/scoreboardIsolation.test.ts`.
Scoreboard 1h movement: `src/features/hackathon/__tests__/scoreboardMovement.test.ts`.
Competition date timezone / no-slash payload: `src/features/hackathon/__tests__/competitionDates.test.ts`.
Settings enforcement suite: `src/features/hackathon/__tests__/settingsEnforcement.test.ts`.
