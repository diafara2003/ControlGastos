-- User credit cards / financial products
create table if not exists public.user_credit_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  bank_name text not null,
  product_type text not null default 'credit_card', -- credit_card, bnpl (buy now pay later)
  created_at timestamptz not null default now(),
  unique (user_id, bank_name)
);

-- Flag in profiles to know if user has answered the credit card question
alter table public.profiles
  add column if not exists credit_cards_configured boolean not null default false;

-- RLS
alter table public.user_credit_cards enable row level security;

create policy "Users can view own credit cards"
  on public.user_credit_cards for select
  using (auth.uid() = user_id);

create policy "Users can insert own credit cards"
  on public.user_credit_cards for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own credit cards"
  on public.user_credit_cards for delete
  using (auth.uid() = user_id);
