-- Prevent duplicate transactions from same email
-- First clean up existing duplicates (keep oldest)
DELETE FROM public.transactions a
USING public.transactions b
WHERE a.id > b.id
  AND a.email_message_id = b.email_message_id
  AND a.email_message_id IS NOT NULL;

-- Add unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_unique_email
  ON public.transactions (user_id, email_message_id)
  WHERE email_message_id IS NOT NULL;
