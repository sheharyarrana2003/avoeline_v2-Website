-- Public vs private promo codes. Default private keeps existing codes code-entry only.
alter table public.promo_codes
  add column if not exists visibility text not null default 'private';

alter table public.promo_codes
  drop constraint if exists promo_codes_visibility_check;

alter table public.promo_codes
  add constraint promo_codes_visibility_check
  check (visibility in ('public', 'private'));

comment on column public.promo_codes.visibility is
  'public = listed on register form; private = code-entry only (never in public DTO)';
