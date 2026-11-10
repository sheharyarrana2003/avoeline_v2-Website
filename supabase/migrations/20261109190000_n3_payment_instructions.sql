-- N3: organizer-editable payment instructions for public registration (paid events)

alter table public.events
  add column if not exists payment_instructions text;

comment on column public.events.payment_instructions is
  'Plain-text bank/wallet/reference instructions shown on the public register card for paid events.';
