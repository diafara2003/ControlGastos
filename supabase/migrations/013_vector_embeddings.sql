-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Merchant embeddings for semantic classification (RAG)
-- Global table: all users contribute, all users benefit
CREATE TABLE IF NOT EXISTS public.merchant_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_text text NOT NULL,        -- original merchant name (lowercase)
  category_name text NOT NULL,        -- category this merchant maps to
  embedding vector(1536) NOT NULL,    -- text-embedding-3-small produces 1536 dims
  corrections_count int NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(merchant_text, category_name)
);

-- Index for fast similarity search
CREATE INDEX IF NOT EXISTS idx_merchant_embeddings_vector
  ON public.merchant_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 50);

ALTER TABLE public.merchant_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read embeddings"
  ON public.merchant_embeddings FOR SELECT
  USING (true);

CREATE POLICY "Service role manages embeddings"
  ON public.merchant_embeddings FOR ALL
  USING (auth.role() = 'service_role');

-- Function to search similar merchants by embedding
CREATE OR REPLACE FUNCTION match_merchant_embedding(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.78,
  match_count int DEFAULT 3
)
RETURNS TABLE (
  merchant_text text,
  category_name text,
  similarity float,
  corrections_count int
)
LANGUAGE sql STABLE
AS $$
  SELECT
    me.merchant_text,
    me.category_name,
    1 - (me.embedding <=> query_embedding) AS similarity,
    me.corrections_count
  FROM public.merchant_embeddings me
  WHERE 1 - (me.embedding <=> query_embedding) > match_threshold
  ORDER BY me.embedding <=> query_embedding
  LIMIT match_count;
$$;
