# docs/22 O2–O8 status (2026-11-08)

Living checklist after O0/O1 and the O2–O4 event-module rebuilds.

## O2 Overview & Attendees — done
| Item | Status |
| --- | --- |
| Agenda tile (not Programme), link, Day-1 starts copy, hide when empty | Done |
| Hackathon ticket fee range + expandable per-competition closes | Done |
| Hackathon with zero tracks: “No competitions yet” | Done |
| Non-hackathon tier min–max / Free from `ticket_tiers` (+ JSONB fallback) | Done |
| Capacity card / seats left omitted when unlimited | Done (`hasLimitedCapacity`) |
| Key details: dates, full reg window, venue, format, category, visibility, description, fees, agenda | Done |
| Open in Maps (no coordinates) | Done |
| Registration form drawer on Attendees | Done |
| Toolbar Email / Export / Exports-Sheets | Done |
| Export participants + teams/members + Competition column + form fields | Done |
| Google Sheets create/sync on Exports tab (C5 sanitize) | Done |
| Drawer: answers, tier, payment hide, status history, check-in who, QR, ticket | Done |
| Join code visibility + revoke/regenerate + valid-until last phase/event end | Done |
| Email `requireConnectedSender`; received answers; confirmed maps + multi-QR ≤10 | Done |
| Composer checkboxes update live preview | Done |
| Unit tests (capacity, join, email compose, export columns, C5) | Done |

## O3 Access — done
| Item | Status |
| --- | --- |
| Type cards + store `tiered` (map legacy `vip_tiered`) | Done |
| A2 How this works table | Done |
| Type-scoped tools (whitelist / invites / gated / tiers) | Done |
| Approval + waitlist + one Save; form only on Attendees | Done |
| Split whitelist vs invite tables; expired/revoked statuses; sample CSV | Done |
| Soft revoke invites | Done |
| Email guests composer (tokens, filters, preview, capacity, copy-link) | Done |
| Tier `available_until` demote + `seatsLeft` on public DTO | Done |
| Drop `promoHints` from public DTO/UI | Done |
| Registration rejects inactive/out-of-window/sold-out tiers | Done |
| Public gate via `resolveEventAccess`; hybrid invite validate; `public-gate` RL | Done |
| `saveAccessSettings` → `assertEventActor(..., "access")` | Done |
| Unit tests (decideAccess, invites, guest parse/email, tier window, DTO forbidden keys) | Done |

## O4 Agenda / Speakers / Sponsors / Expenses / Team — done
| Item | Status |
| --- | --- |
| Agenda SoT (`event_agenda_items` + join); nine types; list\|timeline; modal CRUD | Done |
| Overlap warn-only; Competition `track_id`; public day/type/avatar parity | Done |
| Speakers ↔ agenda bidirectional join; cards show linked sessions | Done |
| Sponsors list-first + modal form→preview; public strip preview; `show_*`; payment fields | Done |
| Ledger view/RPC; manual income; no double-count superseded autos; export auto+manual | Done |
| Event Team assign/lead/remove + Manage in Teams; `hideChrome` (no recruit/grants) | Done |
| Unit tests (overlaps, join helpers, org toggles, ledger, assignment lead) | Done |

## O5 Competitions / Judges / Public — done
| Item | Status |
| --- | --- |
| Shared Modal portal + focus trap; TrackForm O5 sections; opaque Add competition | Done |
| Effective registration close (track else event); Register open/closed/full | Done |
| Judge composer + opened/resend; score 0..task max → completions/scoreboard | Done |
| Public Competitions cards: CTF, expandable rules, effective close, Register team | Done |
| Unit tests (modal focus, close logic, invite lifecycle, scoring bounds, DTO scrub) | Done |

## O6 Phases / Submissions / Scoreboard / Settings — done
| Item | Status |
| --- | --- |
| Phase/task FileStore attachments + phase edit + compete `/api/files` auth | Done |
| Phase window always gates submit/flag (lock toggle = messaging) | Done |
| Participant FileStore submit, multi-link (≤5), `allow_resubmission` | Done |
| Submissions table: file/size/points, proxy download, filter-only, pagination | Done |
| Scoreboard ▲▼ vs hour-ago ranks (no snapshot table) | Done |
| `live_scoreboard` gates organizer board; settings matrix + enforcement tests | Done |

## O7
| Item | Status |
| --- | --- |
| Public viewer `/certificate/[code]` (on-demand SVG + PDF CTA; works with Drive down) | Done |
| Email primary CTA = viewer URL; Drive link only opt-in + share URL | Done |
| Issue = records only; `archiveToDrive` default on; `certificate_jobs` cron private archive | Done |
| Bulk email via docs/18 `enqueueBatch` + outbox send-time render; share-by-link warning | Done |
| Files A4: `EventDriveFoldersPanel`, create under event folder, `assertEventActor(..., "files")` | Done |
| Unit tests + plans archive | Done |

## O8 QA
| Item | Status |
| --- | --- |
| Manual checklist [`docs/O8-full-flow-checklist.md`](O8-full-flow-checklist.md) for `avoeline@gmail.com` localhost | Done |
| Playwright: public/onboarding smoke + enter→compete (rules ack) + A7 redirects | Done (local) |
| Playwright: demo organizer `storageState` tab smoke | Soft-skip until `DEMO_SEED_PASSWORD` login succeeds in CI/agent |
| Docs sync (11, TESTING §4.1, completeContext, plans archive) | Done |
| No restored A7 features (mentors/leaderboard/teams→attendees redirects) | Done |
| Playwright on CI / Drive-Gmail automation / deprecated column DROPs | Out of scope |

## Explicitly out of scope / follow-ups
- Dropping deprecated DB columns (schema optimization).
- Full Playwright suite green on CI.
