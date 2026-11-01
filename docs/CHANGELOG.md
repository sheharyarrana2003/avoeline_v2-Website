# Changelog

## 2026-10-12 — Phase 10 hardening

- Security: CSP enforced (+ HSTS); REVOKE anon EXECUTE on DEFINER helpers; certificates/notifications open policies confirmed closed; CTF flags → HMAC + legacy SHA256 accept; RLS isolation SQL smoke; removed `newrelic` / unused typography.
- DB: hot FK indexes; `mv_event_registration_counts` (hourly refresh note); keyset helpers for registrations/submissions.
- FE: compete/enter/department `loading.tsx`; EventCard `next/image`; bundle analyzer script; Playwright smoke skeleton.
- Tests: settings resolver, flag HMAC, keyset; CI gets `HACKATHON_COMPETE_SECRET`.
- Docs: ARCHITECTURE.md, phase10 report; deleted superseded docs 10 / 10-v2; Part 6 closed/re-listed.

## 2026-10-12 — Phase 8–9 hackathon

Competition timestamptz dates, task submissions, getEffectiveConfig, participant compete workspace.

## 2026-10-12 — Phase 7 registration forms

`event_form_fields`, schema-driven RegistrationForm, signed uploads, `redeem_promo`.
