# W5: Marketing site hardening

**Status:** done (2026-11-01)

## Scope

- **In:** sanitize fix, security/SEO unit tests, RLS smoke wired into CI, Lighthouse report script + checklist, FAQPage JSON-LD, knip/CSP cleanup, docs/11 + completeContext + plans archive.
- **Out:** Cookieless analytics / cookie banner (docs/19 §10); full ESLint debt burn-down; CSP `'unsafe-inline'`/`'unsafe-eval'` removal.

## Shipped

1. **Content safety:** `blockSanitize.ts` sanitizes `rich_text.markdown` + FAQ `items[].answer`; requires hero/event `imageAlt` and logo `alt` when URLs set; LegalCmsPanel `skipHtml`.
2. **Security tests:** XSS sanitize, media upload gate (`media.logic.ts`), Turnstile-required helper, website cap matrix, published-content contract; `npm run test:sql:marketing` + optional CI job when `SUPABASE_DB_URL` is set.
3. **SEO:** FAQPage JSON-LD on home/plans; metadata/sitemap/robots unit tests.
4. **Lighthouse / a11y:** `npm run report:marketing` → `reports/marketing/`; `CHECKLIST.md`; skip-to-content in marketing layout.
5. **Cleanup / docs:** removed `randomuser.me` from CSP + `images.remotePatterns`; docs/11 marketing note; docs/19 W5 marked shipped; completeContext change log.

## Commands

```bash
npm run test:unit
npm run test:sql:marketing   # requires SUPABASE_DB_URL + psql
npm run build && npm run start
npm run report:marketing     # local 95+ gate
```

## Key files

- `src/features/website/blockSanitize.ts`, `media.logic.ts`, `publishedContent.logic.ts`, `seo.logic.ts`
- `scripts/marketing-lighthouse.mjs`, `scripts/test-marketing-rls.mjs`
- `reports/marketing/README.md`, `CHECKLIST.md`
- `.github/workflows/ci.yml` (`marketing-rls` job)
