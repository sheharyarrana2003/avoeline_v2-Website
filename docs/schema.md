# Avoeline public schema (post schema-optimization)

**Branch baseline:** `staging/schema-optimization` · **Date:** 2026-10-12  
**Detail / decisions:** [`docs/schema-report.md`](schema-report.md) · inventory: `docs/schema-inventory/`

App access pattern: **service-role + Server Actions** for most tables (RLS on, often zero policies = deny JWT). JWT policies remain on public/read surfaces (`events`, `registrations`, `notifications`, orgs, etc.).

## Conventions

| Rule | Practice |
| --- | --- |
| PKs | `uuid` + `gen_random_uuid()` |
| Money | `numeric(12,2)` |
| Datetimes | `timestamptz` |
| Statuses | `text` + CHECK; TS unions guarded by `src/lib/__tests__/statusConstraints.test.ts` |
| `updated_at` | Shared trigger `public.set_updated_at()` |
| Realtime | Publication empty (subscribe when needed) |

## Tables by domain

| Domain | Tables | Owning feature |
| --- | --- | --- |
| Identity | `users`, `attendee_profiles`, `organizer_profiles`, `vendor_profiles`, `vendor_services` | auth / profiles |
| Orgs / clubs | `organizations`, `org_memberships`, `pending_invites`, `org_tenures`, `org_module_access`, `org_announcements`, `announcement_deliveries`, `org_requests`, `club_roster`, `budget_entries` | department / clubs |
| Taxonomy | `event_categories`, `category_requests`, `category_field_sets`, `checklist_templates` | taxonomy / admin |
| Events | `events`, `event_checklist_items`, `event_agenda_items`, `event_agenda_speakers`, `event_speakers`, `event_invites`, `event_email_templates`, `event_sponsors_partners`, `partner_types`, `event_external_vendors`, `event_expenses`, `event_access_tiers` (legacy vs tickets — INVESTIGATE) | events / Phase 4 |
| Registration | `ticket_tiers`, `promo_codes`, `promo_redemptions`, `registrations`, `event_form_fields`, `registration_groups` | registration / Phase 7 |
| Staff / teams | `teams`, `team_positions`, `team_members`, `event_staff_assignments`, `recruitment_forms`, `applicants`, `access_grants` | teams / Phase 6 |
| Hackathon | `hackathon_tracks`, `hackathon_track_prizes`, `hackathon_teams`, `hackathon_team_members`, `hackathon_phases`, `hackathon_tasks`, `hackathon_task_*`, `hackathon_config`, `hackathon_settings` (INVESTIGATE vs config), `hackathon_submissions` (INVESTIGATE vs team.extra), CTF/judges/mentors/scores/schedules/attendance/anomalies/sandboxes, `team_activity_pings`, `team_integrity_events`, `compete_access_failures` | hackathon Phases 8–9 |
| Bookings / money | `bookings`, `payments`, `reviews` | bookings |
| Certificates | `certificate_templates`, `certificate_template_versions`, `certificates` (`data` jsonb + `template_version` int; no blockchain/file) | certificates Phase 5 |
| SaaS | `subscription_plans`, `plan_changes`, `feature_overrides`, `custom_pricing_agreements` | admin / plans |
| Support / audit | `support_tickets`, `support_ticket_messages`, `support_ticket_attachments`, `moderation_logs`, `event_reports`, `notifications`, `notification_templates` | admin / support |
| Badges | `badge_tiers`, `user_badges`, `badge_meetups` | networking |
| Analytics | `mv_event_registration_counts` (service-role; revoked from anon/auth). **Refresh:** hourly via scheduled job / after bulk registration jobs with `REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_event_registration_counts` | Phase 10 |

## Key constraints

- `events.status` ∈ `draft|published|archived|cancelled` (lifecycle derived in app)
- `events.visibility` CHECK; `format` ∈ physical|virtual|hybrid; group size CHECK
- `org_tenures`: partial unique one-current + `EXCLUDE USING gist` no-overlap
- `hackathon_tracks_date_order_check` when dates non-null
- `promo_codes` unique `(event_id, code)`; `redeem_promo` RPC owns `usage_count`

## Indexes / RLS notes

- Hot FKs indexed (Phases 10 + schema opt Step 6)
- Duplicate indexes removed (certs / promo_redemptions / support messages / announcement deliveries)
- RLS initplan: policies use `(select auth.uid())`
- Deny-default tables: privileges revoked from `anon`/`authenticated`

## Storage buckets

| Bucket | Visibility | Used by |
| --- | --- | --- |
| media / sponsor-logos | public | banners, logos |
| certificates | private | on-demand render cache optional |
| payment-screenshots | private | registrations / payments |
| hackathon-challenge-files | private | tasks |
| hackathon-submissions | private | task submissions |
| support-attachments | private | support threads |
| expense-receipts | private | event expenses |

## Dropped in this pass

`solo_participants`, `hackathon_mentor_slots`, `hackathon_team_phases`, `badge_meetup_attendees` (scream-tested then dropped).

## Remaining INVESTIGATE

`hackathon_submissions` vs `hackathon_teams.extra`, `event_access_tiers` vs `ticket_tiers`, `hackathon_settings` vs `hackathon_config`, category string/id overlap, prize `amount` as text, Auth HIBP, OTHER_REPOS confirmation.
