# O7 Certificates and Files

**Status:** done  
**Date:** 2026-11-08  
**Source:** Cursor plan `o7_certificates_files_867a8bbf`

## Overview

Close O7: on-demand certificate viewer plus private Drive archive jobs, docs/18 throttled cert emails with opt-in share-by-link, and A4 Files tab folder tree with permissions and tests.

## Locked decisions

- **Build once** (same as O2–O6); docs/tests are the review gate.
- **Phase 5 SoT** for certs is `docs/11-events-and-hackathon-complete-spec.md` Certificates (JSON templates, on-demand PDF/SVG).
- **Viewer:** `src/app/certificate/[code]/page.tsx` — on-demand SVG + PDF download CTA. Email primary CTA = `/certificate/{code}` (not `/download`).
- **Archive:** default **on** when Drive connected. Bulk issue inserts records only; archive via throttled `certificate_jobs` cron into A6 Certificates folder. Copies stay **private**. Soft-skip if Drive down.
- **Email Drive link:** opt-in `includeDriveLink` with mandatory share-by-link warning. Intentional exception to docs/17 §8 for cert opt-in only.
- **Bulk email:** `enqueueBatch` (`kind: certificate`); outbox re-renders HTML at send time.
- **Files A4:** event-folder panel; create blank docs under event folder; `assertEventActor(..., "files")`.

## Shipped

1. Public viewer + email CTA (`certificateEmail.ts`).
2. `certificate_jobs` migration + cron private archive; issue records-only; `archiveToDrive` UI.
3. docs/18 batch email + outbox send-time render + share-anyone helper + warning UI.
4. `EventDriveFoldersPanel` + `listEventDriveFolders`; create under event; Files auth tab.
5. Unit tests; `docs/22-o2-o8-status.md` O7 Done; docs/11 note; `completeContext.md`.

## Out of scope

- O8 Playwright matrix
- Global docs/17 share policy change
- Dropping deprecated columns / content indexing of Drive files

## Key paths

- `src/app/certificate/[code]/page.tsx`
- `src/features/certificates/{certificateEmail,certificateJobs.service,certificates.service}.ts`
- `src/app/api/cron/certificate-jobs/route.ts`
- `src/features/files/{folders.ts,components/EventDriveFoldersPanel.tsx,actions/listEventDriveFolders.action.ts}`
- `src/features/connections/server/{linkedFileEntityAuth,outboxWorker.service,batch.service}.ts`
- `supabase/migrations/20261108160000_o7_certificate_jobs.sql`
