-- Schema optimization Step 6 — non-destructive only.
-- Idempotent: IF NOT EXISTS / DROP IF EXISTS / exception-safe alters.

-- ---------------------------------------------------------------------------
-- 1) Matview: remove from Data API
-- ---------------------------------------------------------------------------
revoke all on table public.mv_event_registration_counts from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) Shared updated_at trigger function
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'attendee_profiles','bookings','certificate_templates','certificates',
    'event_categories','event_email_templates','event_expenses','event_external_vendors',
    'event_form_fields','event_invites','event_sponsors_partners','events',
    'hackathon_settings','hackathon_submissions','hackathon_task_submissions',
    'hackathon_teams','hackathon_tracks','notifications','org_requests',
    'organizations','organizer_profiles','payments','registrations','reviews',
    'subscription_plans','support_tickets','users','vendor_profiles'
  ]
  loop
    execute format('drop trigger if exists trg_set_updated_at on public.%I', t);
    execute format(
      'create trigger trg_set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 3) Duplicate indexes (keep constraint-backed uniques / richer composites)
-- ---------------------------------------------------------------------------
drop index if exists public.certificates_certificate_number_uidx;
drop index if exists public.certificates_verification_code_uidx;
drop index if exists public.certificates_verification_code_idx;
drop index if exists public.promo_redemptions_promo_idx;
drop index if exists public.support_ticket_messages_ticket_id_idx;
drop index if exists public.announcement_deliveries_announcement_idx;

-- ---------------------------------------------------------------------------
-- 4) Hot FK indexes still missing (Advisor unindexed_foreign_keys subset)
-- ---------------------------------------------------------------------------
create index if not exists applicants_position_id_idx on public.applicants (position_id);
create index if not exists applicants_team_id_idx on public.applicants (team_id);
create index if not exists bookings_event_id_idx on public.bookings (event_id);
create index if not exists bookings_organizer_id_idx on public.bookings (organizer_id);
create index if not exists bookings_vendor_id_idx on public.bookings (vendor_id);
create index if not exists budget_entries_org_id_idx on public.budget_entries (org_id);
create index if not exists certificate_templates_organizer_id_idx on public.certificate_templates (organizer_id);
create index if not exists event_agenda_items_event_id_idx on public.event_agenda_items (event_id);
create index if not exists event_agenda_speakers_speaker_id_idx on public.event_agenda_speakers (speaker_id);
create index if not exists event_invites_event_id_idx on public.event_invites (event_id);
create index if not exists event_speakers_event_id_idx on public.event_speakers (event_id);
create index if not exists event_sponsors_partners_event_id_idx on public.event_sponsors_partners (event_id);
create index if not exists event_sponsors_partners_track_id_idx on public.event_sponsors_partners (track_id);
create index if not exists hackathon_phases_event_id_idx on public.hackathon_phases (event_id);
create index if not exists hackathon_task_assignments_task_id_idx on public.hackathon_task_assignments (task_id);
create index if not exists hackathon_team_members_hackathon_team_id_idx on public.hackathon_team_members (hackathon_team_id);
create index if not exists hackathon_team_members_user_id_idx on public.hackathon_team_members (user_id);
create index if not exists hackathon_team_task_starts_task_id_idx on public.hackathon_team_task_starts (task_id);
create index if not exists hackathon_tracks_event_id_idx on public.hackathon_tracks (event_id);
create index if not exists hackathon_tracks_organizer_id_idx on public.hackathon_tracks (organizer_id);
create index if not exists moderation_logs_admin_id_idx on public.moderation_logs (admin_id);
create index if not exists organizations_owner_user_id_idx on public.organizations (owner_user_id);
create index if not exists organizer_profiles_org_id_idx on public.organizer_profiles (org_id);
create index if not exists payments_payer_id_idx on public.payments (payer_id);
create index if not exists payments_receiver_id_idx on public.payments (receiver_id);
create index if not exists promo_codes_track_id_idx on public.promo_codes (track_id);
create index if not exists recruitment_forms_team_id_idx on public.recruitment_forms (team_id);
create index if not exists recruitment_forms_position_id_idx on public.recruitment_forms (position_id);
create index if not exists registration_groups_lead_registration_id_idx on public.registration_groups (lead_registration_id);
create index if not exists team_activity_pings_event_id_idx on public.team_activity_pings (event_id);
create index if not exists team_integrity_events_event_id_idx on public.team_integrity_events (event_id);
create index if not exists teams_event_id_idx on public.teams (event_id);
create index if not exists teams_org_id_idx on public.teams (org_id);
create index if not exists teams_organizer_id_idx on public.teams (organizer_id);
create index if not exists ticket_tiers_event_id_idx on public.ticket_tiers (event_id);
create index if not exists vendor_services_vendor_id_idx on public.vendor_services (vendor_id);

-- ---------------------------------------------------------------------------
-- 5) Money → numeric(12,2) (skip rates/pct/ratings/scores)
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('bookings','total_amount'),
      ('bookings','platform_commission'),
      ('bookings','vendor_receives'),
      ('budget_entries','amount'),
      ('custom_pricing_agreements','flat_monthly_override'),
      ('event_sponsors_partners','contract_value'),
      ('events','revenue'),
      ('hackathon_tracks','fee'),
      ('org_requests','requested_amount'),
      ('organizer_profiles','minimum_payout'),
      ('organizer_profiles','total_revenue'),
      ('organizer_profiles','total_spent_on_vendors'),
      ('payments','platform_fee'),
      ('payments','subtotal'),
      ('payments','tax'),
      ('payments','total_amount'),
      ('promo_codes','value'),
      ('registrations','amount_paid'),
      ('registrations','final_price'),
      ('subscription_plans','price_monthly'),
      ('subscription_plans','price_yearly'),
      ('ticket_tiers','price'),
      ('vendor_profiles','total_revenue'),
      ('vendor_services','price'),
      ('vendor_services','min_order')
    ) as v(tbl, col)
  loop
    begin
      execute format(
        'alter table public.%I alter column %I type numeric(12,2) using %I::numeric(12,2)',
        r.tbl, r.col, r.col
      );
    exception
      when others then
        raise notice 'money cast skipped %.%: %', r.tbl, r.col, sqlerrm;
    end;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 6) Competition date ordering CHECK
-- ---------------------------------------------------------------------------
alter table public.hackathon_tracks
  drop constraint if exists hackathon_tracks_date_order_check;

alter table public.hackathon_tracks
  add constraint hackathon_tracks_date_order_check
  check (
    (opens_at is null or closes_at is null or opens_at <= closes_at)
    and (opens_at is null or registration_closes_at is null or opens_at <= registration_closes_at)
    and (registration_closes_at is null or closes_at is null or registration_closes_at <= closes_at)
    and (roster_locks_at is null or closes_at is null or roster_locks_at <= closes_at)
    and (submission_deadline_at is null or closes_at is null or submission_deadline_at <= closes_at)
  );

-- ---------------------------------------------------------------------------
-- 7) events.status intent: include cancelled (lifecycle still derived in app)
-- ---------------------------------------------------------------------------
alter table public.events drop constraint if exists events_status_check;
alter table public.events
  add constraint events_status_check
  check (status = any (array['draft'::text, 'published'::text, 'archived'::text, 'cancelled'::text]));

-- ---------------------------------------------------------------------------
-- 8) certificates status default matches CHECK
-- ---------------------------------------------------------------------------
alter table public.certificates alter column status set default 'issued';
update public.certificates set status = 'issued' where status is null or status = 'ready';

-- ---------------------------------------------------------------------------
-- 9) RLS: wrap auth.uid() + collapse duplicate notifications SELECT policies
-- ---------------------------------------------------------------------------
drop policy if exists "Allow select own notifications" on public.notifications;
drop policy if exists "Users can view their own notifications" on public.notifications;

drop policy if exists notifications_own on public.notifications;
create policy notifications_own on public.notifications
  for all
  using (
    (user_id = ((select auth.uid())::text))
    or is_platform_admin()
  )
  with check (
    (user_id = ((select auth.uid())::text))
    or is_platform_admin()
  );

drop policy if exists notifications_insert_self on public.notifications;
create policy notifications_insert_self on public.notifications
  for insert
  to authenticated
  with check (user_id = ((select auth.uid())::text));

drop policy if exists organizer_own_events on public.events;
create policy organizer_own_events on public.events
  for all
  using (organizer_id = (select auth.uid()))
  with check (organizer_id = (select auth.uid()));

drop policy if exists users_self on public.users;
create policy users_self on public.users
  for select
  using ((id = (select auth.uid())) or is_platform_admin());

drop policy if exists bookings_parties on public.bookings;
create policy bookings_parties on public.bookings
  for all
  using (
    (organizer_id = (select auth.uid()))
    or (vendor_id = (select auth.uid()))
    or is_platform_admin()
  );

drop policy if exists event_children_public on public.event_agenda_items;
create policy event_children_public on public.event_agenda_items
  for select
  using (
    exists (
      select 1 from public.events e
      where e.id = event_agenda_items.event_id
        and (
          e.organizer_id = (select auth.uid())
          or is_platform_admin()
          or (e.status = 'published' and e.visibility = 'public' and e.deleted_at is null)
          or (e.org_id in (select user_org_ids()))
        )
    )
  );

drop policy if exists event_speakers_read on public.event_speakers;
create policy event_speakers_read on public.event_speakers
  for select
  using (
    exists (
      select 1 from public.events e
      where e.id = event_speakers.event_id
        and (
          e.organizer_id = (select auth.uid())
          or is_platform_admin()
          or (e.status = 'published' and e.deleted_at is null)
        )
    )
  );

drop policy if exists registrations_own on public.registrations;
create policy registrations_own on public.registrations
  for select
  using (
    (user_id = (select auth.uid()))
    or is_platform_admin()
    or exists (
      select 1 from public.events e
      where e.id = registrations.event_id
        and e.organizer_id = (select auth.uid())
    )
  );

drop policy if exists registrations_insert_self on public.registrations;
create policy registrations_insert_self on public.registrations
  for insert
  with check ((user_id is null) or (user_id = (select auth.uid())));

drop policy if exists orgs_members on public.organizations;
create policy orgs_members on public.organizations
  for select
  using (
    (id in (select user_org_ids()))
    or (owner_user_id = (select auth.uid()))
    or is_platform_admin()
  );

drop policy if exists memberships_self on public.org_memberships;
create policy memberships_self on public.org_memberships
  for select
  using (
    (user_id = (select auth.uid()))
    or is_platform_admin()
    or (org_id in (select user_org_ids()))
  );

drop policy if exists reviews_public on public.reviews;
create policy reviews_public on public.reviews
  for select
  using (
    (visibility = 'public')
    or (reviewer_id = (select auth.uid()))
    or is_platform_admin()
  );

drop policy if exists ticket_tiers_read on public.ticket_tiers;
create policy ticket_tiers_read on public.ticket_tiers
  for select
  using (
    exists (
      select 1 from public.events e
      where e.id = ticket_tiers.event_id
        and (
          e.status = 'published'
          or e.organizer_id = (select auth.uid())
          or is_platform_admin()
        )
    )
  );

-- ---------------------------------------------------------------------------
-- 10) Revoke table privileges on RLS deny-default tables (service_role keeps access)
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'access_grants','announcement_deliveries','applicants','attendee_profiles',
    'category_requests','certificate_template_versions','certificate_templates',
    'certificates','checklist_templates','compete_access_failures','event_access_tiers',
    'event_agenda_speakers','event_checklist_items','event_email_templates',
    'event_expenses','event_external_vendors','event_form_fields','event_invites',
    'event_reports','event_sponsors_partners','event_staff_assignments',
    'hackathon_announcements','hackathon_anomalies','hackathon_attendance',
    'hackathon_ctf_challenges','hackathon_flag_submissions','hackathon_judges',
    'hackathon_mentor_slots','hackathon_mentors','hackathon_phases','hackathon_sandboxes',
    'hackathon_schedules','hackathon_scores','hackathon_settings','hackathon_submissions',
    'hackathon_task_assignments','hackathon_task_submissions','hackathon_team_members',
    'hackathon_team_phases','hackathon_team_task_starts','hackathon_teams','hackathon_tracks',
    'moderation_logs','notification_templates','organizer_profiles','partner_types',
    'payments','pending_invites','promo_codes','promo_redemptions','recruitment_forms',
    'registration_groups','solo_participants','support_ticket_attachments',
    'support_ticket_messages','support_tickets','team_activity_pings','team_integrity_events',
    'team_members','team_positions','teams'
  ]
  loop
    execute format('revoke all on table public.%I from anon, authenticated', t);
  end loop;
end $$;

comment on function public.set_updated_at() is
  'Shared BEFORE UPDATE trigger: sets NEW.updated_at = now(). Schema opt Step 6.';
