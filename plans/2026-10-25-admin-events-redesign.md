# Admin events redesign (2026-10-25)

**Status:** done  
**Route:** `/admin/events`

## Summary

Rebuilt the platform admin Events board (All / Flagged / Moderation log) per product A–G: URL-driven filters, server-side list bundle, Moderate modal (no inline row forms), report review drawer, rate-limited public reports, and `EventThumb` wide + gradient fallback.

## Findings (investigation)

| Topic | Finding |
| --- | --- |
| `event_reports` | Columns: `id`, `event_id`, `event_title`, `reason`, `reporter_email`, `status` (`open`\|`dismissed`\|`actioned`), `created_at`, `decided_at`, `extra`. Migration adds `decided_by`, `admin_note`. Created by `reportEvent` from public `ReportEvent`. |
| Technology duplicate | Taxonomy has one row `id=technology` / `name=Technology`. Events stored both `technology` and `Technology` as free text; old UI used `Set(events.map(e => e.category))` so both labels appeared. Fix: options from `event_categories` by id + case-insensitive resolve. |
| Banner letter | Most events have empty `banner_image` — not a broken URL. Fallback is designed gradient + first letter. |
| Host label | Department orgs used `` `${org.name} · ${profile.org_name}` `` repeating the same name. Now organizer line 1; `Department › Club` only when levels exist and differ. |

## Schema

- `events.moderation_unpublished boolean` (reversible unpublish)
- `event_reports.decided_by`, `admin_note`
- Indexes on events list, open reports, moderation_logs

## Key paths

- Types/filters: `src/features/admin/eventModeration.types.ts`, `eventModeration.filters.ts`
- Service: `src/features/admin/eventModeration.service.ts`
- Actions: `src/features/admin/actions/events.action.ts`
- UI: `src/features/admin/components/events/`
- Page: `src/app/admin/events/page.tsx`
