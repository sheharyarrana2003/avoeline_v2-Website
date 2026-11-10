-- N2: ticket tier available_from + organizer legal docs for publish acceptance

alter table public.ticket_tiers
  add column if not exists available_from timestamptz;

comment on column public.ticket_tiers.available_from is
  'Optional start of sale window; null means available immediately.';

-- ---------------------------------------------------------------------------
-- Legal: Event Organizer Agreement + Content rights (v1)
-- ---------------------------------------------------------------------------
insert into public.legal_documents (id, slug, title)
values
  ('b1000000-0000-4000-8000-000000000003', 'organizer-agreement', 'Event Organizer Agreement'),
  ('b1000000-0000-4000-8000-000000000004', 'content-rights', 'Content Rights')
on conflict (slug) do update set
  title = excluded.title;

insert into public.legal_document_versions (id, document_id, version, body_md, change_summary, effective_date, published_at)
select
  v.id,
  d.id,
  1,
  v.body_md,
  'N2 seed for event publish acceptance',
  current_date,
  now()
from public.legal_documents d
join (
  values
    (
      'b1000000-0000-4000-8000-000000000013'::uuid,
      'organizer-agreement'::text,
      $org$
# Event Organizer Agreement

## Role
You are the organizer of events you create on Avoeline. You are responsible for the accuracy of event details, registrations you collect, and how you use attendee data.

## Content and compliance
You confirm you have the rights to publish the event, and that the event complies with applicable law and Avoeline policies.

## Payments and refunds
You set ticket prices and handle payment verification for paid events. Refunds and disputes are your responsibility unless otherwise agreed in writing.

## Account
You keep your account secure, connect only accounts you control, and disconnect Google access when you no longer need it.

## Changes
We may update this agreement. Material changes may be announced in-product or by email.

## Contact
info@aroxes.com.
$org$
    ),
    (
      'b1000000-0000-4000-8000-000000000014'::uuid,
      'content-rights'::text,
      $rights$
# Content Rights

## Your confirmation
By publishing an event you confirm that you have the rights to use all uploaded images, video links, logos, and written content for that event.

## Licences
You grant Avoeline a non-exclusive licence to host and display that content for operating and promoting the event on the platform.

## Takedown
If content you uploaded infringes rights, you will remove or replace it promptly when notified.

## Contact
info@aroxes.com.
$rights$
    )
) as v(id, slug, body_md) on d.slug = v.slug
on conflict (document_id, version) do nothing;

update public.legal_documents d
set current_version_id = v.id
from public.legal_document_versions v
where v.document_id = d.id
  and v.version = 1
  and d.slug in ('organizer-agreement', 'content-rights')
  and (d.current_version_id is null or d.current_version_id is distinct from v.id);
