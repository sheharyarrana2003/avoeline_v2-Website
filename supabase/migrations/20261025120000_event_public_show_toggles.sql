-- Public page visibility toggles for sponsors / collaborators / partners.
-- Default false so existing events do not suddenly expose logos until organizers opt in.

alter table public.events
  add column if not exists show_sponsors boolean not null default false,
  add column if not exists show_collaborators boolean not null default false,
  add column if not exists show_partners boolean not null default false;

comment on column public.events.show_sponsors is 'When true, sponsors appear on the public event page';
comment on column public.events.show_collaborators is 'When true, collaborators appear on the public event page';
comment on column public.events.show_partners is 'When true, partners appear on the public event page';
