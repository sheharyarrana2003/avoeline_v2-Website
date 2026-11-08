# Google Picker setup (Connections C4 / docs/22 A5)

Use a **browser API key** restricted by HTTP referrer (your production and preview domains). Do not use an unrestricted key.

## A5 order (Cloud Console)

1. Open the **same** Google Cloud project that owns your OAuth client (`GOOGLE_OAUTH_CLIENT_ID`).
2. Enable **Google Picker API** and **Google Drive API**.
3. APIs & Services → Credentials → **Create credentials → API key**.
4. Restrict the key:
   - Application restrictions → **HTTP referrers**
   - Add production (`https://your-domain.com/*`), Vercel previews (`https://*.vercel.app/*`), and local (`http://localhost:3000/*`).
5. Copy the key → `GOOGLE_PICKER_API_KEY` (browser key; never a server key).
6. Project Settings → note the numeric **project number** → `GOOGLE_PICKER_APP_ID`.
7. Confirm OAuth client + Picker key + App ID are all from that project.
8. Redeploy after setting env on Vercel.
9. Admin check (no secrets returned): `GET /api/admin/picker-diagnostics`.

Also keep existing OAuth env: `GOOGLE_OAUTH_CLIENT_ID` / secret / redirect.

## CSP

`next.config.ts` allows `https://apis.google.com` (scripts), `https://docs.google.com` / `https://drive.google.com` (frames), and `https://www.googleapis.com` (connect).

## Security

The picker-token route returns a **short-lived access token** only (rate-limited). Refresh tokens never leave `integration_secrets`.

## Troubleshoot: “API developer key is invalid”

Google is rejecting the **browser** key in the Picker, not the OAuth client secret.

| Check | What to do |
| --- | --- |
| Wrong project | Key and OAuth client must be from the same Cloud project as `GOOGLE_PICKER_APP_ID` (project **number**). |
| API disabled | Enable **Google Picker API** (+ Drive API) on that project. |
| Referrers | HTTP referrer restrictions must include production, `https://*.vercel.app/*`, and localhost. A missing preview host fails only on Vercel previews. |
| Key type | Use a **browser** key, not a server key. Never paste the key into client error copy or logs. |
| Env on Vercel | Redeploy after setting `GOOGLE_PICKER_API_KEY` / `GOOGLE_PICKER_APP_ID`. |

UI copy for this failure is centralized in `src/features/connections/lib/pickerErrors.ts` (`formatPickerUserError`).
