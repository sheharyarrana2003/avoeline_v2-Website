# Platform + organizer email setup

## Architecture

| Lane | Transport | From | Reply-To / Bcc |
| --- | --- | --- | --- |
| Platform / SaaS (invites, plan changes, support, notifications) | **Resend** | Lane alias (`notifications@`, `billing@`, …) | Always `info@aroxes.com` |
| Organizer → attendees / certs / bulk / custom event mail | **Google OAuth or SMTP only** | Organizer connection | Organizer From; **no Resend fallback** |
| Auth signup verification | **Supabase Auth** | Configure Auth SMTP → Resend in dashboard (out of band) | — |

`Bcc: info@aroxes.com` is an **inbox archive copy** in Hostinger. It does **not** appear in Hostinger’s Sent folder (Resend is the sender).

## Hostinger (`info@aroxes.com`)

1. Create mailbox `info@aroxes.com` (or alias) in Hostinger.
2. Use this address for human replies and the Resend archive Bcc.
3. Do **not** create Hostinger mailboxes for every Resend send-only alias unless you want to receive mail at those addresses.

## Resend domain

1. Add domain `aroxes.com` in Resend → Domains.
2. Publish SPF / DKIM / (optional) DMARC DNS records Resend shows.
3. Wait until domain status is **Verified**.
4. Add send-only aliases (no Hostinger mailbox required):

| Lane | Suggested From |
| --- | --- |
| `notifications` | `notifications@aroxes.com` |
| `events` | `events@aroxes.com` |
| `billing` | `billing@aroxes.com` |
| `onboarding` | `welcome@aroxes.com` |
| `support` | `support@aroxes.com` |
| `security` | `security@aroxes.com` |
| `default` | `info@aroxes.com` |

5. Env (see `.env.example`):

```bash
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=info@aroxes.com
RESEND_REPLY_TO=info@aroxes.com
RESEND_ARCHIVE_BCC=info@aroxes.com
```

## Code entry points

- Platform: `sendPlatformEmail({ lane, to, subject, react|html })` in `src/lib/email/resend.ts`
- Low-level Resend: `sendEmail` (shared payload; prefer platform helper for SaaS)
- Organizer: `sendViaOrganizerConnection` in `src/features/email/organizerTransport.service.ts` — fail-closed without a connection

## Supabase Auth SMTP (optional)

Point Auth “Custom SMTP” at Resend’s SMTP credentials so verification/reset mail uses your domain. App welcome/onboarding after the account exists still uses `sendPlatformEmail` (`onboarding` lane).

## Google OAuth (organizer Connect)

1. Google Cloud Console → OAuth client (Web).
2. Authorized redirect URI = `GOOGLE_REDIRECT_URI` (e.g. `https://app/api/email/google/callback`).
3. Scopes: `https://www.googleapis.com/auth/gmail.send`, `email`, `openid`.
4. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, and `EMAIL_CONNECTION_SECRET` (≥16 chars).

If Google env is incomplete, the Connect Google UI shows setup incomplete; SMTP still works.

## Manual checklist

- [ ] Platform invite/plan email: Resend dashboard shows lane From; Hostinger `info@` receives Bcc; Reply-To is `info@`
- [ ] Organizer Attendees / Certificates: blocked until Google or SMTP connected
- [ ] SaaS owner can provision SMTP on `/admin/organizers/[id]` and revoke it
- [ ] After connect, test send succeeds; disconnect fails closed again
