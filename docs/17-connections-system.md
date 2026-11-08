# Connections System: Google email, Calendar, Meet and Drive for every user type

One module, one page, one security model. It **replaces the separate email-account code** from docs 15 and 16 (their rules about who sends which email still apply and are restated in section 6). Hand this whole file to Cursor and run the prompts in section 13 in order.

---

## 1. Your questions, answered

**If an organizer signs in with Google, do they still have to connect it?** Yes. Signing in with Google only proves who they are. Connecting is a separate consent where they approve specific permissions (send email, calendar, files). Reasons:
- Google wants apps to ask for each permission only when needed, and users can untick individual permissions on the consent screen, so you must check what was really granted.
- Sign-in tokens aren't kept or refreshed for you, so they can't power background jobs like bulk email.
- A login screen that asks for mail and calendar access scares people off.

So the dashboard shows a **"Set up your connections"** checklist, and any feature that needs a connection (sending an email, creating a Meet link) offers **Connect Google** right there.

**Can the platform search all of an organizer's Docs, Sheets and Drive?** Not the whole Drive, and I don't recommend trying. Reading a user's existing Drive needs Google's *restricted* scopes (`drive.readonly`, `drive`), which require verification plus an **annual third-party security assessment (CASA)**. The practical design: the user **picks files with Google's file picker** or **creates files from your platform**. Those use the *non-sensitive* `drive.file` scope. The platform stores a searchable record (title, type, link, which event/team/club it belongs to), so "find it all in one place" works for everything linked or created through the platform.

**Emails.** Platform mail (billing, notifications, invites, system updates) goes from `aroxes.com` through Resend. Everything an organizer sends (confirmations, bulk, custom, judges, mentors, teams, recruitment, vendors, certificates) goes from the **organizer's connected Google account** and appears in their Sent folder. This is the rule from doc 16.

**Departments and clubs.** The connection can belong to the **organization** (for example the club's own Google account), connected by the president or department admin, and used by members the admin allows. A club with no Google account can create a free Gmail for the club. Microsoft 365 can be added later as a second provider, and SMTP stays unsupported (your earlier decision).

---

## 2. What Google lets you build (decides the design)

| Need | Scope | Google tier | What it costs you |
|---|---|---|---|
| Sign in (identity) | `openid email profile` | Non-sensitive | Nothing |
| Send email as the user | `gmail.send` | **Sensitive** | App verification (consent screen, privacy policy, scope justification, demo video). No security assessment |
| Create calendar events and Meet links | `calendar.events` | **Sensitive** (confirm in your Cloud console: Data Access lists each scope's tier) | Same verification |
| Files the user picks or the app creates (Docs, Sheets, Slides, any file) | `drive.file` | **Non-sensitive** | Basic setup only |
| Read or search the user's whole Drive | `drive.readonly`, `drive` | **Restricted** | Verification **plus annual CASA assessment** |

Notes:
- **Meet links** come from Calendar: creating an event with `conferenceDataVersion=1` and a `createRequest` of type `hangoutsMeet` makes the event and the Meet link in one call. The link can come back as *pending* first, so poll briefly.
- The Docs and Sheets APIs accept `drive.file` for files the app created or the user picked, so live sheet sync and template docs can stay on the non-sensitive scope. Don't add broader Docs/Sheets scopes unless a feature truly needs files the app never touched (confirm on Google's scope pages when you build it).
- In **Testing** mode an unverified OAuth app allows only 100 test users and refresh tokens expire after 7 days. Start verification early, and use a separate Google Cloud project for development.
- A university **Workspace admin can block third-party apps**. The flow must show a clear message and a copyable note for the admin (section 5.7).

---

## 3. Integration catalog (what the Connections page shows)

Each card shows: icon, name, one-line benefit, "what you allow" in plain words, "what we never do", status, Connect/Disconnect.

| Key | Card | Benefits | Allows (plain words) | Scope | Phase |
|---|---|---|---|---|---|
| `email.send` | **Gmail: send from your address** | Registration confirmations, bulk and custom emails, invites, certificates and all event mail go out from *your* address. They show in your Sent folder, replies reach your inbox, and it costs nothing | Send emails on your behalf | `gmail.send` | C1 |
| `calendar` | **Google Calendar** | Interviews, mentor slots, judging sessions and your events appear in your calendar with reminders | Create, update and delete the events the platform made | `calendar.events` | C3 |
| `meet` | **Google Meet** | One-click Meet links for interviews, workshops and online hackathon sessions | Same permission as Calendar (the link is created on a calendar event) | `calendar.events` | C3 |
| `drive.files` | **Google Drive, Docs, Sheets** | Attach or create Docs, Sheets and Slides for events, teams and clubs, and find them all in one Library | Open files you pick, and create files from the platform (never browse your Drive) | `drive.file` | C4 |
| `sheets.sync` | **Live attendee sheet** | Keep a Google Sheet updated with registrations, teams and check-ins | Update the sheet the platform created | `drive.file` | C5 |

Always shown under each card: "We never read your inbox, never read files you didn't choose, and you can disconnect any time."

**Who sees which cards**

| Owner | Connection belongs to | Cards |
|---|---|---|
| Organizer | The user | All five |
| Vendor | The user | Gmail (optional, for sending quotes and invoices), Calendar and Meet (bookings, client calls), Drive |
| Department, club | The **organization** (or a member, personally) | All five. The president or department admin connects it |
| SaaS owner and staff | Personal use only | Calendar, Meet, Drive. Platform mail never uses a Google connection |
| Attendees and general users | None | No connections. They get an "Add to Google Calendar" link (no sign-in) |

---

## 4. Module structure (one module, easy to extend)

```text
src/features/connections/
  catalog.ts               # integrations, benefits, scopes, tiers, plan gates
  types.ts
  providers/
    provider.ts            # interfaces: OAuthProvider, EmailSender, CalendarClient, DriveClient
    google/                # oauth.ts, email.ts, calendar.ts, drive.ts, errors.ts
    (microsoft/ later)
  server/                  # server-only
    oauth.service.ts       # start, callback, state and PKCE, incremental scopes
    tokens.service.ts      # encrypt and decrypt, refresh, health check
    connections.service.ts # create, list, resolve, revoke, grants
    sender.service.ts      # resolveSender() for all organizer-origin email
    quota.service.ts       # per-connection daily and per-minute limits
    audit.service.ts
  actions/                 # connect, disconnect, setDefaultSender, grantUse, reconnectLink
  components/              # ConnectionsPage, IntegrationCard, ConnectDialog, ConnectionRow,
                           # SenderPicker, NeedsConnection, PermissionList,
                           # FilePickerButton, LibraryList
src/app/<role>/settings/connections/page.tsx   # same page for organizer, vendor, department, club
src/app/api/connections/[provider]/start/route.ts
src/app/api/connections/[provider]/callback/route.ts
```

Rules: other features never call Google directly. They call `connections` services (`sendAs`, `createCalendarEvent`, `linkFile`). Every provider call goes through one wrapper that handles token refresh, error mapping, quotas, retries and audit.

---

## 5. Flows

### 5.1 Sign-in versus connect
- Sign-in (email/password or Google) never gets API access.
- After first login, the dashboard shows a dismissible **Connections checklist** card (Email, Calendar and Meet, Files) linking to Settings → Connections. Features that need a connection show `<NeedsConnection capability="…"/>` with a Connect button and then return the user to where they were.

### 5.2 Connect flow
1. User clicks **Connect** on a card. For organization-owned connections the user needs `connections:manage` on that organization.
2. **ConnectDialog** explains benefits, lists exact permissions in plain words, says what we never do, and links the privacy policy.
3. Server action `startConnect(capability, owner, returnTo)`: creates a one-time `oauth_states` row (hashed state, encrypted PKCE verifier, owner, capability, validated same-origin `returnTo`, 10-minute expiry, bound to the signed-in user) and returns the Google URL with scopes = `openid email` + the capability's scopes, `include_granted_scopes=true`, `access_type=offline`, `prompt=select_account consent`.
4. **Callback**: validate state (single use, not expired, same user), exchange the code with PKCE, verify the ID token (issuer, audience, expiry, email verified), and **compare granted scopes with required scopes**. If the user unticked something, show "You didn't allow X" with a retry. Handle `access_denied`. Key the account by Google `sub`, not email.
5. Encrypt the refresh token, store the connection, enable only the capabilities that were granted, write an audit entry, and return to `returnTo`.
6. Post-connect step: for email, send a test message to themselves. For calendar, choose which calendar. For files, show the file picker.

### 5.3 Reconnect
On `invalid_grant`, revoked access or expired consent: set status `needs_reconnect`, pause queues for that connection, create an in-app notification (and one rate-limited platform email), and show a banner with **Reconnect** (same flow with `login_hint`). Queued emails wait. Nothing falls back to the platform sender.

### 5.4 Disconnect
Revoke the token at Google, delete the secret, stop queues and calendar sync, keep an audit entry, and offer "Also remove linked file records". Features show their not-connected state (doc 16 section 3).

### 5.5 Organization-owned connections (departments and clubs)
- The president or department admin connects the club's Google account. The row is owned by the **organization**.
- They grant members use of it through `connection_grants` (for example `email.send` for executives and leads) and can revoke at any time.
- Every send records who used it. Quotas are shared across all users of that connection.
- If the person who connected leaves, the connection stays; any org admin can re-authorize or disconnect it.
- Anyone may also connect personally. In the sender picker they choose "Me" or the organization.

### 5.6 Platform owner and support
- Owner and permitted staff see each tenant's connection status: provider email, granted capabilities, status, last used and last error. **Never tokens.**
- They can send the tenant a one-time "Reconnect" link, or switch a tenant's integration off (kill switch) with a reason, all audited. No impersonation.

### 5.7 Workspace admin blocked
If Google reports the organization's admin has restricted the app, set status `blocked_by_admin` and show: "Your organization's Google admin must allow this app." with a copyable message that includes the OAuth client ID and the requested permissions. Offer the alternative of connecting a personal Gmail.

---

## 6. Email routing

| Kind | Origin | Sent through |
|---|---|---|
| Signup and password reset, account invites, owner notifications and announcements, billing, support replies, vendor status, security alerts, marketplace notifications (new quote or message) | Platform | Resend from `notifications@` / `events@` / `billing@aroxes.com`, Reply-To `info@aroxes.com` |
| Registration received/confirmed, tickets, team access codes, guest and whitelist invites, announcements to participants, custom and bulk email, certificate emails, judge, mentor, team and staff invites, recruitment and interview emails | Organizer (or department/club) | The sender chosen by `resolveSender()`: a connection with `email.send` |
| Quotes and invoices sent to a customer from a vendor's own address (optional) | Vendor | The vendor's connection |

**`resolveSender({ actor, orgContext, eventId, kind })`**, first match wins:
1. The event's chosen default sender, if the actor may use it.
2. The actor's own default `email.send` connection.
3. An organization connection the actor has a grant for.
4. None: the action is **blocked** (disabled Send, "Connect your email", the web fallbacks and held emails from doc 16 section 3).

**Quotas:** per-connection daily limit (defaults: free Gmail 400, Google Workspace 1,500, adjustable downward) and a per-minute throttle, with overflow queued to the next day and a visible remaining quota. Recipients are always resolved on the server from event data. The platform never sends organizer-origin email.

---

## 7. Calendar and Meet behavior
- One-way, platform to Google. The platform creates, updates and deletes **only the events it created**, tracked in `calendar_links`.
- What creates events: interviews (Teams recruitment), mentor slots, judging sessions, online hackathon sessions, agenda items marked "add to calendar", and the organizer's own event dates. Always optional per item, never automatic without a switch.
- Idempotent: one `calendar_links` row per entity and connection, and a stable `requestId` so retries never duplicate. Changes in the platform update the Google event, and cancel deletes it.
- Meet links: `conferenceDataVersion=1` and a `hangoutsMeet` `createRequest`. If the response says *pending*, poll a few times, then show "Link is being created". The link is stored in `calendar_links.meet_url` and shown as a **Join** button to the right people.
- Default `sendUpdates=none`, so Google does not email guests by surprise. Interviews can opt in to "Send Google Calendar invite".
- Always give an `.ics` download and an "Add to Google Calendar" link as the fallback for people without a connection (including attendees).
- Times are stored in UTC and shown in the event's timezone.

---

## 8. Drive, Docs and Sheets
- **Library** page: search and filter all linked and created files (title, type, owner, linked event/team/club, added by, last opened) from the platform's own table. Each result opens in Google.
- **Add from Google Drive**: Google Picker with `drive.file`. The server returns a short-lived access token for the Picker only for the signed-in user (rate-limited, never the refresh token). The picked file's metadata is saved and linked to an event, team, club or booking.
- **Create new**: blank Doc, Sheet or Slides created by the app in an "Avoeline" folder in the user's Drive, then linked to a chosen entity. Template-filled docs come in Phase C5.
- **Live attendee sheet** (C5): create a Sheet and keep it updated one-way. Sanitize every cell against formula injection (prefix values starting with `=`, `+`, `-` or `@`).
- Verify access when a file is opened or on a daily job: statuses `ok`, `missing`, `no_access`. A "No access" file shows how to fix it.
- The platform never changes sharing settings in v1 and never reads file contents (no content indexing).

---

## 9. Data model

```sql
integration_connections (
  id uuid pk,
  owner_type text check (owner_type in ('user','org')),
  owner_id uuid not null,                       -- users.id or organizations.id
  provider text check (provider in ('google','microsoft')),
  provider_account_id text not null,            -- Google "sub"
  provider_email text not null,
  display_name text, avatar_url text,
  status text check (status in ('active','needs_reconnect','revoked','blocked_by_admin','disabled')),
  granted_scopes text[] not null default '{}',
  connected_by uuid references users(id),
  connected_at timestamptz default now(),
  last_used_at timestamptz, last_error text, last_error_at timestamptz,
  unique (owner_type, owner_id, provider, provider_account_id)
);

integration_secrets (                           -- service role only; no client grants
  connection_id uuid primary key references integration_connections on delete cascade,
  encrypted_refresh_token text not null,
  key_version int not null,
  rotated_at timestamptz
);

integration_capabilities (
  connection_id uuid references integration_connections on delete cascade,
  capability text check (capability in ('email.send','calendar','meet','drive.files','sheets.sync')),
  enabled boolean default true,
  settings jsonb default '{}',                  -- calendar_id, daily_limit, folder_id...
  primary key (connection_id, capability)
);

connection_grants (                             -- who may USE an organization-owned connection
  id uuid pk, connection_id uuid references integration_connections on delete cascade,
  user_id uuid references users(id), capabilities text[] not null,
  granted_by uuid, created_at timestamptz default now(), revoked_at timestamptz
);

sender_preferences (owner_type, owner_id, event_id nullable, connection_id);   -- default sender
connection_usage (connection_id, capability, usage_date date, count int, primary key (...));
oauth_states (id, state_hash unique, code_verifier_enc, user_id, owner_type, owner_id,
              capability, return_to, expires_at, used_at);
linked_files (id, owner_type, owner_id, connection_id, provider_file_id, mime_type, title,
              web_url, icon_url, entity_type, entity_id, added_by, added_at,
              last_checked_at, provider_modified_at, status check (status in ('ok','missing','no_access')),
              unique (connection_id, provider_file_id, entity_type, entity_id));
calendar_links (id, connection_id, entity_type, entity_id, google_calendar_id, google_event_id,
                meet_url, etag, status, last_synced_at, unique (connection_id, entity_type, entity_id));
connection_audit (id, connection_id nullable, owner_type, owner_id, actor_id, action, details jsonb, created_at);
```
RLS: users read only their own connections and org connections they belong to, **never** `integration_secrets`. Index every foreign key and `(owner_type, owner_id)`. Migrate the older `email_accounts` rows into `integration_connections` (capability `email.send`) and point `email_log` and the outbox at `connection_id`.

---

## 10. Security checklist (applies to every phase)

1. Authorization code flow with **PKCE**, a one-time `state` bound to the signed-in user, exact redirect URI allowlist, same-origin `returnTo` only.
2. Verify the ID token. Identify accounts by Google `sub`. **Check granted scopes** (users can untick). Never trust a requested scope as granted.
3. **Incremental consent**: ask only for the capability being connected. Never request restricted scopes (`drive.readonly`, `drive`, any Gmail read scope). Never request every scope at sign-in.
4. Refresh tokens encrypted with AES-256-GCM, a versioned key from the environment (key rotation script), stored in a table that no client role can read, decrypted only in `server-only` code, never logged or returned. Access tokens are short-lived and kept only in memory.
5. Disconnect revokes at Google and deletes the secret. Suspension and kill switches (global per provider, per tenant) stop all use immediately.
6. Org connections: use only through grants, every use audited, quotas shared, no silent changes of the connected account.
7. **Google API data policy (Limited Use):** use Google user data only to provide the user-facing features. No advertising, no selling, no training of AI models on it, and no human reading except with consent or for security or legal reasons. Disclose this in the privacy policy. Do not send Gmail, Calendar or Drive data to Gemini or any other AI feature.
8. Store the minimum: file metadata and event ids only. No email content, no file contents. Recipients and calendar attendees come from platform data, never free input.
9. Rate-limit connect, disconnect, token endpoints, sends and the Picker token endpoint. Backoff and retry on Google 429/5xx.
10. Strip control characters from addresses, subjects and event titles (header and ICS injection). Escape everything rendered. Sanitize sheet cells against formula injection.
11. Content Security Policy updated only for what the Picker needs (Google domains), API key restricted by HTTP referrer.
12. Audit every connect, disconnect, grant, revoke, send batch and admin action. No tokens, no email bodies, no file contents in logs.
13. Keep env names in `src/env.ts`: `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `CONNECTIONS_ENCRYPTION_KEY`, `GOOGLE_PICKER_API_KEY`, `GOOGLE_PICKER_APP_ID`, `CONNECTIONS_GOOGLE_ENABLED`. If the existing code already uses other names for the Google client and secret, reuse them or migrate them in one step. Never paste values into Cursor.

---

## 11. Google Cloud and verification checklist
1. Two Google Cloud projects: **dev** (Testing mode, test users only) and **prod**.
2. Consent screen: app name, logo, support email, authorized domain (`aroxes.com`), privacy policy and terms pages on your domain.
3. Enable the Gmail, Calendar, Drive and Picker APIs only when each phase ships.
4. Declare each scope with a short justification. Prepare a demo video for each sensitive scope (`gmail.send`, `calendar.events`).
5. Verify domain ownership, submit for verification, and expect back-and-forth. Until approved: 100 test users and 7-day refresh tokens.
6. Publish the app only after every shipped scope is approved.
7. Document the client ID for university Workspace admins who need to allow the app.

---

## 12. Plan gates (suggested, you decide)
- `email.send`, `calendar`, `meet`: free for everyone (no cost to you).
- `drive.files` Library and `sheets.sync`: could be a paid module such as `google_workspace_sync`. Cheap for you to run, so this is only a pricing choice.
- Org-owned connections for departments and clubs: part of the department plan.

---

## 13. Cursor prompts

Run one per fresh chat, attaching `@docs/ENGINEERING_RULES.md` and `@docs/17-connections-system.md`. Never put secret values in a prompt.

### C1: Foundation, OAuth, Gmail, replace email accounts

> **Status (2026-11-01):** Shipped. Module `src/features/connections/`, migration `supabase/migrations/20261101200000_connections_c1.sql`, organizer Settings → Connections, `resolveSender` / `requireConnectedSender` rewired, kill switches, unit tests. C2+ still open.

````text
Build the Connections foundation exactly as specified in docs/17 (sections 2, 4, 5.1-5.4, 6, 9, 10).
1. Create the module skeleton in src/features/connections/ and the route files. No other feature may call Google directly.
2. Migrations for integration_connections, integration_secrets, integration_capabilities, sender_preferences, connection_usage, oauth_states, connection_audit, with RLS (secrets table has no client grants), indexes and constraints. Regenerate types.
3. tokens.service: AES-256-GCM with a versioned key from CONNECTIONS_ENCRYPTION_KEY (src/env.ts), server-only, refresh with in-memory short cache, health check, key rotation script.
4. catalog.ts with the five integrations (benefits, plain-language permissions, scopes, tier, gates). Only email.send is active in this phase.
5. OAuth start and callback per 5.2: one-time state + PKCE, ID token verification, granted-scope check, access_denied and admin-blocked handling, same-origin returnTo, key by Google sub, duplicate handling.
6. GoogleProvider: oauth and Gmail send via users.messages.send (RFC 822, UTF-8, plain and HTML parts, Reply-To), error mapping (invalid_grant → needs_reconnect and pause the queue, 429 → backoff and reschedule).
7. UI: one shared ConnectionsPage (owner scope prop), IntegrationCard, ConnectDialog, ConnectionRow, status badges, disconnect with revoke at Google, reconnect, test email to self, quota display. Mount it in Settings → Connections for the organizer. Add the dismissible dashboard "Set up your connections" checklist and the NeedsConnection component.
8. Migrate the existing email_accounts data and code into the new tables. Make requireConnectedSender() call resolveSender() from this module (single sender for now). Point email_log and the outbox at connection_id. Replace the current admin "Outbound email" panel on the organizer page with a read-only connection status plus "Send reconnect link"; support users can never see tokens.
9. Kill switches: CONNECTIONS_GOOGLE_ENABLED and a per-tenant disable flag, both audited.
10. Tests: state and PKCE validation, scope-granularity (user unticks a scope), token encryption round trip, secrets not selectable by any client role, quota overflow, disconnect revokes and deletes, migration preserves connections.
Pause for review.
````

### C2: Organization connections, vendors, sender picker

**Status (2026-11-02):** Shipped — org grants + mounts + full `resolveSender` + SenderPicker + reconnect tokens + admin kill switch + unit tests. Pause for review before C3.

````text
Read docs/17 sections 3, 5.5-5.7, 6. Extend the foundation.
1. Org-owned connections: owner_type 'org', connected by users with connections:manage on that organization, connection_grants table and UI (grant/revoke use per member and capability), shared quotas, usage recorded with the acting user, and an "owner changed, re-authorize" state when the connecting user leaves.
2. Mount the same ConnectionsPage for vendors, departments and clubs (owner scope prop). Vendor cards per docs/17 section 3.
3. resolveSender() full algorithm (event default, personal default, org grant, blocked). SenderPicker component used in every email modal ("Sending as ..."), a per-event default sender setting, and a per-user default.
4. Reconnect and blocked_by_admin flows (copyable note for the Google admin with the client ID).
5. Platform owner view per tenant (status, capabilities, last used, last error, never tokens), "Send reconnect link", per-tenant integration kill switch with reason, all audited.
6. Tests: a member without a grant cannot use an org connection, revoke takes effect immediately, quotas shared across members, sender resolution order, support cannot read secrets, no organizer-origin mail ever uses the platform sender.
Pause for review.
````

### C3: Calendar and Meet

**Status (2026-11-02):** Shipped — `calendar_links` + GoogleCalendarClient/Meet poll; catalog calendar+meet active; sync service + CalendarPicker/CalendarSyncControls; hooks (interview, event dates, agenda, mentor slots, judging window, online session); ICS + Google TEMPLATE on public hero + ticket; unit tests. Pause for review before C4.

````text
Read docs/17 sections 2 and 7. Enable the calendar and meet capabilities (scope calendar.events, incremental consent only).
1. CalendarClient on the Google provider: create, update, delete events; Meet via conferenceDataVersion=1 and a hangoutsMeet createRequest with a stable requestId; poll when pending; map errors; quotas and backoff.
2. calendar_links table and sync service: one-way platform to Google, idempotent, only events the platform created. Hooks: interview scheduling (Teams recruitment), mentor slots, judging sessions, online hackathon sessions, agenda items marked "add to calendar", and the organizer's event dates. Each is an explicit switch, default off.
3. UI: calendar picker after connecting, "Add Meet link" and "Add to my calendar" switches in those forms, a Join button showing the Meet link, sendUpdates=none by default with an opt-in "Send Google Calendar invite" for interviews.
4. Fallbacks for people without a connection: .ics download and an "Add to Google Calendar" link, including on attendee ticket pages (no sign-in required).
5. Tests: idempotent create (retry does not duplicate), update and cancel propagate, pending Meet handling, UTC storage and timezone display, ICS and header injection sanitizing, permission checks.
Pause for review.
````

### C4: Drive library

**Status (2026-11-02):** Shipped — `linked_files` + GoogleDriveClient (`drive.file`); picker-token route; create Doc/Sheet/Slides in Avoeline folder; Library + Files on event/team/club/booking; daily verify cron; unit tests. Setup: `docs/connections-picker-setup.md`. **Closeout (2026-11-02):** `provider_modified_at`; verify-on-open gate; Library mime/added-by filters + load more; action-level entity auth; extended `c4Drive` tests.

**Phase A (2026-11-07) — Event Drive + Gmail hard-require:** Organizers must have active `drive.files` + send-capable Gmail before payment proofs, registration file fields, event media, certificates, and `registration_received` / `registration_confirmed` mail. Uploads use `GoogleDriveClient.uploadBinaryFile` into Avoeline / `Event – {title}` / Payment proofs|Certificates|Media|Submissions|QR. Registration and certificate email stay fail-closed on organizer Gmail (no Resend). Public register UI blocks paid/file flows when the gate fails. Picker invalid-key diagnosis: `docs/connections-picker-setup.md` Troubleshoot.

````text
Read docs/17 sections 2 and 8. Enable drive.files with the drive.file scope only. Never request drive or drive.readonly.
1. Picker: a server endpoint returning a short-lived access token for the Picker only for the current user (rate-limited, never the refresh token), a FilePickerButton component, CSP and API key setup notes.
2. linked_files table and service: save metadata (id, name, mime, link, icon, modified time), link to an event, team, club or booking, verify access on open and daily (ok, missing, no_access), unlink.
3. Create new: blank Doc, Sheet or Slides inside an "Avoeline" folder created by the app, then link it to the chosen entity.
4. Library page: search (title, type, entity, owner, added by), filters, pagination, empty state, open in Google. Attach "Files" sections on the event, team, club and booking pages using the same LibraryList component.
5. No file contents are read or stored. No sharing changes.
6. Tests: only picked or created files are accessible, token endpoint never exposes the refresh token, permission checks per entity, status checks.
Pause for review.
````

### C5: Live attendee sheet and templates

**Status (2026-11-02):** Shipped — `sheet_syncs` + Sheets write (RAW + formula sanitize); Export once / Keep in sync on event Exports; templates (run-of-show, sponsor tracker, MoU); cron `/api/cron/sheet-syncs`; unit tests. **Closeout (2026-11-02):** event-triggered `scheduleSheetRefresh`; cron-safe `runActiveSheetSync`; chunked writes + soft 429 defer; Stop sync UI; agenda-enriched run-of-show; extended `c5Sheets` tests.

````text
Read docs/17 section 8. Using only drive.file on files the app created:
1. "Export attendees to Google Sheets" (one-off) and "Keep in sync" (one-way, event-triggered plus a job) for registrations, teams and check-ins, using the form-field columns.
2. Sanitize every cell against formula injection. Batch writes, respect quotas, back off, and handle a deleted sheet by pausing the sync with a clear message.
3. Template documents (run-of-show, sponsor tracker, MoU draft) created from platform data into the user's Drive and linked to the entity.
4. Tests: formula injection cases, sync idempotency, quota backoff, behavior when the sheet is deleted or access is revoked.
Pause for review.
````

### C6: Hardening and verification

**Status (2026-11-02):** Shipped — `docs/connections-security-review.md`, `docs/google-verification.md`, `c6Hardening.test.ts`, `/api/cron/connections-health`. Connections phases C1–C6 complete for docs/17 scope. **Closeout (2026-11-02):** import-boundary script; `oauthStateGate`; needs_reconnect notify + 24h health metrics; evidence matrix; docs/11 + verification checklist.

````text
Read docs/17 sections 10 and 11. Prove the system follows them and write docs/connections-security-review.md with evidence.
1. Static checks: the Google SDK and token code are imported only inside src/features/connections/server and providers; no organizer-origin email uses the platform sender; no restricted scopes are requested anywhere.
2. Threat tests: state forgery, open redirect via returnTo, scope downgrade, token leakage in logs, responses and RLS, cross-tenant access to connections and linked files, grant bypass, Picker token abuse, header and ICS injection, formula injection.
3. Operations: daily health job for connections, needs_reconnect notifications, metrics (connects, failures by reason, sends, quota use), and runbooks for key rotation and Google verification.
4. Produce docs/google-verification.md: scope justifications, demo video outline per sensitive scope, privacy-policy text that covers Limited Use, and the Workspace admin allow-list note.
5. Update docs/11, docs 15/16 (mark superseded parts) and completeContext.md.
````

---

## 14. Decisions for you
1. **Library scope:** linked and created files only, not the whole Drive. Whole-Drive search means restricted scopes and an annual external assessment.
2. **Plan gating:** Gmail, Calendar and Meet free for everyone, and the Drive Library and live sheet sync as a paid module, or all free?
3. **Microsoft 365:** if your universities mostly use Microsoft instead of Google, add a Microsoft provider as phase C7. Tell me what they use.
4. **Multiple accounts:** I assumed an owner may connect more than one Google account (for example personal and club). Cap it at 3?
5. **Vendor email:** vendors can optionally send quotes and invoices from their own Gmail. Say if you'd rather keep vendor mail inside the platform only.
