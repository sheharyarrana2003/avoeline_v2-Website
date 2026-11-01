# Hackathon + events E2E audit on demo data

**Status:** done (2026-10-19)  
**Report:** [`docs/hackathon-e2e-audit-2026-10-19.md`](../docs/hackathon-e2e-audit-2026-10-19.md)

## Overview

Run a full hackathon + event-tab audit and live test against demo seed (`org.enterprise@avoeline.demo` / Demo Spring Hackathon), fill missing demo data for settings/leads/timers, fix P0–P1 bugs found, and leave a written findings report plus tighter Playwright smoke.

## Scope

- Primary fixture: `npm run seed:demo` → Demo Spring Hackathon (teams Alpha–Echo, join `HT01`–`HT05`, enter `AV-DEMO001`–`AV-DEMO005`, flags `FLAG{demo1}`…).
- “Chrome disable” = `anti_cheat_tab_close` (integrity log only).
- “Minutes” = `per_task_timer` + `time_limit_minutes` / `hackathon_timer`.
- Competition leads = Staff positions with `team_positions.extra.trackIds`.
- Out of scope: full safeAction rewrite, Next bump, HIBP, toggle-only Not-active settings.

## Phases (shipped)

1. Prep — seed, resolve eventId, compete secret  
2. Organizer event-tab live audit  
3. Participant enter/compete E2E (flag, timer, monitoring)  
4. Security spot-check (cookie, flag leak, staff ACL)  
5. Seed gaps (timers, instructions, Cyber CTF Lead)  
6. P0–P1 fixes  
7. Playwright + audit doc + TESTING.md + completeContext  

## Outcome

Success criteria met for Demo Spring enforced settings, enter/compete, CTF Warmup solve, track-scoped lead seed, documented findings. Deferred: full IDOR suite, residual `select('*')`, toggle-only settings.
