CREATE TABLE public.scrape_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key text NOT NULL UNIQUE,
  url text NOT NULL,
  final_url text,
  title text,
  status_code integer,
  markdown text,
  html text,
  metadata_json jsonb,
  links_json jsonb,
  warnings_json jsonb DEFAULT '[]',
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX idx_scrape_cache_expires ON public.scrape_cache(expires_at);

ALTER TABLE public.scrape_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON public.scrape_cache FOR ALL TO service_role USING (true);