-- Phase 3: vendor_event_marketing on vendor_pro; keep vendor_free to core modules only.

update public.subscription_plans
set
  included_modules = array[
    'vendor_dashboard',
    'vendor_quotes',
    'vendor_services',
    'vendor_bookings'
  ]::text[],
  description = coalesce(description, 'Basic marketplace listing and quotes.'),
  updated_at = now()
where key = 'vendor_free';

update public.subscription_plans
set
  included_modules = array[
    'vendor_dashboard',
    'vendor_quotes',
    'vendor_services',
    'vendor_bookings',
    'vendor_portfolio',
    'vendor_event_marketing',
    'vendor_analytics'
  ]::text[],
  description = 'Portfolio, event marketing, and analytics.',
  updated_at = now()
where key = 'vendor_pro';
