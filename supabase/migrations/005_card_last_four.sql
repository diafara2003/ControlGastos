-- Add card_last_four to transactions
alter table public.transactions
  add column if not exists card_last_four text;

create index idx_transactions_card on public.transactions (user_id, card_last_four)
  where card_last_four is not null;
