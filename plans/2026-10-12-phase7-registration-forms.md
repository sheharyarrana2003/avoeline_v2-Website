# Phase 7 — Registration form engine

**Status:** done  
**Migration (already applied):** `supabase/migrations/20261012190000_phase7_event_form_fields.sql`

## Shipped (app)

- `event_form_fields` service: list/upsert/reorder/archive, seedDefaults, syncPaymentField, replaceEventFieldsFromWizard
- Zod `buildRegistrationSchema` + unit test
- `EventFormFieldsEditor` (draft wizard + live Access) and `RegistrationQuestionsCard`
- `create_event` writes group columns + seeds fields; EventModel maps `allow_group_*` and form-backed `customForm`
- Public `RegistrationForm` from definitions via `CustomFieldsRenderer` (phone/url/file); honeypot + rate limit; optional **Register as a team** when group registration allowed
- `requestRegistrationUpload` → signed upload under `registration/{eventId}/…` in `payment-screenshots`
- Promo: `previewPromo`, atomic `redeem_promo` after solo/group create; Access list shows used/limit + total discounted
- Attendee drawer + exports use ordered form fields (active + archived-with-data only); file answers signed

## Key paths

| Area | Path |
| --- | --- |
| Types / service / schema | `src/features/registration/forms/` |
| Public register | `RegistrationForm.tsx`, `registerAttendee.action.ts` |
| Access UI | `RegistrationQuestionsCard.tsx`, Access page |
| Ticketing | `ticketing.service.ts` (`previewPromo`, `redeemPromo`) |

## Follow-ups

- Optional: hard-delete unused archived fields via admin maintenance job
- Switch remaining payment proofs fully off `certificates` bucket when ready
