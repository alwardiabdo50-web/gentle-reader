
-- Scheduled jobs table
CREATE TABLE public.scheduled_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  
  -- What to run
  job_type text NOT NULL DEFAULT 'scrape', -- 'scrape', 'crawl', 'extract'
  config_json jsonb NOT NULL DEFAULT '{}'::jsonb, -- job-specific config (url, formats, etc.)
  
  -- Schedule
  cron_expression text NOT NULL DEFAULT '0 0 * * *', -- default: daily at midnight
  timezone text NOT NULL DEFAULT 'UTC',
  
  -- State
  is_active boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  next_run_at timestamptz,
  last_job_id uuid, -- reference to the most recent job created
  last_status text, -- 'completed', 'failed', etc.
  run_count integer NOT NULL DEFAULT 0,
  
  -- Diff detection
  enable_diff boolean NOT NULL DEFAULT false,
  last_content_hash text, -- SHA-256 of last result for diff detection
  last_diff_json jsonb, -- stores diff summary when content changed
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.scheduled_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own schedules"
  ON public.scheduled_jobs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own schedules"
  ON public.scheduled_jobs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own schedules"
  ON public.scheduled_jobs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own schedules"
  ON public.scheduled_jobs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access scheduled_jobs"
  ON public.scheduled_jobs FOR ALL
  TO service_role
  USING (true);

-- Schedule run history for tracking each execution
CREATE TABLE public.schedule_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES public.scheduled_jobs(id) ON DELETE CASCADE,
  job_id uuid,
  job_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
  content_hash text,
  content_changed boolean DEFAULT false,
  diff_summary_json jsonb,
  error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.schedule_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own schedule runs"
  ON public.schedule_runs FOR SELECT
  TO authenticated
  USING (schedule_id IN (SELECT id FROM public.scheduled_jobs WHERE user_id = auth.uid()));

CREATE POLICY "Service role full access schedule_runs"
  ON public.schedule_runs FOR ALL
  TO service_role
  USING (true);

-- Updated_at trigger
CREATE TRIGGER update_scheduled_jobs_updated_at
  BEFORE UPDATE ON public.scheduled_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
