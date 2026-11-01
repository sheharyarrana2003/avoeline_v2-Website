# Phase 5 — Certificates: JSON templates, on-demand render, no blockchain

**Status:** done  
**Source plan:** `.cursor/plans/phase_5_certificates_5d5cd65a.plan.md`

## Overview

Rewrite certificates as versioned JSON templates + on-demand rendering (web/PDF/mobile), drop blockchain/IPFS/stored PDFs, and ship a Konva editor — with a narrow Route Handler API for mobile ETag caching.

## Shipped

### 5A — Blockchain purge
- Migration drops all `blockchain_*` columns from `certificates` / `certificate_templates`
- Deleted `blockchain.service.ts`, `blockchain.model.ts`
- Removed `ethers`, `pinata` and env (`POLYGON_*`, `PINATA_JWT`, contract key)
- `rg` clean under `src/` for ethers/pinata/blockchain_/POLYGON_/PINATA_/ipfs/nft/polygon

### 5B — Schema
- `certificate_templates`: `layout`, `assets`, `status` (`draft|published`), `version`, `email_attach_pdf`
- `certificate_template_versions`: immutable `(template_id, version)`
- `certificates`: `data` jsonb; no `pdf_url`; status `issued|revoked`
- Types regenerated (`src/lib/database.types.ts`); `TABLES.CERTIFICATE_TEMPLATE_VERSIONS`

### 5C — Renderer
- `layout.types.ts`, `interpolate.ts`, `renderCertificate.ts` (SVG + pdf-lib)
- Tests: short / long / non-Latin names under `__tests__/renderCertificate.test.ts`

### 5D — Routes
- `GET /api/certificates/[id]` — JSON + ETag / 304
- `GET /certificate/[code]/download` — PDF stream, bump `download_count`
- `/verify/[code]` — SVG preview, bump `verification_count`; UUID → code redirect
- Email: download link; optional in-memory PDF when `email_attach_pdf`
- Bulk issue: insert rows only + rate limit + module gate

### 5E–F — Editor + organizer UI
- Dynamic Konva `CertificateEditor`: tools, tokens, fonts, gallery, preview, autosave, publish, re-render-all
- `certificateClient` / pages: no blockchain copy; on-demand download links

## Key paths

| Area | Path |
| --- | --- |
| Migration | `supabase/migrations/20261012170000_phase5_certificates_json.sql` |
| Feature | `src/features/certificates/` |
| API | `src/app/api/certificates/[id]/route.ts` |
| Download | `src/app/certificate/[code]/download/route.ts` |
| Verify | `src/app/verify/[code]/page.tsx` |
| Organizer | `src/app/organizer/.../events/[eventId]/certificates/` |

## Follow-ups (non-blocking)

- Optional cleanup of orphan PDFs left in Storage from pre-Phase-5 writes
- QR element still uses placeholder boxes in SVG/PDF until full QR draw lands
