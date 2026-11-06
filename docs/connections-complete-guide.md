# Connections & Google email — complete guide

One place that summarizes **everything shipped** for organizer Google Connections (docs/17 C1–C6), send limits (docs/18), security, schema, code quality, and **how to test the organizer flow**.

Canonical product/spec: [`docs/17-connections-system.md`](17-connections-system.md).  
Security evidence: [`docs/connections-security-review.md`](connections-security-review.md).  
Google verification: [`docs/google-verification.md`](google-verification.md).  
Send limits: [`docs/18-email-send-limits-and-scheduling.md`](18-email-send-limits-and-scheduling.md).  
Code map: [`completeContext.md`](../completeContext.md) (feature `connections`).

---

## 1. What this system is

**Platform mail** (billing, welcome, admin alerts) still goes through **Resend** on `aroxes.com`.

**Organizer-origin mail** (confirmations, bulk, certificates, recruitment, invites) goes from the organizer’s **connected Google account** via Gmail API. Messages appear in **their Sent folder**. There is **no fallback** to the platform sender when Google is missing or broken.

Other Google features (Calendar / Meet / Drive / Sheets) use the same Connections module and **only non-restricted / sensitive scopes we justify**:

| Scope | Used for |
| --- | --- |
| `gmail.send` | Send as the organizer |
| `calendar.events` | Calendar + Meet (Meet is created on calendar events) |
| `drive.file` | Files the user picks or the app creates; live Sheets the app created |

**Never requested:** `drive`, `drive.readonly`, Gmail read/modify scopes.

---

## 2. Plan timeline (what was built)

| Plan archive | Phase | What shipped |
| --- | --- | --- |
| `plans/2026-11-01-connections-c1-foundation.md` | **C1** | `integration_*` tables, AES-GCM refresh tokens, OAuth PKCE, Gmail send, Connections UI, `resolveSender` migrate off legacy `organizer_email_connections` |
| `plans/2026-11-02-email-limits-scheduling.md` | **Docs/18** | Rolling 24h capacity, plan/tenant caps, preview→confirm, `email_send_batches` + `/api/cron/email-outbox`, suppressions, admin pause |
| `plans/2026-11-02-connections-c2-org-grants.md` | **C2** | Org-owned connections + grants, vendor/dept/club mounts, SenderPicker, reconnect tokens, Workspace admin blocked note, kill switch |
| `plans/2026-11-02-connections-c3-calendar-meet.md` | **C3** | `calendar_links`, Calendar/Meet sync, hooks (interview, agenda, mentor, judging, online), ICS + Google TEMPLATE on public pages |
| `plans/2026-11-02-connections-c4-drive-library.md` + `c4-drive-closeout` | **C4** | `linked_files`, Picker (`drive.file`), create Doc/Sheet/Slides, Library/Files, verify cron; closeout: `provider_modified_at`, verify-on-open, filters, entity auth |
| `plans/2026-11-02-connections-c5-sheets.md` + `c5-sheets-closeout` | **C5** | `sheet_syncs`, Export once / Keep in sync, formula sanitize, templates; closeout: event hooks, chunked writes, soft 429, cron-safe sync |
| `plans/2026-11-02-connections-c6-hardening.md` + `c6-hardening-closeout` | **C6** | Security review + google-verification docs, threat tests, health cron; closeout: import boundary, oauth state gate, reconnect notify + metrics |

---

## 3. Architecture (module boundary)

```text
UI / Server Actions / crons
        │
        ▼
src/features/connections/{actions,server,components}
        │
        ▼
src/features/connections/providers/google/*   ← ONLY place that talks to Google APIs
```

**Rules enforced**

- Other features call Connections **services/actions**, not Google SDKs.
- Google provider imports are allowed only under `connections/{server,providers,__tests__}` — checked by `scripts/check-connections-imports.mjs` (also runs with `npm run test:unit`).
- Tokens: refresh ciphertext in `integration_secrets` (**service_role only**; revoked from `anon`/`authenticated`).
- Client never receives refresh tokens (Picker returns a short-lived access token allowlist only).

Key folders:

| Path | Role |
| --- | --- |
| `src/features/connections/catalog.ts` | Cards, scopes, who sees what |
| `src/features/connections/server/*` | OAuth, tokens, sender, grants, calendar, drive, sheets, health, audit |
| `src/features/connections/providers/google/*` | HTTP clients (Gmail, Calendar, Drive/Sheets/Docs) |
| `src/features/connections/actions/*` | `"use server"` safeActions |
| `src/features/connections/components/*` | Connections page, NeedsConnection, Calendar controls, Library, Sheets panel |
| `src/features/email/organizerTransport.service.ts` | Thin wrapper → `sendAsOrganizer` / `resolveSender` |

---

## 4. Schema (Postgres) — what was added

All via Supabase migrations under `supabase/migrations/` (remote versions may differ slightly in timestamp prefix).

| Table | Purpose |
| --- | --- |
| `integration_connections` | Connected Google account (owner user/org, status, scopes, email) |
| `integration_secrets` | Encrypted refresh token (service role only) |
| `integration_capabilities` | Per-connection capability flags + settings (e.g. calendar id, Drive folder) |
| `connection_grants` | Org connection → allowed members (C2) |
| `oauth_states` | PKCE + state hash, TTL, `used_at` (one-time) |
| `connection_audit` | Connect/disconnect/send/health (no secrets in details) |
| `connection_usage` / capacity helpers | Rolling send usage (docs/18) |
| `email_outbox` + `email_send_batches` | Queued organizer mail + bulk batches |
| `calendar_links` | Platform entity → Google event id + Meet URL |
| `linked_files` | Drive metadata links (`ok` / `missing` / `no_access`, `provider_modified_at`) |
| `sheet_syncs` | Event sheet export/sync (`keep_in_sync`, fingerprint, pause errors) |
| `connection_reconnect_tokens` | One-time reconnect links |

**Status enums (connections):** `active`, `needs_reconnect`, `revoked`, `blocked_by_admin`, `disabled`.

**Integrity habits**

- Unique keys for links (connection + entity / file / sheet kind).
- Fail-closed checks before writes (`assertMayUseConnection`, `assertLinkedFileEntityAccess`, `assertEventActor`).
- RLS: connections tables enabled; client roles **revoked**; app uses service role after auth in actions.

---

## 5. Features by capability

### 5.1 Gmail — send from organizer address (`email.send`)

- Connect on **Organizer → Settings → Connections**.
- Outbound paths use `resolveSender` → Gmail `users.messages.send` (RFC 822).
- Surfaces: registration confirmations, attendee bulk/custom mail, certificates, recruitment, etc. (`EventEmailPanels`, `requireConnectedSender`).
- Capacity strip + preview/confirm for large sends (docs/18).
- On `invalid_grant`: status → `needs_reconnect`, outbox paused, rate-limited reconnect notification.

### 5.2 Calendar + Meet (`calendar` / `meet`)

- Same OAuth scope `calendar.events` (incremental consent).
- Sync controls on Connections; entity hooks for interviews, agenda items, mentor slots, judging, online sessions, event dates.
- Public ticket / hero: ICS download + Google Calendar TEMPLATE link when not connected.
- Meet: conferenceData on create + short poll for pending URLs.

### 5.3 Drive library (`drive.files`)

- Scope **`drive.file` only**.
- Google Picker (short-lived picker-token API) or **Create** Doc/Sheet/Slides in an “Avoeline” folder.
- Metadata stored in `linked_files`; Library + Files on event/team/club/booking.
- Open in Google: **verify first**; block missing/no_access with fix copy.
- Daily `/api/cron/linked-files` re-verify.
- Unlink removes the **platform row only** (never deletes the Drive file).

### 5.4 Live Sheets + templates (`sheets.sync`)

- On **Event → Exports**: Export once / Keep in sync (attendees with form columns, check-in, hackathon teams).
- Formula injection sanitized (`= + - @` + RAW writes); chunked writes; soft 429 (defer, don’t pause); pause on deleted/revoked sheet.
- Event-triggered refresh after registration/check-in/team mutations + cron `/api/cron/sheet-syncs`.
- Templates: run-of-show (from agenda), sponsor tracker, MoU draft → Drive + linked.

---

## 6. Security measures (C6)

| Control | How |
| --- | --- |
| OAuth state | PKCE + hashed state; `oauthStateGate` rejects used / expired / wrong user |
| Open redirect | `sameOriginReturnTo` — only same-origin paths |
| Scope downgrade | Missing required scopes → reject + audit `scope_rejected` |
| Token leakage | Audit scrubber strips token/secret keys; Picker allowlist; secrets table not client-readable |
| Cross-tenant | `assertMayUseConnection` / entity ownership before link/list/send |
| Formula / ICS / headers | `sheetSanitize`, `calendarFallbacks` sanitizers |
| Import boundary | Script + unit test; no Google providers outside Connections server |
| Rate limits | Sensitive actions + reconnect notify (1/day) |
| Kill switch / admin block | Platform can disable Google; Workspace block shows copyable admin note |

Evidence file: `docs/connections-security-review.md` (threat matrix).

---

## 7. Code quality conventions followed

- **Supabase-only** data access (`supabaseAdmin` / `createSupabaseServer`); no Firestore/`adminDb`.
- **Server Actions** with `safeAction` + Zod for new Connections APIs; `rateLimit` on sensitive paths.
- **`server-only`** on services that touch secrets; never import `supabaseAdmin` in `"use client"`.
- **Pure logic** extracted for unit tests (`oauthState.logic`, `sheetSanitize`, `sheetWrite.logic`, `linkedFiles.logic`, `securityChecks.logic`, calendar fallbacks).
- **Typed `Database`** / `TABLES` from `data/collections.ts`.
- **Auth before every write** (`AuthService`, `assertEventActor`, connection ownership).
- **Tests:** `npm run test:unit` includes C2–C6 suites + import check.
- **completeContext.md** + `plans/` updated with each phase (archive rule).

---

## 8. Schema optimization & parallel DB reads

Patterns used throughout Connections (aligned with project rules):

- **Batched `.in()` + `Promise.all`** for multi-id lookups (e.g. user names for `added_by` on Library list; health job parallel counts).
- **No N+1** per-id loops for list screens.
- **Single upsert** with on-conflict uniqueness for links/syncs (idempotent).
- **Fingerprints** skip unchanged Sheet rewrites (`row_fingerprint` / `shouldRewriteSheet`).
- **Keyset-style cursors** on Library (`added_at` + Load more).
- **Cron workers** process limited batches (`processSheetSyncs(limit)`, outbox drain with capacity).
- Indexes on keep-in-sync, audit `created_at`, connection owner, etc. (see migrations).

---

## 9. Crons & ops (must be scheduled in prod)

| Route | Cadence (recommended) | Job |
| --- | --- | --- |
| `/api/cron/email-outbox` | Every **1 minute** | Drain organizer queued mail |
| `/api/cron/linked-files` | Daily | Re-verify Drive links |
| `/api/cron/sheet-syncs` | Hourly / daily | Refresh keep-in-sync sheets |
| `/api/cron/connections-health` | Daily | Status + 24h metrics + reconnect notifies |
| `/api/cron/plan-expiry` | Daily | Plan expiry reminders (related ops) |

Auth: `Authorization: Bearer $CRON_SECRET` or `?secret=`.

Key rotation: `scripts/rotate-connections-key.mjs` + env `CONNECTIONS_ENCRYPTION_KEY` (see security review).

---

## 10. Env checklist (do not commit values)

**Connections / Google**

- `CONNECTIONS_GOOGLE_ENABLED`
- `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URI` → `https://<host>/api/connections/google/callback`
- `CONNECTIONS_ENCRYPTION_KEY` (≥16)
- `GOOGLE_PICKER_API_KEY` / `GOOGLE_PICKER_APP_ID` (Drive Picker; HTTP-referrer restricted; App ID = **numeric** Cloud project number)
- `CRON_SECRET`

### Google Cloud OAuth client (Web) — origins vs redirects

In **Google Auth Platform → Clients → your Web client**:

**Authorised JavaScript origins** (origins only — no path; delete empty rows):

- `http://localhost:3000`
- `https://avoeline.aroxes.com`

**Authorised redirect URIs** (Connections Gmail/Calendar/Drive):

- `http://localhost:3000/api/connections/google/callback`
- `https://avoeline.aroxes.com/api/connections/google/callback`

**Sign-in with Google** (Supabase account login) is separate: add Supabase’s callback  
`https://<project-ref>.supabase.co/auth/v1/callback` in the same client (or a dedicated client), and in Supabase Auth → Google provider. App redirect after login is `/auth/callback` (see `docs/onboarding-plans-checkout.md`).

### Auto-link Connections after Google sign-up (organizer / vendor)

When an **organizer** or **vendor** signs up / signs in with Google:

1. Auth requests Gmail send + Calendar + Drive (`drive.file`) scopes (consent).
2. `/auth/callback` tries to create a Connections row from Supabase’s `provider_refresh_token`.
3. If that token is missing, the user is redirected to Connections OAuth `capability=workspace` (all cards in one consent).

**Requirement:** Supabase Auth → Google provider must use the **same** Google Cloud OAuth Client ID/Secret as `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET`. Otherwise seeding fails and the workspace OAuth redirect still completes the link.

Attendees only get identity scopes (no Drive/Gmail).

**Hydration / SSR:** console noise like `bis_skin_checked` comes from antivirus browser extensions (e.g. Bitdefender), not the app — disable the extension on localhost or ignore in dev.

**Platform Resend** (not for organizer attendee mail): `RESEND_*` — see `docs/email-platform-setup.md`.

Picker/CSP notes: `docs/connections-picker-setup.md`.

---

## 11. How to test the organizer flow (manual QA)

Assume local or staging app is running, Google OAuth client has the redirect URI, and (for Picker) API key + App ID are set.

### Connections hub (where to manage Google)

Organizer left rail → **Connections** (`/organizer/<id>/settings/connections`).

Tabs: **Accounts** (connect/disconnect) · **Library** (Drive Docs/Sheets links) · **Calendar** (synced entities) · **Sheets** (live exports) · **Sent email** (batches).

Profile → Connections also links Library and **Custom Forms** (`/organizer/<id>/forms`). Attendee Excel/Sheet **import** is on event **Attendees** and **Exports** (free events only).

### A. Connect Gmail and send as yourself

1. Sign in as an **organizer**.
2. Open **Connections** from the left rail (or `/organizer/<organizerId>/settings/connections`).
3. On **Accounts**, find **Gmail: send from your address**, click **Connect**.
4. Google consent: leave **Send email on your behalf** checked; finish.
5. Expect: card **Active**, connected email shown, capacity strip visible.
6. Open an event → **Attendees** → send a confirmation / custom email (or registration auto-mail after a test signup).
7. Expect: recipient gets mail **From** your Google address; message appears in **your Gmail Sent**.
8. Disconnect Google (or revoke in Google Account → Third-party access) and try send again → should **fail closed** / banner to reconnect — **not** send via Resend.

### B. Calendar + Meet

1. On Connections, connect **Google Calendar** (and Meet shares the same consent if prompted).
2. Pick a writable calendar if the UI offers a picker.
3. Create/update an interview, agenda item with “add to calendar”, or mentor/judging slot that syncs.
4. Expect: event in Google Calendar; Meet link when opted in.
5. Public event page / ticket: **Add to calendar** ICS and Google link still work for attendees without Connections.

### C. Drive Docs / Library

1. Connect **Google Drive** (`drive.file`).
2. Open `/organizer/<organizerId>/library` **or** event **Files**.
3. **Create** a Doc/Sheet/Slides → opens in Google, appears in Library.
4. **Pick from Drive** via Picker → link appears with metadata.
5. **Open in Google** after revoke access or delete file in Drive → should block with missing/no_access message after verify.
6. **Unlink** → row gone in Avoeline; file still in Drive.

### D. Live Sheets + templates

1. Event → **Exports** → Google Sheets panel.
2. **Export once** (Attendees) → sheet in Avoeline folder; open in Google.
3. **Keep in sync** → register/check-in someone → sheet updates (or wait for sheet-syncs cron).
4. Put `=1+1` style text in a form answer → cell should be neutralized (leading `'`), not execute as formula.
5. Delete the sheet in Drive → sync pauses with clear error; **Stop sync** works from the panel.
6. Create **Run of show** / **Sponsor tracker** / **MoU** templates → Doc/Sheet linked under Files.

### E. Limits & reconnect

1. Bulk send past remaining capacity → preview shows schedule / overflow (docs/18 UI).
2. Force reconnect: revoke app in Google → next send marks `needs_reconnect`; notification + Connections banner; outbox paused until reconnect.

### F. Automated checks (dev)

```bash
npm run test:connections-imports
npm run test:unit
# or focused:
node --import tsx --test src/features/connections/__tests__/c6Hardening.test.ts
node --import tsx --test src/features/connections/__tests__/c5Sheets.test.ts
node --import tsx --test src/features/connections/__tests__/c4Drive.test.ts
```

Optional: hit crons with `CRON_SECRET` against local routes.

---

## 12. Where organizers click (URLs)

| Feature | Path |
| --- | --- |
| Connect Google | `/organizer/[organizer_id]/settings/connections` |
| Drive Library | `/organizer/[organizer_id]/library` |
| Event Files | `/organizer/[organizer_id]/events/[eventId]/files` |
| Sheets export / templates | `/organizer/[organizer_id]/events/[eventId]/exports` |
| Attendee email | `/organizer/[organizer_id]/events/[eventId]/attendees` |
| OAuth callback | `/api/connections/google/callback` |

Vendor / department / club have their own `settings/connections` mounts (C2).

---

## 13. Related docs index

| Doc | Use when |
| --- | --- |
| `docs/17-connections-system.md` | Full product + phase prompts |
| `docs/18-email-send-limits-and-scheduling.md` | Capacity, batches, outbox |
| `docs/connections-security-review.md` | Threat matrix + runbooks |
| `docs/google-verification.md` | Scope justifications + Limited Use + verification checklist |
| `docs/connections-picker-setup.md` | Picker API key / CSP |
| `docs/email-platform-setup.md` | Resend platform lanes only |
| `docs/16-platform-email.md` | Superseded for organizer Google mail |
| `completeContext.md` | Code map + change log |

---

*Last updated: 2026-11-02 — after C1–C6 + closeouts + docs/18.*
