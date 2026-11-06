# Platform email (SaaS / tenant)

Canonical rules for admin and platform outbound mail. Organizer → attendee mail uses Google/SMTP and is out of scope here.

> **Superseded for organizer Google mail:** use [`docs/17-connections-system.md`](17-connections-system.md) + [`docs/18-email-send-limits-and-scheduling.md`](18-email-send-limits-and-scheduling.md). Platform Resend lanes in this file remain authoritative for SaaS/tenant mail only.

## Transport

- **Only** `sendPlatformEmail` / `sendLoggedPlatformEmail` (Resend).
- From: lane aliases (`notifications@`, `billing@`, `welcome@` / onboarding, …).
- Always **Reply-To** `info@` (or `RESEND_REPLY_TO`) and archive **Bcc** (`RESEND_ARCHIVE_BCC`).

## Allowlisted kinds

| Kind | Lane | When |
| --- | --- | --- |
| `admin_account_setup` | onboarding | Account ready / invite link (never a password) |
| `billing_notice` | billing | Plan changed, pricing updated |
| `owner_notification` | notifications | Access granted/denied/ended, approval decisions |

Do not invent kinds at call sites. Extend `src/lib/email/kinds.ts`.

## Daily cap and reserve

- Env: `PLATFORM_EMAIL_DAILY_CAP` (default 500), `PLATFORM_EMAIL_ESSENTIAL_RESERVE` (default 50).
- `admin_account_setup` is **essential** and always attempts send.
- Other kinds are **queued** in `email_log` when remaining capacity ≤ reserve.

## Coalescing

- Same tenant + same kind within **10 minutes** merges into one summary email (e.g. “Your access was updated” with a list of changes).
- Never one email per feature row in a batch save.

## Failures

- A failed send **must not** roll back the domain write.
- Record `status = failed` in `email_log`; Activity tab can Resend.
- Never put temporary passwords or internal notes in email bodies, payloads, or logs.

## Templates

React Email under `/emails`: `account-ready`, `plan-changed`, `access-updated`, `access-ended`, `pricing-updated`, `approval-decision`. Escaped values + plain-text part. Each includes tenant name, before → after, effective/expiry dates, dashboard link, and “reply to this email for help”.

## Related

- Setup / lanes: `docs/email-platform-setup.md`
- Implementation: `src/lib/email/resend.ts`, `src/features/email/emailLog.service.ts`, `src/features/email/tenantMail.service.ts`
