# Supabase full data wipe (delete only)

**Status:** done (2026-10-20)

## Overview

Guarded `npm run reset:wipe-data` deletes all public table rows, Storage objects, and Auth users. Nothing is exported or moved. Schema and bucket shells remain. Operator re-runs `npm run seed:owners` afterward.

## Deliverables

- `public.reset_wipe_all_public_data()` — truncate all ordinary `public` tables (`RESTART IDENTITY CASCADE`); execute revoked from anon/authenticated; granted to `service_role`.
- `scripts/reset-wipe-data.mjs` — requires `CONFIRM=YES`; empty Storage → RPC wipe → delete all Auth users.
- Docs: `docs/TESTING.md` §0a; `package.json` script `reset:wipe-data`.

## Run

```
$env:CONFIRM="YES"; npm run reset:wipe-data
npm run seed:owners
```
