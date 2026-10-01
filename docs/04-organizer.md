# Organizer — Dashboard & Plan Gating

Applies to: `/organizer` routes. **This file is the single source of truth for which features are free vs. paid** — do not duplicate this list anywhere else in the codebase; every gating check reads from the `module_key` list below.

## The gating table (exact module keys to use in code)

| Feature | module_key | Free or Paid |
|---|---|---|
| Event Dashboard (create/manage events) | `events_dashboard` | Free (Foundation) |
| AI Planner | `ai_planner` | **Free** |
| Analytics (standard) | `analytics_basic` | Free |
| Registrations | `registrations` | Free (Foundation) |
| Access control & invited-events tab | `access_control` | Free (Foundation) |
| Sponsors — basic management (add/list, no invoicing) | `sponsors_basic` | Free |
| Teams — basic CRUD (create team, add member) | `teams_basic` | Free (Foundation, per earlier Basic Team Core) |
| Teams — advanced roles & positions (named roles, permission scoping, recruitment forms) | `teams_advanced_roles` | **Paid** |
| Vendor Store (browse/book from vendor marketplace) | `vendor_store` | **Paid** |
| Certificates (generation, verification, bulk issue) | `certificates` | **Paid** |
| API access | `api_access` | **Paid** |
| Website Builder | `website_builder` | **Paid** |
| AI Designer (visual design generation) | `ai_designer` | **Paid** |
| Ushers / on-ground staff ops | `ushers_ops` | **Paid** |
| Hackathon (create/manage competitions) | `hackathon_ops` | **Paid** |
| Sponsors/Partners — invoicing with custom templates | `sponsors_invoicing_templates` | **Paid** |

Note the deliberate split: `ai_planner` is free but `ai_designer` is paid — don't conflate these into one "AI features" toggle. Same with `sponsors_basic` (free) vs `sponsors_invoicing_templates` (paid) and `teams_basic` (free) vs `teams_advanced_roles` (paid) — each pair is two different module_keys, not one key with a tier parameter.

## How gating resolves (single function, reused everywhere)

```
function hasModuleAccess(organizerId, moduleKey):
  if moduleKey in FREE_MODULE_KEYS: return true
  plan = get organizer_profiles.plan_type for organizerId
  if moduleKey in subscription_plans.included_modules for that plan: return true
  if an active feature_overrides row exists for (organizerId, moduleKey): return true
  return false
```

Every paid tab, button, or API route must call this one function — see `00-INDEX.md`'s cross-cutting rule. Do not write a second gating check anywhere.

## UI behavior
- Free modules: fully visible and usable immediately, no upsell noise.
- Paid modules not yet unlocked: tab is visible but shows a "Activate [Module Name] — from the plan/module selection screen" prompt in place of the feature, rather than being hidden entirely (matches the in-context activation pattern from the earlier module-selection design — the upsell appears at the moment of intent, not before).
- Paid modules unlocked (via plan or override): fully functional, identical UI to free modules.

## Feature notes

- **AI Planner** (free): reuse the existing Gemini-powered planner already built in the original app — no new backend needed, just ensure it's not accidentally gated.
- **AI Designer** (paid): a separate feature from AI Planner — generates visual assets (banners, certificate layouts, social posts) via an image/design-generation call. Build as its own module, gated by `ai_designer`.
- **Vendor Store** (paid): the existing `vendor_profiles`/`bookings` tables already support this — gating is purely at the UI/route level, not a schema change.
- **Ushers/on-ground ops**: reuse the Physical/On-Ground Operations module from the earlier complete platform spec (staff roles, zone check-in, task board) — gate the whole module behind `ushers_ops`.
- **Hackathon**: create and manage hackathon events from the left-rail module (`hackathon_ops`). Hidden until unlocked; a direct URL shows the locked panel. Club grant uses `org_module_access` like Designer/Ushers.
