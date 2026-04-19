-- User-defined classification rules (per user, with RAG support)
CREATE TABLE IF NOT EXISTS public.user_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  merchant_pattern text NOT NULL,       -- normalized merchant text
  category_name text NOT NULL,          -- target category
  rule_description text,                -- user's note about the rule
  include_in_expenses boolean NOT NULL DEFAULT true,  -- sum in expense indicators
  include_in_income boolean NOT NULL DEFAULT true,    -- sum in income indicators
  embedding vector(1536),               -- for semantic matching
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, merchant_pattern)
);

ALTER TABLE public.user_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own rules"
  ON public.user_rules FOR ALL
  USING (auth.uid() = user_id);

-- Add exclude flags to transactions for rule-based exclusion
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS exclude_from_totals boolean NOT NULL DEFAULT false;

-- Function to match user rules by embedding similarity
CREATE OR REPLACE FUNCTION match_user_rule(
  p_user_id uuid,
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.80,
  match_count int DEFAULT 1
)
RETURNS TABLE (
  id uuid,
  merchant_pattern text,
  category_name text,
  rule_description text,
  include_in_expenses boolean,
  include_in_income boolean,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    ur.id,
    ur.merchant_pattern,
    ur.category_name,
    ur.rule_description,
    ur.include_in_expenses,
    ur.include_in_income,
    1 - (ur.embedding <=> query_embedding) AS similarity
  FROM public.user_rules ur
  WHERE ur.user_id = p_user_id
    AND ur.embedding IS NOT NULL
    AND 1 - (ur.embedding <=> query_embedding) > match_threshold
  ORDER BY ur.embedding <=> query_embedding
  LIMIT match_count;
$$;
