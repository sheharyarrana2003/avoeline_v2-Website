# Hackathon Management — Organizer Configuration

Tracks can be created in the event wizard (see `docs/09-event-creation.md`) as one Main competition or several. Extra fields stored on `hackathon_tracks`: `image_url`, `policies`, `instructions`, `discount_percent`, `discount_note` (name, fee, description, team size, and rules file already existed). After publish, organizers still edit tracks from the event Hackathon tab.

This is the list from your notes, reframed as what it actually is: **a set of independent toggles an organizer picks per hackathon track**, not a fixed feature set every hackathon must have. Store these as flexible key-value config, not as 18 separate boolean columns on `hackathon_tracks` — organizers will pick different subsets every time, and a rigid column-per-feature schema means a migration every time the list changes.

## New table

```sql
create table hackathon_config (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references hackathon_tracks(id) on delete cascade,
  config_key text not null,
  enabled boolean default false,
  config_value jsonb default '{}', -- feature-specific settings, shape depends on config_key
  unique (track_id, config_key)
);
```

## The full config_key list (this is your notes, mapped to keys)

| config_key | What it controls | config_value shape (if any) |
|---|---|---|
| `live_scoreboard` | Show/hide the public live scoreboard | — |
| `ctf_flags` | Enable flag-based CTF tasks (uses `hackathon_tasks.flag_hash`) | — |
| `task_hints` | Whether hints are shown (with point penalties) | — |
| `per_task_timer` | Enforce `hackathon_tasks.time_limit_minutes` | `{ defaultMinutes }` |
| `hackathon_timer` | Overall event countdown | `{ startsAt, endsAt }` |
| `random_tasks` | Enable `hackathon_tasks.is_random` pool assignment | — |
| `task_categories` | Enable category tagging/filtering on tasks (CTF-style: web/crypto/forensics) | `{ categories: string[] }` |
| `docker_sandboxing` | Per-team isolated container machines (premium — real infra cost, see note below) | `{ imageRef, resourceLimits }` |
| `day_wise_calendar` | Multi-day schedule view (uses `event_agenda_items`) | — |
| `day_wise_tasks` | Tasks released per calendar day rather than all at once | `{ releaseSchedule: [{day, taskIds}] }` |
| `link_submissions` | Require repo/demo link fields on submission (already default in `hackathon_submissions`, this toggle controls whether they're required) | — |
| `daily_shifts` | Staff shift scheduling for multi-day events (ties into Ushers/on-ground ops, `04-organizer.md`) | — |
| `team_attendance` | Periodic team check-in requirement | `{ intervalMinutes: 60 }` |
| `activity_check_interval` | "Working caught every 1 hour" — periodic activity confirmation prompt | `{ intervalMinutes: 60 }` |
| `anti_cheat_tab_close` | Browser/tab-close detection, flags anomalies (not a hard block — see caution below) | — |
| `phased_structure` | Enable `hackathon_phases` with locking | — |
| `phase_lock_no_revisit` | Once a phase closes, it cannot reopen (state machine, no special infra) | — |
| `team_collaboration` | Always effectively on if hackathon module is active — this toggle mostly exists for UI consistency in the config screen | — |

## Organizer-facing config UI

A single "Hackathon Settings" screen per track, rendering each row above as a toggle with an expandable settings panel (using the `config_value` shape) when enabled — one generic `<ConfigToggleRow configKey="..." /> ` component looping over a static list of the keys above, not 18 hand-built toggle components.

## Two important cautions carried over from earlier planning (don't lose these)

- **`docker_sandboxing`**: this is real infrastructure investment (container orchestration, network isolation, resource limits), not just a UI checkbox. Treat it as a premium/paid config option and scope it as its own build phase — do not let "add a toggle" imply "add live exploitable machines" is a small task.
- **`anti_cheat_tab_close`**: frame this to organizers as anomaly detection, not a cheating guarantee — a determined participant can work around it. Don't oversell its reliability in the UI copy.
