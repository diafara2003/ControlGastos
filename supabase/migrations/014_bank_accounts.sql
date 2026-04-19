-- Bank accounts: track which accounts affect indicators
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  identifier text NOT NULL,
  bank_name text NOT NULL DEFAULT '',
  account_type text NOT NULL DEFAULT 'savings' CHECK (account_type IN ('savings', 'credit', 'other')),
  is_tracked boolean NOT NULL DEFAULT true,
  track_expenses boolean NOT NULL DEFAULT true,
  track_income boolean NOT NULL DEFAULT true,
  label text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, identifier)
);

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own bank accounts"
  ON public.bank_accounts FOR ALL
  USING (auth.uid() = user_id);

-- Link transactions to bank accounts
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS bank_account_id uuid REFERENCES public.bank_accounts(id);
