-- Sub-expenses for cash withdrawals (informational only, don't affect totals)
CREATE TABLE IF NOT EXISTS public.withdrawal_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description text NOT NULL,
  amount bigint NOT NULL CHECK (amount > 0),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.withdrawal_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own withdrawal details"
  ON public.withdrawal_details FOR ALL
  USING (auth.uid() = user_id);

-- Track withdrawal resolution status on the transaction itself
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS withdrawal_resolved boolean NOT NULL DEFAULT false;
