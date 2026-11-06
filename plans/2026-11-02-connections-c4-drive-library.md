# Connections C4 — Drive library

**Status:** done (2026-11-02) — pause for review before C5.

## Scope lock

**In:** docs/17 §§2, 8 and C4 items 1–6.

**Out:** Live sheets/templates (C5), whole-Drive search, restricted scopes, file contents, sharing changes.

**Defaults:** `drive.file` only; catalog `drive.files` active; `planGate` label retained but not enforced; entity types `event` | `team` | `club` | `booking`.

## Shipped

1. Migration `supabase/migrations/20261103220000_linked_files.sql` + `TABLES.LINKED_FILES`.
2. `GoogleDriveClient` — metadata, Avoeline folder, blank Doc/Sheet/Slides, verifyAccess.
3. `/api/connections/google/picker-token` (rate-limited; no refresh token) + `linkedFiles.service` + `drive.action`.
4. UI: FilePickerButton, CreateDriveFileMenu, LibraryList, EntityFilesPanel; organizer `/library`; event Files tab; team/club/booking mounts.
5. Cron `/api/cron/linked-files`; CSP + `GOOGLE_PICKER_*` env; `docs/connections-picker-setup.md`.
6. Tests: `src/features/connections/__tests__/c4Drive.test.ts`.

## Key paths

- `src/features/connections/providers/google/drive.ts`
- `src/features/connections/server/linkedFiles.service.ts`
- `src/features/connections/components/EntityFilesPanel.tsx`
- `docs/17-connections-system.md` (C4 status)
