-- W2 marketing seed + schema (docs/19 §3/§7/§8).
-- website_featured, plan email caps, CMS page/block seed, stats settings, legal drafts, public plans.

-- ---------------------------------------------------------------------------
-- Schema: events.website_featured + partial index
-- ---------------------------------------------------------------------------
alter table public.events
  add column if not exists website_featured boolean not null default false;

create index if not exists events_website_featured_idx
  on public.events (website_featured)
  where website_featured = true;

-- ---------------------------------------------------------------------------
-- Schema: subscription_plans email caps (nullable; display uses live values)
-- ---------------------------------------------------------------------------
alter table public.subscription_plans
  add column if not exists email_daily_cap int null,
  add column if not exists email_monthly_cap int null;

-- ---------------------------------------------------------------------------
-- site_pages — upsert by slug (published)
-- ---------------------------------------------------------------------------
insert into public.site_pages (id, slug, title, status, seo, published_at, updated_at)
values
  (
    'a1000000-0000-4000-8000-000000000001',
    'home',
    'Avoeline',
    'published',
    jsonb_build_object(
      'title', 'Avoeline — run every event from one place',
      'description', 'Registrations, tickets, hackathons, clubs, sponsors and certificates — built for the people who actually organize.'
    ),
    now(),
    now()
  ),
  (
    'a1000000-0000-4000-8000-000000000002',
    'about',
    'About',
    'published',
    jsonb_build_object(
      'title', 'About Avoeline',
      'description', 'Avoeline is built by Aroxes — practical software for local businesses and people. Distroline and Avoeline.'
    ),
    now(),
    now()
  ),
  (
    'a1000000-0000-4000-8000-000000000003',
    'partners',
    'Partners',
    'published',
    jsonb_build_object(
      'title', 'Partners — Avoeline',
      'description', 'Organizations, sponsors, vendors and technology partners on Avoeline. Logos appear only with granted consent.'
    ),
    now(),
    now()
  ),
  (
    'a1000000-0000-4000-8000-000000000004',
    'contact',
    'Contact',
    'published',
    jsonb_build_object(
      'title', 'Contact Avoeline',
      'description', 'Reach the Avoeline team at info@aroxes.com.'
    ),
    now(),
    now()
  )
on conflict (slug) do update set
  title = excluded.title,
  status = excluded.status,
  seo = excluded.seo,
  published_at = coalesce(public.site_pages.published_at, excluded.published_at),
  updated_at = now();

delete from public.site_blocks
where page_id in (
  select id from public.site_pages where slug in ('home', 'about', 'partners', 'contact')
);

-- ---------------------------------------------------------------------------
-- site_blocks — home
-- ---------------------------------------------------------------------------
insert into public.site_blocks (page_id, type, sort, visible, draft, published, updated_at)
select p.id, b.type, b.sort, true, b.payload, b.payload, now()
from public.site_pages p
cross join lateral (
  values
    (
      'hero'::text,
      10,
      '{
        "headline": "Run every event from one place.",
        "subheadline": "Registrations, tickets, hackathons, clubs, sponsors and certificates, built for the people who actually organize.",
        "trustLine": "",
        "imageUrl": "",
        "imageAlt": "",
        "primaryCta": {"label": "Get started free", "href": "/auth/signup"},
        "secondaryCta": {"label": "See plans", "href": "/plans"}
      }'::jsonb
    ),
    (
      'stats_strip',
      20,
      '{
        "title": "",
        "items": [
          {"key": "events_count", "label": "Events", "value": ""},
          {"key": "registrations_count", "label": "Registrations", "value": ""},
          {"key": "active_organizers_count", "label": "Organizers", "value": ""},
          {"key": "institutions_count", "label": "Institutions", "value": ""},
          {"key": "certificates_count", "label": "Certificates", "value": ""}
        ]
      }'::jsonb
    ),
    (
      'logo_wall',
      30,
      '{"title": "", "items": []}'::jsonb
    ),
    (
      'feature_grid',
      40,
      '{
        "title": "What you can run",
        "body": "",
        "items": [
          {"title": "Events and ticketing", "body": "Free or paid events, groups and teams, QR check-in.", "icon": "", "imageUrl": ""},
          {"title": "Hackathons and CTF", "body": "Multiple competitions, phases, tasks, live scoreboards and judging.", "icon": "", "imageUrl": ""},
          {"title": "Clubs and departments", "body": "One place for every society, its teams, tenures and budgets.", "icon": "", "imageUrl": ""},
          {"title": "Sponsors, partners and vendor marketplace", "body": "Find vendors, compare quotes and manage bookings.", "icon": "", "imageUrl": ""},
          {"title": "Certificates", "body": "Branded certificates anyone can verify online.", "icon": "", "imageUrl": ""},
          {"title": "AI and analytics", "body": "Plan faster and learn from feedback.", "icon": "", "imageUrl": ""}
        ]
      }'::jsonb
    ),
    (
      'steps',
      50,
      '{
        "title": "How it works",
        "body": "",
        "items": [
          {"title": "Create your event", "body": "Set the basics, schedule and registration options.", "icon": ""},
          {"title": "Open registration", "body": "Share the link, collect tickets or team sign-ups.", "icon": ""},
          {"title": "Run the day", "body": "Check in with QR, run competitions and ops from one place.", "icon": ""},
          {"title": "Follow up and certify", "body": "Issue certificates and review feedback.", "icon": ""}
        ]
      }'::jsonb
    ),
    (
      'audience_tabs',
      60,
      '{
        "title": "Who it is for",
        "body": "",
        "tabs": [
          {"title": "Organizers", "body": "Create events, sell tickets, staff the day and follow up after.", "icon": ""},
          {"title": "Universities and clubs", "body": "Manage societies, teams, tenures and budgets in one place.", "icon": ""},
          {"title": "Vendors", "body": "List services, send quotes and manage bookings on the marketplace.", "icon": ""},
          {"title": "Attendees", "body": "Find events, register, check in and verify certificates online.", "icon": ""}
        ]
      }'::jsonb
    ),
    (
      'event_showcase',
      70,
      '{"title": "Upcoming public events", "body": "", "items": []}'::jsonb
    ),
    (
      'pricing_teaser',
      80,
      '{
        "title": "Plans",
        "body": "Start free. Upgrade when you need more. Live prices and modules on the Plans page.",
        "ctaLabel": "See plans",
        "ctaHref": "/plans",
        "showRecommended": true,
        "items": []
      }'::jsonb
    ),
    (
      'testimonials',
      90,
      '{"title": "", "items": []}'::jsonb
    ),
    (
      'faq',
      100,
      '{
        "title": "FAQ",
        "items": [
          {
            "question": "What does it cost?",
            "answer": "There is a free organizer plan and paid plans. See Plans for current prices and what each includes — we do not invent numbers here."
          },
          {
            "question": "Do attendees need an account?",
            "answer": "Attendees can register for events with the details the organizer asks for. An account helps them manage tickets and certificates when they choose to sign up."
          },
          {
            "question": "Can universities manage many clubs?",
            "answer": "Yes. Departments and clubs can share one place for societies, teams, tenures and budgets."
          },
          {
            "question": "How do payments work?",
            "answer": "Organizers set free or paid tickets. Platform billing for paid plans is typically bank transfer with an invoice — see Plans for the billing note on each plan."
          },
          {
            "question": "Can I send emails from my own address?",
            "answer": "Organizers can connect Google for outbound email. Sending uses your connected account and plan email limits."
          },
          {
            "question": "Who owns the data?",
            "answer": "For registration data, the event organizer is the controller and Avoeline processes it on their behalf. Account and billing data is controlled by Avoeline. See the Privacy Policy."
          }
        ]
      }'::jsonb
    ),
    (
      'cta',
      110,
      '{
        "headline": "Ready to run your next event?",
        "body": "Create a free account and set up your first event.",
        "primaryCta": {"label": "Get started free", "href": "/auth/signup"},
        "secondaryCta": {"label": "See plans", "href": "/plans"}
      }'::jsonb
    )
) as b(type, sort, payload)
where p.slug = 'home';

-- ---------------------------------------------------------------------------
-- site_blocks — about
-- ---------------------------------------------------------------------------
insert into public.site_blocks (page_id, type, sort, visible, draft, published, updated_at)
select p.id, b.type, b.sort, true, b.payload, b.payload, now()
from public.site_pages p
cross join lateral (
  values
    (
      'rich_text'::text,
      10,
      '{
        "title": "About Avoeline",
        "markdown": "Avoeline is built by **Aroxes**, a group of companies making practical software for local businesses and people.\n\nAroxes products include **Distroline** and **Avoeline**."
      }'::jsonb
    ),
    (
      'timeline',
      20,
      '{
        "title": "Aroxes products",
        "body": "",
        "items": [
          {"title": "Aroxes", "body": "A group of companies making practical software for local businesses and people.", "date": ""},
          {"title": "Distroline", "body": "An Aroxes product.", "date": ""},
          {"title": "Avoeline", "body": "Event platform for organizers, universities and clubs, vendors and attendees.", "date": ""}
        ]
      }'::jsonb
    )
) as b(type, sort, payload)
where p.slug = 'about';

-- ---------------------------------------------------------------------------
-- site_blocks — partners (empty logo sections; live partners fill when consented)
-- ---------------------------------------------------------------------------
insert into public.site_blocks (page_id, type, sort, visible, draft, published, updated_at)
select p.id, b.type, b.sort, true, b.payload, b.payload, now()
from public.site_pages p
cross join lateral (
  values
    (
      'logo_wall'::text,
      10,
      '{"title": "Organizers and institutions on Avoeline", "items": []}'::jsonb
    ),
    (
      'logo_wall',
      20,
      '{"title": "Sponsors and partners", "items": []}'::jsonb
    ),
    (
      'logo_wall',
      30,
      '{"title": "Vendors", "items": []}'::jsonb
    ),
    (
      'logo_wall',
      40,
      '{"title": "Technology", "items": []}'::jsonb
    ),
    (
      'cta',
      50,
      '{
        "headline": "Become a partner",
        "body": "Tell us about your organization. Logos appear only with granted consent.",
        "primaryCta": {"label": "Contact us", "href": "/contact"},
        "secondaryCta": {"label": "", "href": ""}
      }'::jsonb
    )
) as b(type, sort, payload)
where p.slug = 'partners';

-- ---------------------------------------------------------------------------
-- site_blocks — contact
-- ---------------------------------------------------------------------------
insert into public.site_blocks (page_id, type, sort, visible, draft, published, updated_at)
select p.id, b.type, b.sort, true, b.payload, b.payload, now()
from public.site_pages p
cross join lateral (
  values
    (
      'contact_info'::text,
      10,
      '{
        "title": "Contact",
        "email": "info@aroxes.com",
        "phone": "",
        "whatsapp": "",
        "address": "",
        "responseTime": ""
      }'::jsonb
    )
) as b(type, sort, payload)
where p.slug = 'contact';

-- ---------------------------------------------------------------------------
-- site_stats_settings — keys aligned with get_public_stats()
-- ---------------------------------------------------------------------------
insert into public.site_stats_settings (key, label, visible, min_threshold, format)
values
  ('events_count', 'Events', true, 1, 'number'),
  ('registrations_count', 'Registrations', true, 1, 'number'),
  ('active_organizers_count', 'Organizers', true, 3, 'number'),
  ('institutions_count', 'Institutions', true, 1, 'number'),
  ('certificates_count', 'Certificates', true, 1, 'number')
on conflict (key) do update set
  label = excluded.label,
  visible = excluded.visible,
  min_threshold = excluded.min_threshold,
  format = excluded.format;

-- ---------------------------------------------------------------------------
-- Legal §8 — privacy + terms version 1 (keep [brackets])
-- ---------------------------------------------------------------------------
insert into public.legal_documents (id, slug, title)
values
  ('b1000000-0000-4000-8000-000000000001', 'privacy', 'Privacy Policy'),
  ('b1000000-0000-4000-8000-000000000002', 'terms', 'Terms and Conditions')
on conflict (slug) do update set
  title = excluded.title;

insert into public.legal_document_versions (id, document_id, version, body_md, change_summary, effective_date, published_at)
select
  v.id,
  d.id,
  1,
  v.body_md,
  'W2 seed outline from docs/19 §8',
  current_date,
  now()
from public.legal_documents d
join (
  values
    (
      'b1000000-0000-4000-8000-000000000011'::uuid,
      'privacy'::text,
      $privacy$
# Privacy Policy

## 1. Who we are
Aroxes ([legal entity, address]) operates Avoeline. Contact: info@aroxes.com.

## 2. What we collect
Account details; the events, sponsors, partners and vendors organizers enter; registration details attendees submit (name, email, phone, answers to event forms, payment proofs, team details, check-in); technical data (logs, device, IP); messages you send us; and, if you connect Google, only the data needed for the features you enable.

## 3. Why we use it
To run events and registrations, issue tickets and certificates, process payments, provide support, keep the service secure, meet legal duties, and improve Avoeline using aggregated or de-identified information. We use your details for Avoeline updates or community networking only if you opt in, and you can withdraw at any time.

## 4. Who sees it
Organizers see registrations for their own events and decide how they use them. Sponsors and partners see only what the organizer or you choose to share. We do not sell personal data.

## 5. Roles
For registration data, the event organizer is the controller and Avoeline processes it on their behalf. For accounts, billing and usage, Avoeline is the controller.

## 6. Google user data
We use Google data only to provide the features you enable, never for advertising, and we do not use it to train AI models. Our use follows Google's API Services User Data Policy, including its Limited Use requirements.

## 7. Service providers
Hosting, database, email and payment tools (for example Vercel, Supabase, Resend, Google), under contract.

## 8. Retention and deletion
[periods]. Registration data is kept for the organizer's retention settings and legal needs.

## 9. Security
Encryption in transit, restricted access, audit logs.

## 10. Your rights
Access, correction, deletion, objection and withdrawal of consent, via info@aroxes.com. [Add regulator or complaint information for your jurisdiction.]

## 11. Other
Cookies, children, international transfers, changes, effective date.
$privacy$
    ),
    (
      'b1000000-0000-4000-8000-000000000012'::uuid,
      'terms'::text,
      $terms$
# Terms and Conditions

## Acceptance and eligibility
By using Avoeline you accept these terms. [eligibility rules].

## Accounts and security
Keep credentials safe. You are responsible for activity under your account.

## Organizer responsibilities
Lawful data use; getting permission for the messages they send; accurate event information; refunds and attendee communication.

## Attendees and vendors
Use the service as intended for registration, tickets, certificates, quotes and bookings.

## Acceptable use
No spam, no unlawful content.

## Fees, billing and bank-transfer payments
Paid plans and marketplace fees as stated at signup or on Plans. Billing may use bank transfer with an invoice.

## Vendor marketplace and commissions
[commission terms].

## Content, IP and licenses
You keep rights to content you upload. You grant Avoeline a license to host and display it to operate the service.

## Google connections and email sending limits
Connections are optional. Email sending is subject to plan limits and provider policies.

## Availability and changes to the service
We may change or interrupt the service. We will give reasonable notice for material paid-plan changes where we can.

## Suspension and termination
We may suspend or terminate accounts that breach these terms or the law.

## Disclaimers and limits of liability
[disclaimer language]. [liability caps].

## Governing law and disputes
[jurisdiction].

## Changes to the terms
We may update these terms. Material changes may be announced in-product or by email.

## Contact
info@aroxes.com.
$terms$
    )
) as v(id, slug, body_md) on d.slug = v.slug
on conflict (document_id, version) do nothing;

update public.legal_documents d
set current_version_id = v.id
from public.legal_document_versions v
where v.document_id = d.id
  and v.version = 1
  and d.slug in ('privacy', 'terms');

-- ---------------------------------------------------------------------------
-- Plans display — public organizer free + pro; pro recommended; vendors stay private
-- ---------------------------------------------------------------------------
update public.subscription_plans
set
  is_public = true,
  is_recommended = false,
  tagline = coalesce(nullif(tagline, ''), 'For getting started'),
  billing_note = coalesce(nullif(billing_note, ''), 'Free forever for core organizer tools.'),
  cta_label = coalesce(nullif(cta_label, ''), 'Get started free'),
  cta_href = coalesce(nullif(cta_href, ''), '/auth/signup?plan=free'),
  updated_at = now()
where key = 'free';

update public.subscription_plans
set
  is_public = true,
  is_recommended = true,
  badge_text = coalesce(nullif(badge_text, ''), 'Recommended'),
  tagline = coalesce(nullif(tagline, ''), 'For growing organizers'),
  billing_note = coalesce(nullif(billing_note, ''), 'Billed by bank transfer with an invoice. See Plans for current prices.'),
  cta_label = coalesce(nullif(cta_label, ''), 'Choose Pro'),
  cta_href = coalesce(nullif(cta_href, ''), '/auth/signup?plan=pro'),
  updated_at = now()
where key = 'pro';

update public.subscription_plans
set
  is_public = false,
  is_recommended = false,
  updated_at = now()
where key in ('vendor_free', 'vendor_pro');
