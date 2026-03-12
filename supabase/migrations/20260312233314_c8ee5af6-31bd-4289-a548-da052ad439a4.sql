
-- Pipelines table
CREATE TABLE public.pipelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  scrape_options jsonb DEFAULT '{}',
  extract_schema jsonb,
  extract_prompt text,
  extract_model text DEFAULT 'google/gemini-3-flash-preview',
  transform_prompt text,
  transform_model text DEFAULT 'google/gemini-3-flash-preview',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own pipelines" ON public.pipelines FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own pipelines" ON public.pipelines FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own pipelines" ON public.pipelines FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own pipelines" ON public.pipelines FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service role full access pipelines" ON public.pipelines FOR ALL TO service_role USING (true);

-- Pipeline runs table
CREATE TABLE public.pipeline_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id uuid REFERENCES public.pipelines(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  api_key_id uuid,
  source_url text NOT NULL,
  status text DEFAULT 'running',
  scrape_job_id uuid,
  extraction_job_id uuid,
  scrape_result jsonb,
  extract_result jsonb,
  transform_result jsonb,
  final_output jsonb,
  credits_used integer DEFAULT 0,
  error_code text,
  error_message text,
  started_at timestamptz DEFAULT now(),
  finished_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.pipeline_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own pipeline runs" ON public.pipeline_runs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service role full access pipeline_runs" ON public.pipeline_runs FOR ALL TO service_role USING (true);

-- Triggers for updated_at
CREATE TRIGGER update_pipelines_updated_at BEFORE UPDATE ON public.pipelines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
