-- Global classification patterns learned from user corrections
-- Not per-user: patterns are shared across all users
CREATE TABLE IF NOT EXISTS public.classification_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_pattern text NOT NULL, -- normalized merchant text (lowercase, trimmed)
  category_name text NOT NULL,    -- target category name
  corrections_count int NOT NULL DEFAULT 1, -- how many users corrected this
  confidence numeric(3,2) NOT NULL DEFAULT 0.50,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(merchant_pattern, category_name)
);

-- Anyone can read patterns (global learning)
ALTER TABLE public.classification_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read patterns"
  ON public.classification_patterns FOR SELECT
  USING (true);

-- Only service role inserts/updates (via API routes)
CREATE POLICY "Service role manages patterns"
  ON public.classification_patterns FOR ALL
  USING (auth.role() = 'service_role');
