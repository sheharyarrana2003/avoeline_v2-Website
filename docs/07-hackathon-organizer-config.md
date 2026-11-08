# Hackathon Management — Organizer Configuration

Tracks can be created in the event wizard (see `docs/09-event-creation.md`) as one Main competition or several. After publish, organizers edit competitions from the event **Competitions** tab.

## Competition fields (A7 / O0 keep-list)

Stored on `hackathon_tracks`:

| Field | Notes |
| --- | --- |
| name, description, image_url | Basics |
| kind | `ctf` \| `other` via **This is a CTF** checkbox (legacy kind values deprecated) |
| min/max team size | — |
| fee, discount_percent / note / expires | Pricing |
| dedicated sponsor | Via org link, not a track column |
| structured prizes | `hackathon_track_prizes` |
| `registration_closes_at` | Optional; **roster locks automatically when this passes** |
| `instructions` + `instructions_file_*` | Single **Rules & instructions** (rich text + optional file) |

Deprecated (columns retained, app stops writing): `opens_at`, `closes_at`, `roster_locks_at`, `submission_deadline_at`, `rubric`, dual `policies` / separate rules UI. Phase windows own participant work time.

See [`docs/removal-inventory.md`](removal-inventory.md) and [`docs/hackathon-settings-matrix.md`](hackathon-settings-matrix.md).

## Settings toggles (`hackathon_config`)

Independent toggles per event/track — not boolean columns on `hackathon_tracks`.

```sql
create table hackathon_config (
  id uuid primary key default gen_random_uuid(),
  track_id uuid references hackathon_tracks(id) on delete cascade, -- null = event-wide
  event_id uuid references events(id) on delete cascade,
  config_key text not null,
  enabled boolean default false,
  config_value jsonb default '{}'
);
```

| config_key | What it controls | config_value shape (if any) |
|---|---|---|
| `live_scoreboard` | Show/hide live scoreboard (organizer Scoreboard + participant compete) | — |
| `ctf_flags` | Enable flag-based CTF tasks | — |
| `task_hints` | Whether hints are shown (with point penalties) | — |
| `per_task_timer` | Enforce `hackathon_tasks.time_limit_minutes` | `{ latePolicy }` |
| `hackathon_timer` | Overall countdown | `{ endsAt }` (no track submission-deadline fallback) |
| `random_tasks` | Random task pool | — |
| `task_categories` | Category tagging/filtering | `{ categories: string[] }` |
| `docker_sandboxing` | Premium / not active yet | `{ imageRef, resourceLimits }` |
| `day_wise_calendar` | Multi-day schedule mark | — |
| `day_wise_tasks` | Tasks released per day | — |
| `link_submissions` | Require repo/demo link on submission | — |
| `daily_shifts` | Not active yet | — |
| `team_attendance` | Periodic team check-in | `{ intervalMinutes }` |
| `activity_check_interval` | Activity confirmation | `{ intervalMinutes }` |
| `anti_cheat_tab_close` | Anomaly flag only | — |
| `phased_structure` | Enable phases with locking | — |
| `phase_lock_no_revisit` | Closed phases stay closed | — |
| `team_collaboration` | Shared team session | — |

Organizer **Settings** tab: attachment MB + judging window + config toggles (apply all or per competition). No online mode / livestream / mentors / announcements.

## Cautions

- **`docker_sandboxing`**: real infra — premium; do not treat the toggle as “live machines”.
- **`anti_cheat_tab_close`**: anomaly detection only — do not oversell.
