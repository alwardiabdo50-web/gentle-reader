
ALTER TABLE public.scrape_jobs
  ADD COLUMN IF NOT EXISTS api_key_id uuid,
  ADD COLUMN IF NOT EXISTS screenshot_url text,
  ADD COLUMN IF NOT EXISTS warnings_json jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS request_json jsonb;

-- Allow service role to update scrape_jobs (edge function writes results)
CREATE POLICY "Service role can update scrape_jobs"
  ON public.scrape_jobs FOR UPDATE
  TO service_role
  USING (true);
