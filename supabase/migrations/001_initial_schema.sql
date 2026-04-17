-- Profiles (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  currency text not null default 'COP',
  timezone text not null default 'America/Bogota',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id) values (new.id);
  -- Seed default categories for new user
  insert into public.categories (user_id, name, icon, color, is_default)
  values
    (new.id, 'Suscripciones', '🔄', '#8B5CF6', true),
    (new.id, 'Compras online', '🛒', '#F59E0B', true),
    (new.id, 'Supermercado', '🏪', '#10B981', true),
    (new.id, 'Restaurantes', '🍽️', '#EF4444', true),
    (new.id, 'Transporte', '🚗', '#3B82F6', true),
    (new.id, 'Servicios públicos', '💡', '#6366F1', true),
    (new.id, 'Transferencias', '💸', '#EC4899', true),
    (new.id, 'Salud', '🏥', '#14B8A6', true),
    (new.id, 'Entretenimiento', '🎮', '#F97316', true),
    (new.id, 'Educación', '📚', '#06B6D4', true),
    (new.id, 'Efectivo', '💵', '#84CC16', true),
    (new.id, 'Ingresos', '💰', '#22C55E', true),
    (new.id, 'Otros', '📦', '#9CA3AF', true);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Email accounts
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
  last_history_id text, -- Gmail history ID for incremental sync
  created_at timestamptz not null default now(),
  unique (user_id, provider, email)
);

alter table public.email_accounts enable row level security;

create policy "Users can view own email accounts"
  on public.email_accounts for select using (auth.uid() = user_id);
create policy "Users can insert own email accounts"
  on public.email_accounts for insert with check (auth.uid() = user_id);
create policy "Users can update own email accounts"
  on public.email_accounts for update using (auth.uid() = user_id);
create policy "Users can delete own email accounts"
  on public.email_accounts for delete using (auth.uid() = user_id);

-- Categories
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  icon text not null default '📦',
  color text not null default '#9CA3AF',
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;

create policy "Users can view own categories"
  on public.categories for select using (auth.uid() = user_id);
create policy "Users can insert own categories"
  on public.categories for insert with check (auth.uid() = user_id);
create policy "Users can update own categories"
  on public.categories for update using (auth.uid() = user_id);
create policy "Users can delete non-default categories"
  on public.categories for delete using (auth.uid() = user_id and is_default = false);

-- Transactions
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  email_account_id uuid references public.email_accounts on delete set null,
  type text not null check (type in ('expense', 'income')),
  amount bigint not null check (amount > 0), -- stored in COP (integer, no decimals)
  merchant text not null,
  description text,
  category_id uuid references public.categories on delete set null,
  transaction_date timestamptz not null,
  classification_method text check (classification_method in ('rule', 'ai', 'manual', 'builtin')),
  is_verified boolean not null default false,
  notes text,
  email_message_id text, -- Gmail/Outlook message ID for deduplication
  raw_email_snippet text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_transactions_user_date on public.transactions (user_id, transaction_date desc);
create index idx_transactions_email_message on public.transactions (email_message_id) where email_message_id is not null;

alter table public.transactions enable row level security;

create policy "Users can view own transactions"
  on public.transactions for select using (auth.uid() = user_id);
create policy "Users can insert own transactions"
  on public.transactions for insert with check (auth.uid() = user_id);
create policy "Users can update own transactions"
  on public.transactions for update using (auth.uid() = user_id);
create policy "Users can delete own transactions"
  on public.transactions for delete using (auth.uid() = user_id);

-- Classification rules (user-created)
create table public.classification_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  pattern text not null, -- keyword or regex pattern
  category_id uuid references public.categories on delete cascade not null,
  priority int not null default 0, -- higher = checked first
  created_at timestamptz not null default now()
);

alter table public.classification_rules enable row level security;

create policy "Users can manage own rules"
  on public.classification_rules for all using (auth.uid() = user_id);

-- Sync logs
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

create policy "Users can view own sync logs"
  on public.sync_logs for select using (auth.uid() = user_id);

-- Function: get category breakdown for dashboard donut chart
create or replace function public.get_category_breakdown(start_date timestamptz, end_date timestamptz)
returns table (name text, icon text, color text, total bigint) as $$
begin
  return query
    select c.name, c.icon, c.color, coalesce(sum(t.amount), 0)::bigint as total
    from public.categories c
    left join public.transactions t
      on t.category_id = c.id
      and t.type = 'expense'
      and t.transaction_date between start_date and end_date
      and t.user_id = auth.uid()
    where c.user_id = auth.uid()
    group by c.id, c.name, c.icon, c.color
    having coalesce(sum(t.amount), 0) > 0
    order by total desc;
end;
$$ language plpgsql security definer;

-- Function: get monthly totals for trend chart
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
