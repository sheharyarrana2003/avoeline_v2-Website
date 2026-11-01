# Hackathon + events E2E audit — 2026-10-19

Live audit against demo seed (`npm run seed:demo`), primary fixture **Demo Spring Hackathon**.

## Fixture

| Item | Value |
| --- | --- |
| Organizer | `org.enterprise@avoeline.demo` / `AvoelineDemo1!` |
| Event | Demo Spring Hackathon |
| Event id (this seed run) | `33d215b6-2648-443b-967c-3b16f46f7bb3` |
| Organizer id | `7bc30194-1a50-4866-ae9a-76080677b16a` |
| Enter codes | `AV-DEMO001`–`AV-DEMO005` |
| Join codes | `HT01`–`HT05` |
| CTF flags | `FLAG{demo1}` … `FLAG{demo5}` |
| Compete secret | `HACKATHON_COMPETE_SECRET` in `.env.local` |

Event UUID is **not** fixed across re-seeds; resolve from UI or SQL after `seed:demo`.

## How to re-run

```bash
npm run seed:demo
npm run dev
# Manual: sign in as org.enterprise → open Demo Spring tabs; incognito enter with AV-DEMO001
E2E_EVENT_ID=<uuid> E2E_ENTER_CODE=AV-DEMO001 npm run test:e2e -- e2e/smoke.spec.ts
npm run test:unit
```

## Pass / fail matrix

### Organizer tabs (Demo Spring)

| Area | Result | Notes |
| --- | --- | --- |
| Overview | Pass | Stats, schedule, recent regs load |
| Attendees | Pass (spot) | Grouped teams expected for hackathon |
| Staff | Pass (spot) | Ops Desk Demo assigned; Cyber CTF Lead position seeded |
| Access / Agenda / Speakers | Pass (spot) | Shared strip loads |
| Competitions | Pass | 5 tracks; Cyber CTF CTF kind; configure/edit present |
| Phases & Tasks | Pass | Cyber CTF 1 phase · 5 tasks; filter chips work |
| Teams | Pass (spot) | Unique join/enter codes in seed |
| Settings | Pass | Apply-all + per-competition; timers / phased / scoreboard / tab-close visible |
| Scoreboard | Pass | Cyber CTF: Team Alpha **100** after Warmup solve |
| Submissions | Pass (spot) | Tab loads |

### Participant portal

| Check | Result | Notes |
| --- | --- | --- |
| `/enter` with `AV-DEMO001` | Pass | Sets compete cookie → `/compete` |
| Compete tabs | Pass | Instructions, Phases & Tasks, Scoreboard, Submissions, Team |
| Member count | Pass | Shows 1 after seed + UI fallback |
| Instructions / Active rules | Pass | Custom track copy + enforced settings listed |
| `FLAG{demo1}` on Warmup | Pass | Start timer → Submit → Solved · 100 pts |
| Per-task timer | Pass | Requires Start before submit when `per_task_timer` on |
| Tab-close monitoring | Pass | Banner: visibility logged, **no auto-punish** |
| Live scoreboard (participant) | Pass | Tab present when `live_scoreboard` on |

### Security spot-check

| Check | Result | Notes |
| --- | --- | --- |
| Compete cookie path | Pass | Scoped `/events/{eventId}` |
| Fail-closed team session | Pass | No wrong-team fallback (`competeSession`) |
| Flag plaintext in task descriptions | Fixed | Seed no longer embeds `FLAG{…}` in descriptions |
| Public CTF challenge list | Fixed | `toPublicChallenge` / blank submission flags |
| `submitFlagAction` unauthenticated | Fixed | Requires compete session + track scope |
| Phase update / submission download ACL | Fixed | `staffCanAct` track scope |
| Enter with empty `member_registration_ids` | Fixed | Service fallback + seed backfill |
| Competition lead `trackIds` | Seeded | Ops Desk **Cyber CTF Lead** → `extra.trackIds` = Cyber CTF; assigned to `attendee1` |
| Cross-event enter code | Deferred | Manual adversarial suite still open (TESTING §0c) |
| Residual `select('*')` in hackathon actions | Deferred | P2 burn-down; not newly introduced |

### Seed gaps addressed

- `member_registration_ids` + registration `registered` status for enter path
- Cyber CTF: `per_task_timer`, `anti_cheat_tab_close`, `hackathon_timer`; Warmup `time_limit_minutes: 30`
- Track `kind` / `instructions` / `rules_text` repair
- **Cyber CTF Lead** staff position with `extra.trackIds`

### Bugs fixed this pass (P0–P1)

1. Enter rejected when members only in join table (empty `member_registration_ids`)
2. Compete UI member count ignored join-table members
3. CTF flags / challenge payloads leaked to clients; arena submit lacked compete session
4. Staff phase mutate + submission download missing track-scoped `staffCanAct`
5. Compete cookie wrong-team soft-fallback removed (fail closed)
6. Demo seed plaintext flags in descriptions; timer/phase/lead fixtures incomplete
7. Organizer Teams tab showed **0 members** despite `member_registration_ids` — `mapToTeam` now synthesizes members from that array

### Deferred (out of scope / toggle-only)

- `docker_sandboxing`, `daily_shifts`, and other matrix **Not active yet** keys
- Full `safeAction` rewrite, Next bump, HIBP dashboard
- Full adversarial IDOR suite beyond spot-checks

## Playwright

`e2e/smoke.spec.ts`:

- Always: public + onboarding redirect smoke
- With `E2E_EVENT_ID`: enter page heading
- With `E2E_EVENT_ID` + `E2E_ENTER_CODE`: submit code → assert compete tabs

See also [`docs/TESTING.md`](TESTING.md) §4.1 / §5.
