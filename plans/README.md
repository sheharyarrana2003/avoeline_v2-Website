# Plans archive

Versioned home for product and engineering plans. Cursor’s `.cursor/plans/` is the IDE workspace; **this folder is the repo source of truth**.

## Naming

Save every plan as:

```
plans/YYYY-MM-DD-short-slug.md
```

Examples: `2026-10-07-firebase-supabase-cutover.md`, `2026-10-11-plans-archive-and-verification.md`.

## Workflow

1. Draft or approve a plan (CreatePlan / agent session).
2. In the **same session**, write or copy the final plan into `plans/YYYY-MM-DD-short-slug.md`.
3. Update [`INDEX.md`](INDEX.md) (status, one-line summary, open follow-ups).
4. If the work ships code, also update [`../completeContext.md`](../completeContext.md) Change log.

## Status values (INDEX)

| Status | Meaning |
| --- | --- |
| `done` | Work shipped; retrospective may still note follow-ups |
| `active` | Approved / in progress |
| `archived` | Historical snapshot; do not treat as current backlog |
| `follow-up` | Tracked debt, not a full plan |

## Rules for agents

- After completing a plan: copy it here and refresh INDEX.
- Do not delete archived plans; mark superseded ones in INDEX.
- Prefer linking file paths with backticks so agents can open them next time.
