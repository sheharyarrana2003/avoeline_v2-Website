# Google Cloud verification notes (Connections)

## Scopes and justifications

| Scope | Capability | Sensitivity | User-facing reason |
| --- | --- | --- | --- |
| `openid` `email` | Identity | Non-sensitive | Identify the Google account (`sub`) and show the connected email |
| `gmail.send` | `email.send` | Sensitive | Send event mail from the organizer’s address; messages appear in Sent |
| `calendar.events` | `calendar`, `meet` | Sensitive | Create/update/delete only events the platform made; Meet via conferenceData |
| `drive.file` | `drive.files`, `sheets.sync` | Non-sensitive | Open files the user picks or the app creates; never whole-Drive search |

**Never request:** `drive`, `drive.readonly`, any Gmail read/modify scope.

## Demo video outline (sensitive scopes)

1. **gmail.send:** Connect Gmail → send a registration confirmation → show Sent folder + recipient inbox.
2. **calendar.events:** Connect Calendar → schedule interview with “Add to calendar” → show event (and Meet link if opted in) → cancel/remove.

## Privacy policy — Limited Use (draft text)

> When you connect Google, Avoeline uses Gmail, Calendar, and Drive data only to provide the features you enable (sending mail you initiate, calendar events you opt into, and files you pick or create in the Library / Sheets export). We do not sell this data, use it for advertising, or use it to train AI models. We do not read your inbox or the contents of Drive files. Human review occurs only with your consent or for security/legal reasons. You can disconnect at any time in Settings → Connections.

## Workspace admin allow-list

If your Google Workspace blocks unverified apps, ask your admin to allow the OAuth client ID shown on the Connections “blocked by admin” note (`GOOGLE_OAUTH_CLIENT_ID`).

## Environments

- **Dev:** OAuth consent Testing mode; add test users.
- **Prod:** Separate Cloud project; authorized domains; privacy + terms URLs on your domain; enable Gmail, Calendar, Drive, Picker, Sheets, Docs APIs as features ship.

## Verification submission checklist (docs/17 §11)

1. **Separate Cloud projects** for development and production (never share OAuth clients).
2. **OAuth consent screen:** app name, logo, support email, authorized domains; privacy policy + terms hosted on `aroxes.com` (or production domain).
3. **Domain verification** for the production site before submitting sensitive scopes.
4. **Testing mode limits:** max 100 test users; refresh tokens expire after 7 days — plan verification early.
5. **Sensitive scopes** (`gmail.send`, `calendar.events`): record demo videos per outline above; submit only after demos are ready.
6. **Non-sensitive** `drive.file`: include in consent but does not require the same sensitive-scope review.
7. **Workspace allow-list note:** keep the blocked-by-admin copyable note (see above) for university/corporate admins.
8. **Publish** the OAuth app only after Google approval for production traffic; keep Testing mode for staging.
