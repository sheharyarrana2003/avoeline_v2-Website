# Marketing Lighthouse reports

Local-only performance / a11y / best-practices / SEO reports for the public marketing routes.

## Run

1. `npm run build && npm run start`
2. In another terminal: `npm run report:marketing`

Optional env:

- `MARKETING_LH_BASE` — default `http://127.0.0.1:3000`
- `MARKETING_LH_THRESHOLD` — default `95` (exit non-zero if any category is below)

Outputs (`*.json`, `*.html`, `summary.json`) are gitignored. Keep this README and `CHECKLIST.md`.

## Checklist

Fill [`CHECKLIST.md`](./CHECKLIST.md) when you run a hardening pass.
