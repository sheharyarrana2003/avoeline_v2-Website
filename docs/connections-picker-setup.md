# Google Picker setup (Connections C4)

Use a **browser API key** restricted by HTTP referrer (your production and preview domains). Do not use an unrestricted key.

## Cloud Console

1. Enable **Google Picker API** and **Google Drive API** on the same project as OAuth.
2. Create an API key → Application restrictions → HTTP referrers → add e.g. `https://your-domain.com/*`, `http://localhost:3000/*`.
3. Note the OAuth client’s numeric **App ID** (Google Cloud project number) as `GOOGLE_PICKER_APP_ID`.
4. Set env (see `.env.example`):
   - `GOOGLE_PICKER_API_KEY`
   - `GOOGLE_PICKER_APP_ID`
   - Existing `GOOGLE_OAUTH_CLIENT_ID` / secret / redirect

## CSP

`next.config.ts` allows `https://apis.google.com` (scripts), `https://docs.google.com` / `https://drive.google.com` (frames), and `https://www.googleapis.com` (connect).

## Security

The picker-token route returns a **short-lived access token** only (rate-limited). Refresh tokens never leave `integration_secrets`.
