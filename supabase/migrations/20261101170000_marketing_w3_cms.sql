-- W3: CMS media tags + stats refresh setting (docs/19 §4)

alter table public.site_media
  add column if not exists tags text[] not null default '{}'::text[];

create index if not exists site_media_tags_gin_idx
  on public.site_media using gin (tags);

insert into public.site_settings (key, value, updated_at)
values (
  'stats',
  jsonb_build_object('refreshSeconds', 300),
  now()
)
on conflict (key) do nothing;

-- Allow public read of stats settings key (refreshSeconds is non-sensitive)
drop policy if exists site_settings_public_read on public.site_settings;
create policy site_settings_public_read on public.site_settings
  for select
  to anon, authenticated
  using (
    key in (
      'nav',
      'footer',
      'social',
      'contact',
      'announcement',
      'seo_defaults',
      'stats'
    )
  );
