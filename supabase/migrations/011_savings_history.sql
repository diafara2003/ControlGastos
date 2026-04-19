-- Track monthly savings goal history and results
CREATE TABLE IF NOT EXISTS public.savings_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month text NOT NULL, -- format: "2026-04"
  goal bigint NOT NULL CHECK (goal >= 0),
  actual_savings bigint, -- filled at month end (income - expenses)
  met boolean, -- true if actual_savings >= goal
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, month)
);

ALTER TABLE public.savings_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own savings history"
  ON public.savings_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own savings history"
  ON public.savings_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own savings history"
  ON public.savings_history FOR UPDATE
  USING (auth.uid() = user_id);
