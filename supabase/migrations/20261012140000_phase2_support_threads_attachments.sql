-- Phase 2: support ticket threads + private attachments bucket

create table if not exists public.support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  author_user_id uuid references public.users(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists support_ticket_messages_ticket_id_idx
  on public.support_ticket_messages (ticket_id, created_at);

create table if not exists public.support_ticket_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.support_ticket_messages(id) on delete cascade,
  storage_path text not null,
  filename text not null default '',
  mime text not null default '',
  bytes bigint not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists support_ticket_attachments_message_id_idx
  on public.support_ticket_attachments (message_id);

alter table public.support_ticket_messages enable row level security;
alter table public.support_ticket_attachments enable row level security;

-- Deny-by-default for Data API; app uses service role.
revoke all on table public.support_ticket_messages from anon, authenticated;
revoke all on table public.support_ticket_attachments from anon, authenticated;
grant all on table public.support_ticket_messages to service_role;
grant all on table public.support_ticket_attachments to service_role;

insert into storage.buckets (id, name, public, file_size_limit)
values ('support-attachments', 'support-attachments', false, 10485760)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;
