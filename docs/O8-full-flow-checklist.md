# O8 full-flow checklist (localhost)

**Audience:** You, signed in as `avoeline@gmail.com` on `http://localhost:3000`.  
**Agent role:** Does not drive your session. Playwright uses `seed:demo` separately (`*@avoeline.demo`).  
**Mark each row:** Pass / Fail / N/A (and a short note).  
**SoT for tabs after O0–O7:** this file. Older §4.1 in [`TESTING.md`](TESTING.md) is superseded for hackathon tab names.

**Prep**

1. `npm run dev` → open http://localhost:3000  
2. `/auth/signin` as `avoeline@gmail.com` → land on `/organizer/{uuid}/dashboard` (enterprise / Avoeline)  
3. Optional: Organizer → **Connections** → Google Drive + Gmail (needed for proof-to-Drive, Sheets, cert archive email, guest/attendee mail). Without Connections, mark those rows **N/A**.  
4. Note your organizer UUID from the URL: `________________`

Create **two** events below (A regular, B hackathon). Fill sample data on every tab.

---

## A. Regular (non-hackathon) event

### A0. Create & publish

| # | Check | P/F/N | Notes |
| --- | --- | --- | --- |
| A0.1 | Create via `/organizer/{id}/events/create` — **not** hackathon | | |
| A0.2 | Banner 4:5; free or paid tier; unlimited seats OK | | |
| A0.3 | Publish succeeds; event appears in My Events | | |
| A0.4 | Public `/events/{eventId}` and short `/e/{eventId}` open | | |

**Event id:** `________________`

### A1. Overview

| # | Check | P/F/N | Notes |
| --- | --- | --- | --- |
| A1.1 | Tab label area has **Overview** (not a separate Programme tab) | | |
| A1.2 | **Agenda** tile (or hidden when agenda empty) — not “Programme” | | |
| A1.3 | **Key details**: dates, reg window, venue, format, category, visibility, description | | |
| A1.4 | Fees / capacity: Free or tier range; seats omitted when unlimited | | |
| A1.5 | Open in Maps works without requiring lat/lng | | |

### A2. Attendees

| # | Check | P/F/N | Notes |
| --- | --- | --- | --- |
| A2.1 | **Registration form** opens from Attendees (drawer), not Access | | |
| A2.2 | Toolbar: Email / Export visible | | |
| A2.3 | Public register (single) creates a row | | |
| A2.4 | Approve / confirm registration works | | |
| A2.5 | Check-in from drawer; actor shown | | |
| A2.6 | On-demand QR in drawer (no stored QR image required) | | |
| A2.7 | Email lead with ticket/QR (needs Gmail) | | |

### A3. Access (all five types)

Run as separate saves or two events if easier. For each type, confirm **How this works**, type-scoped tools, and public gate.

| Type | Organizer UI OK | Public gate behaves | Guest/whitelist/invite tools scoped | P/F/N |
| --- | --- | --- | --- | --- |
| `public` | | | | |
| `private` | | | | |
| `invite_only` | | | | |
| `hybrid` | | | | |
| `tiered` | | | | |

| # | Extra | P/F/N | Notes |
| --- | --- | --- | --- |
| A3.1 | No registration **form builder** on Access | | |
| A3.2 | Guest tables show expired/revoked; sample CSV | | |
| A3.3 | Email guests via connected sender (or N/A) | | |

### A4. Agenda & Speakers

| # | Check | P/F/N | Notes |
| --- | --- | --- | --- |
| A4.1 | Agenda: create item (list or timeline); types available | | |
| A4.2 | Overlap warning only (does not hard-block) | | |
| A4.3 | Speaker create; link to agenda session both ways | | |
| A4.4 | Public page shows agenda/speakers when expected | | |

### A5. Vendors / Sponsors / Expenses / Team

| # | Check | P/F/N | Notes |
| --- | --- | --- | --- |
| A5.1 | Vendors tab loads | | |
| A5.2 | Sponsors: add via list → modal; payment fields; show-on-public toggle | | |
| A5.3 | Expenses: ledger totals; add manual income/expense; export | | |
| A5.4 | Team: assign ops staff; **no** recruit/grants chrome on event tab | | |

### A6. Certificates

| # | Check | P/F/N | Notes |
| --- | --- | --- | --- |
| A6.1 | Issue certificates (records only; no hard fail if Drive down) | | |
| A6.2 | Open `/certificate/{code}` — SVG preview + Download PDF | | |
| A6.3 | `/certificate/{code}/download` returns PDF | | |
| A6.4 | `/verify/{code}` works | | |
| A6.5 | Email certs: primary CTA is **viewer** URL (not only `/download`) | | |
| A6.6 | Include Drive link: warning shown; default off (or N/A) | | |

### A7. Files & Exports

| # | Check | P/F/N | Notes |
| --- | --- | --- | --- |
| A7.1 | Files: Drive health / Connect CTA if disconnected | | |
| A7.2 | Event folders panel lists A6 tree + Open in Google (or Connect) | | |
| A7.3 | Create Doc/Sheet/Slides under **event** folder (if Drive) | | |
| A7.4 | Exports: download participant workbook | | |
| A7.5 | Google Sheets sync (if Drive) | | |

---

## B. Hackathon event

### B0. Create & publish

| # | Check | P/F/N | Notes |
| --- | --- | --- | --- |
| B0.1 | Create with **Is this a hackathon?** (or `?hackathon=1`) | | |
| B0.2 | ≥1 named competition; CTF = checkbox (no type dropdown) | | |
| B0.3 | Publish; appears under Events and `?kind=hackathon` | | |
| B0.4 | Tabs include Competitions, Phases & Tasks, Submissions, Scoreboard, Settings | | |
| B0.5 | **No Competitors tab** (teams live under Attendees) | | |

**Event id:** `________________`

### B1. Competitions & Judges

| # | Check | P/F/N | Notes |
| --- | --- | --- | --- |
| B1.1 | Add/edit competition modal (focus trap / portal) | | |
| B1.2 | Single Rules & instructions; **registration closes** only (no product `closesAt`) | | |
| B1.3 | Public `/events/{id}/tracks` cards: Register open/closed/full | | |
| B1.4 | Judge invite compose / resend; `/judge/{token}` scoring → scoreboard | | |
| B1.5 | No rubric configure / advance-round UI | | |

### B2. Phases, Tasks, Submissions, Scoreboard, Settings

| # | Check | P/F/N | Notes |
| --- | --- | --- | --- |
| B2.1 | Phase with open/close; task with optional FileStore attachment | | |
| B2.2 | Phase window gates submit (even if lock messaging differs) | | |
| B2.3 | Participant: enter code → `/compete`; submit file and/or links | | |
| B2.4 | Organizer Submissions: file/size/points; proxy download; filters | | |
| B2.5 | Scoreboard: per-competition; ▲▼ vs ~1h; refresh; gated by `live_scoreboard` | | |
| B2.6 | Settings: matrix toggles only — **no** online mode / mentors / announcements | | |

### B3. Participant register path

| # | Check | P/F/N | Notes |
| --- | --- | --- | --- |
| B3.1 | Public: pick competition → team name → members → optional payment file | | |
| B3.2 | Organizer Attendees: confirm + payment → join/enter code visible | | |
| B3.3 | `/enter` with code → `/compete` tabs | | |

---

## C. Cross-flows (either event)

| # | Check | P/F/N | Notes |
| --- | --- | --- | --- |
| C1 | Paid proof upload lands in Drive **or** fallback storage + health banner | | |
| C2 | Approve after proof | | |
| C3 | Lead email with QR codes (≤10 inline; Gmail) | | |
| C4 | Check-in one member | | |
| C5 | Certificate viewer still works when Drive disconnected | | |

---

## D. Removed A7 surfaces (must stay gone)

| # | Check | P/F/N | Notes |
| --- | --- | --- | --- |
| D1 | `/events/{id}/mentors` redirects away (e.g. to tracks) | | |
| D2 | `/events/{id}/tracks/{trackId}/leaderboard` redirects to competition detail | | |
| D3 | Organizer `.../events/{id}/teams` redirects to **Attendees** | | |
| D4 | No Competitors / Programme nav labels | | |
| D5 | Settings: no online mode, mentors, announcements, judging rubric builder | | |

---

## Results summary

| Area | Overall | Blockers |
| --- | --- | --- |
| A Regular event tabs | | |
| A Access ×5 | | |
| B Hackathon tabs | | |
| C Cross-flows | | |
| D Removed A7 | | |
| Connections (Drive/Gmail) | | |

**Date tested:** ____________  
**App commit / branch:** ____________

---

## Appendix — Not done / out of scope (O8)

| Item | Status |
| --- | --- |
| Playwright full matrix on CI | Out of scope |
| Drop deprecated DB columns | Out of scope |
| Real Gmail inbox verification | Manual / N/A without Connections |
| Drive Picker / share-by-link cert email | Manual / N/A without Drive |
| Agent login as `avoeline@gmail.com` | Not done (by design) |
| Demo organizer Playwright `chromium-auth` tab smoke | Soft-skipped here — confirm `DEMO_SEED_PASSWORD` matches seed, then re-run `npm run test:e2e` |
| Long-run flaky `/teams` redirect when `npm run dev` sleeps | Infra — retry with warm server; authenticated path also in `organizer-tabs` |
| Your Fail/N/A rows from sections A–D | _(fill while testing)_ |

**Automated companion:** `npm run seed:demo` → `npm run dev` → `npm run test:e2e`. Defaults in `e2e/helpers/demo.ts` (override `E2E_EVENT_ID` / `E2E_ORGANIZER_ID` after re-seed).
