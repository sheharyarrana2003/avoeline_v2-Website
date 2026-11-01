# Hackathon settings enforcement matrix

`getEffectiveConfig(trackId)` merges event-wide (`hackathon_config.track_id` null) then track-specific rows (track wins).

| config_key | Enforced in | Participant-visible effect | Test |
| --- | --- | --- | --- |
| `live_scoreboard` | `getEffectiveConfig` + compete scoreboard (track-scoped) / public board | Scoreboard tab hidden when off; board is current competition only | Manual: toggle off → tab gone; multi-track → no mixed ranks |
| `ctf_flags` | `submitTaskFlag` in `tasks.action.ts` | Flag input rejected when off | Manual / unit on action gate |
| `task_hints` | `revealHint` in `tasks.action.ts` | Hints omitted / rejected when off | Manual |
| `per_task_timer` | `hackathon_team_task_starts` + submit path; Settings via `getHackathonConfigsForTracks` merge | Late → `late` status or reject per `latePolicy` | Manual timer expiry; save all-competitions then reload Settings |
| `hackathon_timer` | `taskCutoff` + submit gates (server `now`); Settings merge same as above | Submissions refused after end | Manual |
| `random_tasks` | `visibleTasksForTeam` + `hackathon_task_assignments` | Only pinned random tasks shown | Manual |
| `day_wise_tasks` | `visibleTasksForTeam` / phase open | Tasks hidden before release | Manual |
| `link_submissions` | submit task / project path + `allowedDomains` | Link required; domain allowlist | Manual |
| `phase_lock_no_revisit` | submit / flag when phase closed | Writes rejected | Manual |
| `team_attendance` | `team_activity_pings` heartbeat action | Gaps flagged for organizer | Manual |
| `activity_check_interval` | heartbeat expected interval | Same as attendance | Manual |
| `anti_cheat_tab_close` | `team_integrity_events` (flagged only) | Monitoring / warn only — not OS or browser lockdown; no auto-punish | Manual |
| `docker_sandboxing` | UI only — **Not active yet** | Badge in Settings | — |
| `daily_shifts` | UI only — **Not active yet** | Badge in Settings | — |
| `phased_structure` | `visibleTasksForTeam` | Phase-gated task list | Manual |
| `task_categories` | compete task filter | Category chips | Manual |
| `team_collaboration` | any member may submit via cookie session | Shared team session | Manual |
| `day_wise_calendar` | toggleOnly (schedule UI elsewhere) | Calendar mark | — |

Scoreboard isolation: `src/features/hackathon/__tests__/scoreboardIsolation.test.ts`.
Competition date timezone / no-slash payload: `src/features/hackathon/__tests__/competitionDates.test.ts`.
