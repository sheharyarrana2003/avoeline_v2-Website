-- Taxonomy ids are stable slugs ("hackathon", "technology") that the app
-- writes and compares against (isHackathon checks event_format_id = 'hackathon').

alter table public.category_field_sets drop constraint if exists category_field_sets_super_category_id_fkey;
alter table public.checklist_templates drop constraint if exists checklist_templates_super_category_id_fkey;
alter table public.checklist_templates drop constraint if exists checklist_templates_event_format_id_fkey;
alter table public.events drop constraint if exists events_super_category_id_fkey;
alter table public.events drop constraint if exists events_event_format_id_fkey;

alter table public.event_categories alter column id drop default;
alter table public.event_categories alter column id type text using id::text;
alter table public.event_categories alter column id set default gen_random_uuid()::text;

alter table public.category_field_sets alter column super_category_id type text using super_category_id::text;
alter table public.checklist_templates alter column super_category_id type text using super_category_id::text;
alter table public.checklist_templates alter column event_format_id type text using event_format_id::text;
alter table public.events alter column super_category_id type text using super_category_id::text;
alter table public.events alter column event_format_id type text using event_format_id::text;

alter table public.category_field_sets
  add constraint category_field_sets_super_category_id_fkey
  foreign key (super_category_id) references public.event_categories(id) on update cascade on delete cascade;
alter table public.checklist_templates
  add constraint checklist_templates_super_category_id_fkey
  foreign key (super_category_id) references public.event_categories(id) on update cascade on delete cascade;
alter table public.checklist_templates
  add constraint checklist_templates_event_format_id_fkey
  foreign key (event_format_id) references public.event_categories(id) on update cascade on delete cascade;
alter table public.events
  add constraint events_super_category_id_fkey
  foreign key (super_category_id) references public.event_categories(id) on update cascade;
alter table public.events
  add constraint events_event_format_id_fkey
  foreign key (event_format_id) references public.event_categories(id) on update cascade;

create index if not exists events_event_format_id_idx on public.events (event_format_id);
create index if not exists events_super_category_id_idx on public.events (super_category_id);
