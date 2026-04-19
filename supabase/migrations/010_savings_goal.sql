-- Add monthly savings goal to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS savings_goal bigint CHECK (savings_goal >= 0) DEFAULT NULL;
