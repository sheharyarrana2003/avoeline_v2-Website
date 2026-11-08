alter table public.hackathon_judges
  add column if not exists updated_at timestamptz default now();
