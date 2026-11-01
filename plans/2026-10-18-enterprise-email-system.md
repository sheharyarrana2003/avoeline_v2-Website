# Enterprise email system (platform + organizer)

**Status:** done (2026-10-18)  
**Source plan:** `.cursor/plans/enterprise_email_system_9bde41ec.plan.md`

## Locked product rules

- **Platform / SaaS:** Resend only after domain verify. Lane picks **From** alias; **Reply-To** and **Bcc archive** always `info@aroxes.com`.
- **Organizer → attendees / certs / bulk / custom event mail:** never Resend. Require Google OAuth or SMTP; fail-closed. SaaS owner may provision SMTP.
- **Auth signup verification:** Supabase Auth (custom SMTP → Resend documented separately).
- **Invoices:** plan-change / billing HTML summaries (no Stripe PDF).

## Shipped

| Phase | What |
| --- | --- |
| 1 | `sendPlatformEmail` + lanes + Reply-To/Bcc; env; `docs/email-platform-setup.md`; SaaS invite + notifications lanes |
| 2 | React Email templates + `platformMail.service`; plan change + invoice summary; support status; owner announcement action |
| 3 | `organizer_email_connections` migration; Google/SMTP transport; connect UI; owner provision; gate attendee/cert/guest invites |
| 4 | Unit tests (`lanes.test.ts`); checklist in docs; completeContext + this archive |

## Key paths

- Platform: `src/lib/email/{lanes,resend}.ts`, `src/features/email/platformMail.service.ts`, `emails/platform-*.tsx`
- Organizer: `src/features/email/organizer{EmailConnection,Transport}.service.ts`, `/organizer/[id]/email`, `/api/email/google/callback`
- Docs: `docs/email-platform-setup.md`

## Follow-ups

- Configure Resend domain aliases + Hostinger `info@` DNS in production
- Set `EMAIL_CONNECTION_SECRET` + Google OAuth env for Connect Google
- Optional: gate live/judging organizer mails the same way if product wants parity
