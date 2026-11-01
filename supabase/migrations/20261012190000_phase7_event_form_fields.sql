-- Phase 7: event_form_fields + group registration columns on events.
-- App reads/writes definitions from event_form_fields; custom_form kept for rollback.

-- ---------------------------------------------------------------------------
-- event_form_fields
-- ---------------------------------------------------------------------------
create table if not exists public.event_form_fields (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  key text not null,
  label text not null,
  type text not null check (type in (
    'text', 'textarea', 'number', 'email', 'phone', 'url', 'date',
    'dropdown', 'radio', 'checkbox', 'file'
  )),
  required boolean not null default false,
  options jsonb not null default '[]'::jsonb,
  help_text text,
  placeholder text,
  validation jsonb not null default '{}'::jsonb,
  order_index int not null default 0,
  scope text not null default 'per_member' check (scope in ('per_member', 'per_group')),
  is_system boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, key)
);

create index if not exists event_form_fields_event_order_idx
  on public.event_form_fields (event_id, order_index)
  where archived_at is null;

create index if not exists event_form_fields_event_id_idx
  on public.event_form_fields (event_id);

alter table public.event_form_fields enable row level security;
revoke all on public.event_form_fields from anon, authenticated;
grant all on public.event_form_fields to service_role;

-- ---------------------------------------------------------------------------
-- Group registration settings on events
-- ---------------------------------------------------------------------------
alter table public.events
  add column if not exists allow_group_registration boolean not null default false;

alter table public.events
  add column if not exists group_min_size int;

alter table public.events
  add column if not exists group_max_size int;

alter table public.events
  drop constraint if exists events_group_size_check;

alter table public.events
  add constraint events_group_size_check
  check (
    not allow_group_registration
    or (
      group_min_size is not null
      and group_max_size is not null
      and group_min_size >= 1
      and group_max_size >= group_min_size
      and group_max_size <= 50
    )
  );

-- ---------------------------------------------------------------------------
-- Migrate events.custom_form → event_form_fields
-- ---------------------------------------------------------------------------
insert into public.event_form_fields (
  event_id, key, label, type, required, options, help_text, placeholder,
  validation, order_index, scope, is_system, created_at, updated_at
)
select
  e.id,
  coalesce(
    nullif(btrim(coalesce(elem->>'fieldId', elem->>'id', elem->>'key')), ''),
    'field_' || (ord.ordinality::text)
  ) as key,
  coalesce(nullif(btrim(elem->>'label'), ''), 'Question ' || ord.ordinality::text) as label,
  case
    when lower(coalesce(elem->>'type', 'text')) in ('long_text', 'textarea') then 'textarea'
    when lower(coalesce(elem->>'type', 'text')) in ('checkboxes', 'checkbox') then 'checkbox'
    when lower(coalesce(elem->>'type', 'text')) = 'select' then 'dropdown'
    when lower(coalesce(elem->>'type', 'text')) = 'image' then 'file'
    when lower(coalesce(elem->>'type', 'text')) in (
      'text', 'textarea', 'number', 'email', 'phone', 'url', 'date',
      'dropdown', 'radio', 'checkbox', 'file'
    ) then lower(coalesce(elem->>'type', 'text'))
    else 'text'
  end as type,
  coalesce((elem->>'required')::boolean, false) as required,
  coalesce(elem->'options', '[]'::jsonb) as options,
  nullif(elem->>'helpText', '') as help_text,
  nullif(elem->>'placeholder', '') as placeholder,
  '{}'::jsonb as validation,
  (ord.ordinality::int - 1) as order_index,
  case
    when lower(coalesce(elem->>'askOnce', '')) = 'group' then 'per_group'
    else 'per_member'
  end as scope,
  false as is_system,
  now(),
  now()
from public.events e
cross join lateral jsonb_array_elements(coalesce(e.custom_form, '[]'::jsonb)) with ordinality as ord(elem, ordinality)
where jsonb_typeof(coalesce(e.custom_form, '[]'::jsonb)) = 'array'
  and jsonb_array_length(coalesce(e.custom_form, '[]'::jsonb)) > 0
on conflict (event_id, key) do nothing;

-- Seed system fields name / email / phone when missing
insert into public.event_form_fields (
  event_id, key, label, type, required, options, order_index, scope, is_system
)
select e.id, v.key, v.label, v.type, v.required, '[]'::jsonb, v.ord, 'per_member', true
from public.events e
cross join lateral (
  values
    ('name', 'Full name', 'text', true, 0),
    ('email', 'Email', 'email', true, 1),
    ('phone', 'Phone', 'phone', true, 2)
) as v(key, label, type, required, ord)
where not exists (
  select 1 from public.event_form_fields f
  where f.event_id = e.id and f.key = v.key
)
on conflict (event_id, key) do nothing;

-- Ensure email system field stays required
update public.event_form_fields
set required = true, is_system = true, updated_at = now()
where key = 'email';

-- Seed payment_screenshot for paid events missing it
insert into public.event_form_fields (
  event_id, key, label, type, required, options, order_index, scope, is_system, validation
)
select
  e.id,
  'payment_screenshot',
  'Payment screenshot',
  'file',
  true,
  '[]'::jsonb,
  coalesce((select max(order_index) + 1 from public.event_form_fields f where f.event_id = e.id), 100),
  'per_group',
  true,
  '{"accept":["image/*"],"maxBytes":5242880}'::jsonb
from public.events e
where coalesce(e.is_free, false) = false
  and not exists (
    select 1 from public.event_form_fields f
    where f.event_id = e.id and f.key = 'payment_screenshot' and f.archived_at is null
  )
on conflict (event_id, key) do nothing;

-- ---------------------------------------------------------------------------
-- promo_redemptions (tranche C schema early so types stay in sync)
-- ---------------------------------------------------------------------------
create table if not exists public.promo_redemptions (
  id uuid primary key default gen_random_uuid(),
  promo_id uuid not null references public.promo_codes(id) on delete cascade,
  registration_id uuid references public.registrations(id) on delete set null,
  group_id uuid references public.registration_groups(id) on delete set null,
  discount_amount numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  check (
    (registration_id is not null and group_id is null)
    or (registration_id is null and group_id is not null)
  )
);

create index if not exists promo_redemptions_promo_idx on public.promo_redemptions (promo_id);
create index if not exists promo_redemptions_registration_idx on public.promo_redemptions (registration_id);
create index if not exists promo_redemptions_group_idx on public.promo_redemptions (group_id);

alter table public.promo_redemptions enable row level security;
revoke all on public.promo_redemptions from anon, authenticated;
grant all on public.promo_redemptions to service_role;

-- Optional per-email limit column on promo_codes
alter table public.promo_codes
  add column if not exists per_email_limit int;

-- Atomic redeem_promo RPC
create or replace function public.redeem_promo(
  p_promo_id uuid,
  p_event_id uuid,
  p_track_id uuid,
  p_email text,
  p_list_price numeric,
  p_registration_id uuid,
  p_group_id uuid
)
returns table (
  original_amount numeric,
  discount_amount numeric,
  total_amount numeric,
  promo_code text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_promo public.promo_codes%rowtype;
  v_discount numeric(12, 2);
  v_total numeric(12, 2);
  v_email_uses int;
begin
  if p_list_price is null or p_list_price < 0 then
    raise exception 'invalid_price';
  end if;
  if (p_registration_id is null and p_group_id is null)
     or (p_registration_id is not null and p_group_id is not null) then
    raise exception 'invalid_target';
  end if;

  select * into v_promo
  from public.promo_codes
  where id = p_promo_id
    and event_id = p_event_id
  for update;

  if not found then
    raise exception 'promo_not_found';
  end if;
  if coalesce(v_promo.active, true) = false then
    raise exception 'promo_inactive';
  end if;
  if v_promo.expires_at is not null and v_promo.expires_at <= now() then
    raise exception 'promo_expired';
  end if;
  if v_promo.track_id is not null and (p_track_id is null or v_promo.track_id <> p_track_id) then
    raise exception 'promo_wrong_scope';
  end if;
  if v_promo.usage_limit is not null and coalesce(v_promo.usage_count, 0) >= v_promo.usage_limit then
    raise exception 'promo_exhausted';
  end if;

  if v_promo.per_email_limit is not null and nullif(btrim(p_email), '') is not null then
    select count(*)::int into v_email_uses
    from public.promo_redemptions r
    join public.registrations reg on reg.id = r.registration_id
    where r.promo_id = v_promo.id
      and lower(btrim(reg.attendee_email)) = lower(btrim(p_email));
    if v_email_uses >= v_promo.per_email_limit then
      raise exception 'promo_email_limit';
    end if;
  end if;

  if v_promo.discount_type = 'percent' then
    v_discount := round(p_list_price * (coalesce(v_promo.value, 0) / 100.0), 2);
  else
    v_discount := least(p_list_price, coalesce(v_promo.value, 0));
  end if;
  if v_discount < 0 then v_discount := 0; end if;
  v_total := greatest(0, p_list_price - v_discount);

  update public.promo_codes
  set usage_count = coalesce(usage_count, 0) + 1
  where id = v_promo.id
    and (usage_limit is null or coalesce(usage_count, 0) < usage_limit);

  if not found then
    raise exception 'promo_exhausted';
  end if;

  insert into public.promo_redemptions (promo_id, registration_id, group_id, discount_amount)
  values (v_promo.id, p_registration_id, p_group_id, v_discount);

  original_amount := p_list_price;
  discount_amount := v_discount;
  total_amount := v_total;
  promo_code := v_promo.code;
  return next;
end;
$$;

revoke all on function public.redeem_promo(uuid, uuid, uuid, text, numeric, uuid, uuid) from public, anon, authenticated;
grant execute on function public.redeem_promo(uuid, uuid, uuid, text, numeric, uuid, uuid) to service_role;
