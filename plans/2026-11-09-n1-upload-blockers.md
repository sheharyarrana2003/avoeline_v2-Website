# N1 — Registration, UploadKind, sponsors blockers

Status: **done** (2026-11-09)

## Causes fixed

1. **Payment upload “Event not found.”** — `/api/uploads/proof` treated DB errors and missing rows the same; draft/closed events now use shared `assertPublicRegistrationEvent` and return **CLOSED** with plain copy (not a fake 404). Admin preview no longer invites live uploads.
2. **“Invalid input: expected object, received undefined”** — required `payment_screenshot` Zod object got `undefined` when upload failed (no hidden field). Schema now uses `z.custom` with plain messages; `registerAttendeeAction` maps remaining Zod text via `mapRegistrationValidationMessage`.
3. **“That upload folder is not allowed.”** — UI sent `gallery` / UUID folders; replaced with typed `UploadKind` (`event_gallery`, `sponsor_logo`, …) and public Supabase media pipeline (docs/23 A8).
4. **Admin preview** — any `preview === true` → `admin_preview`; form visible with **Preview only**, submit/uploads disabled.
5. **Sponsors logo** — `OrganizationForm` uses `sponsor_logo` / collaborator / partner kinds + `eventId`; paste URL uses `logoUrlPaste` to avoid FormData clash.

## Key files

- `src/features/files/uploadKinds.ts`
- `src/features/media/uploadMedia.action.ts`, `publicMediaProcess.ts`, `mediaQuota.service.ts`
- `src/features/registration/registrationErrors.ts`, `publicRegistrationEligibility.ts`
- `src/app/api/uploads/proof/route.ts`
- `supabase/migrations/20261109120000_n1_organizer_media_quota.sql`
