-- Track deleted email_message_ids so sync doesn't re-import them
create table if not exists public.deleted_email_ids (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  email_message_id text not null,
  deleted_at timestamptz not null default now()
);

-- Index for fast lookup during sync
create index idx_deleted_email_ids_user on public.deleted_email_ids(user_id);

-- RLS
alter table public.deleted_email_ids enable row level security;

create policy "Users can view own deleted ids"
  on public.deleted_email_ids for select
  using (auth.uid() = user_id);

create policy "Users can insert own deleted ids"
  on public.deleted_email_ids for insert
  with check (auth.uid() = user_id);

-- Trigger: when a transaction with email_message_id is deleted, save the id
create or replace function public.save_deleted_email_id()
returns trigger as $$
begin
  if OLD.email_message_id is not null then
    insert into public.deleted_email_ids (user_id, email_message_id)
    values (OLD.user_id, OLD.email_message_id)
    on conflict do nothing;
  end if;
  return OLD;
end;
$$ language plpgsql security definer;

create trigger trg_save_deleted_email_id
  before delete on public.transactions
  for each row
  execute function public.save_deleted_email_id();
