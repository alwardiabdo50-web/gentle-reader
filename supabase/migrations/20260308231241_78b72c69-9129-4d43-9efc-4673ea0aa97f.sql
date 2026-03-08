
-- crawl_jobs table
CREATE TABLE public.crawl_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  api_key_id uuid REFERENCES public.api_keys(id) ON DELETE SET NULL,
  root_url text NOT NULL,
  normalized_root_url text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  max_pages integer NOT NULL DEFAULT 100,
  max_depth integer NOT NULL DEFAULT 3,
  same_domain_only boolean NOT NULL DEFAULT true,
  include_subdomains boolean NOT NULL DEFAULT false,
  include_patterns_json jsonb DEFAULT '[]'::jsonb,
  exclude_patterns_json jsonb DEFAULT '[]'::jsonb,
  render_javascript boolean NOT NULL DEFAULT true,
  only_main_content boolean NOT NULL DEFAULT true,
  timeout_ms integer NOT NULL DEFAULT 30000,
  discovered_count integer NOT NULL DEFAULT 0,
  queued_count integer NOT NULL DEFAULT 0,
  processed_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  credits_used integer NOT NULL DEFAULT 0,
  started_at timestamptz,
  finished_at timestamptz,
  cancelled_at timestamptz,
  error_code text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- crawl_pages table
CREATE TABLE public.crawl_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crawl_job_id uuid NOT NULL REFERENCES public.crawl_jobs(id) ON DELETE CASCADE,
  parent_page_id uuid REFERENCES public.crawl_pages(id) ON DELETE SET NULL,
  depth integer NOT NULL DEFAULT 0,
  url text NOT NULL,
  normalized_url text NOT NULL,
  final_url text,
  status text NOT NULL DEFAULT 'discovered',
  title text,
  markdown text,
  html text,
  metadata_json jsonb,
  links_json jsonb,
  screenshot_url text,
  http_status_code integer,
  error_code text,
  error_message text,
  discovered_at timestamptz NOT NULL DEFAULT now(),
  queued_at timestamptz,
  scraped_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_crawl_jobs_user_id ON public.crawl_jobs(user_id);
CREATE INDEX idx_crawl_jobs_status ON public.crawl_jobs(status);
CREATE INDEX idx_crawl_pages_job_id ON public.crawl_pages(crawl_job_id);
CREATE INDEX idx_crawl_pages_job_status ON public.crawl_pages(crawl_job_id, status);
CREATE UNIQUE INDEX idx_crawl_pages_job_normalized_url ON public.crawl_pages(crawl_job_id, normalized_url);

-- updated_at triggers
CREATE TRIGGER update_crawl_jobs_updated_at
  BEFORE UPDATE ON public.crawl_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crawl_pages_updated_at
  BEFORE UPDATE ON public.crawl_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.crawl_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crawl_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own crawl jobs"
  ON public.crawl_jobs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own crawl jobs"
  ON public.crawl_jobs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can update crawl jobs"
  ON public.crawl_jobs FOR UPDATE
  USING (true);

CREATE POLICY "Users can view their own crawl pages"
  ON public.crawl_pages FOR SELECT
  TO authenticated
  USING (crawl_job_id IN (SELECT id FROM public.crawl_jobs WHERE user_id = auth.uid()));

CREATE POLICY "Service role can insert crawl pages"
  ON public.crawl_pages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update crawl pages"
  ON public.crawl_pages FOR UPDATE
  USING (true);
