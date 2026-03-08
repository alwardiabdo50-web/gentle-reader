
-- Add missing columns to usage_ledger for Phase 4
ALTER TABLE public.usage_ledger
  ADD COLUMN IF NOT EXISTS api_key_id uuid,
  ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'scrape',
  ADD COLUMN IF NOT EXISTS metadata_json jsonb DEFAULT '{}'::jsonb;

-- Add index for efficient balance queries per user per cycle
CREATE INDEX IF NOT EXISTS idx_usage_ledger_user_created ON public.usage_ledger (user_id, created_at DESC);
