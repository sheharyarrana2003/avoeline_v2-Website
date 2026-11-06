# Connections security review (docs/17 §§10–11 / C6)

Evidence that the Connections system follows the security checklist. Shipped 2026-11-02; closeout 2026-11-02.

## 1. Static checks

| Rule | Evidence |
| --- | --- |
| Google token / API code only under `src/features/connections/{server,providers}` | Providers live there; actions call `server/*` only (`listCalendarsForConnection`). Guard: `scripts/check-connections-imports.mjs` (also run from `c6Hardening.test.ts` / `npm run test:unit`) |
| No restricted scopes | Catalog scopes are `gmail.send`, `calendar.events`, `drive.file` only — `c6Hardening.test.ts` + `securityChecks.logic.ts` |
| Organizer mail never uses platform Resend | `organizerTransport.service.ts` → `resolveSender` / Connections send; platform mail is `platformMail.service.ts` only |
| Secrets never in client | `integration_secrets` **service_role only** (C1 migration revoke from `anon`/`authenticated`); picker-token returns access-token allowlist (`sanitizePickerTokenResponse`) |

## 2. Threat test matrix

| Threat | Runtime control | Automated test |
| --- | --- | --- |
| State forgery / replay / expiry / user mismatch | `oauthStateGate` in `oauth.service.ts` | `c6Hardening.test.ts` |
| Open redirect (`returnTo`) | `sameOriginReturnTo` | `oauthPkce.test.ts`, `c6Hardening.test.ts` |
| Scope downgrade | `missingRequiredScopes` + `scopeDowngradeBlocks` | `c6Hardening.test.ts`, `oauthPkce.test.ts` |
| Token leakage (logs / audit) | `auditDetailsStripSecrets` / `writeConnectionAudit` | `c6Hardening.test.ts` |
| Token leakage (Picker response) | `sanitizePickerTokenResponse` | `c4Drive.test.ts`, `c6Hardening.test.ts` |
| Token leakage (RLS) | `integration_secrets` revoked from clients | Documented (migration); no SQL harness in-repo |
| Cross-tenant connections | `assertMayUseConnection` | Pure grant fail-closed in `c2`/`c6`; DB edge cases not unit-mocked |
| Cross-tenant linked files | `linkedFileEntityAuth` + `isAccessibleProviderFileId` | Allowlist in `c4`/`c6`; entity auth is server+DB |
| Grant bypass | Server asserts before Drive/Calendar/send | `mayUseDriveFiles` / `maySyncCalendar` negatives in `c6` |
| Picker token abuse | Auth + capability + rate limit + sanitize | Sanitize covered; rate-limit/403 not e2e |
| Header / ICS injection | `calendarFallbacks` | `c3Calendar.test.ts`, `c6Hardening.test.ts` |
| Formula injection | `sheetSanitize` + RAW writes | `c5Sheets.test.ts`, `c6Hardening.test.ts` |

No full Google OAuth e2e in CI (out of scope).

## 3. Operations

| Job | Route | Purpose |
| --- | --- | --- |
| Email outbox | `/api/cron/email-outbox` | Drain organizer mail with capacity |
| Linked files verify | `/api/cron/linked-files` | `ok` / `missing` / `no_access` |
| Sheet sync | `/api/cron/sheet-syncs` | Keep-in-sync Sheets rewrite |
| Connections health | `/api/cron/connections-health` | Status counts + 24h audit metrics + reconnect notifies |

All require `CRON_SECRET` (Bearer or `?secret=`). Schedule health **daily** and sheet/linked-files on a daily-ish cadence in the host (Vercel cron or equivalent); outbox every minute.

### Health snapshot metrics (`health_snapshot` audit details)

- Connection counts: `active`, `needsReconnect`, `blocked`, `disabled`
- `sheetSyncPaused`, `linkedNoAccess`
- `metrics24h`: `connects`, `failuresByReason`, `sends`, `quotaEvents` from `connection_audit`

### needs_reconnect notifications

`markNeedsReconnect` pauses outbox and calls `notifyConnectionNeedsReconnect` (rate-limited 1/day per connection). Health job re-notifies outstanding `needs_reconnect` rows (same rate limit). Template: `connection_needs_reconnect`.

### Key rotation runbook

1. Generate new AES material ≥16 chars; set `CONNECTIONS_ENCRYPTION_KEY`.
2. Run [`scripts/rotate-connections-key.mjs`](../scripts/rotate-connections-key.mjs) to re-encrypt stored refresh tokens, **or** ask users to reconnect Google.
3. Rotate Google OAuth client secret in Cloud Console; update env; smoke connect.

### Google verification runbook

See [`docs/google-verification.md`](google-verification.md).

## 4. Doc cross-refs

| Doc | Status |
| --- | --- |
| `docs/17-connections-system.md` | Canonical Connections + security |
| `docs/18-email-send-limits-and-scheduling.md` | Send limits / outbox |
| `docs/16-platform-email.md` | Superseded for organizer Google mail (banner present) |
| `docs/15*` | **Not in repo** — N/A |
| `docs/11-events-and-hackathon-complete-spec.md` | Event/hackathon UI SoT; organizer Google mail points to docs/17+18 |

## 5. Residual risk

- In-memory `rateLimit` is per-instance (swap for Redis in multi-region).
- Picker API key must stay HTTP-referrer restricted (`docs/connections-picker-setup.md`).
- Drive/Sheets `planGate` label is not enforced until a billing module ships.
