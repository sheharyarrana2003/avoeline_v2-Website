-- C4 closeout: persist Drive modifiedTime on linked_files

alter table public.linked_files
  add column if not exists provider_modified_at timestamptz;
