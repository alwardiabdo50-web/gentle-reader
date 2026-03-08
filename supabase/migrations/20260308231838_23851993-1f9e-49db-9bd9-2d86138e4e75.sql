
CREATE TABLE public.extraction_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  api_key_id uuid REFERENCES public.api_keys(id) ON DELETE SET NULL,
  scrape_job_id uuid REFERENCES public.scrape_jobs(id) ON DELETE SET NULL,
  source_url text NOT NULL,
  prompt text,
  schema_json jsonb,
  model text NOT NULL,
  provider text NOT NULL DEFAULT 'lovable',
  input_markdown text,
  output_json jsonb,
  validation_json jsonb,
  status text NOT NULL DEFAULT 'queued',
  error_code text,
  error_message text,
  credits_used integer NOT NULL DEFAULT 0,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_extraction_jobs_user_id ON public.extraction_jobs(user_id);
CREATE INDEX idx_extraction_jobs_api_key_id ON public.extraction_jobs(api_key_id);
CREATE INDEX idx_extraction_jobs_scrape_job_id ON public.extraction_jobs(scrape_job_id);
CREATE INDEX idx_extraction_jobs_status ON public.extraction_jobs(status);
CREATE INDEX idx_extraction_jobs_model ON public.extraction_jobs(model);

CREATE TRIGGER update_extraction_jobs_updated_at
  BEFORE UPDATE ON public.extraction_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.extraction_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own extraction jobs"
  ON public.extraction_jobs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own extraction jobs"
  ON public.extraction_jobs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can update extraction jobs"
  ON public.extraction_jobs FOR UPDATE
  USING (true);
