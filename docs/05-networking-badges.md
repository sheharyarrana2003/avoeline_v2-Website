# Networking Channel & Badges

Applies to: attendees, organizers, AND vendors — this is cross-role, not attendee-only like the earlier badge design. Extend, don't replace, the badge system from the earlier complete platform spec.

## New/extended tables

```sql
-- Extend the earlier badge concept to be role-aware
create table badge_tiers (
  id uuid primary key default gen_random_uuid(),
  key text unique not null, -- 'explorer','connector','networker','ambassador'
  label text not null,
  applies_to text[] default '{"attendee","organizer","vendor"}', -- which user types this tier applies to
  requirement_description text,
  sort_order int
);

create table user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  badge_tier_id uuid not null references badge_tiers(id),
  earned_at timestamptz default now(),
  unique (user_id, badge_tier_id)
);

-- Profile-capability-based matching: what to match people ON, per role
-- attendees match on attendee_profiles.interests/skills
-- organizers match on organizer_profiles (add a specialties text[] column)
-- vendors match on vendor_profiles.service_categories
-- No new table needed here — matching is a query-time join across these existing columns.

create table badge_meetups (
  id uuid primary key default gen_random_uuid(),
  badge_tier_id uuid not null references badge_tiers(id),
  title text not null,
  description text,
  scheduled_at timestamptz,
  location text, -- physical address or virtual link
  linked_event_id uuid references events(id), -- optional, if tied to a specific event
  created_at timestamptz default now()
);

create table badge_meetup_attendees (
  id uuid primary key default gen_random_uuid(),
  meetup_id uuid not null references badge_meetups(id) on delete cascade,
  user_id uuid not null references users(id),
  rsvp_status text default 'interested' check (rsvp_status in ('interested','confirmed','attended')),
  unique (meetup_id, user_id)
);
```

## Feature checklist

- **Networking channel**: a directory/feed view where attendees, organizers, and vendors can all appear (filtered by role), each showing their profile-capability tags (attendee interests/skills, organizer specialties, vendor service categories) — build as one shared `<ProfileCard />` component with role-conditional fields, not three separate directory pages.
- **Badges**: reuse `user_badges` — award logic already outlined in the earlier badge spec (check-in, session attendance, connections made). Extend award triggers to also apply to organizers (e.g., "ran 5+ successful events") and vendors (e.g., "completed 10+ bookings with 4+ star average").
- **Meetups of same-badge users**: `badge_meetups` — either organizer-created (a real scheduled meetup) or system-suggested (a simple "people at your badge tier" browse list with no formal meetup object needed for the lightweight case — only create a `badge_meetups` row when there's an actual scheduled gathering).
- **More events unlock speaker/favorite-person details**: add a `visibility_tier` column to whatever table stores speaker profile depth (e.g., `event_agenda_items` speaker sub-data, or a dedicated `speakers` table if one doesn't exist yet) — gate extended fields (direct contact, extended bio, social links) behind the viewer having reached a certain `badge_tier_id`, checked via `user_badges`.
- **Discount on events as per badge**: extend the registration price calculation (already touches `ticket_tiers`, `promo_codes`) to also check the registrant's current badge tier and apply a badge-tier discount percentage — store the per-tier discount rate on `badge_tiers` (add a `default_discount_pct` column) rather than hardcoding percentages in the pricing logic.
