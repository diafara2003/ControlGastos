-- ============================================
-- MisCuentas - Migración completa
-- Pegar en Supabase SQL Editor y dar Run
-- ============================================

-- 1. Categorías (necesita existir antes del trigger)
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  icon text not null default 'package',
  color text not null default '#9CA3AF',
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;
create policy "Users can view own categories" on public.categories for select using (auth.uid() = user_id);
create policy "Users can insert own categories" on public.categories for insert with check (auth.uid() = user_id);
create policy "Users can update own categories" on public.categories for update using (auth.uid() = user_id);
create policy "Users can delete non-default categories" on public.categories for delete using (auth.uid() = user_id and is_default = false);

-- 2. Profiles
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  currency text not null default 'COP',
  timezone text not null default 'America/Bogota',
  notify_large_expense boolean not null default true,
  notify_large_expense_threshold bigint not null default 500000,
  notify_budget_alert boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- 3. Trigger: auto-create profile + seed categories on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id) values (new.id);
  insert into public.categories (user_id, name, icon, color, is_default) values
    (new.id, 'Suscripciones', 'repeat', '#8B5CF6', true),
    (new.id, 'Compras online', 'shopping-bag', '#F59E0B', true),
    (new.id, 'Supermercado', 'store', '#10B981', true),
    (new.id, 'Restaurantes', 'utensils', '#EF4444', true),
    (new.id, 'Transporte', 'car', '#3B82F6', true),
    (new.id, 'Servicios públicos', 'zap', '#6366F1', true),
    (new.id, 'Transferencias', 'arrow-right-left', '#EC4899', true),
    (new.id, 'Salud', 'heart-pulse', '#14B8A6', true),
    (new.id, 'Entretenimiento', 'gamepad-2', '#F97316', true),
    (new.id, 'Educación', 'graduation-cap', '#06B6D4', true),
    (new.id, 'Efectivo', 'banknote', '#84CC16', true),
    (new.id, 'Ingresos', 'trending-up', '#22C55E', true),
    (new.id, 'Otros', 'package', '#9CA3AF', true);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 4. Email accounts
create table public.email_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  provider text not null check (provider in ('gmail', 'outlook')),
  email text not null,
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  is_active boolean not null default true,
  last_sync_at timestamptz,
  last_history_id text,
  created_at timestamptz not null default now(),
  unique (user_id, provider, email)
);

alter table public.email_accounts enable row level security;
create policy "Users can view own email accounts" on public.email_accounts for select using (auth.uid() = user_id);
create policy "Users can insert own email accounts" on public.email_accounts for insert with check (auth.uid() = user_id);
create policy "Users can update own email accounts" on public.email_accounts for update using (auth.uid() = user_id);
create policy "Users can delete own email accounts" on public.email_accounts for delete using (auth.uid() = user_id);

-- 5. Transactions
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  email_account_id uuid references public.email_accounts on delete set null,
  type text not null check (type in ('expense', 'income')),
  amount bigint not null check (amount > 0),
  merchant text not null,
  description text,
  category_id uuid references public.categories on delete set null,
  transaction_date timestamptz not null,
  classification_method text check (classification_method in ('rule', 'ai', 'manual', 'builtin')),
  is_verified boolean not null default false,
  notes text,
  email_message_id text,
  raw_email_snippet text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_transactions_user_date on public.transactions (user_id, transaction_date desc);
create index idx_transactions_email_message on public.transactions (email_message_id) where email_message_id is not null;
create index idx_transactions_search on public.transactions using gin (to_tsvector('spanish', coalesce(merchant, '') || ' ' || coalesce(description, '') || ' ' || coalesce(notes, '')));

alter table public.transactions enable row level security;
create policy "Users can view own transactions" on public.transactions for select using (auth.uid() = user_id);
create policy "Users can insert own transactions" on public.transactions for insert with check (auth.uid() = user_id);
create policy "Users can update own transactions" on public.transactions for update using (auth.uid() = user_id);
create policy "Users can delete own transactions" on public.transactions for delete using (auth.uid() = user_id);

-- 6. Classification rules
create table public.classification_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  pattern text not null,
  category_id uuid references public.categories on delete cascade not null,
  priority int not null default 0,
  created_at timestamptz not null default now(),
  constraint classification_rules_user_pattern_category_unique unique (user_id, pattern, category_id)
);

alter table public.classification_rules enable row level security;
create policy "Users can manage own rules" on public.classification_rules for all using (auth.uid() = user_id);

-- 7. Sync logs
create table public.sync_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  email_account_id uuid references public.email_accounts on delete cascade not null,
  status text not null check (status in ('success', 'error', 'partial')),
  emails_processed int not null default 0,
  transactions_created int not null default 0,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

alter table public.sync_logs enable row level security;
create policy "Users can view own sync logs" on public.sync_logs for select using (auth.uid() = user_id);

-- 8. Budgets
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  category_id uuid references public.categories on delete cascade not null,
  amount_limit bigint not null check (amount_limit > 0),
  period text not null default 'monthly' check (period in ('monthly', 'weekly')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category_id, period)
);

alter table public.budgets enable row level security;
create policy "Users can manage own budgets" on public.budgets for all using (auth.uid() = user_id);

-- 9. Push subscriptions
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
create policy "Users can manage own push subscriptions" on public.push_subscriptions for all using (auth.uid() = user_id);

-- ============================================
-- FUNCIONES RPC
-- ============================================

-- Category breakdown (donut chart)
create or replace function public.get_category_breakdown(start_date timestamptz, end_date timestamptz)
returns table (name text, icon text, color text, total bigint) as $$
begin
  return query
    select c.name, c.icon, c.color, coalesce(sum(t.amount), 0)::bigint as total
    from public.categories c
    left join public.transactions t
      on t.category_id = c.id and t.type = 'expense'
      and t.transaction_date between start_date and end_date
      and t.user_id = auth.uid()
    where c.user_id = auth.uid()
    group by c.id, c.name, c.icon, c.color
    having coalesce(sum(t.amount), 0) > 0
    order by total desc;
end;
$$ language plpgsql security definer;

-- Monthly totals (trend chart)
create or replace function public.get_monthly_totals(num_months int default 6)
returns table (month text, expenses bigint, income bigint) as $$
begin
  return query
    select
      to_char(date_trunc('month', t.transaction_date), 'YYYY-MM') as month,
      coalesce(sum(case when t.type = 'expense' then t.amount end), 0)::bigint as expenses,
      coalesce(sum(case when t.type = 'income' then t.amount end), 0)::bigint as income
    from public.transactions t
    where t.user_id = auth.uid()
      and t.transaction_date >= date_trunc('month', now()) - (num_months || ' months')::interval
    group by date_trunc('month', t.transaction_date)
    order by month;
end;
$$ language plpgsql security definer;

-- Search transactions
create or replace function public.search_transactions(search_query text)
returns setof public.transactions as $$
begin
  return query
    select * from public.transactions
    where user_id = auth.uid()
      and (merchant ilike '%' || search_query || '%'
        or description ilike '%' || search_query || '%'
        or notes ilike '%' || search_query || '%')
    order by transaction_date desc limit 50;
end;
$$ language plpgsql security definer;

-- Detect subscriptions
create or replace function public.detect_subscriptions()
returns table (merchant text, avg_amount bigint, frequency_days int, last_date timestamptz, occurrences bigint, category_name text, category_icon text, category_color text) as $$
begin
  return query
    with recurring as (
      select t.merchant, avg(t.amount)::bigint as avg_amount, count(*) as occurrences,
        max(t.transaction_date) as last_date, min(t.transaction_date) as first_date, t.category_id
      from public.transactions t
      where t.user_id = auth.uid() and t.type = 'expense' and t.transaction_date >= now() - interval '6 months'
      group by t.merchant, t.category_id
      having count(*) >= 2 and (max(t.amount) - min(t.amount))::float / nullif(avg(t.amount), 0) < 0.2
    )
    select r.merchant, r.avg_amount,
      (extract(epoch from (r.last_date - r.first_date)) / nullif(r.occurrences - 1, 0) / 86400)::int as frequency_days,
      r.last_date, r.occurrences,
      coalesce(c.name, 'Otros') as category_name, coalesce(c.icon, 'package') as category_icon, coalesce(c.color, '#9CA3AF') as category_color
    from recurring r left join public.categories c on c.id = r.category_id
    where r.occurrences >= 2 order by r.avg_amount desc;
end;
$$ language plpgsql security definer;

-- Monthly comparison
create or replace function public.get_monthly_comparison()
returns table (category_name text, category_icon text, current_month_total bigint, previous_month_total bigint, change_percent numeric) as $$
begin
  return query
    with current_month as (
      select t.category_id, sum(t.amount) as total from public.transactions t
      where t.user_id = auth.uid() and t.type = 'expense' and t.transaction_date >= date_trunc('month', now())
      group by t.category_id
    ), previous_month as (
      select t.category_id, sum(t.amount) as total from public.transactions t
      where t.user_id = auth.uid() and t.type = 'expense'
        and t.transaction_date >= date_trunc('month', now()) - interval '1 month'
        and t.transaction_date < date_trunc('month', now())
      group by t.category_id
    )
    select coalesce(c.name, 'Otros'), coalesce(c.icon, 'package'),
      coalesce(cm.total, 0)::bigint, coalesce(pm.total, 0)::bigint,
      case when coalesce(pm.total, 0) = 0 then null
        else round(((coalesce(cm.total, 0) - pm.total)::numeric / pm.total) * 100, 1) end
    from public.categories c
    left join current_month cm on cm.category_id = c.id
    left join previous_month pm on pm.category_id = c.id
    where c.user_id = auth.uid() and (cm.total is not null or pm.total is not null)
    order by coalesce(cm.total, 0) desc;
end;
$$ language plpgsql security definer;

-- Budget progress
create or replace function public.get_budget_progress()
returns table (budget_id uuid, category_id uuid, category_name text, category_icon text, category_color text, amount_limit bigint, amount_spent bigint, percentage numeric) as $$
begin
  return query
    select b.id, b.category_id, c.name, c.icon, c.color, b.amount_limit,
      coalesce(sum(t.amount), 0)::bigint as amount_spent,
      case when b.amount_limit = 0 then 0
        else round((coalesce(sum(t.amount), 0)::numeric / b.amount_limit) * 100, 1) end
    from public.budgets b
    join public.categories c on c.id = b.category_id
    left join public.transactions t
      on t.category_id = b.category_id and t.user_id = auth.uid() and t.type = 'expense'
      and t.transaction_date >= date_trunc('month', now())
      and t.transaction_date < date_trunc('month', now()) + interval '1 month'
    where b.user_id = auth.uid() and b.is_active = true
    group by b.id, b.category_id, c.name, c.icon, c.color, b.amount_limit
    order by percentage desc;
end;
$$ language plpgsql security definer;
