-- Avoeline complete Postgres schema (Supabase Auth + RLS).
-- Fixes: team_positions before team_members; circular FKs deferred;
-- extra tables for CTF, speakers, checklists, access tiers, admin permissions.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. Identity & tenancy
-- ---------------------------------------------------------------------------

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  phone_number text,
  avatar_url text,
  user_type text not null check (user_type in ('attendee','organizer','vendor','platform_admin')),
  account_status text not null default 'active' check (account_status in ('active','suspended','deleted')),
  gender text,
  city text,
  country text,
  language text default 'en',
  theme text default 'light',
  email_notifications boolean default true,
  push_notifications boolean default true,
  email_verified boolean default false,
  email_verified_at timestamptz,
  phone_verified boolean default false,
  mfa_enabled boolean default false,
  login_count int default 0,
  failed_login_attempts int default 0,
  last_login_at timestamptz,
  last_active_at timestamptz,
  is_owner boolean default false,
  admin_permissions text[] default '{}',
  setup_complete boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  org_type text not null check (org_type in ('department','club','organizer_business','vendor_business')),
  parent_org_id uuid references public.organizations(id),
  owner_user_id uuid references public.users(id),
  description text,
  logo_url text,
  cover_image_url text,
  established_year int,
  contact_email text,
  contact_phone text,
  website_url text,
  social_links jsonb default '{}',
  address jsonb default '{}',
  is_verified boolean default false,
  verification_level text default 'none' check (verification_level in ('none','bronze','silver','gold')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index on public.organizations (parent_org_id);

create table public.org_memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null check (role in (
    'platform_admin','department_admin','president','executive','organizer','vendor_owner','member'
  )),
  title text,
  joined_at timestamptz default now(),
  unique (org_id, user_id)
);
create index on public.org_memberships (user_id);

create table public.pending_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  org_type text not null check (org_type in ('department','club')),
  parent_org_id uuid references public.organizations(id),
  invited_by uuid references public.users(id),
  status text not null default 'pending' check (status in ('pending','accepted','expired','cancelled')),
  token text unique not null,
  expires_at timestamptz,
  created_at timestamptz default now(),
  accepted_at timestamptz
);

-- ---------------------------------------------------------------------------
-- 2. Role-specific profiles
-- ---------------------------------------------------------------------------

create table public.attendee_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  university text,
  department text,
  student_id text,
  graduation_year int,
  is_student_verified boolean default false,
  verification_method text,
  interests text[] default '{}',
  skills text[] default '{}',
  social_links jsonb default '{}',
  events_registered int default 0,
  events_attended int default 0,
  attendance_rate numeric default 0,
  total_certificates_earned int default 0,
  total_hours_spent int default 0,
  networking_connections int default 0,
  total_reviews_written int default 0,
  average_rating_given numeric default 0,
  updated_at timestamptz default now()
);

create table public.organizer_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  org_name text,
  org_id uuid references public.organizations(id),
  plan_type text default 'free' check (plan_type in ('free','pro','enterprise')),
  plan_expires_at timestamptz,
  plan_auto_renew boolean default false,
  plan_features text[] default '{}',
  auto_publish_events boolean default false,
  default_require_approval boolean default false,
  default_allow_waitlist boolean default true,
  default_certificate_template_id uuid,
  bank_name text,
  account_title text,
  account_number text,
  iban text,
  payout_schedule text default 'weekly' check (payout_schedule in ('weekly','biweekly','monthly')),
  minimum_payout numeric default 5000,
  total_events_created int default 0,
  published_events int default 0,
  completed_events int default 0,
  cancelled_events int default 0,
  total_attendees int default 0,
  total_revenue numeric default 0,
  average_rating numeric default 0,
  total_vendors_hired int default 0,
  total_spent_on_vendors numeric default 0,
  is_verified boolean default false,
  verification_level text default 'bronze',
  username text,
  recovery_contact text,
  updated_at timestamptz default now()
);

create table public.vendor_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  business_name text not null,
  org_id uuid references public.organizations(id),
  business_email text,
  service_categories text[] default '{}',
  commission_rate numeric default 15,
  auto_accept_quotes boolean default false,
  logo_url text,
  cover_image_url text,
  status text default 'pending' check (status in ('pending','approved','suspended','rejected')),
  featured boolean default false,
  average_rating numeric default 0,
  total_reviews int default 0,
  total_bookings int default 0,
  completed_bookings int default 0,
  cancellation_rate numeric default 0,
  avg_response_time text,
  repeat_clients int default 0,
  total_revenue numeric default 0,
  is_verified boolean default false,
  verification_method text,
  verified_at timestamptz,
  portfolio jsonb default '{}',
  updated_at timestamptz default now()
);

create table public.vendor_services (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.users(id) on delete cascade,
  category text not null,
  name text not null,
  description text,
  inclusions text[] default '{}',
  price numeric default 0,
  min_order numeric default 0,
  images text[] default '{}',
  videos text[] default '{}',
  pricing_packages jsonb default '[]',
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- 3. Categories
-- ---------------------------------------------------------------------------

create table public.event_categories (
  id uuid primary key default gen_random_uuid(),
  category_type text not null check (category_type in ('super_category','event_format')),
  name text not null,
  description text,
  active boolean default true,
  checklist jsonb default '[]',
  admin_note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (category_type, name)
);

create table public.category_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid references public.users(id),
  requested_by_name text,
  category_type text not null check (category_type in ('super_category','event_format')),
  name text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  admin_note text,
  decided_at timestamptz,
  created_at timestamptz default now()
);

create table public.category_field_sets (
  id uuid primary key default gen_random_uuid(),
  super_category_id uuid references public.event_categories(id) on delete cascade,
  fields jsonb not null default '[]'
);

create table public.checklist_templates (
  id uuid primary key default gen_random_uuid(),
  super_category_id uuid references public.event_categories(id) on delete cascade,
  event_format_id uuid references public.event_categories(id) on delete cascade,
  items jsonb not null default '[]',
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- 4. Events
-- ---------------------------------------------------------------------------

create table public.events (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.users(id),
  org_id uuid references public.organizations(id),
  parent_event_id uuid references public.events(id),
  title text not null,
  short_description text,
  description text,
  super_category_id uuid references public.event_categories(id),
  event_format_id uuid references public.event_categories(id),
  custom_field_values jsonb default '{}',
  event_type text,
  category text,
  format text check (format in ('physical','virtual','hybrid')),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  visibility text not null default 'public' check (visibility in ('public','private','invite_only','hybrid','vip_tiered')),
  access_code text,
  language text default 'en',
  banner_image text,
  gallery_images text[] default '{}',
  promo_video_url text,
  venue_name text,
  address text,
  city text,
  country text,
  coordinates jsonb,
  meeting_link text,
  meeting_platform text,
  meeting_id text,
  meeting_password text,
  start_date date,
  start_time text,
  end_date date,
  end_time text,
  timezone text default 'PKT',
  is_recurring boolean default false,
  recurrence_pattern text,
  total_seats int,
  reserved_seats int default 0,
  available_seats int,
  max_registrations_per_user int default 1,
  waitlist_enabled boolean default false,
  waitlist_capacity int,
  is_free boolean default true,
  currency text default 'PKR',
  pricing jsonb default '{}',
  requires_approval boolean default false,
  registration_open_date timestamptz,
  registration_close_date timestamptz,
  custom_form jsonb default '[]',
  sponsor_tiers text[] default '{}',
  issue_certificates boolean default false,
  certificate_type text,
  certificate_template_id uuid,
  views int default 0,
  registrations_count int default 0,
  check_ins_count int default 0,
  completion_rate numeric default 0,
  revenue numeric default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  published_at timestamptz,
  archived_at timestamptz,
  deleted_at timestamptz
);
create index on public.events (parent_event_id);
create index on public.events (organizer_id);
create index on public.events (org_id);
create index on public.events (visibility, status) where deleted_at is null;

create table public.event_checklist_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  label text not null,
  done boolean default false,
  sort_order int default 0
);

create table public.event_agenda_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  title text not null,
  item_type text,
  status text,
  start_time timestamptz,
  end_time timestamptz,
  session_date date,
  start_clock text,
  end_clock text,
  duration text,
  timezone text,
  speaker_names text[] default '{}',
  location text,
  room text,
  description text,
  linked_child_event_id uuid references public.events(id)
);

create table public.event_speakers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  designation text,
  bio text,
  profile_image text,
  session_title text,
  purpose text,
  start_time text,
  end_time text,
  email text,
  phone text,
  is_contact_public boolean,
  linkedin text,
  twitter text,
  company text,
  website text,
  created_at timestamptz default now()
);

create table public.event_access_tiers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  description text,
  sort_order int default 0
);

create table public.event_invites (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  email text not null,
  name text,
  kind text check (kind in ('whitelist','invite_link')),
  token text,
  single_use boolean default false,
  tier text,
  expires_at timestamptz,
  opened_at timestamptz,
  registered_at timestamptz,
  registration_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- 5. Ticketing & registration
-- ---------------------------------------------------------------------------

create table public.ticket_tiers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  description text,
  price numeric default 0,
  seats_available int,
  seats_sold int default 0,
  available_until date,
  is_early_bird boolean default false,
  group_discount_enabled boolean default false,
  group_min_size int,
  group_discount_pct numeric,
  student_discount_enabled boolean default false,
  student_discount_pct numeric,
  created_at timestamptz default now()
);

create table public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  code text not null,
  discount_type text check (discount_type in ('percent','flat')),
  value numeric not null,
  usage_limit int,
  usage_count int default 0,
  expires_at timestamptz,
  active boolean default true,
  unique (event_id, code)
);

create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid references public.users(id),
  attendee_name text not null,
  attendee_email text not null,
  attendee_phone text,
  ticket_tier_id uuid references public.ticket_tiers(id),
  final_price numeric default 0,
  promo_code_used text,
  custom_responses jsonb default '{}',
  invite_id uuid,
  status text not null default 'awaiting_payment' check (status in (
    'awaiting_payment','pending_approval','registered','checked_in','cancelled','waitlisted','rejected'
  )),
  waitlist_position int,
  registration_source text default 'web',
  qr_code_data text,
  qr_code_image_url text,
  checked_in boolean default false,
  check_in_time timestamptz,
  check_in_method text,
  checked_in_by uuid references public.users(id),
  payment_status text default 'free' check (payment_status in ('free','pending','paid','failed')),
  amount_paid numeric default 0,
  payment_proof_path text,
  certificate_issued boolean default false,
  certificate_id uuid,
  feedback_submitted boolean default false,
  rating numeric,
  review_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  cancelled_at timestamptz
);
create index on public.registrations (event_id, status);
create index on public.registrations (user_id);
create unique index registrations_waitlist_user on public.registrations (event_id, user_id)
  where status = 'waitlisted' and user_id is not null;

alter table public.event_invites
  add constraint event_invites_registration_fk
  foreign key (registration_id) references public.registrations(id);
alter table public.registrations
  add constraint registrations_invite_fk
  foreign key (invite_id) references public.event_invites(id);

-- ---------------------------------------------------------------------------
-- 6. Teams
-- ---------------------------------------------------------------------------

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  context_type text not null check (context_type in ('event_staff','club_committee','hackathon_track')),
  event_id uuid references public.events(id) on delete cascade,
  org_id uuid references public.organizations(id) on delete cascade,
  name text not null,
  join_code text unique,
  created_by uuid references public.users(id),
  created_at timestamptz default now()
);

create table public.team_positions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  title text not null,
  permissions text[] default '{}'
);

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.users(id),
  role text default 'member' check (role in ('lead','member')),
  position_id uuid references public.team_positions(id),
  joined_at timestamptz default now(),
  unique (team_id, user_id)
);

create table public.recruitment_forms (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  title text not null,
  fields jsonb not null default '[]',
  is_open boolean default true,
  created_at timestamptz default now()
);

create table public.applicants (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.recruitment_forms(id) on delete cascade,
  team_id uuid not null references public.teams(id),
  responses jsonb default '{}',
  status text default 'applied' check (status in ('applied','shortlisted','interview_scheduled','accepted','rejected')),
  interview_at timestamptz,
  interview_notes text,
  applied_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- 7. Hackathon
-- ---------------------------------------------------------------------------

create table public.hackathon_settings (
  event_id uuid primary key references public.events(id) on delete cascade,
  online_mode boolean default false,
  livestream_url text,
  updated_at timestamptz default now()
);

create table public.hackathon_tracks (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  organizer_id uuid references public.users(id),
  name text not null,
  description text,
  fee numeric default 0,
  currency text default 'PKR',
  min_team_size int default 1,
  max_team_size int default 4,
  prize_pool text,
  rules_file_path text,
  rules_file_name text,
  rubric jsonb default '[]',
  submission_deadline timestamptz,
  roster_lock_date timestamptz,
  current_round int default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.hackathon_teams (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.hackathon_tracks(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  join_code text unique not null,
  status text default 'forming' check (status in ('forming','locked')),
  looking_for_members boolean default false,
  needed_skills text[] default '{}',
  fee_status text default 'unpaid' check (fee_status in ('unpaid','fee_paid')),
  fee_proof_path text,
  eliminated_at_round int,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.hackathon_team_members (
  id uuid primary key default gen_random_uuid(),
  hackathon_team_id uuid not null references public.hackathon_teams(id) on delete cascade,
  registration_id uuid references public.registrations(id),
  user_id uuid references public.users(id),
  name text,
  email text,
  is_owner boolean default false,
  skills text[] default '{}',
  status text default 'active' check (status in ('active','left')),
  joined_at timestamptz default now()
);

create table public.solo_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  track_id uuid not null references public.hackathon_tracks(id) on delete cascade,
  user_id uuid not null references public.users(id),
  skills text[] default '{}',
  status text default 'unmatched' check (status in ('unmatched','matched')),
  created_at timestamptz default now()
);

create table public.hackathon_submissions (
  id uuid primary key default gen_random_uuid(),
  hackathon_team_id uuid not null references public.hackathon_teams(id) on delete cascade,
  track_id uuid not null references public.hackathon_tracks(id),
  repo_url text,
  demo_video_url text,
  description text,
  deck_path text,
  deck_name text,
  unlocked_by_organizer boolean default false,
  submitted_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.hackathon_judges (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  email text not null,
  invite_token text unique,
  track_ids uuid[] default '{}',
  invited_at timestamptz default now(),
  last_scored_at timestamptz
);

create table public.hackathon_scores (
  id uuid primary key default gen_random_uuid(),
  hackathon_team_id uuid not null references public.hackathon_teams(id) on delete cascade,
  judge_id uuid not null references public.hackathon_judges(id) on delete cascade,
  round int not null,
  category text not null,
  score numeric not null,
  comment text,
  scored_at timestamptz default now(),
  unique (hackathon_team_id, judge_id, round, category)
);

create table public.hackathon_mentors (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  email text,
  bio text,
  expertise text[] default '{}'
);

create table public.hackathon_mentor_slots (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references public.hackathon_mentors(id) on delete cascade,
  slot_date date not null,
  start_time text not null,
  end_time text not null,
  booked_by_team_id uuid references public.hackathon_teams(id),
  booked_team_name text,
  booked_at timestamptz
);

create table public.hackathon_announcements (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  track_id uuid references public.hackathon_tracks(id),
  title text not null,
  body text not null,
  emailed_count int default 0,
  created_at timestamptz default now()
);

-- CTF extensions
create table public.hackathon_ctf_challenges (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  track_id uuid references public.hackathon_tracks(id) on delete cascade,
  title text not null,
  category text,
  description text,
  points int default 100,
  flag_type text default 'static' check (flag_type in ('static','dynamic')),
  static_flag text,
  dynamic_flag_salt text,
  hints jsonb default '[]',
  time_limit_minutes int,
  attachment_url text,
  attachment_name text,
  docker_image text,
  created_at timestamptz default now()
);

create table public.hackathon_flag_submissions (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.hackathon_ctf_challenges(id) on delete cascade,
  hackathon_team_id uuid references public.hackathon_teams(id) on delete cascade,
  user_id uuid references public.users(id),
  flag_value text,
  correct boolean default false,
  submitted_at timestamptz default now()
);

create table public.hackathon_phases (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  sort_order int default 0,
  starts_at timestamptz,
  ends_at timestamptz
);

create table public.hackathon_team_phases (
  id uuid primary key default gen_random_uuid(),
  phase_id uuid not null references public.hackathon_phases(id) on delete cascade,
  hackathon_team_id uuid not null references public.hackathon_teams(id) on delete cascade,
  unlocked boolean default false,
  completed_at timestamptz
);

create table public.hackathon_sandboxes (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid references public.hackathon_ctf_challenges(id) on delete cascade,
  hackathon_team_id uuid references public.hackathon_teams(id) on delete cascade,
  docker_image text,
  status text default 'stopped',
  instance_url text,
  created_at timestamptz default now()
);

create table public.hackathon_anomalies (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  hackathon_team_id uuid references public.hackathon_teams(id),
  kind text,
  detail text,
  created_at timestamptz default now()
);

create table public.hackathon_schedules (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  schedule_date date not null,
  title text,
  body text
);

create table public.hackathon_attendance (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  hackathon_team_id uuid references public.hackathon_teams(id),
  user_id uuid references public.users(id),
  checked_in_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- 8. Sponsors
-- ---------------------------------------------------------------------------

create table public.event_sponsors_partners (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  track_id uuid references public.hackathon_tracks(id),
  name text not null,
  type text not null check (type in ('sponsor','collaborator','partner')),
  partnership_kind text,
  tier text,
  contract_value numeric default 0,
  benefits jsonb default '[]',
  logo_url text,
  website_url text,
  contact_name text,
  contact_email text,
  contact_phone text,
  user_id uuid references public.users(id),
  invited_email text,
  invite_token text,
  role text,
  invited_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- 9. Bookings
-- ---------------------------------------------------------------------------

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id),
  organizer_id uuid not null references public.users(id),
  vendor_id uuid not null references public.users(id),
  service_type text,
  status text not null default 'quote_requested' check (status in (
    'quote_requested','quote_sent','quote_accepted','confirmed','completed','cancelled'
  )),
  requirements jsonb default '{}',
  quote jsonb default '{}',
  negotiation_messages jsonb default '[]',
  contract_signed boolean default false,
  contract_signed_at timestamptz,
  contract_signed_by_organizer boolean default false,
  contract_signed_by_vendor boolean default false,
  contract_url text,
  scheduled_date date,
  scheduled_time text,
  setup_completed boolean default false,
  teardown_completed boolean default false,
  actual_delivery_time timestamptz,
  delivery_notes text,
  platform_commission numeric,
  platform_commission_pct numeric default 15,
  vendor_receives numeric,
  total_amount numeric,
  currency text default 'PKR',
  quote_pdf_url text,
  invoice_pdf_url text,
  receipt_pdf_url text,
  status_history jsonb default '[]',
  organizer_rating numeric,
  vendor_rating numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  confirmed_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz
);

-- ---------------------------------------------------------------------------
-- 10. Certificates
-- ---------------------------------------------------------------------------

create table public.certificate_templates (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.users(id),
  event_id uuid references public.events(id),
  template_name text not null,
  canvas jsonb default '{"width":700,"height":500}',
  primary_color text default '#ffffff',
  secondary_color text default '#1e293b',
  border_color text,
  border_size int default 4,
  border_style text default 'solid',
  logo_url text,
  signature_url text,
  layout_fields jsonb not null default '{}',
  blockchain_enabled boolean default false,
  blockchain_network text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references public.certificate_templates(id),
  event_id uuid not null references public.events(id),
  organizer_id uuid not null references public.users(id),
  registration_id uuid references public.registrations(id),
  user_id uuid references public.users(id),
  certificate_number text unique not null,
  verification_code text unique not null,
  title text,
  description text,
  recipient_name text not null,
  issuer_name text,
  issuer_designation text,
  event_title text,
  completion_date date,
  duration text,
  pdf_url text,
  download_count int default 0,
  last_downloaded_at timestamptz,
  status text default 'ready' check (status in ('pending','ready','revoked')),
  share_count int default 0,
  is_verified boolean default true,
  verification_count int default 0,
  blockchain_minted boolean default false,
  blockchain_network text,
  blockchain_contract_address text,
  blockchain_token_id text,
  blockchain_tx_hash text,
  blockchain_ipfs_hash text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index on public.certificates (registration_id);
create index on public.certificates (verification_code);

alter table public.registrations
  add constraint registrations_certificate_fk
  foreign key (certificate_id) references public.certificates(id);

-- ---------------------------------------------------------------------------
-- 11. Payments & budget
-- ---------------------------------------------------------------------------

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  payer_id uuid references public.users(id),
  receiver_id uuid references public.users(id),
  purpose text not null check (purpose in ('event_registration','vendor_booking','subscription','payout')),
  reference_type text,
  reference_id uuid,
  subtotal numeric,
  tax numeric default 0,
  platform_fee numeric default 0,
  total_amount numeric not null,
  currency text default 'PKR',
  exchange_rate numeric default 1,
  payment_method_type text,
  payment_method_details jsonb default '{}',
  status text not null default 'pending' check (status in ('pending','verified','failed','refunded')),
  screenshot_url text,
  screenshot_verified boolean default false,
  screenshot_uploaded_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.budget_entries (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  category text not null,
  amount numeric not null,
  entry_type text not null check (entry_type in ('income','expense')),
  note text,
  entry_date date not null,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- 12. Reviews, notifications, moderation, support
-- ---------------------------------------------------------------------------

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  reviewer_id uuid not null references public.users(id),
  reviewer_type text,
  target_type text not null check (target_type in ('event','vendor','organizer')),
  target_id uuid not null,
  rating numeric not null,
  title text,
  comment text,
  tags text[] default '{}',
  attended_event boolean,
  used_service boolean,
  verified_purchase boolean default false,
  visibility text default 'public',
  helpful_count int default 0,
  helpful_user_ids uuid[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index on public.reviews (target_type, target_id);

create table public.notification_templates (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  subject text,
  body text not null,
  default_channels text[] default '{"email"}'
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  deep_link text,
  channel text default 'email' check (channel in ('email','push','sms','whatsapp')),
  status text default 'pending' check (status in ('pending','sent','failed','read')),
  read_at timestamptz,
  related_event_id uuid,
  created_at timestamptz default now()
);
create index on public.notifications (user_id, status);

create table public.moderation_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.users(id),
  admin_email text,
  action text not null,
  target_type text not null,
  target_id uuid not null,
  target_label text,
  reason text,
  created_at timestamptz default now()
);

create table public.event_reports (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id),
  event_title text,
  reason text not null,
  reporter_email text,
  status text default 'open' check (status in ('open','dismissed','action_taken')),
  created_at timestamptz default now(),
  decided_at timestamptz
);

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid references public.users(id),
  from_email text,
  from_role text,
  subject text not null,
  body text not null,
  status text default 'open' check (status in ('open','in_progress','resolved')),
  admin_note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- 13. RLS helpers + policies
-- ---------------------------------------------------------------------------

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and (u.user_type = 'platform_admin' or u.is_owner = true)
  );
$$;

create or replace function public.user_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from public.org_memberships where user_id = auth.uid();
$$;

-- Enable RLS on tenant tables
alter table public.users enable row level security;
alter table public.organizations enable row level security;
alter table public.org_memberships enable row level security;
alter table public.pending_invites enable row level security;
alter table public.attendee_profiles enable row level security;
alter table public.organizer_profiles enable row level security;
alter table public.vendor_profiles enable row level security;
alter table public.vendor_services enable row level security;
alter table public.event_categories enable row level security;
alter table public.category_requests enable row level security;
alter table public.category_field_sets enable row level security;
alter table public.checklist_templates enable row level security;
alter table public.events enable row level security;
alter table public.event_checklist_items enable row level security;
alter table public.event_agenda_items enable row level security;
alter table public.event_speakers enable row level security;
alter table public.event_access_tiers enable row level security;
alter table public.event_invites enable row level security;
alter table public.ticket_tiers enable row level security;
alter table public.promo_codes enable row level security;
alter table public.registrations enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.team_positions enable row level security;
alter table public.hackathon_tracks enable row level security;
alter table public.hackathon_teams enable row level security;
alter table public.hackathon_team_members enable row level security;
alter table public.hackathon_submissions enable row level security;
alter table public.hackathon_judges enable row level security;
alter table public.hackathon_scores enable row level security;
alter table public.event_sponsors_partners enable row level security;
alter table public.bookings enable row level security;
alter table public.certificates enable row level security;
alter table public.certificate_templates enable row level security;
alter table public.payments enable row level security;
alter table public.budget_entries enable row level security;
alter table public.reviews enable row level security;
alter table public.notifications enable row level security;
alter table public.moderation_logs enable row level security;
alter table public.event_reports enable row level security;
alter table public.support_tickets enable row level security;
alter table public.hackathon_ctf_challenges enable row level security;
alter table public.hackathon_settings enable row level security;
alter table public.hackathon_mentors enable row level security;
alter table public.hackathon_announcements enable row level security;

-- users
create policy users_self on public.users for select using (id = auth.uid() or public.is_platform_admin());
create policy users_self_update on public.users for update using (id = auth.uid() or public.is_platform_admin());

-- events
create policy platform_admin_all_events on public.events for all using (public.is_platform_admin());
create policy organizer_own_events on public.events for all using (organizer_id = auth.uid());
create policy public_events on public.events for select
  using (status = 'published' and visibility = 'public' and deleted_at is null);
create policy org_scoped_events on public.events for select
  using (org_id in (select public.user_org_ids()));

create policy event_children_public on public.event_agenda_items for select
  using (exists (select 1 from public.events e where e.id = event_id and (
    e.organizer_id = auth.uid() or public.is_platform_admin()
    or (e.status = 'published' and e.visibility = 'public' and e.deleted_at is null)
    or e.org_id in (select public.user_org_ids())
  )));
create policy event_speakers_read on public.event_speakers for select
  using (exists (select 1 from public.events e where e.id = event_id and (
    e.organizer_id = auth.uid() or public.is_platform_admin()
    or (e.status = 'published' and e.deleted_at is null)
  )));

create policy categories_read on public.event_categories for select using (true);
create policy field_sets_read on public.category_field_sets for select using (true);

create policy registrations_own on public.registrations for select
  using (user_id = auth.uid() or public.is_platform_admin()
    or exists (select 1 from public.events e where e.id = event_id and e.organizer_id = auth.uid()));
create policy registrations_insert_self on public.registrations for insert
  with check (user_id is null or user_id = auth.uid());

create policy bookings_parties on public.bookings for all
  using (organizer_id = auth.uid() or vendor_id = auth.uid() or public.is_platform_admin());

create policy budget_org on public.budget_entries for all
  using (org_id in (select public.user_org_ids()) or public.is_platform_admin());

create policy orgs_members on public.organizations for select
  using (id in (select public.user_org_ids()) or owner_user_id = auth.uid() or public.is_platform_admin());

create policy memberships_self on public.org_memberships for select
  using (user_id = auth.uid() or public.is_platform_admin() or org_id in (select public.user_org_ids()));

create policy notifications_own on public.notifications for all
  using (user_id = auth.uid() or public.is_platform_admin());

create policy certificates_public_verify on public.certificates for select using (true);

create policy reviews_public on public.reviews for select using (visibility = 'public' or reviewer_id = auth.uid() or public.is_platform_admin());

create policy vendor_profiles_read on public.vendor_profiles for select using (true);
create policy vendor_services_read on public.vendor_services for select using (true);
create policy ticket_tiers_read on public.ticket_tiers for select
  using (exists (select 1 from public.events e where e.id = event_id and (
    e.status = 'published' or e.organizer_id = auth.uid() or public.is_platform_admin()
  )));

-- Seed notification templates
insert into public.notification_templates (key, subject, body, default_channels) values
  ('registration_confirmed', 'Registration Confirmed: {{eventTitle}}', 'Hello {{attendeeName}}, your registration for {{eventTitle}} has been confirmed.', array['email','push']),
  ('waitlist_promoted', 'You''re off the waitlist for {{eventTitle}}', 'A place at {{eventTitle}} has opened up.', array['email','push']),
  ('category_approved', 'Category Request Approved: {{categoryName}}', 'Your request was approved. {{adminNote}}', array['email','push']),
  ('invite_link_sent', 'You''re invited to {{eventTitle}}', 'Claim your ticket: {{inviteUrl}}', array['email']);

-- App leftover fields (Firestore-shaped documents) plus extra jsonb on every table.
alter table public.hackathon_teams add column if not exists scores jsonb default '{}';
alter table public.hackathon_teams add column if not exists round int default 1;
alter table public.registrations add column if not exists communications jsonb default '[]';
alter table public.registrations add column if not exists status_history jsonb default '[]';
alter table public.registrations add column if not exists organizer_id uuid;
alter table public.registrations add column if not exists tier text;
alter table public.registrations add column if not exists pricing_tier text;

do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I add column if not exists extra jsonb default ''{}''::jsonb', t);
  end loop;
end $$;
