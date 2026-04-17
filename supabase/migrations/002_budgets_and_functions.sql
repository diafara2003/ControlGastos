-- Budgets table
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

create policy "Users can manage own budgets"
  on public.budgets for all using (auth.uid() = user_id);

-- Add search index for full-text search on transactions
create index idx_transactions_search on public.transactions
  using gin (to_tsvector('spanish', coalesce(merchant, '') || ' ' || coalesce(description, '') || ' ' || coalesce(notes, '')));

-- Function: search transactions
create or replace function public.search_transactions(search_query text)
returns setof public.transactions as $$
begin
  return query
    select *
    from public.transactions
    where user_id = auth.uid()
      and (
        merchant ilike '%' || search_query || '%'
        or description ilike '%' || search_query || '%'
        or notes ilike '%' || search_query || '%'
      )
    order by transaction_date desc
    limit 50;
end;
$$ language plpgsql security definer;

-- Function: detect subscriptions (recurring payments with same merchant and similar amount)
create or replace function public.detect_subscriptions()
returns table (
  merchant text,
  avg_amount bigint,
  frequency_days int,
  last_date timestamptz,
  occurrences bigint,
  category_name text,
  category_icon text,
  category_color text
) as $$
begin
  return query
    with recurring as (
      select
        t.merchant,
        avg(t.amount)::bigint as avg_amount,
        count(*) as occurrences,
        max(t.transaction_date) as last_date,
        min(t.transaction_date) as first_date,
        t.category_id
      from public.transactions t
      where t.user_id = auth.uid()
        and t.type = 'expense'
        and t.transaction_date >= now() - interval '6 months'
      group by t.merchant, t.category_id
      having count(*) >= 2
        -- Amount variance less than 20%
        and (max(t.amount) - min(t.amount))::float / nullif(avg(t.amount), 0) < 0.2
    )
    select
      r.merchant,
      r.avg_amount,
      (extract(epoch from (r.last_date - r.first_date)) / nullif(r.occurrences - 1, 0) / 86400)::int as frequency_days,
      r.last_date,
      r.occurrences,
      coalesce(c.name, 'Otros') as category_name,
      coalesce(c.icon, 'package') as category_icon,
      coalesce(c.color, '#9CA3AF') as category_color
    from recurring r
    left join public.categories c on c.id = r.category_id
    where r.occurrences >= 2
    order by r.avg_amount desc;
end;
$$ language plpgsql security definer;

-- Function: monthly comparison insight
create or replace function public.get_monthly_comparison()
returns table (
  category_name text,
  category_icon text,
  current_month_total bigint,
  previous_month_total bigint,
  change_percent numeric
) as $$
begin
  return query
    with current_month as (
      select t.category_id, sum(t.amount) as total
      from public.transactions t
      where t.user_id = auth.uid()
        and t.type = 'expense'
        and t.transaction_date >= date_trunc('month', now())
      group by t.category_id
    ),
    previous_month as (
      select t.category_id, sum(t.amount) as total
      from public.transactions t
      where t.user_id = auth.uid()
        and t.type = 'expense'
        and t.transaction_date >= date_trunc('month', now()) - interval '1 month'
        and t.transaction_date < date_trunc('month', now())
      group by t.category_id
    )
    select
      coalesce(c.name, 'Otros') as category_name,
      coalesce(c.icon, 'package') as category_icon,
      coalesce(cm.total, 0)::bigint as current_month_total,
      coalesce(pm.total, 0)::bigint as previous_month_total,
      case
        when coalesce(pm.total, 0) = 0 then null
        else round(((coalesce(cm.total, 0) - pm.total)::numeric / pm.total) * 100, 1)
      end as change_percent
    from public.categories c
    left join current_month cm on cm.category_id = c.id
    left join previous_month pm on pm.category_id = c.id
    where c.user_id = auth.uid()
      and (cm.total is not null or pm.total is not null)
    order by coalesce(cm.total, 0) desc;
end;
$$ language plpgsql security definer;

-- Function: get budget progress
create or replace function public.get_budget_progress()
returns table (
  budget_id uuid,
  category_id uuid,
  category_name text,
  category_icon text,
  category_color text,
  amount_limit bigint,
  amount_spent bigint,
  percentage numeric
) as $$
begin
  return query
    select
      b.id as budget_id,
      b.category_id,
      c.name as category_name,
      c.icon as category_icon,
      c.color as category_color,
      b.amount_limit,
      coalesce(sum(t.amount), 0)::bigint as amount_spent,
      case
        when b.amount_limit = 0 then 0
        else round((coalesce(sum(t.amount), 0)::numeric / b.amount_limit) * 100, 1)
      end as percentage
    from public.budgets b
    join public.categories c on c.id = b.category_id
    left join public.transactions t
      on t.category_id = b.category_id
      and t.user_id = auth.uid()
      and t.type = 'expense'
      and t.transaction_date >= date_trunc('month', now())
      and t.transaction_date < date_trunc('month', now()) + interval '1 month'
    where b.user_id = auth.uid()
      and b.is_active = true
    group by b.id, b.category_id, c.name, c.icon, c.color, b.amount_limit
    order by percentage desc;
end;
$$ language plpgsql security definer;
