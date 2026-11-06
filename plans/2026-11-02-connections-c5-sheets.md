# Connections C5 — Live attendee sheet and templates

**Status:** done (2026-11-02).

## Shipped

- Migration `sheet_syncs`; catalog `sheets.sync` active (pairs with `drive.files` on OAuth)
- Formula sanitize + fingerprint skip; Sheets clear/write RAW; pause on missing/no_access
- Event Exports: Export once / Keep in sync; templates run-of-show, sponsor tracker, MoU
- Cron `/api/cron/sheet-syncs`
- Tests `c5Sheets.test.ts`
