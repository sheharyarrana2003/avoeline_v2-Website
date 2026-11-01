# Email send limits, capacity checks and scheduled bulk sending

Plugs into the Connections system (`17-connections-system.md`, prompt C1) and the organizer-email rules in `16-email-v2-platform-only-and-organizer-connect.md`. Run the prompt at the end after C1 exists.

---

## 1. Why limits exist (sending is free for you, so this is about safety)

1. **Protect the organizer's Gmail.** Google caps sending per account over a *rolling* 24 hours (not midnight to midnight). Free Gmail is about **500 a day**, Google Workspace about **2,000**. Hitting the cap blocks sending for up to 24 hours, even in the middle of a campaign.
2. **Protect your Google project.** If one organizer spams, Google can restrict *your* OAuth app, which would break every organizer's connection. Caps and checks are your insurance.
3. **Keep important mail flowing.** A 1,000-person announcement must not use up the day's capacity and delay ticket and confirmation emails.
4. **Plan control.** You can sell higher caps on higher plans.

Technical ceilings to design around: a send costs 100 quota units and each user gets 6,000 units a minute, which is about **60 sends a minute per user**. Default to 30 a minute so you stay well under it.

---

## 2. The limit layers (the strictest one wins)

| Layer | Default | Who sets it |
|---|---|---|
| Provider daily limit per connection (rolling 24 hours) | **Free Gmail 400**, **Workspace 1,500** (kept under Google's 500 and 2,000). Workspace is detected from the `hd` claim in Google's ID token | Platform default. Organizer can lower it |
| Per-minute throttle per connection | 30 per minute, with small random jitter | Platform |
| Plan daily cap per organizer | Set per plan | SaaS owner (plans admin) |
| Plan monthly cap per organizer | Set per plan, for example Free 1,000, Pro 10,000, Enterprise 50,000 (examples, you decide) | SaaS owner |
| Max recipients per single send | 500 | Platform, per plan |
| Reserve for time-sensitive mail (confirmations, tickets, access codes) | 20% of the daily limit stays available for them; bulk uses the rest | Platform |

`remainingNow = min(provider remaining, plan daily remaining, plan monthly remaining)`. For bulk mail, subtract the reserve.
Organization connections (a club's shared Gmail) share one pool across everyone who uses them.

---

## 3. What the organizer sees

**Capacity strip** in every compose dialog and on Settings → Connections:
"Today 120 / 400 used · next slots free up from 3:42 PM · This month 640 / 5,000"

**When the send fits:** normal preview and confirm.

**When it doesn't** (example: 1,000 selected, 320 available for bulk today), a dialog:

> You can send **320 more** emails today from you@gmail.com. You selected **1,000**.
>
> ◉ **Send 320 now, schedule the rest** (default). Rest: 320 tomorrow 9:00 AM, 320 on Friday 9:00 AM, 40 on Saturday 9:00 AM. *Estimated finish: Saturday.* You can change the start time.
> ○ **Choose recipients.** Back to the list with a selection counter "x / 320" and tick boxes disabled beyond the limit.
> ○ **Spread evenly over [3] days.**
> ○ **Cancel.**
>
> Tip: connecting a Google Workspace account raises your daily limit.

**Monthly cap reached:** blocked with "Your plan allows N emails a month; it resets on Nov 1." Options: schedule from the 1st, or upgrade.

**Batches page** ("Sent emails"): each send is a batch with status Scheduled, Sending, Completed, Paused (limit reached), Cancelled. Per batch: progress, cancel the rest, change start time, send now (only when capacity exists), failures with Retry.

**Time-sensitive mail** (registration confirmed, ticket, access code) is never queued behind a bulk batch. If even the reserve is empty, those emails wait and the organizer sees "N confirmations delayed". The web ticket and status pages already work as the fallback.

---

## 4. How it works (server)

- **Rolling window:** `usedLast24h` = emails sent through this connection in the last 24 hours (from `email_log`, indexed by connection and sent time). Slots free up when old sends age past 24 hours, so the schedule is computed from timestamps, not midnight.
- **Preview:** `previewSend({recipients or filter, kind})` runs on the server and returns `{ total, sendNow, schedule[], eta, blockedReason }`. The dialog only displays it.
- **Outbox worker** (runs every minute): takes eligible rows (`not_before` passed), highest priority first (time-sensitive before bulk), respects remaining capacity and the per-minute throttle with jitter, and stops when capacity is used.
- **At send time (not at scheduling time):** render the template with fresh data, re-check the recipient (still registered, not cancelled, not unsubscribed, the event hasn't ended for time-sensitive mail) and skip with a reason if invalid. One idempotency key per batch and recipient, so retries never double-send.
- **Circuit breaker:** on Google's daily-limit error (550 5.4.5) or rate errors (`rateLimitExceeded`, `userRateLimitExceeded`), pause that connection for a backoff (up to 24 hours), reschedule the rest, and notify the organizer once.
- **Timezones:** "tomorrow 9:00 AM" uses the organizer's timezone, and times are stored in UTC.
- **Safeguards:** one email per recipient (no CC lists), the same recipient is not emailed twice for the same kind within 24 hours, non-transactional mail carries an unsubscribe link and honors the organizer's suppression list.
- **Known limit:** with the send-only permission the platform cannot see bounces (they land in the organizer's inbox), so it only knows about errors Google returns at send time. Say so in the UI help text.

---

## 5. Data model additions

```sql
-- plan limits (or columns on subscription_plans)
plan_email_limits (plan_key pk, daily_cap int, monthly_cap int, max_per_send int)
email_limit_overrides (owner_id, daily_cap, monthly_cap, max_per_send, reason, set_by, expires_at)

email_send_batches (
  id uuid pk, owner_type, owner_id, connection_id, kind, created_by,
  total int, sent int default 0, failed int default 0, skipped int default 0, cancelled int default 0,
  status text check (status in ('scheduled','sending','completed','paused','cancelled')),
  not_before timestamptz, spread_days int, created_at timestamptz default now()
)
-- email_outbox gains: batch_id, not_before, priority int, time_sensitive boolean, attempt_at
-- integration_connections gains: daily_limit, per_minute_limit, quota_exhausted_until, is_workspace boolean
-- indexes: email_log (connection_id, sent_at), email_outbox (status, not_before, priority), batches (owner, created_at)
```

---

## 6. Platform owner controls
- Plans admin: edit `daily_cap`, `monthly_cap`, `max_per_send` per plan, and per-organizer overrides with a reason and optional expiry (reuse the override pattern from Tenant accounts).
- Usage view: emails sent per organizer per day and month, top senders, paused connections.
- Pause an organizer's sending (abuse) with a reason. Audit-logged and the organizer is notified.

---

## 7. Cursor prompt

````text
Read @docs/ENGINEERING_RULES.md, docs/17 (Connections, sections 5-6 and 10), docs/16 (organizer email rules) and docs/18 (this spec). Build send limits, capacity checks and scheduled bulk sending on top of the Connections module and the existing email outbox. Do not change who may send what.

1. Migrations per section 5 (plan_email_limits, overrides, batches, outbox and connection columns, indexes), RLS, regenerated types. Set connection defaults on connect: is_workspace from the ID token hd claim, daily_limit 1,500 for Workspace and 400 otherwise, per_minute_limit 30. The organizer can only lower these.
2. capacity.service (server-only): getCapacity(connection, owner, kind) using a rolling 24-hour window from email_log, monthly usage in the organizer's timezone, reserve for time-sensitive kinds (default 20%), and remainingNow = min(provider, plan daily, plan monthly) with the reserve applied to bulk. Also nextFreeAt timestamps.
3. previewSend({ recipients or filter, kind }) server action returning { total, sendNow, schedule[], eta, blockedReason }. Recipients are resolved on the server. Enforce max_per_send.
4. UI: a CapacityStrip component in every compose dialog and on Settings → Connections; the capacity dialog with the four options (send now and schedule the rest with an editable start time defaulting to next 9:00 AM local, choose recipients with a selection counter that disables boxes beyond the cap, spread evenly over N days, cancel); the monthly-cap blocked state; and a "Sent emails" batches page with statuses and actions (cancel the rest, change start time, send now only when capacity exists, retry failures).
5. Worker (every minute): eligible rows by not_before, priority order (time-sensitive first), capacity and per-minute throttle with jitter; render and re-validate each recipient at send time (still registered, not cancelled, not unsubscribed, event not ended for time-sensitive kinds) and skip with a stored reason; idempotency key per batch and recipient; circuit breaker on Google 550 5.4.5, rateLimitExceeded and userRateLimitExceeded (pause connection with backoff up to 24 hours, reschedule, notify the organizer once).
6. Time-sensitive kinds never wait behind a bulk batch; when the reserve is empty they queue and the organizer sees "N confirmations delayed" while the web ticket and status pages remain the fallback.
7. Safeguards: one email per recipient, dedupe the same recipient and kind within 24 hours, unsubscribe link and organizer suppression list for non-transactional kinds, and help text explaining that bounces are not visible with the send-only permission.
8. Admin: edit plan email limits and per-organizer overrides, usage view, and pause-sending with reason, all permission-checked and audit-logged.
9. Security and performance: all checks on the server, rate-limit preview and send actions, no recipient addresses or message bodies in logs, indexes from section 5, keyset pagination on the batches page.
10. Tests: rolling-window math across midnight, remainingNow as the minimum of the three limits, schedule across several days, selection-cap mode, reserve for time-sensitive mail, batch cancel and start-time change, send-time re-validation, circuit breaker and resume, timezone and DST handling, idempotent retries, monthly rollover, plan limit change mid-batch, shared pool for organization connections.
Update docs/11 and completeContext.md.
Pause after items 1-4, then again after items 5-10.
````

---

## 8. Decisions for you
1. **Default numbers:** 400 for free Gmail and 1,500 for Workspace, 20% reserve, 30 per minute, 500 per send. Lower them if you'd rather be extra safe.
2. **Plan caps:** the monthly figures above are examples. Pick them with your pricing in mind.
3. **Default schedule time:** next 9:00 AM in the organizer's timezone.
4. **Warm-up:** optionally start a brand-new connection at a lower daily limit and raise it over a few days. It makes accounts less likely to be flagged, but adds a bit of complexity. Say if you want it.
