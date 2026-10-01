-- Owner-editable plan catalog: plans carry pricing/display fields and
-- organizer_profiles.plan_type points at any plan key instead of a fixed list.

alter table public.subscription_plans
  add column if not exists description text,
  add column if not exists price_yearly numeric,
  add column if not exists currency text not null default 'PKR',
  add column if not exists is_active boolean not null default true,
  add column if not exists sort_order integer not null default 0,
  add column if not exists updated_at timestamptz not null default now();

update public.subscription_plans set sort_order = case key
  when 'free' then 0 when 'pro' then 10 when 'enterprise' then 20 else sort_order end;

alter table public.organizer_profiles drop constraint if exists organizer_profiles_plan_type_check;

alter table public.organizer_profiles
  drop constraint if exists organizer_profiles_plan_type_fkey;
alter table public.organizer_profiles
  add constraint organizer_profiles_plan_type_fkey
  foreign key (plan_type) references public.subscription_plans(key)
  on update cascade on delete restrict;

create index if not exists organizer_profiles_plan_type_idx on public.organizer_profiles (plan_type);
