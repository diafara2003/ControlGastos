-- Fix: Add unique constraint on classification_rules for upsert
alter table public.classification_rules
  add constraint classification_rules_user_pattern_category_unique
  unique (user_id, pattern, category_id);

-- Push notification subscriptions
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

create policy "Users can manage own push subscriptions"
  on public.push_subscriptions for all using (auth.uid() = user_id);

-- Notification preferences
alter table public.profiles
  add column if not exists notify_large_expense boolean not null default true,
  add column if not exists notify_large_expense_threshold bigint not null default 500000,
  add column if not exists notify_budget_alert boolean not null default true;
