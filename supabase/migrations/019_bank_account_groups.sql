-- Allow grouping bank accounts that belong to the same real account
-- e.g., savings *3181 and debit card *1036 are the same Bancolombia account
ALTER TABLE public.bank_accounts
  ADD COLUMN IF NOT EXISTS group_id uuid;
