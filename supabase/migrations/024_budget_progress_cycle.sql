-- Update get_budget_progress to use cycle config from profiles
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
declare
  v_cycle_day smallint;
  v_cycle_hour smallint;
  v_period_start timestamptz;
  v_period_end timestamptz;
  v_now timestamptz := now();
  v_col_now timestamp;
  v_col_year int;
  v_col_month int;
  v_col_day int;
  v_col_hour int;
  v_clamped_day int;
  v_last_day int;
  v_start_year int;
  v_start_month int;
  v_end_year int;
  v_end_month int;
  v_end_clamped int;
begin
  -- Load user's cycle config
  select coalesce(p.cycle_start_day, 1), coalesce(p.cycle_start_hour, 0)
  into v_cycle_day, v_cycle_hour
  from public.profiles p
  where p.id = auth.uid();

  -- If no profile or default config, use calendar month
  if v_cycle_day is null or (v_cycle_day = 1 and v_cycle_hour = 0) then
    v_period_start := date_trunc('month', v_now);
    v_period_end := date_trunc('month', v_now) + interval '1 month' - interval '1 second';
  else
    -- Convert now to Colombia time (UTC-5)
    v_col_now := v_now at time zone 'America/Bogota';
    v_col_year := extract(year from v_col_now)::int;
    v_col_month := extract(month from v_col_now)::int;
    v_col_day := extract(day from v_col_now)::int;
    v_col_hour := extract(hour from v_col_now)::int;

    -- Clamp cycle day to last day of current month
    v_last_day := extract(day from (make_date(v_col_year, v_col_month, 1) + interval '1 month' - interval '1 day'))::int;
    v_clamped_day := least(v_cycle_day, v_last_day);

    -- Are we before this month's boundary?
    if v_col_day < v_clamped_day or (v_col_day = v_clamped_day and v_col_hour < v_cycle_hour) then
      -- Period started in previous month
      v_start_month := v_col_month - 1;
      v_start_year := v_col_year;
      if v_start_month < 1 then
        v_start_month := 12;
        v_start_year := v_start_year - 1;
      end if;
    else
      v_start_month := v_col_month;
      v_start_year := v_col_year;
    end if;

    -- Clamp start day
    v_last_day := extract(day from (make_date(v_start_year, v_start_month, 1) + interval '1 month' - interval '1 day'))::int;
    v_clamped_day := least(v_cycle_day, v_last_day);

    -- Build period start in COT then convert to UTC
    v_period_start := make_timestamp(v_start_year, v_start_month, v_clamped_day, v_cycle_hour, 0, 0) at time zone 'America/Bogota';

    -- Period end = next month's boundary - 1 second
    v_end_month := v_start_month + 1;
    v_end_year := v_start_year;
    if v_end_month > 12 then
      v_end_month := 1;
      v_end_year := v_end_year + 1;
    end if;
    v_last_day := extract(day from (make_date(v_end_year, v_end_month, 1) + interval '1 month' - interval '1 day'))::int;
    v_end_clamped := least(v_cycle_day, v_last_day);
    v_period_end := make_timestamp(v_end_year, v_end_month, v_end_clamped, v_cycle_hour, 0, 0) at time zone 'America/Bogota' - interval '1 second';
  end if;

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
      and t.transaction_date >= v_period_start
      and t.transaction_date <= v_period_end
    where b.user_id = auth.uid()
      and b.is_active = true
    group by b.id, b.category_id, c.name, c.icon, c.color, b.amount_limit
    order by percentage desc;
end;
$$ language plpgsql security definer;
