-- Phase 10: revoke DEFINER EXECUTE from anon; hot FK indexes; analytics MV.
-- App data path remains service-role + action auth; JWT clients stay deny-default
-- on tables without policies.

revoke execute on function public.is_platform_admin() from anon, public;
revoke execute on function public.user_org_ids() from anon, public;
revoke execute on function public.user_is_event_staff(uuid) from anon, public;

grant execute on function public.is_platform_admin() to postgres, service_role, authenticated;
grant execute on function public.user_org_ids() to postgres, service_role, authenticated;
grant execute on function public.user_is_event_staff(uuid) to postgres, service_role, authenticated;

create index if not exists hackathon_teams_event_id_idx on public.hackathon_teams (event_id);
create index if not exists hackathon_teams_track_id_idx on public.hackathon_teams (track_id);
create index if not exists hackathon_task_completions_task_id_idx on public.hackathon_task_completions (task_id);
create index if not exists hackathon_task_submissions_phase_id_idx on public.hackathon_task_submissions (phase_id);
create index if not exists hackathon_task_submissions_submitted_by_idx on public.hackathon_task_submissions (submitted_by);
create index if not exists certificates_organizer_id_idx on public.certificates (organizer_id);
create index if not exists certificates_template_id_idx on public.certificates (template_id);
create index if not exists certificates_user_id_idx on public.certificates (user_id);
create index if not exists certificates_event_id_created_idx on public.certificates (event_id, created_at desc);
create index if not exists event_expenses_event_id_created_idx on public.event_expenses (event_id, created_at desc);
create index if not exists event_expenses_booking_id_idx on public.event_expenses (booking_id);
create index if not exists event_expenses_created_by_idx on public.event_expenses (created_by);
create index if not exists event_expenses_external_vendor_id_idx on public.event_expenses (external_vendor_id);
create index if not exists access_grants_granted_by_idx on public.access_grants (granted_by);
create index if not exists access_grants_scope_idx on public.access_grants (scope_type, scope_id);
create index if not exists registrations_event_id_created_idx on public.registrations (event_id, created_at desc);
create index if not exists registrations_certificate_id_idx on public.registrations (certificate_id);
create index if not exists registrations_checked_in_by_idx on public.registrations (checked_in_by);
create index if not exists registrations_invite_id_idx on public.registrations (invite_id);
create index if not exists registrations_ticket_tier_id_idx on public.registrations (ticket_tier_id);
create index if not exists support_tickets_from_user_id_idx on public.support_tickets (from_user_id);
create index if not exists support_tickets_created_idx on public.support_tickets (created_at desc);
create index if not exists support_ticket_messages_author_idx on public.support_ticket_messages (author_user_id);
create index if not exists support_ticket_messages_ticket_created_idx on public.support_ticket_messages (ticket_id, created_at);
create index if not exists team_members_user_id_idx on public.team_members (user_id);
create index if not exists team_members_position_id_idx on public.team_members (position_id);
create index if not exists promo_redemptions_promo_id_idx on public.promo_redemptions (promo_id);
create index if not exists event_form_fields_event_order_idx on public.event_form_fields (event_id, order_index) where archived_at is null;
create index if not exists moderation_logs_created_idx on public.moderation_logs (created_at desc);
create index if not exists announcement_deliveries_announcement_idx on public.announcement_deliveries (announcement_id);

drop policy if exists "Allow insert for all" on public.notifications;
drop policy if exists "notifications_insert_any" on public.notifications;
drop policy if exists "certificates_public_verify" on public.certificates;
drop policy if exists "Enable read access for all users" on public.certificates;

create materialized view if not exists public.mv_event_registration_counts as
select
  event_id,
  count(*)::bigint as total_registrations,
  count(*) filter (where status in ('confirmed','checked_in','attended'))::bigint as confirmed_count,
  count(*) filter (where status = 'waitlisted')::bigint as waitlisted_count,
  count(*) filter (where status = 'awaiting_payment')::bigint as awaiting_payment_count,
  max(created_at) as last_registration_at
from public.registrations
group by event_id;

create unique index if not exists mv_event_registration_counts_event_id_uidx
  on public.mv_event_registration_counts (event_id);

comment on materialized view public.mv_event_registration_counts is
  'Phase 10 analytics. Refresh hourly: refresh materialized view concurrently public.mv_event_registration_counts;';
